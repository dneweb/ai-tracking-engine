"""
Organization members management router.

Role-Based Access Control (4-tier hierarchy):
  owner  (power 4) — full control, cannot be removed via this API
  admin  (power 3) — can invite/change/remove members and viewers
  member (power 2) — read-only access to member list
  viewer (power 1) — no access to member management

Permission map:
  members:read   → owner, admin, member
  members:write  → owner, admin
  members:delete → owner, admin

Hierarchy rules (enforced in each endpoint):
  1. Cannot promote anyone to owner via API.
  2. Admin cannot modify another admin (unless org_settings allows peer removal).
  3. Admin cannot touch the owner.
  4. Cannot remove the owner.
  5. Member/Viewer cannot perform any write operations.
"""

import os
import httpx
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.services.clerk_auth import (
    get_current_user,
    require_permission,
    ROLE_POWER,
)
from app.middleware.tenant import get_current_org_id
from app.services.database import _async_db
from app.services.audit_service import log_role_change

router = APIRouter()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_URL    = "https://api.clerk.com/v1"

# ── Pydantic models ───────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    role:  str   # canonical: admin | member | viewer


class ChangeRoleRequest(BaseModel):
    target_user_id: str
    new_role:       str  # canonical: admin | member | viewer


class RemoveMemberRequest(BaseModel):
    target_user_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type":  "application/json",
    }


def _normalize_role(raw: str) -> str:
    """Strip org: prefix and return canonical role."""
    return str(raw).replace("org:", "").strip().lower()


