"""
MongoDB database service.
Provides both sync PyMongo collections (for reports) and async functions (for API routes).
"""
from pymongo import MongoClient, DESCENDING
from pymongo.collection import Collection
import motor.motor_asyncio
import os
import json
import numpy as np
from bson import ObjectId
from dotenv import load_dotenv
import certifi
from datetime import datetime
from typing import List, Optional
import uuid

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://deep_db_user:kZNVJJI89KHJsbLA@deep.yjgn8aa.mongodb.net/?appName=Deep")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "ai_tracking")

# Get CA file from certifi to fix [SSL: CERTIFICATE_VERIFY_FAILED] on macOS
ca = certifi.where()

# ── Synchronous client (used by reports clustering, etc.) ──────────────────
_sync_client = MongoClient(MONGODB_URI, tlsCAFile=ca)
_sync_db = _sync_client[MONGODB_DATABASE]

documents_collection: Collection = _sync_db["documents"]
queries_collection: Collection = _sync_db["queries"]
resolved_topics_collection: Collection = _sync_db["resolved_topics"]
users_collection: Collection = _sync_db["users"]

# ── Async Motor client (used by FastAPI route handlers) ─────────────────────
_async_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI, tlsCAFile=ca)
_async_db = _async_client[MONGODB_DATABASE]

async_documents = _async_db["documents"]
async_queries = _async_db["queries"]
async_resolved_topics = _async_db["resolved_topics"]
async_users = _async_db["users"]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _normalize(doc: dict, exclude_embedding: bool = False) -> dict:
    """Rename _id → id, handle casing, and optionally strip the embedding field."""
    if doc is None:
        return None
    doc = dict(doc)
    
    # 1. Standardize ID
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "id" in doc:
        doc["id"] = str(doc["id"])
        
    # 2. Standardize Category casing (Category -> category)
    if "category" not in doc and "Category" in doc:
        doc["category"] = doc.pop("Category")
    if "category" not in doc:
        doc["category"] = "Uncategorized"
        
    # 3. Strip embedding if requested
    if exclude_embedding:
        doc.pop("embedding", None)
        
    # 4. Ensure timestamps exist
    if "updated_at" not in doc:
        doc["updated_at"] = doc.get("created_at", datetime.utcnow().isoformat())
    if "created_at" not in doc:
        doc["created_at"] = doc.get("updated_at", datetime.utcnow().isoformat())
        
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# QUERY LOG OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

async def get_all_queries(user_email: Optional[str] = None) -> List[dict]:
    """Return query logs ordered newest-first."""
    try:
        filt = {}
        if user_email:
            filt["user_email"] = user_email
        cursor = async_queries.find(filt, {"embedding": 0}).sort("created_at", DESCENDING)
        results = await cursor.to_list(length=None)
        return [_normalize(r) for r in results]
    except Exception as e:
        print(f"Error fetching queries: {e}")
        return []


