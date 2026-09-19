"""Rate-limits verification emails per address, independent of Supabase's
own (per-project, not per-email) send limit -- confirmed live earlier that
Supabase's own limit is low enough to block real signups in a quiet burst,
but that's a blunt project-wide throttle, not protection against one
address being spammed with resends.

The dashboard calls /verification-send BEFORE calling Supabase's own
signUp()/resend() (see login/page.tsx) -- this endpoint never sends an
email itself, it only records the attempt and says whether another one is
allowed. Deliberately not tied to auth.users: at signup time the user may
not exist yet.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db, run_db

router = APIRouter(prefix="/v1/auth", tags=["auth"])

_MAX_SENDS_PER_WINDOW = 5
_WINDOW = timedelta(hours=24)


class VerificationSendIn(BaseModel):
    email: str


@router.post("/verification-send", status_code=204)
async def check_and_record_verification_send(body: VerificationSendIn) -> None:
    db = get_db()
    email = body.email.strip().lower()
    window_start = (datetime.now(timezone.utc) - _WINDOW).isoformat()

    count = (
        await run_db(
            lambda: db.table("verification_email_sends")
            .select("id", count="exact")
            .eq("email", email)
            .gte("created_at", window_start)
            .execute()
        )
    ).count or 0

    if count >= _MAX_SENDS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Too many verification emails sent to this address today. Please try again tomorrow.",
        )

    await run_db(lambda: db.table("verification_email_sends").insert({"email": email}).execute())
