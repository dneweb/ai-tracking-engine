from app.services.database import documents_collection
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

def upload_document(title: str, content_text: str, category: str, uploaded_by: str = "admin") -> dict:
    """
    Save document as text with embedding into MongoDB
    NO file storage — only text is saved
    """
    # Generate vector embedding from text
    embedding = generate_embedding(content_text)
    
    document = {
        "_id": str(uuid.uuid4()),
        "title": title,
        "content": content_text,      # Full text stored here
        "category": category,
        "embedding": embedding,        # Vector stored here
        "uploaded_by": uploaded_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    documents_collection.insert_one(document)
    return {"status": "success", "id": document["_id"], "title": title}

def get_all_documents() -> list:
    """Get all documents without embeddings (for listing)"""
    return list(documents_collection.find(
        {},
        {"embedding": 0}  # Exclude embedding from list view
    ))

def delete_document(document_id: str) -> dict:
    """Delete a document by ID"""
    result = documents_collection.delete_one({"_id": document_id})
    if result.deleted_count == 0:
        return {"status": "error", "message": "Document not found"}
    return {"status": "success", "message": "Document deleted"}
