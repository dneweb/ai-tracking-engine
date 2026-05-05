"""
Tenant isolation middleware for multi-tenant RAG platform.

Extracts org_id from a verified Clerk JWT and stores it in a request-scoped
ContextVar.  All downstream DB operations read this value via get_current_org_id().

Security contract:
  - org_id is NEVER optional for tenant-scoped routes.
  - A valid JWT without an org_id claim results in 403, not 200.
  - EXCLUDED_PATHS bypass middleware completely (they handle auth internally).
"""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextvars import ContextVar

# ── Context variable (per-request, async-safe) ────────────────────────────────
_current_org_id: ContextVar[str] = ContextVar("current_org_id")

# ── Paths that bypass tenant middleware ───────────────────────────────────────
# These routes handle their own auth / are genuinely public.
EXCLUDED_PATHS: frozenset[str] = frozenset({
    # Public auth flow
    "/auth/org-check",
    "/auth/org-available",
    "/auth/org-lookup",
    "/auth/verify-membership",
    "/auth/register-owner",
    "/auth/register-member",
    "/auth/validate-signin",
    # Auth-managed (JWT handled inside route)
    "/auth/approve-request",
    "/auth/members-list",
    "/auth/pending-requests",
    "/auth/remove-member",
    # System / infra
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/users/sync",
    # Test endpoints
    "/api/test-embedding",
    "/api/test-search",
    "/api/test",
    "/api/test-groq",
})


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        # Always pass CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip excluded paths
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        # ── 1. Require Authorization header ──────────────────────────────────
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing or malformed"},
            )

        token = auth_header.removeprefix("Bearer ").strip()

        ctx_token = None
        try:
            # ── 2. Verify JWT (RS256 via JWKS) ────────────────────────────────
            from app.services.clerk_auth import verify_token
            payload = await verify_token(token)

            # ── 3. Resolve org_id ────────────────────────────────────────────
            # Priority:
            # 1. X-Org-ID Header (User-selected, requires verification)
            # 2. JWT native claim (org_id)
            # 3. JWT public_metadata (org_id)
            
            header_org_id = request.headers.get("X-Org-ID")
            jwt_org_id = payload.get("org_id") or payload.get("public_metadata", {}).get("org_id")
            
            clerk_id = payload.get("sub")
            if not clerk_id:
                 return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid token: missing 'sub'"}
                )

            header_org_id = request.headers.get("X-Org-ID")
            jwt_org_id = payload.get("org_id") or payload.get("public_metadata", {}).get("org_id")

            from app.services.db_instance import async_db as _async_db
            final_org_id = None

            if header_org_id:
                # Security: Verify that this clerk_id is actually a member of header_org_id
                user_record = await _async_db.users.find_one({
                    "clerk_id": clerk_id,
                    "org_id": header_org_id,
                    "status": "approved"
                })
                if user_record:
                    final_org_id = header_org_id
                else:
                    # Fallback to JWT if header is invalid/unauthorized
                    final_org_id = jwt_org_id
            else:
                final_org_id = jwt_org_id
            
            if not final_org_id:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": (
                            "No active organisation context. "
                            "Please select an organisation."
                        )
                    },
                )

            # ── 4. Set org_id in request-scoped context ───────────────────────
            ctx_token = _current_org_id.set(final_org_id)
            return await call_next(request)

        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )
        except Exception as exc:
            print(f"[TenantMiddleware] Unexpected error: {exc}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": f"Token validation error: {str(exc)}"},
            )
        finally:
            # Always clean up context to prevent leaks across requests
            if ctx_token is not None:
                _current_org_id.reset(ctx_token)


# ── Dependency ────────────────────────────────────────────────────────────────

def get_current_org_id() -> str:
    """
    FastAPI dependency: returns the org_id injected by TenantMiddleware.
    Raises 403 if called outside an authenticated tenant context.
    """
    try:
        return _current_org_id.get()
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organisation context not found — is this a tenant-scoped route?",
        )