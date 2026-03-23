from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from app.models.document import RAGQueryResponse
from app.services.rag_service import answer_question
from app.services.database import get_all_queries
from app.services.clerk_auth import get_current_user

router = APIRouter(prefix="/api", tags=["queries"])


class RAGQueryRequestWithUser(BaseModel):
    question: str
    top_k: int = 3
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None


@router.post("/query", response_model=RAGQueryResponse)
async def query_documents(query: RAGQueryRequestWithUser, user: dict = Depends(get_current_user)):
    """Answer a question using RAG"""
    try:
        # Use user info from Clerk token if not explicitly provided in payload
        u_id = query.user_id or user.get("user_id")
        u_email = query.user_email or user.get("email")
        
        # Clerk usually provides first/last name, we can approximate user_name
        u_name = query.user_name
        
        result = await answer_question(
            question=query.question,
            top_k=query.top_k,
            user_id=u_id,
            user_email=u_email,
            user_name=u_name,
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"status": "error", "message": f"Query failed: {str(e)}"}
        )


@router.get("/queries", status_code=status.HTTP_200_OK)
async def get_queries(user_email: Optional[str] = None):
    """Retrieve query logs, optionally filtered by user email."""
    try:
        queries = await get_all_queries(user_email)
        return {"queries": queries}
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"status": "error", "message": f"Failed to get queries: {str(e)}"}
        )