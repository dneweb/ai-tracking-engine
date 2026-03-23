from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.services.database import sync_user

router = APIRouter(prefix="/api/users", tags=["auth"])

class UserSyncRequest(BaseModel):
    clerk_id: str
    email: str
    full_name: Optional[str] = None

@router.post("/sync", status_code=status.HTTP_200_OK)
async def handle_user_sync(request: UserSyncRequest):
    """
    Sync a Clerk user with the backend database.
    Called from frontend on login/signup.
    """
    try:
        result = await sync_user(
            clerk_id=request.clerk_id,
            email=request.email,
            full_name=request.full_name
        )
        
        if not result:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to sync user")
        return {"message": "User synced successfully", "user": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
