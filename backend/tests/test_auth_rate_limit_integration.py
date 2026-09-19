"""Integration tests for the verification-email rate limiter: an address
under the cap gets recorded and allowed through, an address at the cap
gets a 429 and does NOT get another row written (so it can't be nudged
past the limit by retrying the same call)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


class _FakeResult:
    def __init__(self, count):
        self.data = []
        self.count = count


class _FakeSelectQuery:
    def __init__(self, count):
        self._count = count

    def select(self, *_a, **_kw):
        return self

    def eq(self, *_a, **_kw):
        return self

    def gte(self, *_a, **_kw):
        return self

    def execute(self):
        return _FakeResult(self._count)


class _FakeInsertQuery:
    def __init__(self, recorder):
        self._recorder = recorder

    def insert(self, row):
        self._recorder.append(row)
        return self

    def execute(self):
        return _FakeResult(None)


class _FakeTable:
    def __init__(self, existing_count, inserted):
        self._existing_count = existing_count
        self._inserted = inserted

    def select(self, *a, **kw):
        return _FakeSelectQuery(self._existing_count).select(*a, **kw)

    def insert(self, row):
        return _FakeInsertQuery(self._inserted).insert(row)


class _FakeDb:
    def __init__(self, existing_count):
        self.inserted = []
        self._existing_count = existing_count

    def table(self, name):
        assert name == "verification_email_sends"
        return _FakeTable(self._existing_count, self.inserted)


def test_allows_send_under_the_cap_and_records_it(monkeypatch):
    fake_db = _FakeDb(existing_count=2)
    monkeypatch.setattr("app.routers.auth_rate_limit.get_db", lambda: fake_db)

    with TestClient(app) as c:
        resp = c.post("/v1/auth/verification-send", json={"email": "Person@Example.com"})

    assert resp.status_code == 204
    assert fake_db.inserted == [{"email": "person@example.com"}]


def test_rejects_send_at_the_cap_and_does_not_record_it(monkeypatch):
    fake_db = _FakeDb(existing_count=5)
    monkeypatch.setattr("app.routers.auth_rate_limit.get_db", lambda: fake_db)

    with TestClient(app) as c:
        resp = c.post("/v1/auth/verification-send", json={"email": "person@example.com"})

    assert resp.status_code == 429
    assert fake_db.inserted == []
