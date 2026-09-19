"""Founder-only signup/sign-in analytics -- not tied to any numbered
feature, not shown to workspace members. Gated by security.py's
require_admin (server-side email allowlist), not just a hidden route.

"Sign-ins" here means each user's most recent last_sign_in_at, which is
all Supabase's own user record tracks -- there is no full history of
every login event anywhere in this schema. The "active in the last N
days" counts are derived from that single timestamp per user, not a
count of sessions; that's stated in the response shape (not implied to
be more precise) so the dashboard can be honest about what it's showing.
"""

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.db import get_db, run_db
from app.security import CurrentUser, require_admin

router = APIRouter(prefix="/v1/admin", tags=["admin"])


@router.get("/analytics")
async def get_analytics(user: CurrentUser = Depends(require_admin)) -> dict:
    db = get_db()

    # list_users is paginated (Supabase defaults to 50/page) -- keep pulling
    # pages until one comes back short of what was asked for, so this stays
    # correct as signups grow past a single page.
    users = []
    page = 1
    while True:
        batch = await run_db(lambda p=page: db.auth.admin.list_users(page=p, per_page=200))
        users.extend(batch)
        if len(batch) < 200:
            break
        page += 1

    now = datetime.now(timezone.utc)
    signups_by_day: Counter[str] = Counter()
    recent = []
    active_7d = 0
    active_30d = 0
    confirmed = 0

    for u in users:
        signups_by_day[u.created_at.date().isoformat()] += 1
        if u.email_confirmed_at:
            confirmed += 1
        if u.last_sign_in_at:
            age = now - u.last_sign_in_at
            if age <= timedelta(days=7):
                active_7d += 1
            if age <= timedelta(days=30):
                active_30d += 1
        recent.append(
            {
                "email": u.email,
                "created_at": u.created_at.isoformat(),
                "email_confirmed_at": u.email_confirmed_at.isoformat() if u.email_confirmed_at else None,
                "last_sign_in_at": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
            }
        )

    recent.sort(key=lambda r: r["created_at"], reverse=True)

    workspace_count = (await run_db(lambda: db.table("workspaces").select("id", count="exact").execute())).count or 0

    thirty_days_ago_key = (now - timedelta(days=30)).date().isoformat()
    signups_last_30_days = sum(n for day, n in signups_by_day.items() if day >= thirty_days_ago_key)

    return {
        "total_signups": len(users),
        "confirmed_signups": confirmed,
        "signups_last_30_days": signups_last_30_days,
        "active_last_7_days": active_7d,
        "active_last_30_days": active_30d,
        "total_workspaces": workspace_count,
        "signups_by_day": dict(sorted(signups_by_day.items())[-30:]),
        "recent_signups": recent[:50],
    }
