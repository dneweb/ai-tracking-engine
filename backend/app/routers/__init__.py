"""
Organization members management router.
Handles member invitations, role changes, removals, and audit logging.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import jwt as pyjwt

from app.services.clerk_auth import get_current_user
from app.middleware.tenant import get_current_org_id
from app.services.database import _async_db
from app.services.audit_service import log_role_change

load_dotenv = __import__('dotenv').load_dotenv
load_dotenv()

router = APIRouter()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_URL = "https://api.clerk.com/v1"

# ── Pydantic Request Models ──────────────────────────────────────────────
class InviteRequest(BaseModel):
    email: str
    role: str  # must be one of: org:admin, org:member, org:viewer


class ChangeRoleRequest(BaseModel):
    target_user_id: str
    new_role: str


class RemoveMemberRequest(BaseModel):
    target_user_id: str


class AuditLogEntry(BaseModel):
    org_id: str
    changed_by_user_id: str
    changed_by_role: str
    target_user_id: str
    from_role: str
    to_role: str
    action: str
    timestamp: str
    reason: Optional[str] = None


# ── Permission & Role Helpers ───────────────────────────────────────────

async def require_permission(permission: str):
    """Dependency to check if user has required permission"""
    async def _require_permission(current_user: dict = Depends(get_current_user)) -> dict:
        # Extract permissions from JWT
        # For now, use simple role-based permission mapping
        permissions_map = {
            "org:owner": ["members:read", "members:write", "members:delete"],
            "org:admin": ["members:read", "members:write", "members:delete"],
            "org:member": [],
            "org:viewer": [],
        }
        
        user_role = current_user.get("org_role", "org:member")
        user_permissions = permissions_map.get(user_role, [])
        
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        
        return current_user
    
    return _require_permission


async def get_current_org_role(
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(get_current_user)
) -> str:
    """Get the current user's role in the organization"""
    # Extract from JWT public_metadata
    try:
        # The role is stored in public_metadata.org_role
        org_role = current_user.get("org_role", "org:member")
        return org_role
    except Exception:
        return "org:member"


async def _get_clerk_headers() -> dict:
    """Get headers for Clerk API calls"""
    return {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def _get_org_membership(org_id: str, user_id: str) -> dict:
    """Fetch Clerk org membership for a user"""
    async with httpx.AsyncClient() as client:
        try:
            headers = await _get_clerk_headers()
            # Get all memberships for the org
            response = await client.get(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships",
                headers=headers,
            )
            response.raise_for_status()
            memberships = response.json()
            
            # Find the specific user's membership
            for membership in memberships:
                if membership.get("user_id") == user_id:
                    return membership
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in organisation"
            )
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Clerk API error: {str(e)}"
            )


async def _determine_action(from_role: str, to_role: str) -> str:
    """Determine the action based on role transition"""
    role_power = {
        "none": 0,
        "org:viewer": 1,
        "org:member": 2,
        "org:admin": 3,
        "org:owner": 4,
    }
    
    from_power = role_power.get(from_role, 0)
    to_power = role_power.get(to_role, 0)
    
    if to_power > from_power:
        return "promoted"
    elif to_power < from_power:
        return "demoted"
    else:
        return "role_updated"


async def _get_org_settings(org_id: str) -> dict:
    """Fetch org_settings from MongoDB"""
    try:
        org_settings = _async_db["org_settings"]
        settings = await org_settings.find_one({"org_id": org_id})
        return settings or {}
    except Exception as e:
        print(f"Error fetching org_settings: {e}")
        return {}


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/invite")
async def invite_member(
    request: InviteRequest,
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(lambda: require_permission("members:write")),
):
    """
    Invite a user to the organisation.
    Requires: members:write permission
    """
    # Validate role is not org:owner
    if request.role == "org:owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ownership transfer not allowed via this endpoint"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            headers = await _get_clerk_headers()
            
            # Call Clerk to create org invitation
            response = await client.post(
                f"{CLERK_API_URL}/organizations/{org_id}/invitations",
                headers=headers,
                json={
                    "email_address": request.email,
                    "role": request.role,
                }
            )
            
            if response.status_code == 409:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already a member of this organisation"
                )
            
            response.raise_for_status()
            invitation = response.json()
            
            # Log the role change
            await log_role_change(
                org_id=org_id,
                changed_by_user_id=current_user.get("user_id"),
                changed_by_role=await get_current_org_role(org_id, current_user),
                target_user_id=invitation.get("created_user_id", "pending"),
                from_role="none",
                to_role=request.role,
                action="invited",
                reason=None
            )
            
            return {
                "success": True,
                "message": "Invite sent successfully"
            }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}"
        )


