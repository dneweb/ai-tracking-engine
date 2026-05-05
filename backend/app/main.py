from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from pydantic import BaseModel
from typing import Optional
from app.api import queries
# from app.api import auth  # REMOVED - using Clerk instead
from app.api import analytics  # Analytics router (timeline chart)
from app.api import reports    # Reports router (SOP updates)
from app.api import auth       # Auth/User sync router
from app.routers.members import router as members_router
# from app.routers.users import router as users_router  # DELETED - consolidated into app.api.auth
from app.routers.auth_flow import router as auth_flow_router
from app.routers.conversations import router as conversations_router
from app.services.rate_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# ── Lifespan handler ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and Shutdown logic for the application.
    Allows us to initialize heavy resources (like the AI model) without
    blocking the entire initial import phase.
    """
    print("🚀 Starting AI Tracking Engine...", flush=True)
    # The model will load lazily on the first request to avoid blocking the server startup.

    yield

    print("👋 Shutting down AI Tracking Engine...")

# Import database utility (non-tenant, for health checks only)
from app.services.database import MONGODB_URI

# Import AI service functions (existing)
from app.services.ai_service import get_embedding, chat_completion

# Import API routers (NEW)
from app.api import document as documents

# Load settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="AI Tracking Engine API",
    lifespan=lifespan
)

# ============================================================================
# MIDDLEWARE
# IMPORTANT: Starlette executes middleware in REVERSE order of registration.
# The last middleware added here runs FIRST on every incoming request.
# Order of execution: CORSMiddleware → SlowAPIMiddleware → TenantMiddleware
# ============================================================================

# Initialize rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add rate limiting middleware — executes second
from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# Add tenant isolation middleware — executes third
from app.middleware.tenant import TenantMiddleware
app.add_middleware(TenantMiddleware)

# Configure CORS — added LAST so it executes FIRST.
# This ensures every request (including OPTIONS preflight) gets
# Access-Control-Allow-Origin headers before anything else runs.
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
app.include_router(members_router, prefix="/members", tags=["members"])
app.include_router(auth_flow_router, prefix="/auth", tags=["auth"])
app.include_router(conversations_router, tags=["conversations"])


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
    """
    Quick sanity-check: verifies the AI embedding pipeline is functional.
    Does NOT touch tenant-scoped data — safe for public health monitoring.
    """
    from app.services.ai_service import get_embedding
    try:
        test_question  = "How do I reset my password?"
        test_embedding = await get_embedding(test_question)
        return {
            "status":             "success",
            "test_question":      test_question,
            "embedding_generated": test_embedding is not None,
            "embedding_length":   len(test_embedding) if test_embedding else 0,
            "note":               "Tenant document search requires an authenticated request via /api/query"
        }
    except Exception as e:
        import traceback
        return {
            "status":    "error",
            "error":     str(e),
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
    embedding = await get_embedding(text)

    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_5_values": embedding[:5] if embedding else [],
        "model": "mistral-embed (API, light-weight)"
    }


@app.get("/api/test-groq")
async def test_groq():
    """
    Test Groq chat completion.
    Generates an answer using Groq API.
    """
    result = await chat_completion(
        prompt="What is a password reset?",
        context="A password reset allows users to create a new password when they forget their old one."
    )

    return {
        "question": "What is a password reset?",
        "result": result
    }


# NOTE: /api/queries (GET) and /api/queries (POST) have been intentionally removed.
# The authenticated, org-scoped equivalents are registered via app.include_router(queries.router)
# and live in app/api/queries.py. All query operations require a valid JWT and org context.