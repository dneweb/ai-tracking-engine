"""
Queries API router.

Role-Based Access Control:
  - POST /api/query   → member, admin, owner (can write queries — viewer cannot)
  - GET  /api/queries → viewer+              (read query history)

Multi-Tenant Isolation:
  - org_id from TenantMiddleware scopes ALL queries.
  - database.py enforces org_id at the service layer as well.
"""

from fastapi import APIRouter, status, Depends, Query as QParam
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.models.document import RAGQueryResponse, RAGQueryRequest
from app.services.rag_service import answer_question
from app.services.database import _async_db, get_all_queries
from app.services.clerk_auth import (
    get_current_user,
    require_permission,
)
from app.middleware.tenant import get_current_org_id
from app.services.conversation_service import (
    create_conversation,
    get_recent_messages_for_context,
    update_conversation_after_message,
)

router = APIRouter(prefix="/api", tags=["queries"])


# ── POST /api/query  (member | admin | owner — viewers cannot write) ──────────
@router.post("/query", response_model=RAGQueryResponse)
async def query_documents(
    query: RAGQueryRequest,
    org_id: str  = Depends(get_current_org_id),
    user: dict   = Depends(require_permission("queries:write")),
):
    """
    Answer a question using RAG, scoped to the authenticated organisation.
    Viewers are not permitted to submit queries (read-only role).
    """
    try:
        clerk_id = user.get("user_id")
        conv_id = query.conversation_id

        # Enforce dynamic plan query limits
        org_settings = await _async_db.org_settings.find_one({"org_id": org_id})
        max_queries = 100
        queries_used = 0
        if org_settings:
            max_queries = org_settings.get("max_queries_per_month", 100)
            queries_used = org_settings.get("queries_used_this_month", 0)

        if queries_used >= max_queries:
            return JSONResponse(
                status_code=403,
                content={
                    "status": "error",
                    "detail": f"Monthly query limit reached ({queries_used}/{max_queries}). Please upgrade your plan to continue."
                },
            )

        # If no conversation_id provided, create new one
        if not conv_id:
            conv = await create_conversation(
                org_id=org_id,
                clerk_id=clerk_id,
                first_message=query.question,
            )
            conv_id = conv["conversation_id"]

        # Get conversation history for AI context
        history = await get_recent_messages_for_context(
            conversation_id=conv_id,
            org_id=org_id,
            limit=6,
        )

        print(f"[DEBUG] query_documents question='{query.question}' org_id='{org_id}' conv='{conv_id}'", flush=True)
        result = await answer_question(
            question=query.question,
            top_k=query.top_k,
            threshold=query.threshold, # Pass threshold
            user_id=query.user_id    or user.get("user_id"),
            user_email=query.user_email or user.get("email"),
            user_name=query.user_name,
            org_id=org_id,           # mandatory — RLS enforced in DB layer
            conversation_id=conv_id,
            conversation_history=history,
        )

        # Atomically increment queries used count inside MongoDB
        await _async_db.org_settings.update_one(
            {"org_id": org_id},
            {"$inc": {"queries_used_this_month": 1}}
        )

        # Update conversation metadata after successful message
        await update_conversation_after_message(
            conversation_id=conv_id,
            org_id=org_id,
        )

        # Add conversation_id to response
        result["conversation_id"] = conv_id
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": f"Query failed: {str(e)}"},
        )


# ── GET /api/queries  (viewer+) ───────────────────────────────────────────────
@router.get("/queries", status_code=status.HTTP_200_OK)
async def get_queries(
    org_id: str          = Depends(get_current_org_id),
    user: dict           = Depends(require_permission("queries:read")),
    user_email: Optional[str] = QParam(default=None),
):
    """
    Retrieve query logs for the authenticated organisation.
    Members/Viewers see their own logs; admins/owners can filter by email.
    """
    try:
        role = user.get("role", "viewer")

        # Members and viewers can only see their own queries unless admin/owner
        if role in ("viewer", "member"):
            # Override email filter — can only see own queries
            user_email = user.get("email") or user_email

        queries = await get_all_queries(org_id=org_id, user_email=user_email)
        return {"queries": queries}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": f"Failed to get queries: {str(e)}"},
        )