@router.post("/change-role")
async def change_member_role(
    request: ChangeRoleRequest,
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(lambda: require_permission("members:write")),
):
    """
    Change a member's role in the organisation.
    Requires: members:write permission
    Enforces role hierarchy.
    """
    try:
        # Get current membership of target user
        membership = await _get_org_membership(org_id, request.target_user_id)
        current_role = membership.get("role")
        changed_by_role = await get_current_org_role(org_id, current_user)
        
        # HIERARCHY CHECKS
        
        # Check 1: Cannot promote to owner
        if request.new_role == "org:owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ownership transfer not allowed via this endpoint"
            )
        
        # Check 2: Admin cannot change another admin's role (if allow_admin_peer_removal is False)
        if changed_by_role == "org:admin" and current_role == "org:admin":
            org_settings = await _get_org_settings(org_id)
            if org_settings.get("allow_admin_peer_removal", False) is False:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admins cannot change the role of other admins"
                )
        
        # Check 3: Admin cannot modify the owner
        if changed_by_role == "org:admin" and current_role == "org:owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot modify the owner"
            )
        
        # Call Clerk to update membership role
        async with httpx.AsyncClient() as client:
            headers = await _get_clerk_headers()
            
            response = await client.patch(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships/{request.target_user_id}",
                headers=headers,
                json={"role": request.new_role}
            )
            
            response.raise_for_status()
            updated_membership = response.json()
            
            # Determine action (promoted/demoted/updated)
            action = await _determine_action(current_role, request.new_role)
            
            # Log the role change
            await log_role_change(
                org_id=org_id,
                changed_by_user_id=current_user.get("user_id"),
                changed_by_role=changed_by_role,
                target_user_id=request.target_user_id,
                from_role=current_role,
                to_role=request.new_role,
                action=action,
                reason=None
            )
            
            return {
                "success": True,
                "message": "Role updated successfully"
            }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )


@router.delete("/remove")
async def remove_member(
    request: RemoveMemberRequest,
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(lambda: require_permission("members:delete")),
):
    """
    Remove a member from the organisation.
    Requires: members:delete permission
    Enforces hierarchy checks.
    """
    try:
        # Get current membership of target user
        membership = await _get_org_membership(org_id, request.target_user_id)
        target_current_role = membership.get("role")
        changed_by_role = await get_current_org_role(org_id, current_user)
        
        # HIERARCHY CHECKS
        
        # Check 1: Cannot remove the owner
        if target_current_role == "org:owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot remove the organisation owner"
            )
        
        # Check 2: Admin cannot remove another admin
        if changed_by_role == "org:admin" and target_current_role == "org:admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot remove other admins"
            )
        
        # Call Clerk to remove membership
        async with httpx.AsyncClient() as client:
            headers = await _get_clerk_headers()
            
            response = await client.delete(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships/{request.target_user_id}",
                headers=headers
            )
            
            response.raise_for_status()
            
            # Log the removal
            await log_role_change(
                org_id=org_id,
                changed_by_user_id=current_user.get("user_id"),
                changed_by_role=changed_by_role,
                target_user_id=request.target_user_id,
                from_role=target_current_role,
                to_role="removed",
                action="removed",
                reason=None
            )
            
            return {
                "success": True,
                "message": "Member removed successfully"
            }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove member: {str(e)}"
        )


@router.get("/audit-log")
async def get_audit_log(
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(lambda: require_permission("members:read")),
) -> dict:
    """
    Get the audit log for role changes in the organisation.
    Requires: members:read permission
    Returns: Last 50 entries, sorted by timestamp descending
    """
    try:
        org_role_audit = _async_db["org_role_audit"]
        
        # Query audit log for this org, sorted by timestamp descending, limit 50
        cursor = org_role_audit.find(
            {"org_id": org_id}
        ).sort("timestamp", -1).limit(50)
        
        audit_entries = await cursor.to_list(length=50)
        
        # Convert _id to string for JSON serialization
        for entry in audit_entries:
            entry["_id"] = str(entry.get("_id", ""))
            # Convert timestamp to ISO string if it's a datetime object
            if isinstance(entry.get("timestamp"), datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
        
        total = await org_role_audit.count_documents({"org_id": org_id})
        
        return {
            "audit_log": audit_entries,
            "total": total,
            "limit": 50
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit log: {str(e)}"
        )


@router.get("/list")
async def list_members(
    org_id: str = Depends(get_current_org_id),
    current_user: dict = Depends(lambda: require_permission("members:read")),
) -> dict:
    """
    Get list of all members in the organisation.
    Requires: members:read permission
    """
    try:
        async with httpx.AsyncClient() as client:
            headers = await _get_clerk_headers()
            
            # Get all memberships for the org
            response = await client.get(
                f"{CLERK_API_URL}/organizations/{org_id}/memberships",
                headers=headers,
            )
            
            response.raise_for_status()
            memberships = response.json()
            
            # Format the response
            members = []
            for membership in memberships:
                members.append({
                    "user_id": membership.get("user_id"),
                    "email": membership.get("email_address", membership.get("public_email")),
                    "role": membership.get("role"),
                    "joined_at": membership.get("created_at"),
                })
            
            return {
                "members": members,
                "total": len(members)
            }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch members: {str(e)}"
        )
