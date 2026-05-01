import httpx
import os
import time
from typing import Optional, Dict
from fastapi import HTTPException

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
if not CLERK_JWKS_URL:
    # Construct from Clerks standard pattern if not provided
    # Format: https://clerk.your-slug.com/.well-known/jwks.json
    # Or for dev: https://clerk.accounts.dev/.well-known/jwks.json
    # Given the env pk_test_..., we can guess or use a default.
    # The user should ideally provide this in .env.
    # I'll use a placeholder or try to infer it.
    pass

# Global cache for JWKS
_jwks_cache: Optional[Dict] = None
_last_fetch: float = 0
CACHE_TTL = 3600  # 1 hour

async def get_jwks() -> Dict:
    """Fetch and cache JWKS from Clerk."""
    global _jwks_cache, _last_fetch
    
    now = time.time()
    if _jwks_cache and (now - _last_fetch < CACHE_TTL):
        return _jwks_cache

    if not CLERK_JWKS_URL:
        # Fallback for the user's specific dev domain if known
        # pk_test_bW92ZWQtZHJhZ29uLTE5LmNsZXJrLmFjY291bnRzLmRldiQ
        # translates to moved-dragon-19.clerk.accounts.dev
        url = "https://moved-dragon-19.clerk.accounts.dev/.well-known/jwks.json"
    else:
        url = CLERK_JWKS_URL

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _last_fetch = now
            return _jwks_cache
        except Exception as e:
            if _jwks_cache:
                return _jwks_cache  # Return stale cache on failure
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch Clerk public keys: {str(e)}"
            )
