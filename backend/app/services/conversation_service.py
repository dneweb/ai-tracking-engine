"""
Conversation service — MongoDB operations for multi-turn conversations.

Each conversation belongs to a (org_id, clerk_id) pair.
Soft-delete via is_deleted flag preserves query logs.
"""

from uuid import uuid4
from datetime import datetime
from app.services.db_instance import async_db as _async_db


async def create_conversation(
    org_id: str,
    clerk_id: str,
    first_message: str,
) -> dict:
    """
    Creates a new conversation.
    Title is auto-generated from first_message:
      - Take first 60 chars
      - Strip to last full word
      - Add "..." if truncated
    """
    conv_id = f"conv_{uuid4().hex[:20]}"

    title = first_message[:60]
    if len(first_message) > 60:
        title = title.rsplit(" ", 1)[0] + "..."

    now = datetime.utcnow()
    doc = {
        "conversation_id": conv_id,
        "org_id": org_id,
        "clerk_id": clerk_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "message_count": 0,
        "is_deleted": False,
    }
    await _async_db.conversations.insert_one(doc)
    return doc


async def get_conversations(
    org_id: str,
    clerk_id: str,
    limit: int = 50,
) -> list:
    """
    Returns conversations for this user in this org.
    Sorted by updated_at descending (most recent first).
    Excludes deleted conversations.
    """
    cursor = _async_db.conversations.find(
        {
            "org_id": org_id,
            "clerk_id": clerk_id,
            "is_deleted": False,
        },
        {
            "_id": 0,
            "conversation_id": 1,
            "title": 1,
            "created_at": 1,
            "updated_at": 1,
            "message_count": 1,
        },
    ).sort("updated_at", -1).limit(limit)

    results = []
    async for doc in cursor:
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        results.append(doc)
    return results


async def get_conversation_messages(
    conversation_id: str,
    org_id: str,
    clerk_id: str,
) -> list:
    """
    Returns all messages (queries) for a conversation.
    Verifies conversation belongs to this org and user.
    Returns messages sorted by created_at ascending.
    """
    # Verify ownership
    conv = await _async_db.conversations.find_one({
        "conversation_id": conversation_id,
        "org_id": org_id,
        "clerk_id": clerk_id,
        "is_deleted": False,
    })
    if not conv:
        return []

    cursor = _async_db.queries.find(
        {
            "conversation_id": conversation_id,
            "org_id": org_id,
        },
        {"_id": 0},
    ).sort("created_at", 1)

    messages = []
    async for doc in cursor:
        if "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        messages.append(doc)
    return messages


async def get_recent_messages_for_context(
    conversation_id: str,
    org_id: str,
    limit: int = 6,
) -> list:
    """
    Returns last N messages for AI context injection.
    Returns list of {role, content} dicts.
    Used to give Groq the conversation history.
    """
    if not conversation_id:
        return []

    cursor = _async_db.queries.find(
        {
            "conversation_id": conversation_id,
            "org_id": org_id,
        },
        {"_id": 0, "question": 1, "answer": 1, "created_at": 1},
    ).sort("created_at", -1).limit(limit)

    messages = []
    async for doc in cursor:
        messages.append(doc)

    # Reverse so oldest is first (correct order for AI)
    messages.reverse()

    # Format as Groq message format
    formatted = []
    for msg in messages:
        formatted.append({"role": "user", "content": msg["question"]})
        formatted.append({"role": "assistant", "content": msg["answer"]})
    return formatted


async def update_conversation_after_message(
    conversation_id: str,
    org_id: str,
) -> None:
    """
    Called after each new message.
    Updates updated_at and increments message_count.
    """
    await _async_db.conversations.update_one(
        {"conversation_id": conversation_id, "org_id": org_id},
        {
            "$set": {"updated_at": datetime.utcnow()},
            "$inc": {"message_count": 1},
        },
    )


async def delete_conversation(
    conversation_id: str,
    org_id: str,
    clerk_id: str,
) -> bool:
    """
    Soft deletes a conversation.
    Sets is_deleted=True.
    Does NOT delete the messages (queries).
    Returns True if deleted, False if not found.
    """
    result = await _async_db.conversations.update_one(
        {
            "conversation_id": conversation_id,
            "org_id": org_id,
            "clerk_id": clerk_id,
        },
        {"$set": {"is_deleted": True}},
    )
    return result.modified_count > 0
