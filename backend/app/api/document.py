"""
Documents API router.

Role-Based Access Control:
  - GET  /api/documents       → viewer, member, admin, owner  (read)
  - GET  /api/documents/{id}  → viewer, member, admin, owner  (read)
  - POST /api/documents       → admin, owner only             (write)
  - PUT  /api/documents/{id}  → admin, owner only             (write)
  - DELETE /api/documents/{id}→ admin, owner only             (delete)

Multi-tenant isolation is enforced at two layers:
  1. TenantMiddleware injects org_id from the JWT (cannot be spoofed).
  2. database.py _require_org_id() will raise RuntimeError if org_id is absent.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import List

from app.services.clerk_auth import (
    get_current_user,
    get_admin_user,
    require_permission,
)
from app.models.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentList,
)
from app.services.database import (
    _async_db,
    add_document,
    get_all_documents,
    get_document_by_id,
    delete_document,
    update_document,
)
from app.services.ai_service import get_embedding
from app.middleware.tenant import get_current_org_id

router = APIRouter(prefix="/api/documents", tags=["documents"])


# ── POST /api/documents  (admin | owner) ─────────────────────────────────────
@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document: DocumentCreate,
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("documents:write")),
):
    """
    Upload a new SOP document (admin/owner only).
    Generates an embedding automatically from the content.
    """
    try:
        # Enforce dynamic plan ingestion limits
        current_docs = await _async_db.documents.count_documents({"org_id": org_id})
        org_settings = await _async_db.org_settings.find_one({"org_id": org_id})
        max_docs = 10
        if org_settings:
            max_docs = org_settings.get("max_documents", 10)

        if current_docs >= max_docs:
            return JSONResponse(
                status_code=403,
                content={
                    "status": "error",
                    "message": f"Document limit reached. Your plan allows up to {max_docs} documents. Please upgrade your plan."
                },
            )

        embedding = await get_embedding(document.content)
        if not embedding:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to generate embedding"},
            )

        result = await add_document(
            title=document.title,
            content=document.content,
            category=document.category,
            embedding=embedding,
            org_id=org_id,          # mandatory — RLS enforced in DB layer
        )

        if not result:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to persist document"},
            )

        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Unexpected error: {str(e)}"},
        )


# ── GET /api/documents  (viewer+) ────────────────────────────────────────────
@router.get("", response_model=DocumentList)
async def list_documents(
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("documents:read")),
):
    """
    List all documents for the authenticated organisation.
    Accessible by all roles (viewer, member, admin, owner).
    """
    try:
        documents = await get_all_documents(org_id=org_id)
        return {"total": len(documents), "documents": documents}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error fetching documents: {str(e)}"},
        )


# ── GET /api/documents/{id}  (viewer+) ────────────────────────────────────────
@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("documents:read")),
):
    """
    Fetch a single document by ID, scoped to the authenticated organisation.
    """
    try:
        document = await get_document_by_id(document_id, org_id=org_id)
        if not document:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document '{document_id}' not found"},
            )
        return document
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error fetching document: {str(e)}"},
        )


# ── DELETE /api/documents/{id}  (admin | owner) ───────────────────────────────
@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_endpoint(
    document_id: str,
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("documents:delete")),
):
    """
    Delete a document. Requires admin or owner role.
    The org_id scope prevents deletion of another org's documents.
    """
    try:
        document = await get_document_by_id(document_id, org_id=org_id)
        if not document:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document '{document_id}' not found"},
            )

        success = await delete_document(document_id, org_id=org_id)
        if not success:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to delete document"},
            )
        return None  # 204 No Content
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error deleting document: {str(e)}"},
        )


# ── PUT /api/documents/{id}  (admin | owner) ──────────────────────────────────
@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document_endpoint(
    document_id: str,
    updates: DocumentUpdate,
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("documents:write")),
):
    """
    Update a document. Requires admin or owner role.
    If content changes, the embedding is automatically regenerated.
    """
    try:
        existing = await get_document_by_id(document_id, org_id=org_id)
        if not existing:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Document '{document_id}' not found"},
            )

        new_embedding = None
        if updates.content is not None and updates.content != existing.get("content"):
            new_embedding = await get_embedding(updates.content)
            if not new_embedding:
                return JSONResponse(
                    status_code=500,
                    content={"status": "error", "message": "Failed to regenerate embedding"},
                )

        result = await update_document(
            doc_id=document_id,
            title=updates.title,
            content=updates.content,
            category=updates.category,
            embedding=new_embedding,
            org_id=org_id,
        )

        if not result:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Failed to update document"},
            )

        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error updating document: {str(e)}"},
        )