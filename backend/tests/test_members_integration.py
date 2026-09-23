"""Integration tests for shared workspaces (routers/members.py) through the
real FastAPI app with an in-memory Supabase stand-in: who can change roles
and remove people, leaving, handing over ownership, the invite settings,
and joining by invite link or password (including the guess limit)."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.members import hash_password, verify_password
from app.security import CurrentUser, get_current_user

WS = "ws-1"


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table, op, payload=None):
        self.db, self.table, self.op, self.payload = db, table, op, payload
        self.eqs: dict = {}
        self.gtes: dict = {}
        self.ins = None

    def eq(self, f, v):
        self.eqs[f] = v
        return self

    def gte(self, f, v):
        self.gtes[f] = v
        return self

    def in_(self, f, vs):
        self.ins = (f, set(vs))
        return self

    def _match(self, r):
        return (
            all(r.get(k) == v for k, v in self.eqs.items())
            and all((r.get(k) or "") >= v for k, v in self.gtes.items())
            and (self.ins is None or r.get(self.ins[0]) in self.ins[1])
        )

    def execute(self):
        rows = self.db.tables.setdefault(self.table, [])
        if self.op == "insert":
            row = {"created_at": datetime.now(timezone.utc).isoformat(), **self.payload}
            rows.append(row)
            return _Result([dict(row)])
        hits = [r for r in rows if self._match(r)]
        if self.op == "update":
            for r in hits:
                r.update(self.payload)
        if self.op == "delete":
            self.db.tables[self.table] = [r for r in rows if r not in hits]
        return _Result([dict(r) for r in hits])


class _Table:
    def __init__(self, db, name):
        self.db, self.name = db, name

    def select(self, *_a, **_k):
        return _Query(self.db, self.name, "select")

    def insert(self, payload):
        return _Query(self.db, self.name, "insert", payload)

    def update(self, payload):
        return _Query(self.db, self.name, "update", payload)

    def delete(self):
        return _Query(self.db, self.name, "delete")


class _FakeDb:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {
            "workspaces": [{"id": WS, "name": "Acme", "slug": "acme", "plan": "free", "owner_id": "owner", "created_at": "2026-01-01T00:00:00+00:00"}],
            "workspace_members": [
                {"workspace_id": WS, "user_id": "owner", "role": "owner", "created_at": "2026-01-01"},
                {"workspace_id": WS, "user_id": "admin", "role": "admin", "created_at": "2026-01-02"},
                {"workspace_id": WS, "user_id": "member", "role": "member", "created_at": "2026-01-03"},
            ],
        }
        self.auth = SimpleNamespace(
            admin=SimpleNamespace(
                get_user_by_id=lambda uid: SimpleNamespace(
                    user=SimpleNamespace(email=f"{uid}@example.com", user_metadata={"full_name": uid.title()})
                )
            )
        )

    def table(self, name):
        return _Table(self, name)

    def role(self, uid):
        rows = [m for m in self.tables["workspace_members"] if m["workspace_id"] == WS and m["user_id"] == uid]
        return rows[0]["role"] if rows else None


@pytest.fixture
def db(monkeypatch):
    fake = _FakeDb()
    monkeypatch.setattr("app.routers.members.get_db", lambda: fake)
    return fake


@pytest.fixture
def as_user(db):
    clients = []

    def make(uid):
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=uid, email=f"{uid}@example.com")
        c = TestClient(app)
        clients.append(c)
        return c

    yield make
    app.dependency_overrides.clear()


def test_password_hash_round_trip():
    stored = hash_password("correct horse")
    assert verify_password("correct horse", stored)
    assert not verify_password("wrong", stored)
    assert not verify_password("anything", None)


def test_every_member_sees_the_member_list_in_role_order(db, as_user):
    resp = as_user("member").get(f"/v1/workspaces/{WS}/members")
    assert resp.status_code == 200
    body = resp.json()
    assert [m["role"] for m in body] == ["owner", "admin", "member"]
    assert body[2]["is_me"] and body[0]["email"] == "owner@example.com"


def test_outsiders_cant_see_members(db, as_user):
    assert as_user("stranger").get(f"/v1/workspaces/{WS}/members").status_code == 403


def test_only_the_owner_changes_roles(db, as_user):
    assert as_user("admin").patch(f"/v1/workspaces/{WS}/members/member", json={"role": "admin"}).status_code == 403
    assert as_user("owner").patch(f"/v1/workspaces/{WS}/members/member", json={"role": "admin"}).status_code == 200
    assert db.role("member") == "admin"
    assert as_user("owner").patch(f"/v1/workspaces/{WS}/members/owner", json={"role": "member"}).status_code == 400


def test_admins_remove_members_but_not_admins(db, as_user):
    assert as_user("admin").delete(f"/v1/workspaces/{WS}/members/member").status_code == 204
    assert db.role("member") is None
    db.tables["workspace_members"].append({"workspace_id": WS, "user_id": "admin2", "role": "admin", "created_at": "x"})
    assert as_user("admin").delete(f"/v1/workspaces/{WS}/members/admin2").status_code == 403
    assert as_user("member").delete(f"/v1/workspaces/{WS}/members/admin").status_code == 403


def test_anyone_but_the_owner_can_leave(db, as_user):
    assert as_user("member").delete(f"/v1/workspaces/{WS}/members/member").status_code == 204
    assert as_user("owner").delete(f"/v1/workspaces/{WS}/members/owner").status_code == 400


def test_transfer_makes_them_owner_and_keeps_you_as_admin(db, as_user):
    assert as_user("admin").post(f"/v1/workspaces/{WS}/transfer", json={"user_id": "member"}).status_code == 403
    resp = as_user("owner").post(f"/v1/workspaces/{WS}/transfer", json={"user_id": "member"})
    assert resp.status_code == 200
    assert db.role("member") == "owner" and db.role("owner") == "admin"
    assert db.tables["workspaces"][0]["owner_id"] == "member"


def test_invite_settings_are_admin_only_and_start_off(db, as_user):
    assert as_user("member").get(f"/v1/workspaces/{WS}/invite").status_code == 403
    invite = as_user("admin").get(f"/v1/workspaces/{WS}/invite").json()
    assert invite["link_token"] is None and invite["has_password"] is False and len(invite["join_code"]) == 10


def test_join_with_the_invite_link(db, as_user):
    invite = as_user("owner").post(f"/v1/workspaces/{WS}/invite/link", json={"enabled": True}).json()
    code, key = invite["join_code"], invite["link_token"]

    preview = as_user("newbie").get(f"/v1/join/{code}", params={"key": key}).json()
    assert preview["workspace_name"] == "Acme" and preview["key_valid"] and not preview["already_member"]

    resp = as_user("newbie").post(f"/v1/join/{code}", json={"key": key})
    assert resp.status_code == 200 and resp.json()["role"] == "member"
    assert db.role("newbie") == "member"


def test_resetting_the_link_stops_the_old_one(db, as_user):
    old = as_user("owner").post(f"/v1/workspaces/{WS}/invite/link", json={"enabled": True}).json()
    as_user("owner").post(f"/v1/workspaces/{WS}/invite/link", json={"enabled": True})
    resp = as_user("newbie").post(f"/v1/join/{old['join_code']}", json={"key": old["link_token"]})
    assert resp.status_code == 403
    assert db.role("newbie") is None


def test_join_with_the_workspace_password(db, as_user):
    assert as_user("admin").put(f"/v1/workspaces/{WS}/invite/password", json={"password": "abc"}).status_code == 400
    invite = as_user("admin").put(f"/v1/workspaces/{WS}/invite/password", json={"password": "open-sesame"}).json()
    assert invite["has_password"] and "password" not in str(invite).replace("has_password", "")

    code = invite["join_code"]
    assert as_user("newbie").post(f"/v1/join/{code}", json={"password": "nope"}).status_code == 403
    assert db.role("newbie") is None
    assert as_user("newbie").post(f"/v1/join/{code}", json={"password": "open-sesame"}).status_code == 200
    assert db.role("newbie") == "member"


def test_wrong_passwords_are_limited(db, as_user):
    code = as_user("admin").put(f"/v1/workspaces/{WS}/invite/password", json={"password": "open-sesame"}).json()["join_code"]
    client = as_user("guesser")
    for _ in range(10):
        assert client.post(f"/v1/join/{code}", json={"password": "guess"}).status_code == 403
    assert client.post(f"/v1/join/{code}", json={"password": "open-sesame"}).status_code == 429


def test_joining_is_off_until_turned_on(db, as_user):
    code = as_user("admin").get(f"/v1/workspaces/{WS}/invite").json()["join_code"]
    resp = as_user("newbie").post(f"/v1/join/{code}", json={"password": "anything"})
    assert resp.status_code == 403 and "isn't accepting" in resp.json()["detail"]


def test_unknown_code(db, as_user):
    assert as_user("newbie").get("/v1/join/nothere123").status_code == 404
