from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import uuid4, UUID
from datetime import datetime

# ============================================================================
# EXISTING MODELS (Your original code - kept for internal use)
# ============================================================================

class Document(BaseModel):
    """
    Represents a document in the system (internal use).
    Used for storing content that will be embedded and searched.
    Flexible model for internal processing.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None

class DocumentChunk(BaseModel):
    """
    Represents a chunk of a larger document.
    Useful when documents are too long and need to be split.
    We'll use this later for chunking large SOPs.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    content: str
    chunk_index: int
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DocumentQuery(BaseModel):
    """
    Represents a search query for documents.
    Used when querying the RAG system.
    """
    query: str
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results to return (1-20)")
    threshold: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity score (0.0-1.0)")

# ============================================================================
# NEW MODELS (API contracts - match MongoDB database schema)
# ============================================================================

class DocumentCreate(BaseModel):
    """
    Schema for creating a new document via API.
    Used in: POST /api/documents
    
    This is what the frontend sends when uploading a SOP.
    FastAPI validates the input matches this schema.
    """
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=500, 
        description="Document title (e.g., 'Password Reset SOP')"
    )
    content: str = Field(
        ..., 
        min_length=1, 
        description="Full document content/text"
    )
    category: Optional[str] = Field(
        None, 
        max_length=100, 
        description="Document category (e.g., 'IT Security', 'Engineering')"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Password Reset Procedure",
                "content": "Step 1: Go to portal.company.com. Step 2: Click Forgot Password...",
                "category": "IT Security"
            }
        }
class DocumentUpdate(BaseModel):
    """
    Schema for updating an existing document.
    All fields are optional to allow partial updates.
    Used in: PUT /api/documents/{document_id}
    """
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated SOP Title",
                "content": "Updated content...",
                "category": "Operations"
            }
        }

class DocumentResponse(BaseModel):
    """
    Schema for returning document data via API.
    Used in: GET /api/documents, POST /api/documents responses
    
    This matches the exact structure of documents in MongoDB.
    When we fetch from database, we convert to this format.
    """
    id: str  # Updated for MongoDB string IDs
    title: str
    content: str
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        # Allows Pydantic to convert from MongoDB response dict
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Password Reset Procedure",
                "content": "Step 1: Go to portal.company.com...",
                "category": "IT Security",
                "created_at": "2026-02-12T10:30:00",
                "updated_at": "2026-02-12T10:30:00"
            }
        }

class DocumentWithSimilarity(BaseModel):
    """
    Schema for search results with similarity scores.
    Used in: RAG queries, document search
    
    When searching for similar documents, we return this.
    Includes all document fields + similarity score.
    """
    id: str
    title: str
    content: str
    category: Optional[str] = None
    similarity: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Similarity score: 1.0 = identical, 0.0 = completely different"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Password Reset Procedure",
                "content": "Step 1: Go to portal.company.com...",
                "category": "IT Security",
                "similarity": 0.92
            }
        }

class DocumentList(BaseModel):
    """
    Schema for listing multiple documents.
    Used in: GET /api/documents (list all)
    
    Returns total count + array of documents.
    Useful for pagination and showing totals in UI.
    """
    total: int = Field(..., description="Total number of documents")
    documents: List[DocumentResponse] = Field(..., description="Array of documents")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 3,
                "documents": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "title": "Password Reset Procedure",
                        "content": "Step 1...",
                        "category": "IT Security",
                        "created_at": "2026-02-12T10:30:00",
                        "updated_at": "2026-02-12T10:30:00"
                    }
                ]
            }
        }

# ============================================================================
# QUERY/RESPONSE MODELS (For RAG system)
# ============================================================================

class RAGQueryRequest(BaseModel):
    """
    Schema for RAG query requests.
    Used in: POST /api/query
    """
    question: str = Field(..., min_length=1, description="User's question")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of similar documents to retrieve")
    threshold: float = Field(default=0.1, ge=0.0, le=1.0, description="Minimum similarity threshold")
    conversation_id: Optional[str] = Field(default=None, description="Existing conversation ID, or null for new conversation")
    
    # User metadata fields (sent by frontend, used for logging)
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "How do I reset my password?",
                "top_k": 3,
                "conversation_id": None,
                "user_id": "user_123",
                "user_email": "user@example.com"
            }
        }

class DocumentWithSimilarity(BaseModel):
    """
    Schema for search results with similarity scores.
    """
    id: str
    title: str
    content: str
    category: Optional[str] = None
    similarity: float = Field(..., ge=0.0, le=1.0)
    
    class Config:
        from_attributes = True

class RAGQueryResponse(BaseModel):
    """
    Schema for RAG query responses.
    """
    question: str
    answer: str
    confidence: float
    sources: List[DocumentWithSimilarity]
    conversation_id: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "How do I reset my password?",
                "answer": "To reset your password...",
                "confidence": 0.92,
                "sources": [],
                "conversation_id": "conv_abc123"
            }
        }