async def _get_org_membership(org_id: str, user_id: str) -> dict:
    """Fetch a specific user's Clerk org membership."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{CLERK_API_URL}/organizations/{org_id}/memberships",
            headers=_clerk_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        memberships = data if isinstance(data, list) else data.get("data", [])
        for m in memberships:
            if m.get("public_user_data", {}).get("user_id") == user_id or m.get("user_id") == user_id:
                return m
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this organisation",
        )


async def _get_org_settings(org_id: str) -> dict:
    """Fetch org-level settings from MongoDB."""
    try:
        settings = await _async_db["org_settings"].find_one({"org_id": org_id})
        return settings or {}
    except Exception as e:
        print(f"[members] get_org_settings error: {e}")
        return {}


def _action_from_transition(from_role: str, to_role: str) -> str:
    from_p = ROLE_POWER.get(_normalize_role(from_role), 0)
    to_p   = ROLE_POWER.get(_normalize_role(to_role),   0)
    if to_p > from_p:   return "promoted"
    if to_p < from_p:   return "demoted"
    return "role_updated"


# ── POST /org/invite  (admin | owner) ────────────────────────────────────────

@router.post("/invite")
async def invite_member(
    request:  InviteRequest,
    org_id:   str  = Depends(get_current_org_id),
    caller:   dict = Depends(require_permission("members:write")),
):
    """
    Invite a user to the organisation by email.
    Allowed roles for invitee: admin, member, viewer (not owner).
    Requires: admin or owner.
    """
    clean_role = _normalize_role(request.role)

    if clean_role not in ("admin", "member", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{clean_role}'. Must be: admin, member, or viewer.",
        )

    # Admins cannot invite other admins
    caller_role = caller.get("role", "member")
    if caller_role == "admin" and clean_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot invite other admins. Only owners can.",
        )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{CLERK_API_URL}/organizations/{org_id}/invitations",
                headers=_clerk_headers(),
                json={
                    "email_address": request.email,
                    "role":          f"org:{clean_role}",
                },
            )
            if resp.status_code == 409:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User is already a member of this organisation.",
                )
            resp.raise_for_status()

        await log_role_change(
            org_id=org_id,
            changed_by_user_id=caller["user_id"],
            changed_by_role=caller_role,
            target_user_id="pending",
            from_role="none",
            to_role=clean_role,
            action="invited",
        )

        return {"success": True, "message": f"Invitation sent to {request.email} as {clean_role}"}

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clerk API error while sending invitation: {str(e)}",
        )


# ── POST /org/change-role  (admin | owner) ────────────────────────────────────

@router.post("/change-role")
async def change_member_role(
    request: ChangeRoleRequest,
    org_id:  str  = Depends(get_current_org_id),
    caller:  dict = Depends(require_permission("members:write")),
):
    """
    Change a member's role.
    Enforces the strict hierarchy rules described in the module docstring.
    """
    caller_role = caller.get("role", "member")
    new_role    = _normalize_role(request.new_role)

    if new_role not in ("admin", "member", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target role must be: admin, member, or viewer. Use a separate ownership-transfer flow.",
        )

    try:
        membership    = await _get_org_membership(org_id, request.target_user_id)
        current_role  = _normalize_role(membership.get("role", "member"))

        # Rule 1: Cannot modify the owner
        if current_role == "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The organisation owner's role cannot be changed via this endpoint.",
            )

        # Rule 2: Admins cannot change another admin's role
        if caller_role == "admin" and current_role == "admin":
            org_settings = await _get_org_settings(org_id)
            if not org_settings.get("allow_admin_peer_removal", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admins cannot modify other admins. Enable 'allow_admin_peer_removal' in org settings.",
                )

        # Rule 3: Admins cannot promote to admin
        if caller_role == "admin" and new_role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners can promote members to admin.",
            )

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships/{request.target_user_id}",
                headers=_clerk_headers(),
                json={"role": f"org:{new_role}"},
            )
            resp.raise_for_status()

        action = _action_from_transition(current_role, new_role)
        await log_role_change(
            org_id=org_id,
            changed_by_user_id=caller["user_id"],
            changed_by_role=caller_role,
            target_user_id=request.target_user_id,
            from_role=current_role,
            to_role=new_role,
            action=action,
        )

        return {"success": True, "message": f"Role updated to '{new_role}'"}

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clerk API error: {str(e)}",
        )


# ── DELETE /org/remove-member  (admin | owner) ────────────────────────────────

@router.delete("/remove-member")
async def remove_member(
    body:    RemoveMemberRequest,
    org_id:  str  = Depends(get_current_org_id),
    caller:  dict = Depends(require_permission("members:delete")),
) -> dict:
    """
    Remove a member from the organisation.
    Cannot remove the owner. Admins cannot remove other admins.
    """
    caller_role = caller.get("role", "member")

    try:
        membership       = await _get_org_membership(org_id, body.target_user_id)
        target_role      = _normalize_role(membership.get("role", "member"))

        # Rule 1: Cannot remove owner
        if target_role == "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The organisation owner cannot be removed.",
            )

        # Rule 2: Admin cannot remove another admin
        if caller_role == "admin" and target_role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot remove other admins.",
            )

        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships/{body.target_user_id}",
                headers=_clerk_headers(),
            )
            resp.raise_for_status()

        await log_role_change(
            org_id=org_id,
            changed_by_user_id=caller["user_id"],
            changed_by_role=caller_role,
            target_user_id=body.target_user_id,
            from_role=target_role,
            to_role="removed",
            action="removed",
        )

        return {"success": True, "message": "Member removed successfully"}

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clerk API error: {str(e)}",
        )


# ── GET /org/audit-log  (admin | owner) ───────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(
    org_id:  str  = Depends(get_current_org_id),
    _caller: dict = Depends(require_permission("members:read")),
) -> dict:
    """
    Retrieve the last 50 role-change audit entries for this organisation.
    Scoped strictly to org_id — no cross-tenant leakage.
    """
    try:
        col = _async_db["org_role_audit"]
        cursor = col.find({"org_id": org_id}).sort("timestamp", -1).limit(50)
        entries = await cursor.to_list(length=50)

        for e in entries:
            e["_id"] = str(e.get("_id", ""))
            if isinstance(e.get("timestamp"), datetime):
                e["timestamp"] = e["timestamp"].isoformat()

        total = await col.count_documents({"org_id": org_id})
        return {"audit_log": entries, "total": total, "limit": 50}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit log: {str(e)}",
        )


# ── GET /org/list  (admin | owner | member) ───────────────────────────────────

@router.get("/list")
async def list_members(
    org_id:  str  = Depends(get_current_org_id),
    _caller: dict = Depends(require_permission("members:read")),
) -> dict:
    """
    List all members of the organisation.
    Accessible by member, admin, and owner. Viewers cannot access this.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships",
                headers=_clerk_headers(),
            )
            resp.raise_for_status()
            data        = resp.json()
            memberships = data if isinstance(data, list) else data.get("data", [])

        members = []
        for m in memberships:
            pub  = m.get("public_user_data", {})
            role = _normalize_role(m.get("role", "viewer"))
            members.append({
                "user_id":   pub.get("user_id") or m.get("user_id"),
                "email":     pub.get("identifier") or m.get("email_address"),
                "first_name": pub.get("first_name", ""),
                "last_name":  pub.get("last_name", ""),
                "role":      role,
                "joined_at": m.get("created_at"),
            })

        # Sort by role power descending (owners first)
        members.sort(key=lambda x: ROLE_POWER.get(x["role"], 0), reverse=True)

        return {"members": members, "total": len(members)}

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Clerk API error: {str(e)}",
        )
