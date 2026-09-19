"""Integration tests for the founder-only analytics endpoint: the email
allowlist actually rejects a non-admin caller (not just a route that
happens to be unlinked from the sidebar), and the aggregation math over
a controlled set of fake users comes out right."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import CurrentUser, get_current_user

NOW = datetime.now(timezone.utc)


def _user(email, created_days_ago, confirmed=True, last_sign_in_days_ago=None):
    return SimpleNamespace(
        email=email,
        created_at=NOW - timedelta(days=created_days_ago),
        email_confirmed_at=(NOW - timedelta(days=created_days_ago)) if confirmed else None,
        last_sign_in_at=(NOW - timedelta(days=last_sign_in_days_ago)) if last_sign_in_days_ago is not None else None,
    )


class _FakeAdminAuth:
    def __init__(self, users):
        self._users = users

    def list_users(self, page=None, per_page=None):
        # Single page is enough for these tests -- the router's pagination
        # loop stops as soon as a page comes back shorter than per_page.
        return self._users if page == 1 else []


class _FakeAuth:
    def __init__(self, users):
        self.admin = _FakeAdminAuth(users)


class _FakeResult:
    def __init__(self, count):
        self.data = []
        self.count = count


class _FakeWorkspacesQuery:
    def __init__(self, count):
        self._count = count

    def select(self, *_a, **_kw):
        return self

    def execute(self):
        return _FakeResult(self._count)


class _FakeDb:
    def __init__(self, users, workspace_count):
        self.auth = _FakeAuth(users)
        self._workspace_count = workspace_count

    def table(self, name):
        assert name == "workspaces"
        return _FakeWorkspacesQuery(self._workspace_count)


@pytest.fixture
def admin_override():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="admin-1", email="awais201001@gmail.com")
    yield
    app.dependency_overrides.clear()


def test_analytics_requires_authentication():
    with TestClient(app) as c:
        resp = c.get("/v1/admin/analytics")
    assert resp.status_code == 401


def test_analytics_rejects_a_non_admin_email():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="user-1", email="someone@example.com")
    try:
        with TestClient(app) as c:
            resp = c.get("/v1/admin/analytics")
    finally:
        app.dependency_overrides.clear()
    assert resp.status_code == 403


def test_analytics_aggregates_real_signup_and_activity_counts(admin_override, monkeypatch):
    users = [
        _user("a@example.com", created_days_ago=1, confirmed=True, last_sign_in_days_ago=1),  # active 7d + 30d
        _user("b@example.com", created_days_ago=10, confirmed=True, last_sign_in_days_ago=10),  # active 30d only
        _user("c@example.com", created_days_ago=40, confirmed=False, last_sign_in_days_ago=None),  # outside 30d signup window, unconfirmed, never signed in
    ]
    monkeypatch.setattr("app.routers.admin.get_db", lambda: _FakeDb(users, workspace_count=2))

    with TestClient(app) as c:
        resp = c.get("/v1/admin/analytics")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_signups"] == 3
    assert body["confirmed_signups"] == 2
    assert body["signups_last_30_days"] == 2  # the 40-day-old signup is excluded
    assert body["active_last_7_days"] == 1
    assert body["active_last_30_days"] == 2
    assert body["total_workspaces"] == 2
    assert len(body["recent_signups"]) == 3
    # Most recent signup first.
    assert body["recent_signups"][0]["email"] == "a@example.com"