async def add_query_log(
    question: str,
    answer: str,
    confidence: float,
    retrieved_doc_id: Optional[str] = None,
    retrieved_doc_title: Optional[str] = None,
    category: Optional[str] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
) -> Optional[dict]:
    """Insert a query log record into MongoDB."""
    try:
        doc = {
            "_id": str(uuid.uuid4()),
            "question": question,
            "answer": answer,
            "confidence_score": confidence,
            "retrieved_doc_id": retrieved_doc_id,
            "retrieved_doc_title": retrieved_doc_title,
            "category": category,
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "created_at": datetime.utcnow().isoformat(),
        }
        await async_queries.insert_one(doc)
        print(f"✅ Query logged: '{question[:50]}' | confidence: {confidence:.2f} | doc: {retrieved_doc_title}")
        return _normalize(dict(doc))
    except Exception as e:
        print(f"Error adding query log: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

async def add_document(
    title: str,
    content: str,
    category: Optional[str] = None,
    embedding: Optional[List[float]] = None,
) -> Optional[dict]:
    """Insert a new document (with embedding) into MongoDB."""
    try:
        doc = {
            "_id": str(uuid.uuid4()),
            "title": title,
            "content": content,
            "category": category,
            "embedding": embedding,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await async_documents.insert_one(doc)
        return _normalize(dict(doc), exclude_embedding=True)
    except Exception as e:
        print(f"Error adding document: {e}")
        return None


async def get_all_documents() -> List[dict]:
    """Return all documents without embeddings."""
    try:
        cursor = async_documents.find({}, {"embedding": 0}).sort("created_at", DESCENDING)
        results = await cursor.to_list(length=None)
        return [_normalize(r) for r in results]
    except Exception as e:
        print(f"Error fetching documents: {e}")
        return []


async def get_document_by_id(doc_id: str) -> Optional[dict]:
    try:
        # Try string _id first, then ObjectId
        doc = await async_documents.find_one({"_id": doc_id}, {"embedding": 0})
        if not doc:
            try:
                doc = await async_documents.find_one({"_id": ObjectId(doc_id)}, {"embedding": 0})
            except Exception:
                pass
        return _normalize(doc) if doc else None
    except Exception as e:
        print(f"Error fetching document: {e}")
        return None


async def get_document_count() -> int:
    """Return total document count."""
    try:
        return await async_documents.count_documents({})
    except Exception as e:
        print(f"Error getting document count: {e}")
        return 0


async def delete_document(doc_id: str) -> bool:
    try:
        result = await async_documents.delete_one({"_id": doc_id})
        if result.deleted_count == 0:
            try:
                result = await async_documents.delete_one({"_id": ObjectId(doc_id)})
            except Exception:
                pass
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting document {doc_id}: {e}")
        return False


async def update_document(
    doc_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    category: Optional[str] = None,
    embedding: Optional[List[float]] = None,
) -> Optional[dict]:
    try:
        data: dict = {"updated_at": datetime.utcnow().isoformat()}
        if title is not None:
            data["title"] = title
        if content is not None:
            data["content"] = content
        if category is not None:
            data["category"] = category
        if embedding is not None:
            data["embedding"] = embedding

        # Try string _id first, then ObjectId
        result = await async_documents.update_one({"_id": doc_id}, {"$set": data})
        if result.matched_count == 0:
            try:
                await async_documents.update_one({"_id": ObjectId(doc_id)}, {"$set": data})
            except Exception:
                pass

        doc = await async_documents.find_one({"_id": doc_id}, {"embedding": 0})
        if not doc:
            try:
                doc = await async_documents.find_one({"_id": ObjectId(doc_id)}, {"embedding": 0})
            except Exception:
                pass
        return _normalize(doc) if doc else None
    except Exception as e:
        print(f"Error updating document {doc_id}: {e}")
        return None


async def search_similar_documents(
    query_embedding: List[float],
    match_threshold: float = 0.1,
    match_count: int = 5,
) -> List[dict]:
    """
    Optimized cosine-similarity search across all documents using in-memory numpy.
    Filters documents in the database to reduce memory usage.
    """
    try:
        # Fetch only documents with embeddings
        cursor = async_documents.find(
            {"embedding": {"$exists": True}},
            {"_id": 1, "title": 1, "content": 1, "category": 1, "embedding": 1}
        )
        all_docs = await cursor.to_list(length=None)

        if not all_docs:
            return []

        results = []
        query_vec = np.array(query_embedding, dtype=np.float64)

        for doc in all_docs:
            embedding_data = doc.get("embedding")
            if isinstance(embedding_data, str):
                try:
                    embedding_data = json.loads(embedding_data)
                except Exception:
                    continue

            doc_vec = np.array(embedding_data, dtype=np.float64)
            similarity = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))

            if similarity >= match_threshold:
                results.append({
                    "id": str(doc["_id"]),
                    "title": doc["title"],
                    "content": doc["content"],
                    "category": doc["category"],
                    "similarity": similarity,
                })

        # Sort results by similarity and return top matches
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:match_count]

    except Exception as e:
        print(f"Error in search_similar_documents: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# USER OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

async def sync_user(
    clerk_id: str,
    email: str,
    full_name: Optional[str] = None,
) -> Optional[dict]:
    """Upsert a user record into MongoDB."""
    try:
        now = datetime.utcnow().isoformat()
        user_doc = {
            "clerk_id": clerk_id,
            "email": email,
            "full_name": full_name,
            "updated_at": now,
        }
        
        # Check if user exists
        existing = await async_users.find_one({"clerk_id": clerk_id})
        
        if existing:
            await async_users.update_one(
                {"clerk_id": clerk_id},
                {"$set": user_doc}
            )
            user_doc = {**existing, **user_doc}
        else:
            user_doc["_id"] = str(uuid.uuid4())
            user_doc["created_at"] = now
            await async_users.insert_one(user_doc)
            
        print(f"✅ User synced: {email} ({clerk_id})")
        return _normalize(user_doc)
    except Exception as e:
        print(f"Error syncing user {clerk_id}: {e}")
        return None