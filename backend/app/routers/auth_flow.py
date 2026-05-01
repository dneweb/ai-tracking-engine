"""
Core authentication flow router for KnowledgeEngine (Nexus AI).

Manages:
  - org-check / org-available   (public, rate-limited)
  - register-owner              (public — new org creator)
  - register-member             (public — join existing org)
  - validate-signin             (public — post-Clerk sign-in validation)
  - approve-request             (JWT required — owner/admin)
  - members-list                (JWT required — owner/admin)
  - pending-requests            (JWT required — owner/admin)
  - remove-member               (JWT required — owner/admin)

All Clerk metadata writes go via the Clerk v1 REST API (PATCH /v1/users/{id}).
All org/user state lives in MongoDB collections:
  org_settings, users, join_requests.
"""

import os
import re
import httpx
from uuid import uuid4
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
from slowapi.util import get_remote_address
from app.services.rate_limiter import limiter

from app.services.clerk_auth import get_current_user
from app.services.database import _async_db

router = APIRouter()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_BASE = "https://api.clerk.com/v1"

# Limiter is now imported from app.services.rate_limiter

# Role → redirect map  (mirrors frontend roleRedirects.ts)
ROLE_REDIRECT: dict[str, str] = {
    "owner":  "/dashboard",
    "admin":  "/dashboard",
    "member": "/dashboard/ask",
    "viewer": "/dashboard",    # read-only: can view docs & analytics, cannot query
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def to_slug(name: str) -> str:
    s = name.lower().strip()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


async def _verify_clerk_user(clerk_id: str) -> None:
    """Verify that a Clerk user ID actually exists. Raises 400 / 502 on failure."""
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{CLERK_API_BASE}/users/{clerk_id}",
                headers=clerk_headers(),
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Clerk API unreachable: {exc}",
            )
    if r.status_code == 404:
        raise HTTPException(status_code=400, detail="Invalid user")
    if not r.is_success:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to verify user with Clerk (HTTP {r.status_code})",
        )


async def _set_clerk_metadata(clerk_id: str, metadata: dict) -> None:
    """PATCH Clerk public_metadata. Raises 502 on hard failure."""
    async with httpx.AsyncClient() as client:
        try:
            r = await client.patch(
                f"{CLERK_API_BASE}/users/{clerk_id}",
                headers=clerk_headers(),
                json={"public_metadata": metadata},
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Clerk API unreachable: {exc}",
            )
    if not r.is_success:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to update Clerk metadata (HTTP {r.status_code})",
        )


# ── ENDPOINT 1: Check org exists ─────────────────────────────────────────────

@router.get("/org-check")
@limiter.limit("10/minute")
async def org_check(request: Request, slug: str) -> dict:
    """NO auth required. Checks if an org with the given slug exists."""
    slug_clean = to_slug(slug)
    try:
        doc = await _async_db.org_settings.find_one({"org_slug": slug_clean})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    if doc:
        return {
            "exists": True,
            "org_id": doc["org_id"],
            "org_name": doc["org_name"],
            "org_slug": doc["org_slug"],
        }
    return {"exists": False}


# ── ENDPOINT 2: Check org slug available ─────────────────────────────────────

@router.get("/org-available")
@limiter.limit("10/minute")
async def org_available(
    request: Request,
    slug: str,
    clerk_id: Optional[str] = None,
) -> dict:
    """NO auth required. Returns {"available": bool}."""
    slug_clean = to_slug(slug)
    try:
        doc = await _async_db.org_settings.find_one({"org_slug": slug_clean})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    if doc is None:
        return {"available": True}

    # Slug exists — check if same user owns it (idempotent retry case)
    if clerk_id:
        owner = await _async_db.users.find_one({
            "clerk_id": clerk_id,
            "org_id": doc["org_id"],
            "role": "owner",
        })
        if owner:
            return {"available": True}

    return {"available": False}


# ── ENDPOINT 3: Register owner (new org) ─────────────────────────────────────

class RegisterOwnerRequest(BaseModel):
    clerk_id: str
    email: str
    full_name: str
    org_name: str
    org_slug: str


