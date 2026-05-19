"""
Clerk JWT Authentication Service.

Provides:
  - verify_token()       - RS256 signature verification via JWKS
  - get_current_user()   - FastAPI dependency, returns user dict
  - require_role()       - Dependency factory for role-gated endpoints
  - get_admin_user()     - Shorthand: owner + admin only
  - get_viewer_user()    - Shorthand: any authenticated user (viewer+)

Role Hierarchy (lowest → highest):
  viewer → member → admin → owner
"""

import os
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import jwt as pyjwt
from jwt.algorithms import RSAAlgorithm
from app.services.clerk_keys import get_jwks

load_dotenv()

security = HTTPBearer()

# ── Role Definitions ──────────────────────────────────────────────────────────

# Power levels for hierarchy comparisons
ROLE_POWER: dict[str, int] = {
    "viewer": 1,
    "member": 2,
    "admin": 3,
    "owner": 4,
}

# All valid application roles (canonical names)
VALID_ROLES = set(ROLE_POWER.keys())

# Mapping from Clerk's org role strings to our canonical roles
ROLE_MAP: dict[str, str] = {
    # Clerk prefixed forms
    "org:owner":  "owner",
    "org:admin":  "admin",
    "org:member": "member",
    "org:viewer": "viewer",
    # Bare canonical forms (pass-through)
    "owner":  "owner",
    "admin":  "admin",
    "member": "member",
    "viewer": "viewer",
    # Legacy mapping
    "user": "member",
}

# Permission sets per role (additive — higher roles inherit lower perms)
PERMISSIONS: dict[str, set[str]] = {
    "owner": {
        "documents:read", "documents:write", "documents:delete",
        "queries:read",   "queries:write",
        "analytics:read",
        "reports:read",
        "members:read",   "members:write",   "members:delete",
        "org:manage",
    },
    "admin": {
        "documents:read", "documents:write", "documents:delete",
        "queries:read",   "queries:write",
        "analytics:read",
        "reports:read",
        "members:read",   "members:write",   "members:delete",
    },
    "member": {
        "documents:read",
        "queries:read",   "queries:write",
        "analytics:read",
        "reports:read",
    },
    "viewer": {
        "documents:read",
        "queries:read",   "queries:write",
        "analytics:read",
        "reports:read",
    },
}


def _normalize_role(raw: str | None) -> str:
    """Map any raw role string to a canonical role, defaulting to 'viewer'."""
    if not raw:
        return "viewer"
    return ROLE_MAP.get(str(raw).strip().lower(), "viewer")


# ── Token Verification ────────────────────────────────────────────────────────

async def verify_token(token: str) -> dict:
    """
    Verify a Clerk JWT (RS256) against JWKS and return the decoded payload.
    Raises HTTP 401 on any failure.
    """
    try:
        jwks_data = await get_jwks()

        unverified_header = pyjwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="JWT header missing 'kid'")

        public_key = None
        for key_data in jwks_data.get("keys", []):
            if key_data.get("kid") == kid:
                public_key = RSAAlgorithm.from_jwk(key_data)
                break

        if not public_key:
            raise HTTPException(
                status_code=401,
                detail="No matching public key found — JWKS may need refreshing"
            )

        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={
                "verify_exp": True,
                "verify_aud": False,   # Clerk doesn't always set aud
            },
            leeway=30,                 # 30-second clock-skew tolerance
        )
        return payload

    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired — please sign in again"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


# ── User Extraction ───────────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency: verify token and return a normalised user dict.
    
    Source of Truth:
    1. Clerk JWT provides the identity (sub).
    2. Tenant Context provides the active org_id.
    3. Database provides the actual role/status (bypasses JWT lag).
    """
    token = credentials.credentials
    payload = await verify_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing 'sub'"
        )

    email = payload.get("email", "")
    
    # ── 1. Resolve org_id from context, request header, or JWT ───────────────
    # We prefer the context (middleware resolved) as it handles X-Org-ID headers
    from app.middleware.tenant import get_current_org_id
    try:
        org_id = get_current_org_id()
    except:
        # Fallback to request header, then JWT if called outside tenant-scoped route (like /users/sync)
        org_id = request.headers.get("X-Org-ID")
        if not org_id:
            metadata = payload.get("public_metadata", {})
            org_id = payload.get("org_id") or metadata.get("org_id")

    # ── 2. Resolve Role from Database (Primary) ──────────────────────────────
    # This is critical to avoid "JWT Lag" where Clerk hasn't updated the session
    # but the DB is already updated during registration.
    from app.services.database import async_users
    role = "viewer"  # Default fallback
    
    if org_id:
        user_record = await async_users.find_one({
            "clerk_id": user_id,
            "org_id": org_id,
            "status": "approved"
        })
        if user_record:
            role = user_record.get("role", "viewer")
        else:
            # Fallback to JWT metadata IF not found in DB (allows sync/init flows)
            metadata = payload.get("public_metadata", {})
            role = metadata.get("role") or payload.get("org_role") or "viewer"
    else:
        # No org context, use JWT metadata
        metadata = payload.get("public_metadata", {})
        role = metadata.get("role") or payload.get("org_role") or "viewer"

    role = _normalize_role(role)
    perms = PERMISSIONS.get(role, set())

    return {
        "user_id":     user_id,
        "email":       email,
        "role":        role,
        "org_id":      org_id,
        "permissions": perms,
    }


# ── Role-Gated Dependencies ───────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    Dependency factory — gate an endpoint to specific roles.

    Usage:
        @router.post("/doc")
        async def create(user = Depends(require_role("owner", "admin"))):
            ...
    """
    allowed = set(allowed_roles)

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Requires one of: {sorted(allowed)}. "
                    f"Your role: '{current_user['role']}'"
                )
            )
        return current_user

    return _check


def require_permission(permission: str):
    """
    Dependency factory — gate an endpoint by a specific permission string.

    Usage:
        @router.delete("/doc/{id}")
        async def delete(user = Depends(require_permission("documents:delete"))):
            ...
    """
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if permission not in current_user.get("permissions", set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permission '{permission}' required. "
                    f"Your role '{current_user['role']}' does not have this permission."
                )
            )
        return current_user

    return _check


# ── Convenience Shorthands ────────────────────────────────────────────────────

# Any authenticated user (viewer+)
get_viewer_user = get_current_user

# Member or above
def get_member_user(current_user: dict = Depends(get_current_user)) -> dict:
    if ROLE_POWER.get(current_user["role"], 0) < ROLE_POWER["member"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member-level access required"
        )
    return current_user

# Admin or above (owner | admin)
async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if ROLE_POWER.get(current_user["role"], 0) < ROLE_POWER["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin-level access required (admin or owner)"
        )
    return current_user

# Owner only
async def get_owner_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner-only action"
        )
    return current_user
