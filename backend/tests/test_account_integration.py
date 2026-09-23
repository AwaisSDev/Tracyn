"""Integration tests for account deletion (routers/account.py) through the
real FastAPI app, with Supabase and Whop faked: the password gate, handing
a shared workspace to its next member, erasing a solo workspace (after
cancelling its billing), and refusing to start without the database update."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import CurrentUser, get_current_user

USER_ID = "user-1"


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table, op, payload=None):
        self.db, self.table, self.op, self.payload = db, table, op, payload
        self.filters = {}

    def eq(self, field, value):
        self.filters[field] = value
        return self

    def execute(self):
        rows = self.db.tables.setdefault(self.table, [])
        matches = [r for r in rows if all(r.get(k) == v for k, v in self.filters.items())]
        if self.op == "update":
            for r in matches:
                r.update(self.payload)
        return _Result([dict(r) for r in matches])


class _Table:
    def __init__(self, db, name):
        self.db, self.name = db, name

    def select(self, *_a, **_kw):
        return _Query(self.db, self.name, "select")

    def update(self, payload):
        return _Query(self.db, self.name, "update", payload)


class _Rpc:
    def __init__(self, db, fn, params):
        self.db, self.fn, self.params = db, fn, params

    def execute(self):
        if not self.db.has_purge_function:
            raise RuntimeError("Could not find the function public.purge_workspace(ws)")
        self.db.purged.append(self.params["ws"])
        return _Result(None)


class _Admin:
    def __init__(self, db):
        self.db = db

    def delete_user(self, user_id):
        self.db.deleted_users.append(user_id)


class _Auth:
    def __init__(self, db):
        self.admin = _Admin(db)


class _FakeDb:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {}
        self.purged: list[str] = []
        self.deleted_users: list[str] = []
        self.has_purge_function = True
        self.auth = _Auth(self)

    def table(self, name):
        return _Table(self, name)

    def rpc(self, fn, params):
        return _Rpc(self, fn, params)


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDb()
    monkeypatch.setattr("app.routers.account.get_db", lambda: db)
    monkeypatch.setattr("app.routers.account._verify_password", lambda email, pw: USER_ID if pw == "right-password" else None)
    return db


@pytest.fixture
def cancelled(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr("app.routers.account.cancel_membership", lambda mid: calls.append(mid))
    return calls


@pytest.fixture
def client(fake_db):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER_ID, email="owner@example.com")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_wrong_password_deletes_nothing(client, fake_db, cancelled):
    fake_db.tables["workspaces"] = [{"id": "ws-solo", "owner_id": USER_ID}]
    resp = client.post("/v1/account/delete", json={"password": "wrong"})
    assert resp.status_code == 403
    assert fake_db.purged == [] and fake_db.deleted_users == [] and cancelled == []


def test_solo_workspace_is_erased_after_its_billing_is_cancelled(client, fake_db, cancelled):
    fake_db.tables["workspaces"] = [{"id": "ws-solo", "owner_id": USER_ID}]
    fake_db.tables["workspace_members"] = [{"workspace_id": "ws-solo", "user_id": USER_ID, "role": "owner", "created_at": "2026-01-01"}]
    fake_db.tables["subscriptions"] = [{"workspace_id": "ws-solo", "whop_membership_id": "mem_1", "status": "active"}]

    resp = client.post("/v1/account/delete", json={"password": "right-password"})

    assert resp.status_code == 204, resp.text
    assert cancelled == ["mem_1"]
    # The first purge is the nil-uuid preflight check.
    assert fake_db.purged[1:] == ["ws-solo"]
    assert fake_db.deleted_users == [USER_ID]


def test_shared_workspace_passes_to_an_admin_first(client, fake_db, cancelled):
    fake_db.tables["workspaces"] = [{"id": "ws-team", "owner_id": USER_ID}]
    fake_db.tables["workspace_members"] = [
        {"workspace_id": "ws-team", "user_id": USER_ID, "role": "owner", "created_at": "2026-01-01"},
        {"workspace_id": "ws-team", "user_id": "early-member", "role": "member", "created_at": "2026-01-02"},
        {"workspace_id": "ws-team", "user_id": "later-admin", "role": "admin", "created_at": "2026-03-01"},
    ]

    resp = client.post("/v1/account/delete", json={"password": "right-password"})

    assert resp.status_code == 204, resp.text
    assert fake_db.tables["workspaces"][0]["owner_id"] == "later-admin"
    heir = next(m for m in fake_db.tables["workspace_members"] if m["user_id"] == "later-admin")
    assert heir["role"] == "owner"
    assert fake_db.purged[1:] == []
    assert cancelled == []
    assert fake_db.deleted_users == [USER_ID]


def test_billing_failure_stops_before_anything_is_deleted(client, fake_db, monkeypatch):
    fake_db.tables["workspaces"] = [{"id": "ws-solo", "owner_id": USER_ID}]
    fake_db.tables["subscriptions"] = [{"workspace_id": "ws-solo", "whop_membership_id": "mem_1", "status": "active"}]

    def boom(_mid):
        raise RuntimeError("Whop down")

    monkeypatch.setattr("app.routers.account.cancel_membership", boom)
    resp = client.post("/v1/account/delete", json={"password": "right-password"})

    assert resp.status_code == 502
    assert fake_db.purged[1:] == [] and fake_db.deleted_users == []


def test_missing_database_update_is_reported_before_any_change(client, fake_db, cancelled):
    fake_db.has_purge_function = False
    fake_db.tables["workspaces"] = [{"id": "ws-solo", "owner_id": USER_ID}]
    fake_db.tables["subscriptions"] = [{"workspace_id": "ws-solo", "whop_membership_id": "mem_1", "status": "active"}]

    resp = client.post("/v1/account/delete", json={"password": "right-password"})

    assert resp.status_code == 503
    assert "account_deletion.sql" in resp.json()["detail"]
    assert cancelled == [] and fake_db.deleted_users == []
