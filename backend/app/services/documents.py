from app.services.database import async_documents
from app.services.embeddings import generate_embedding
from datetime import datetime, timezone
import uuid
import PyPDF2
import io


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from PDF file bytes"""
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text.strip()


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract text from plain text file"""
    return file_bytes.decode("utf-8", errors="ignore").strip()


async def upload_document(
    title: str,
    content_text: str,
    category: str,
    org_id: str,                           # REQUIRED — RLS enforced
    uploaded_by: str = "admin",
) -> dict:
    """
    Save a document as text with embedding into MongoDB.
    org_id is mandatory — documents belong to an organisation.
    """
    if not org_id or not str(org_id).strip():
        raise ValueError("[RLS] upload_document requires a non-empty org_id")

    embedding = await generate_embedding(content_text)

    document = {
        "_id":         str(uuid.uuid4()),
        "title":       title,
        "content":     content_text,
        "category":    category,
        "embedding":   embedding,
        "org_id":      str(org_id).strip(),     # ← tenant scope
        "uploaded_by": uploaded_by,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }

    await async_documents.insert_one(document)
    return {"status": "success", "id": document["_id"], "title": title}


def get_all_documents_sync(org_id: str) -> list:
    """
    Sync version: Get all documents without embeddings, scoped to org.
    org_id is mandatory.
    """
    if not org_id or not str(org_id).strip():
        raise ValueError("[RLS] get_all_documents_sync requires a non-empty org_id")
    return list(documents_collection.find(
        {"org_id": str(org_id).strip()},
        {"embedding": 0},
    ))


def delete_document_sync(document_id: str, org_id: str) -> dict:
    """
    Sync version: Delete a document by ID, scoped to org.
    org_id is mandatory.
    """
    if not org_id or not str(org_id).strip():
        raise ValueError("[RLS] delete_document_sync requires a non-empty org_id")
    result = documents_collection.delete_one({
        "_id":    document_id,
        "org_id": str(org_id).strip(),
    })
    if result.deleted_count == 0:
        return {"status": "error", "message": "Document not found or access denied"}
    return {"status": "success", "message": "Document deleted"}

