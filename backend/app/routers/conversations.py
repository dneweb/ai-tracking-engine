"""
Conversations API router.

Provides CRUD endpoints for multi-turn conversation management.
All endpoints are scoped to the authenticated user + org.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.middleware.tenant import get_current_org_id
from app.services.clerk_auth import get_current_user
from app.services.conversation_service import (
    create_conversation,
    get_conversations,
    get_conversation_messages,
    delete_conversation,
)

router = APIRouter(prefix="/api", tags=["conversations"])


class NewConversationRequest(BaseModel):
    first_message: str


@router.post("/conversations/new")
async def new_conversation(
    body: NewConversationRequest,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
) -> dict:
    """
    Creates a new conversation.
    Returns the conversation_id.
    """
    clerk_id = current_user["user_id"]

    if not body.first_message.strip():
        raise HTTPException(400, "Message cannot be empty")

    conv = await create_conversation(
        org_id=org_id,
        clerk_id=clerk_id,
        first_message=body.first_message.strip(),
    )
    return {
        "conversation_id": conv["conversation_id"],
        "title": conv["title"],
        "created_at": conv["created_at"].isoformat(),
    }


@router.get("/conversations")
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
) -> dict:
    """
    Lists all conversations for current user in this org.
    """
    clerk_id = current_user["user_id"]
    convs = await get_conversations(
        org_id=org_id,
        clerk_id=clerk_id,
    )
    return {"conversations": convs, "total": len(convs)}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
) -> dict:
    """
    Returns all messages in a conversation.
    Verifies ownership before returning.
    """
    clerk_id = current_user["user_id"]
    messages = await get_conversation_messages(
        conversation_id=conversation_id,
        org_id=org_id,
        clerk_id=clerk_id,
    )
    return {
        "conversation_id": conversation_id,
        "messages": messages,
        "total": len(messages),
    }


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_current_org_id),
) -> dict:
    """
    Soft deletes a conversation.
    """
    clerk_id = current_user["user_id"]
    deleted = await delete_conversation(
        conversation_id=conversation_id,
        org_id=org_id,
        clerk_id=clerk_id,
    )
    if not deleted:
        raise HTTPException(404, "Conversation not found")
    return {"success": True}