@router.post("/register-owner")
async def register_owner(body: RegisterOwnerRequest) -> dict:
    """NO auth required. Called after Clerk email verification for org creators."""

    slug_clean = to_slug(body.org_slug)

    # 1. Verify clerk user exists
    await _verify_clerk_user(body.clerk_id)

    # 2. Check slug — allow idempotent retry if same user already owns it
    existing = await _async_db.org_settings.find_one({"org_slug": slug_clean})
    if existing:
        existing_org_id = existing["org_id"]
        # Check if this exact user already owns this org (idempotent retry)
        existing_user = await _async_db.users.find_one({
            "clerk_id": body.clerk_id,
            "org_id": existing_org_id,
            "role": "owner",
        })
        if existing_user:
            # Idempotent — same user retrying after a partial failure. Return success.
            await _set_clerk_metadata(body.clerk_id, {
                "org_id": existing_org_id,
                "role": "owner",
                "status": "approved",
            })
            return {
                "success": True,
                "org_id": existing_org_id,
                "role": "owner",
                "redirect_to": "/dashboard",
            }
        # A *different* user owns this slug — truly taken
        raise HTTPException(status_code=409, detail="Organisation name already taken")

    # 3. Generate IDs
    org_id = f"org_{uuid4().hex[:16]}"
    now = datetime.utcnow()

    # 4. Check if this user already has ANY org (prevent orphan orgs from retries)
    existing_owner = await _async_db.users.find_one({
        "clerk_id": body.clerk_id,
        "role": "owner",
    })
    if existing_owner:
        # User already created a different org — clean up orphan if no other members
        old_org_id = existing_owner.get("org_id", "")
        member_count = await _async_db.users.count_documents({"org_id": old_org_id})
        if member_count <= 1:
            # Only this user — safe to clean up the orphaned org
            await _async_db.org_settings.delete_one({"org_id": old_org_id})
            await _async_db.users.delete_one({"clerk_id": body.clerk_id, "org_id": old_org_id})

    # 5. Insert org_settings
    try:
        await _async_db.org_settings.insert_one({
            "org_id": org_id,
            "org_name": body.org_name,
            "org_slug": slug_clean,
            "plan": "trial",
            "max_documents": 10,
            "max_members": 5,
            "max_queries_per_month": 100,
            "queries_used_this_month": 0,
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "allow_admin_peer_removal": False,
            "require_admin_approval": True,
            "require_user_approval": True,
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create organisation: {exc}")

    # 6. Insert user record
    try:
        await _async_db.users.insert_one({
            "clerk_id": body.clerk_id,
            "email": body.email,
            "full_name": body.full_name,
            "org_id": org_id,
            "role": "owner",
            "status": "approved",
            "approved_by": None,
            "approved_at": now,
            "created_at": now,
        })
    except Exception as exc:
        # Attempt rollback
        await _async_db.org_settings.delete_one({"org_id": org_id})
        raise HTTPException(status_code=500, detail=f"Failed to create user record: {exc}")

    # 7. Set Clerk public_metadata
    await _set_clerk_metadata(body.clerk_id, {
        "org_id": org_id,
        "role": "owner",
        "status": "approved",
    })

    return {
        "success": True,
        "org_id": org_id,
        "role": "owner",
        "redirect_to": "/dashboard",
    }


# ── ENDPOINT 4: Register member (join existing org) ──────────────────────────

class RegisterMemberRequest(BaseModel):
    clerk_id: str
    email: str
    full_name: str
    org_id: str
    requested_role: str  # "admin" or "member"


@router.post("/register-member")
async def register_member(body: RegisterMemberRequest) -> dict:
    """NO auth required. Called after Clerk email verification for org joiners."""

    if body.requested_role not in ("admin", "member"):
        raise HTTPException(
            status_code=400,
            detail="requested_role must be 'admin' or 'member'",
        )

    # 1. Verify clerk user exists
    await _verify_clerk_user(body.clerk_id)

    # 2. Check org exists
    org = await _async_db.org_settings.find_one({"org_id": body.org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    # 3. No duplicate user or join_request
    existing_user = await _async_db.users.find_one(
        {"clerk_id": body.clerk_id, "org_id": body.org_id}
    )
    existing_req = await _async_db.join_requests.find_one(
        {"clerk_id": body.clerk_id, "org_id": body.org_id}
    )
    if existing_user or existing_req:
        raise HTTPException(status_code=409, detail="You have already requested to join")

    # 4. Insert join_request
    now = datetime.utcnow()
    try:
        await _async_db.join_requests.insert_one({
            "clerk_id": body.clerk_id,
            "email": body.email,
            "full_name": body.full_name,
            "org_id": body.org_id,
            "requested_role": body.requested_role,
            "status": "pending",
            "reviewed_by": None,
            "reviewed_at": None,
            "rejection_reason": None,
            "created_at": now,
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create join request: {exc}")

    # 5. Set Clerk public_metadata
    await _set_clerk_metadata(body.clerk_id, {
        "org_id": body.org_id,
        "role": body.requested_role,
        "status": "pending",
    })

    return {
        "success": True,
        "status": "pending",
        "redirect_to": "/pending",
    }


# ── ENDPOINT 5: Validate sign-in ─────────────────────────────────────────────

class ValidateSigninRequest(BaseModel):
    clerk_id: str
    org_slug: str


@router.post("/validate-signin")
async def validate_signin(body: ValidateSigninRequest) -> dict:
    """NO auth required. Called after Clerk session is active to validate membership."""

    slug_clean = to_slug(body.org_slug)

    # 1. Resolve org
    org = await _async_db.org_settings.find_one({"org_slug": slug_clean})
    if not org:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "org_not_found",
                "message": "No organisation found with that name.",
            },
        )

    org_id: str = org["org_id"]

    # 2. Find in users collection
    print(f"[DEBUG] validate-signin: clerk_id='{body.clerk_id}', org_id='{org_id}'")
    user = await _async_db.users.find_one({"clerk_id": body.clerk_id, "org_id": org_id})

    if not user:
        print(f"[DEBUG] User not found in DB. Attempting self-healing for {body.clerk_id}...")
        # SELF-HEALING: Check if Clerk has this user registered for this org
        async with httpx.AsyncClient() as client:
            try:
                r = await client.get(
                    f"{CLERK_API_BASE}/users/{body.clerk_id}",
                    headers=clerk_headers(),
                )
                if r.status_code == 200:
                    clerk_user = r.json()
                    metadata = clerk_user.get("public_metadata", {})
                    # If Clerk says they belong to this org and are approved
                    if metadata.get("org_id") == org_id and metadata.get("status") == "approved":
                        # Restore the missing user record
                        user = {
                            "clerk_id": body.clerk_id,
                            "email": clerk_user.get("email_addresses", [{}])[0].get("email_address", ""),
                            "full_name": f"{clerk_user.get('first_name', '')} {clerk_user.get('last_name', '')}".strip(),
                            "org_id": org_id,
                            "role": metadata.get("role", "member"),
                            "status": "approved",
                            "created_at": datetime.utcnow(),
                        }
                        await _async_db.users.insert_one(user)
            except Exception:
                pass # Fall through to legacy check

    if not user:
        # Check join_requests (Legacy check)
        req = await _async_db.join_requests.find_one(
            {"clerk_id": body.clerk_id, "org_id": org_id}
        )
        if req:
            req_status = req.get("status", "")
            if req_status == "pending":
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "pending_approval",
                        "message": "Your account is pending approval.",
                    },
                )
            if req_status == "rejected":
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "rejected",
                        "message": "Your request was rejected.",
                    },
                )

        raise HTTPException(
            status_code=403,
            detail={
                "error": "not_member",
                "message": "You are not authorised for this organisation.",
            },
        )
    
    print(f"[DEBUG] validate-signin: SUCCESS for {body.clerk_id} role={user.get('role')}")

    # 3. Check user status
    if user.get("status") == "pending":
        raise HTTPException(
            status_code=403,
            detail={
                "error": "pending_approval",
                "message": "Your account is pending approval.",
            },
        )

    # 4. Approved — return redirect
    role: str = user.get("role", "member")
    return {
        "success": True,
        "org_id": org_id,
        "org_name": org["org_name"],
        "role": role,
        "redirect_to": ROLE_REDIRECT.get(role, "/dashboard"),
    }


