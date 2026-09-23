"""Shared workspaces: who's in a workspace, what they can do, and how
people join (Settings > Members in the dashboard, and /join/<code>).

Roles:
  owner   one per workspace. Everything below, plus changing roles,
          removing admins and handing ownership to someone else.
  admin   manages how people join and removes members.
  member  uses the workspace; sees who else is in it.

Joining works two ways, both through /join/<join_code>:
  - the invite link adds ?key=<link_token>; it joins in one click
  - the plain link asks for the workspace password
The token and the password hash live in workspace_invites, which only the
service role can read, so members never see either.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.db import get_db, run_db
from app.models.schemas import WorkspaceOut
from app.security import CurrentUser, get_current_user

router = APIRouter(tags=["members"])

ROLE_ORDER = {"owner": 0, "admin": 1, "member": 2}
MIN_PASSWORD = 6
MAX_FAILED_JOINS = 10
FAILED_JOIN_WINDOW = timedelta(minutes=15)
_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o, 1/l/i
_PBKDF2_ROUNDS = 310_000


# ---------- helpers ----------

_SETUP_HINT = (
    "Inviting people needs a one-time database update. Run supabase/shared_workspaces.sql "
    "in the Supabase SQL editor, then try again."
)


async def _db(fn):
    """run_db for the invite tables, turning 'table not found' (the SQL file
    hasn't been run on this project yet) into a clear message."""
    try:
        return await run_db(fn)
    except Exception as exc:  # noqa: BLE001 -- PostgREST raises its own APIError type
        text = str(exc)
        if "workspace_invites" in text or "workspace_join_attempts" in text:
            raise HTTPException(status_code=503, detail=_SETUP_HINT) from exc
        raise


def _new_join_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(10))


def _new_link_token() -> str:
    return secrets.token_urlsafe(24)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        algo, rounds, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds))
    return hmac.compare_digest(digest.hex(), digest_hex)


async def _role_of(db, workspace_id: str, user_id: str) -> str | None:
    res = await run_db(
        lambda: db.table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0]["role"] if res.data else None


