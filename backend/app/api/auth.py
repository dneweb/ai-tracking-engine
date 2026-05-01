from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.database import sync_user

router = APIRouter(prefix="/api", tags=["auth"])

class UserSyncRequest(BaseModel):
    clerk_id: str
    email: str
    full_name: Optional[str] = None

from app.services.clerk_auth import verify_token, get_current_user

@router.post("/users/sync", status_code=status.HTTP_200_OK)
async def handle_user_sync(
    request: UserSyncRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync a Clerk user with the backend database.
    Called from frontend on login/signup.
    Extracts org_id from the validated JWT (current_user).
    """
    try:
        # Extract org_id from the verified token context
        org_id = current_user.get("org_id")
        
        result = await sync_user(
            clerk_id=request.clerk_id,
            email=request.email,
            full_name=request.full_name,
            org_id=org_id
        )
        
        if not result:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to sync user")
        return {"message": "User synced successfully", "user": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
