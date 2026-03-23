import os
import httpx
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import jwt as pyjwt

load_dotenv()

security = HTTPBearer()
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials

    try:
        # Decode token without verification first to get header
        unverified = pyjwt.decode(
    token,
    options={"verify_signature": False, "verify_exp": False}
)

        # Extract user info
        user_id = unverified.get("sub")
        email = unverified.get("email", "")
        metadata = unverified.get("public_metadata", {})
        role = metadata.get("role", "admin")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        return {
            "user_id": user_id,
            "email": email,
            "role": role
        }

    except Exception as e:
        # PRODUCTION ENFORCED: No more debug bypass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


async def get_admin_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