# ── ENDPOINT 6: Approve / reject join request ─────────────────────────────────

class ApproveRequestBody(BaseModel):
    request_id: str
    action: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None


@router.post("/approve-request")
async def approve_request(
    body: ApproveRequestBody,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """JWT required. Owner or admin can approve/reject pending join requests."""

    if body.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="action must be 'approved' or 'rejected'")

    caller_clerk_id: str = current_user["user_id"]

    # Resolve caller from users collection
    caller = await _async_db.users.find_one(
        {"clerk_id": caller_clerk_id, "status": "approved"}
    )
    if not caller:
        raise HTTPException(
            status_code=403,
            detail="You are not an approved member of any organisation",
        )

    caller_role: str = caller.get("role", "member")
    org_id: str = caller.get("org_id", "")

    if caller_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can approve requests")

    # Resolve the join_request
    try:
        obj_id = ObjectId(body.request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request_id")

    join_req = await _async_db.join_requests.find_one(
        {"_id": obj_id, "org_id": org_id, "status": "pending"}
    )
    if not join_req:
        raise HTTPException(status_code=404, detail="Join request not found")

    requested_role: str = join_req.get("requested_role", "member")

    # Permission: only owner can approve admin requests
    if requested_role == "admin" and caller_role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Only the owner can approve admin role requests",
        )

    now = datetime.utcnow()

    if body.action == "approved":
        # Insert into users
        try:
            await _async_db.users.insert_one({
                "clerk_id": join_req["clerk_id"],
                "email": join_req["email"],
                "full_name": join_req["full_name"],
                "org_id": org_id,
                "role": requested_role,
                "status": "approved",
                "approved_by": caller_clerk_id,
                "approved_at": now,
                "created_at": now,
            })
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user record: {exc}",
            )

        # Update Clerk metadata (non-fatal if Clerk is down)
        try:
            await _set_clerk_metadata(join_req["clerk_id"], {
                "org_id": org_id,
                "role": requested_role,
                "status": "approved",
            })
        except HTTPException:
            pass

        # Mark join_request approved
        await _async_db.join_requests.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "status": "approved",
                    "reviewed_by": caller_clerk_id,
                    "reviewed_at": now,
                }
            },
        )

    else:  # rejected
        # Update Clerk metadata (non-fatal)
        try:
            await _set_clerk_metadata(join_req["clerk_id"], {"status": "rejected"})
        except HTTPException:
            pass

        await _async_db.join_requests.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejection_reason": body.rejection_reason,
                    "reviewed_by": caller_clerk_id,
                    "reviewed_at": now,
                }
            },
        )

    return {"success": True}


