from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from pydantic import BaseModel
from typing import Optional
from app.api import queries
# from app.api import auth  # REMOVED - using Clerk instead
from app.api import analytics  # Analytics router (timeline chart)
from app.api import reports    # Reports router (SOP updates)
from app.api import auth       # Auth/User sync router

# Import database functions (existing)
from app.services.database import get_all_queries, add_query_log

# Import AI service functions (existing)
from app.services.ai_service import get_embedding, chat_completion

# Import API routers (NEW)
from app.api import document as documents

# Load settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(title="AI Tracking Engine API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# ============================================================================
# REGISTER API ROUTERS
# ============================================================================

# Documents API (NEW - handles document upload and retrieval)
app.include_router(documents.router)
app.include_router(queries.router)
app.include_router(analytics.router)  # Analytics - timeline chart
app.include_router(reports.router)    # Reports - SOP updates
app.include_router(auth.router)       # User sync


# ============================================================================
# ROOT ENDPOINTS (Basic info)
# ============================================================================

@app.get("/")
async def root():
    """
    Root endpoint - API welcome message.
    Shows basic info about the API.
    """
    return {
        "message": "AI Tracking Engine API",
        "status": "running",
        "version": "0.2.0",
        "docs": "/docs"  # Link to interactive API documentation
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Used by monitoring systems to check if API is alive.
    """
    return {
        "status": "healthy",
        "service": "ai-tracking-engine-backend"
    }

@app.get("/api/test-search")
async def test_search():
    """Test search function with debug info"""
    from app.services.database import search_similar_documents, get_all_documents
    from app.services.ai_service import get_embedding
    
    try:
        # Get all docs
        docs = await get_all_documents()
        
        # Generate embedding
        test_question = "How do I reset my password?"
        test_embedding = get_embedding(test_question)
        
        # Search
        results = await search_similar_documents(
            query_embedding=test_embedding,
            match_threshold=0.1,
            match_count=5
        )
        
        return {
            "status": "success",
            "test_question": test_question,
            "embedding_generated": test_embedding is not None,
            "embedding_length": len(test_embedding) if test_embedding else 0,
            "total_docs_in_db": len(docs),
            "search_results_count": len(results),
            "first_result": results[0] if results else None
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }


# ============================================================================
# TEST ENDPOINTS (For development/testing)
# ============================================================================

@app.get("/api/test")
async def test_endpoint():
    """
    Test endpoint to verify backend is working.
    Shows MongoDB connection status.
    """
    from app.services.database import MONGODB_URI
    return {
        "message": "Backend is working!",
        "database": "MongoDB",
        "status": "connected" if MONGODB_URI else "not configured"
    }


@app.get("/api/test-embedding")
async def test_embedding():
    """
    Test local embedding model.
    Generates embedding for a sample text.
    """
    text = "How do I reset my password?"
    embedding = get_embedding(text)
    
    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_5_values": embedding[:5] if embedding else [],
        "model": "all-MiniLM-L6-v2 (local, free)"
    }


@app.get("/api/test-groq")
async def test_groq():
    """
    Test Groq chat completion.
    Generates an answer using Groq API.
    """
    result = chat_completion(
        prompt="What is a password reset?",
        context="A password reset allows users to create a new password when they forget their old one."
    )
    
    return {
        "question": "What is a password reset?",
        "result": result
    }


# ============================================================================
# QUERY LOGS ENDPOINTS (Existing - for testing)
# ============================================================================

class QueryRequest(BaseModel):
    """Schema for adding a query log"""
    question: str
    answer: str
    confidence: float


@app.get("/api/queries")
async def get_queries(user_email: Optional[str] = None):
    """
    Get all query logs.
    Used by frontend dashboard to show query history.
    """
    queries = await get_all_queries(user_email=user_email)
    return {
        "count": len(queries),
        "queries": queries
    }


@app.post("/api/queries")
async def create_query(query: QueryRequest):
    """
    Add new query log.
    Used for testing database writes.
    """
    result = await add_query_log(
        question=query.question,
        answer=query.answer,
        confidence=query.confidence
    )
    return {"success": True, "data": result}