async def _require_role(db, workspace_id: str, user: CurrentUser, allowed: set[str]) -> str:
    role = await _role_of(db, workspace_id, user.id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role in this workspace can't do that.")
    return role


async def _invite_row(db, workspace_id: str) -> dict:
    """The workspace's invite settings, created on first use (joining starts
    off: no invite link and no password until an admin turns one on)."""
    res = await _db(lambda: db.table("workspace_invites").select("*").eq("workspace_id", workspace_id).execute())
    if res.data:
        return res.data[0]
    row = {"workspace_id": workspace_id, "join_code": _new_join_code(), "link_token": None, "password_hash": None}
    return (await _db(lambda: db.table("workspace_invites").insert(row).execute())).data[0]


async def _update_invite(db, workspace_id: str, changes: dict) -> dict:
    changes = {**changes, "updated_at": datetime.now(timezone.utc).isoformat()}
    return (
        await _db(lambda: db.table("workspace_invites").update(changes).eq("workspace_id", workspace_id).execute())
    ).data[0]


def _invite_out(row: dict) -> dict:
    return {
        "join_code": row["join_code"],
        "link_token": row.get("link_token"),
        "has_password": bool(row.get("password_hash")),
    }


async def _people(db, user_ids: list[str]) -> dict[str, dict]:
    """Email and display name for each user id, from Supabase Auth."""
    out: dict[str, dict] = {}
    for uid in user_ids:
        try:
            found = await run_db(lambda uid=uid: db.auth.admin.get_user_by_id(uid))
            u = found.user if found else None
        except Exception:  # noqa: BLE001 -- a deleted or unreadable user just shows without details
            u = None
        meta = (getattr(u, "user_metadata", None) or {}) if u else {}
        out[uid] = {"email": getattr(u, "email", None) if u else None, "name": (meta.get("full_name") or "").strip() or None}
    return out


# ---------- members ----------


@router.get("/v1/workspaces/{workspace_id}/members")
async def list_members(workspace_id: str, user: CurrentUser = Depends(get_current_user)) -> list[dict]:
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner", "admin", "member"})
    rows = (
        await run_db(
            lambda: db.table("workspace_members").select("user_id, role, created_at").eq("workspace_id", workspace_id).execute()
        )
    ).data or []
    people = await _people(db, [r["user_id"] for r in rows])
    members = [
        {
            "user_id": r["user_id"],
            "role": r["role"],
            "joined_at": r.get("created_at"),
            "email": people[r["user_id"]]["email"],
            "name": people[r["user_id"]]["name"],
            "is_me": r["user_id"] == user.id,
        }
        for r in rows
    ]
    members.sort(key=lambda m: (ROLE_ORDER.get(m["role"], 9), m["joined_at"] or ""))
    return members


class RoleIn(BaseModel):
    role: str = Field(pattern="^(admin|member)$")


@router.patch("/v1/workspaces/{workspace_id}/members/{member_id}")
async def change_role(workspace_id: str, member_id: str, body: RoleIn, user: CurrentUser = Depends(get_current_user)) -> dict:
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner"})
    target = await _role_of(db, workspace_id, member_id)
    if target is None:
        raise HTTPException(status_code=404, detail="That person isn't in this workspace.")
    if target == "owner":
        raise HTTPException(status_code=400, detail="Transfer ownership to change the owner's role.")
    await run_db(
        lambda: db.table("workspace_members")
        .update({"role": body.role})
        .eq("workspace_id", workspace_id)
        .eq("user_id", member_id)
        .execute()
    )
    return {"user_id": member_id, "role": body.role}


@router.delete("/v1/workspaces/{workspace_id}/members/{member_id}", status_code=204, response_class=Response)
async def remove_member(workspace_id: str, member_id: str, user: CurrentUser = Depends(get_current_user)) -> Response:
    """Removes someone, or with your own id, leaves the workspace."""
    db = get_db()
    my_role = await _require_role(db, workspace_id, user, {"owner", "admin", "member"})
    if member_id == user.id:
        if my_role == "owner":
            raise HTTPException(status_code=400, detail="Transfer ownership to someone else before you leave.")
    else:
        target = await _role_of(db, workspace_id, member_id)
        if target is None:
            raise HTTPException(status_code=404, detail="That person isn't in this workspace.")
        allowed = my_role == "owner" or (my_role == "admin" and target == "member")
        if not allowed:
            raise HTTPException(status_code=403, detail="Your role in this workspace can't remove them.")
    await run_db(
        lambda: db.table("workspace_members").delete().eq("workspace_id", workspace_id).eq("user_id", member_id).execute()
    )
    return Response(status_code=204)


class TransferIn(BaseModel):
    user_id: str


@router.post("/v1/workspaces/{workspace_id}/transfer")
async def transfer_ownership(workspace_id: str, body: TransferIn, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Makes another member the owner. The previous owner stays on as an admin."""
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner"})
    if body.user_id == user.id:
        raise HTTPException(status_code=400, detail="You already own this workspace.")
    if await _role_of(db, workspace_id, body.user_id) is None:
        raise HTTPException(status_code=404, detail="That person isn't in this workspace.")
    await run_db(lambda: db.table("workspaces").update({"owner_id": body.user_id}).eq("id", workspace_id).execute())
    await run_db(
        lambda: db.table("workspace_members")
        .update({"role": "owner"})
        .eq("workspace_id", workspace_id)
        .eq("user_id", body.user_id)
        .execute()
    )
    await run_db(
        lambda: db.table("workspace_members")
        .update({"role": "admin"})
        .eq("workspace_id", workspace_id)
        .eq("user_id", user.id)
        .execute()
    )
    return {"owner_id": body.user_id}


# ---------- invite settings ----------


@router.get("/v1/workspaces/{workspace_id}/invite")
async def get_invite(workspace_id: str, user: CurrentUser = Depends(get_current_user)) -> dict:
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner", "admin"})
    return _invite_out(await _invite_row(db, workspace_id))


class InviteLinkIn(BaseModel):
    enabled: bool


@router.post("/v1/workspaces/{workspace_id}/invite/link")
async def set_invite_link(workspace_id: str, body: InviteLinkIn, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Turning the invite link on always issues a new one, so this doubles
    as 'reset link': the old one stops working."""
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner", "admin"})
    await _invite_row(db, workspace_id)
    row = await _update_invite(db, workspace_id, {"link_token": _new_link_token() if body.enabled else None})
    return _invite_out(row)


class InvitePasswordIn(BaseModel):
    password: str | None = None


@router.put("/v1/workspaces/{workspace_id}/invite/password")
async def set_invite_password(workspace_id: str, body: InvitePasswordIn, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Sets the workspace password for the plain link, or with null turns
    joining by password off."""
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner", "admin"})
    if body.password is not None and len(body.password) < MIN_PASSWORD:
        raise HTTPException(status_code=400, detail=f"Use at least {MIN_PASSWORD} characters.")
    await _invite_row(db, workspace_id)
    row = await _update_invite(db, workspace_id, {"password_hash": hash_password(body.password) if body.password else None})
    return _invite_out(row)


@router.post("/v1/workspaces/{workspace_id}/invite/code")
async def reset_join_code(workspace_id: str, user: CurrentUser = Depends(get_current_user)) -> dict:
    """A new workspace link. Both old links stop working."""
    db = get_db()
    await _require_role(db, workspace_id, user, {"owner", "admin"})
    row = await _invite_row(db, workspace_id)
    changes = {"join_code": _new_join_code()}
    if row.get("link_token"):
        changes["link_token"] = _new_link_token()
    return _invite_out(await _update_invite(db, workspace_id, changes))


# ---------- joining ----------


async def _invite_by_code(db, code: str) -> dict:
    res = await _db(lambda: db.table("workspace_invites").select("*").eq("join_code", code.strip().lower()).execute())
    if not res.data:
        raise HTTPException(status_code=404, detail="That workspace link isn't valid. Ask for a new one.")
    return res.data[0]


def _key_matches(row: dict, key: str | None) -> bool:
    token = row.get("link_token")
    return bool(key and token and hmac.compare_digest(key, token))


@router.get("/v1/join/{code}")
async def preview_join(code: str, key: str | None = None, user: CurrentUser = Depends(get_current_user)) -> dict:
    """What the join page shows before anyone commits: the workspace's name
    and whether this link needs the password."""
    db = get_db()
    row = await _invite_by_code(db, code)
    ws = (await run_db(lambda: db.table("workspaces").select("id, name").eq("id", row["workspace_id"]).execute())).data
    if not ws:
        raise HTTPException(status_code=404, detail="That workspace no longer exists.")
    members = (
        await run_db(lambda: db.table("workspace_members").select("user_id").eq("workspace_id", row["workspace_id"]).execute())
    ).data or []
    return {
        "workspace_id": ws[0]["id"],
        "workspace_name": ws[0]["name"],
        "member_count": len(members),
        "already_member": any(m["user_id"] == user.id for m in members),
        "key_valid": _key_matches(row, key),
        "accepts_password": bool(row.get("password_hash")),
    }


class JoinIn(BaseModel):
    key: str | None = None
    password: str | None = None


@router.post("/v1/join/{code}", response_model=WorkspaceOut)
async def join_workspace(code: str, body: JoinIn, user: CurrentUser = Depends(get_current_user)) -> WorkspaceOut:
    db = get_db()
    row = await _invite_by_code(db, code)
    ws_id = row["workspace_id"]

    async def workspace() -> dict:
        ws = (await run_db(lambda: db.table("workspaces").select("*").eq("id", ws_id).execute())).data
        if not ws:
            raise HTTPException(status_code=404, detail="That workspace no longer exists.")
        return ws[0]

    if await _role_of(db, ws_id, user.id) is not None:
        return {**await workspace(), "role": await _role_of(db, ws_id, user.id)}

    since = (datetime.now(timezone.utc) - FAILED_JOIN_WINDOW).isoformat()
    recent = (
        await _db(
            lambda: db.table("workspace_join_attempts").select("id").eq("user_id", user.id).gte("created_at", since).execute()
        )
    ).data or []
    if len(recent) >= MAX_FAILED_JOINS:
        raise HTTPException(status_code=429, detail="Too many wrong passwords. Wait 15 minutes and try again.")

    if not (_key_matches(row, body.key) or (body.password and verify_password(body.password, row.get("password_hash")))):
        if not row.get("link_token") and not row.get("password_hash"):
            raise HTTPException(status_code=403, detail="This workspace isn't accepting new members right now.")
        await _db(
            lambda: db.table("workspace_join_attempts").insert({"user_id": user.id, "join_code": row["join_code"]}).execute()
        )
        if body.key and not body.password:
            raise HTTPException(status_code=403, detail="This invite link has been reset. Ask for a new one, or use the workspace password.")
        raise HTTPException(status_code=403, detail="That password isn't right.")

    await run_db(lambda: db.table("workspace_members").insert({"workspace_id": ws_id, "user_id": user.id, "role": "member"}).execute())
    return {**await workspace(), "role": "member"}