# ── ENDPOINT 7: List approved members ────────────────────────────────────────

@router.get("/members-list")
async def members_list(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """JWT required. Owner or admin only."""

    caller_clerk_id: str = current_user["user_id"]
    org_id: str = str(current_user.get("org_id") or "").strip()

    if not org_id:
        raise HTTPException(status_code=403, detail="No organization context found in token")

    # Verify caller is an approved member of THIS specific org
    caller = await _async_db.users.find_one(
        {"clerk_id": caller_clerk_id, "org_id": org_id, "status": "approved"}
    )
    if not caller:
        raise HTTPException(
            status_code=403, 
            detail=f"User is not an approved member of organization '{org_id}'"
        )

    caller_role: str = caller.get("role", "member")
    if caller_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owner or admin access required")

    cursor = _async_db.users.find(
        {"org_id": org_id, "status": "approved"},
        {
            "_id": 0,
            "clerk_id": 1,
            "email": 1,
            "full_name": 1,
            "role": 1,
            "status": 1,
            "approved_at": 1,
            "created_at": 1,
        },
    ).sort("created_at", 1)

    members = []
    async for doc in cursor:
        for field in ("approved_at", "created_at"):
            if isinstance(doc.get(field), datetime):
                doc[field] = doc[field].isoformat()
        members.append(doc)

    return {"members": members, "total": len(members)}


# ── ENDPOINT 8: List pending join requests ────────────────────────────────────

@router.get("/pending-requests")
async def pending_requests(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """JWT required. Owner or admin only."""

    caller_clerk_id: str = current_user["user_id"]
    org_id: str = str(current_user.get("org_id") or "").strip()

    if not org_id:
        raise HTTPException(status_code=403, detail="No organization context found in token")

    # Verify caller is an approved member of THIS specifically org
    caller = await _async_db.users.find_one(
        {"clerk_id": caller_clerk_id, "org_id": org_id, "status": "approved"}
    )
    if not caller:
        raise HTTPException(status_code=403, detail="Not an approved member of this org")

    caller_role: str = caller.get("role", "member")
    if caller_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owner or admin access required")

    cursor = _async_db.join_requests.find(
        {"org_id": org_id, "status": "pending"},
        {
            "clerk_id": 1,
            "email": 1,
            "full_name": 1,
            "requested_role": 1,
            "created_at": 1,
        },
    ).sort("created_at", 1)

    results: list[dict] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        results.append(doc)

    return {"requests": results, "total": len(results)}


# ── ENDPOINT 9: Remove member ─────────────────────────────────────────────────

class RemoveMemberBody(BaseModel):
    target_clerk_id: str


@router.delete("/remove-member")
async def remove_member(
    body: RemoveMemberBody,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """JWT required. Owner can remove admin/member. Admin can remove member only."""

    caller_clerk_id: str = current_user["user_id"]
    caller = await _async_db.users.find_one(
        {"clerk_id": caller_clerk_id, "status": "approved"}
    )
    if not caller:
        raise HTTPException(status_code=403, detail="Not an approved member")

    org_id: str = caller.get("org_id", "")
    caller_role: str = caller.get("role", "member")

    if caller_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Find target in same org
    target = await _async_db.users.find_one(
        {"clerk_id": body.target_clerk_id, "org_id": org_id}
    )
    if not target:
        raise HTTPException(
            status_code=404,
            detail="Member not found in your organisation",
        )

    target_role: str = target.get("role", "member")

    # Hierarchy checks
    if target_role == "owner":
        raise HTTPException(
            status_code=403,
            detail="Cannot remove the organisation owner",
        )
    if caller_role == "admin" and target_role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admins cannot remove other admins",
        )

    # Delete from users
    await _async_db.users.delete_one(
        {"clerk_id": body.target_clerk_id, "org_id": org_id}
    )

    # Clear Clerk public_metadata (non-fatal)
    try:
        await _set_clerk_metadata(body.target_clerk_id, {})
    except HTTPException:
        pass

    return {"success": True}