from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import List
from app.services.clerk_auth import get_current_user, get_admin_user

# Import our Pydantic models for validation
from app.models.document import (
    DocumentCreate,      # For validating upload requests
    DocumentUpdate,      # For validating update requests
    DocumentResponse,    # For returning document data
    DocumentList         # For listing multiple documents
)

# Import database functions
from app.services.database import (
    add_document,           # Create new document
    get_all_documents,      # List all documents
    get_document_by_id,     # Get one document
    delete_document,        # Delete document
    update_document         # Update document
)

# Import AI service for generating embeddings
from app.services.ai_service import get_embedding

# Create API router
# prefix="/api/documents" means all routes start with /api/documents
# tags=["documents"] groups these endpoints in Swagger UI docs
router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(document: DocumentCreate, _: dict = Depends(get_admin_user)):
    """
    Upload a new document (SOP) with automatic embedding generation.
    
    This is the main endpoint for adding SOPs to the system.
    
    Process flow:
    1. Frontend sends: {"title": "...", "content": "...", "category": "..."}
    2. FastAPI validates input against DocumentCreate schema
    3. Generate embedding from content (text → 384 numbers)
    4. Store document + embedding in MongoDB Atlas
    5. Return created document with auto-generated ID and timestamps
    
    The embedding is generated automatically - user doesn't need to provide it.
    This makes the API simple: just send title and content!
    
    Args:
        document: DocumentCreate object (validated by FastAPI)
                 Must include: title, content
                 Optional: category
    
    Returns:
        DocumentResponse: Created document with id, timestamps
    
    Raises:
        500 Internal Server Error: If embedding generation fails
        500 Internal Server Error: If database insertion fails
    
    Example request:
        POST /api/documents
        {
            "title": "Password Reset Procedure",
            "content": "Step 1: Go to portal.company.com. Step 2: Click Forgot Password...",
            "category": "IT Security"
        }
    
    Example response (201 Created):
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Password Reset Procedure",
            "content": "Step 1: Go to portal.company.com...",
            "category": "IT Security",
            "created_at": "2026-02-12T10:30:00.123456",
            "updated_at": "2026-02-12T10:30:00.123456"
        }
    """
    try:
        embedding = get_embedding(document.content)
        if not embedding:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to generate embedding"}
            )
        
        result = await add_document(
            title=document.title,
            content=document.content,
            category=document.category,
            embedding=embedding
        )
        
        if not result:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to create document in database"}
            )
        
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Unexpected error creating document: {str(e)}"}
        )


@router.get("/", response_model=DocumentList)
async def list_documents(_: dict = Depends(get_current_user)):
    """
    Get all documents (without embeddings for efficiency).
    
    This endpoint returns a list of all SOPs in the system.
    Embeddings are excluded because:
    - They're large (384 numbers × 4 bytes each ≈ 1.5KB per doc)
    - Not needed for display (only needed for search)
    - Reduces network bandwidth
    
    Use this for:
    - Showing list of all SOPs in dashboard
    - Document management UI
    - Admin panel
    
    Returns:
        DocumentList: Object with:
                     - total: count of documents
                     - documents: array of DocumentResponse objects
    
    Example response (200 OK):
        {
            "total": 3,
            "documents": [
                {
                    "id": "uuid-1",
                    "title": "Password Reset Procedure",
                    "content": "Step 1...",
                    "category": "IT Security",
                    "created_at": "2026-02-12T10:30:00",
                    "updated_at": "2026-02-12T10:30:00"
                },
                {
                    "id": "uuid-2",
                    "title": "Deployment Process",
                    "content": "Step 1...",
                    "category": "Engineering",
                    "created_at": "2026-02-11T15:20:00",
                    "updated_at": "2026-02-11T15:20:00"
                },
                {
                    "id": "uuid-3",
                    "title": "Expense Report Guide",
                    "content": "Step 1...",
                    "category": "Finance",
                    "created_at": "2026-02-10T09:15:00",
                    "updated_at": "2026-02-10T09:15:00"
                }
            ]
        }
    """
    try:
        documents = await get_all_documents()
        return {
            "total": len(documents),
            "documents": documents
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error fetching documents: {str(e)}"}
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, _: dict = Depends(get_current_user)):
    """
    Get a single document by its ID.
    
    Use this for:
    - Viewing full document details
    - Editing a document (fetch current data first)
    - Document preview
    
    Args:
        document_id: UUID string of the document
                    Example: "550e8400-e29b-41d4-a716-446655440000"
    
    Returns:
        DocumentResponse: Single document with all fields
    
    Raises:
        404 Not Found: If document with given ID doesn't exist
        500 Internal Server Error: If database error occurs
    
    Example request:
        GET /api/documents/550e8400-e29b-41d4-a716-446655440000
    
    Example response (200 OK):
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Password Reset Procedure",
            "content": "Full SOP content here...",
            "category": "IT Security",
            "created_at": "2026-02-12T10:30:00",
            "updated_at": "2026-02-12T10:30:00"
        }
    
    Example error (404 Not Found):
        {
            "detail": "Document with ID 550e8400-... not found"
        }
    """
    try:
        document = await get_document_by_id(document_id)
        if not document:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document with ID {document_id} not found"}
            )
        return document
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error fetching document: {str(e)}"}
        )
@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_endpoint(document_id: str, _: dict = Depends(get_admin_user)):
    """
    Delete a document by its ID.
    
    Args:
        document_id: UUID string of the document to delete
    
    Raises:
        404 Not Found: If document doesn't exist
        500 Internal Server Error: If deletion fails
    """
    try:
        document = await get_document_by_id(document_id)
        if not document:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document with ID {document_id} not found"}
            )
        
        success = await delete_document(document_id)
        if not success:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to delete document from database"}
            )
        return None
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error deleting document: {str(e)}"}
        )


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document_endpoint(document_id: str, updates: DocumentUpdate, _: dict = Depends(get_admin_user)):
    """
    Update an existing document.
    
    If 'content' is updated, the AI embedding is automatically regenerated.
    
    Args:
        document_id: UUID of the document to update
        updates: DocumentUpdate object with fields to change
        
    Returns:
        DocumentResponse: The updated document
    """
    try:
        existing = await get_document_by_id(document_id)
        if not existing:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document {document_id} not found"}
            )
        
        new_embedding = None
        if updates.content is not None and updates.content != existing.get("content"):
            new_embedding = get_embedding(updates.content)
            if not new_embedding:
                return JSONResponse(
                    status_code=500,
                    content={"status": "error", "message": "Failed to regenerate embedding"}
                )
        
        result = await update_document(
            doc_id=document_id,
            title=updates.title,
            content=updates.content,
            category=updates.category,
            embedding=new_embedding
        )
        
        if not result:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to update document in database"}
            )
            
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Unexpected error updating document: {str(e)}"}
        )