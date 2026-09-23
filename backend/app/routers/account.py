"""Deleting your own account (Settings > Account in the dashboard).

Name and password changes don't come through here: the dashboard makes
those straight to Supabase Auth with the user's own session. Deletion needs
the service role, so it lives on the backend:

  1. The user's password is checked again with Supabase Auth, so a stolen or
     forgotten-open session alone can't delete an account.
  2. Each workspace the user owns either passes to another member (an admin
     first, else the longest-standing member) or, with no one else in it, is
     erased for good along with its audit log (purge_workspace() in
     supabase/schema.sql; it's the one path past the append-only guard).
     Any live Whop subscription on an erased workspace is cancelled first,
     and before anything is deleted, so a billing failure leaves the account
     untouched.
  3. The Supabase Auth user is deleted. Their memberships in other people's
     workspaces go with it; "created by" references there are set to null.
"""

import asyncio
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.config import get_settings
from app.db import get_db, run_db
from app.security import CurrentUser, get_current_user
from app.services.whop_client import cancel_membership

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/account", tags=["account"])

_NIL_UUID = "00000000-0000-0000-0000-000000000000"
_ENDED_STATUSES = {"canceled", "cancelled", "expired", "completed"}
_SETUP_HINT = (
    "Account deletion needs a one-time database update. Run supabase/account_deletion.sql "
    "in the Supabase SQL editor, then try again."
)


class AccountDeleteIn(BaseModel):
    password: str


def _verify_password(email: str, password: str) -> str | None:
    """Returns the user id Supabase Auth signs in with these credentials, or
    None if the password is wrong. Raises on anything else (rate limited,
    Auth unreachable) so a failure there is never mistaken for a match."""
    settings = get_settings()
    resp = httpx.post(
        f"{settings.supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": settings.supabase_service_role_key},
        json={"email": email, "password": password},
        timeout=15.0,
    )
    if resp.status_code == 200:
        return (resp.json().get("user") or {}).get("id")
    if resp.status_code in (400, 401):
        return None
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="Too many attempts. Wait a minute and try again.")
    resp.raise_for_status()
    return None


def _successor(members: list[dict]) -> dict | None:
    """Who inherits a workspace: an admin first, else the member who joined
    earliest. Ties break on user id so the choice is deterministic."""
    if not members:
        return None
    rank = {"owner": 0, "admin": 0, "member": 1}
    return sorted(members, key=lambda m: (rank.get(m.get("role"), 2), m.get("created_at") or "", m["user_id"]))[0]


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_account(body: AccountDeleteIn, user: CurrentUser = Depends(get_current_user)) -> Response:
    db = get_db()

    email = user.email
    if not email:
        found = await run_db(lambda: db.auth.admin.get_user_by_id(user.id))
        email = found.user.email if found and found.user else None
    if not email or not body.password:
        raise HTTPException(status_code=403, detail="That password isn't right.")
    if await asyncio.to_thread(_verify_password, email, body.password) != user.id:
        raise HTTPException(status_code=403, detail="That password isn't right.")

    # Make sure the database side is in place before touching anything:
    # purging the nil workspace deletes nothing.
    try:
        await run_db(lambda: db.rpc("purge_workspace", {"ws": _NIL_UUID}).execute())
    except Exception as exc:  # noqa: BLE001 -- PostgREST raises its own APIError type
        logger.warning("purge_workspace unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=_SETUP_HINT) from exc

    owned = (await run_db(lambda: db.table("workspaces").select("id").eq("owner_id", user.id).execute())).data or []

    transfers: list[tuple[str, dict]] = []
    purges: list[str] = []
    for ws in owned:
        members = (
            await run_db(
                lambda ws_id=ws["id"]: db.table("workspace_members")
                .select("user_id, role, created_at")
                .eq("workspace_id", ws_id)
                .execute()
            )
        ).data or []
        heir = _successor([m for m in members if m["user_id"] != user.id])
        if heir:
            transfers.append((ws["id"], heir))
        else:
            purges.append(ws["id"])

    # Cancel billing on every workspace about to be erased before erasing any.
    for ws_id in purges:
        subs = (
            await run_db(
                lambda ws_id=ws_id: db.table("subscriptions")
                .select("whop_membership_id, status")
                .eq("workspace_id", ws_id)
                .execute()
            )
        ).data or []
        for sub in subs:
            membership_id = sub.get("whop_membership_id")
            if membership_id and (sub.get("status") or "").lower() not in _ENDED_STATUSES:
                try:
                    await asyncio.to_thread(cancel_membership, membership_id)
                except Exception as exc:  # noqa: BLE001
                    logger.error("Couldn't cancel Whop membership %s: %s", membership_id, exc)
                    raise HTTPException(
                        status_code=502,
                        detail="Couldn't cancel your subscription, so nothing was deleted. Try again in a minute.",
                    ) from exc

    for ws_id, heir in transfers:
        await run_db(lambda ws_id=ws_id, heir=heir: db.table("workspaces").update({"owner_id": heir["user_id"]}).eq("id", ws_id).execute())
        await run_db(
            lambda ws_id=ws_id, heir=heir: db.table("workspace_members")
            .update({"role": "owner"})
            .eq("workspace_id", ws_id)
            .eq("user_id", heir["user_id"])
            .execute()
        )

    for ws_id in purges:
        await run_db(lambda ws_id=ws_id: db.rpc("purge_workspace", {"ws": ws_id}).execute())

    try:
        await run_db(lambda: db.auth.admin.delete_user(user.id))
    except Exception as exc:  # noqa: BLE001
        logger.error("Deleting auth user %s failed: %s", user.id, exc)
        raise HTTPException(status_code=500, detail="Your workspaces were removed, but the account itself couldn't be deleted. " + _SETUP_HINT) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
