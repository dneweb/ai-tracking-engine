"""
MongoDB database service.

Row-Level Security (RLS) contract:
  - Every function that reads or writes tenant data REQUIRES a non-empty org_id.
  - _require_org_id() is called at the top of every such function and raises
    RuntimeError if org_id is absent — this makes accidental cross-tenant
    queries impossible, not just unlikely.

Provides:
  - Sync  PyMongo collections  (reports clustering, background jobs)
  - Async Motor collections    (FastAPI route handlers)
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

from .db_instance import sync_db as _sync_db, async_db as _async_db, MONGODB_URI

documents_collection:        Collection = _sync_db["documents"]
queries_collection:          Collection = _sync_db["queries"]
resolved_topics_collection:  Collection = _sync_db["resolved_topics"]
users_collection:            Collection = _sync_db["users"]

async_documents       = _async_db["documents"]
async_queries         = _async_db["queries"]
async_resolved_topics = _async_db["resolved_topics"]
async_users           = _async_db["users"]


# ─────────────────────────────────────────────────────────────────────────────
# RLS GUARD — DO NOT REMOVE
# ─────────────────────────────────────────────────────────────────────────────

def _require_org_id(org_id: Optional[str], fn_name: str = "database") -> str:
    """
    Enforce that org_id is present before executing any tenant-scoped query.
    This is the row-level security guard — it makes cross-tenant leaks impossible
    by failing loudly rather than silently returning all-tenant data.
    """
    if not org_id or not str(org_id).strip():
        raise RuntimeError(
            f"[RLS VIOLATION] '{fn_name}' called without a valid org_id. "
            "All tenant-scoped database operations require an org_id. "
            "Ensure TenantMiddleware is running and the JWT contains 'org_id'."
        )
    return str(org_id).strip()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _normalize(doc: dict, exclude_embedding: bool = False) -> dict:
    """Rename _id → id, normalise casing, optionally strip embeddings."""
    if doc is None:
        return None
    doc = dict(doc)

    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "id" in doc:
        doc["id"] = str(doc["id"])

    if "category" not in doc and "Category" in doc:
        doc["category"] = doc.pop("Category")
    if "category" not in doc:
        doc["category"] = "Uncategorized"

    if exclude_embedding:
        doc.pop("embedding", None)

    now = datetime.utcnow().isoformat()
    doc.setdefault("updated_at", doc.get("created_at", now))
    doc.setdefault("created_at", doc.get("updated_at", now))

    return doc


# ─────────────────────────────────────────────────────────────────────────────
# QUERY LOG OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

async def get_all_queries(
    org_id: str,                           # REQUIRED — RLS enforced
    user_email: Optional[str] = None,
) -> List[dict]:
    """Return query logs for an org, newest-first. org_id is mandatory."""
    oid = _require_org_id(org_id, "get_all_queries")
    try:
        filt: dict = {"org_id": oid}
        if user_email:
            filt["user_email"] = user_email
        cursor = async_queries.find(filt, {"embedding": 0}).sort("created_at", DESCENDING)
        results = await cursor.to_list(length=1000)
        return [_normalize(r) for r in results]
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] get_all_queries error: {e}")
        return []


async def add_query_log(
    question: str,
    answer: str,
    confidence: float,
    org_id: str,                           # REQUIRED — RLS enforced
    retrieved_doc_id: Optional[str] = None,
    retrieved_doc_title: Optional[str] = None,
    category: Optional[str] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> Optional[dict]:
    """Insert a query log record. org_id is mandatory."""
    oid = _require_org_id(org_id, "add_query_log")
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
            "org_id": oid,
            "conversation_id": conversation_id,
            "created_at": datetime.utcnow().isoformat(),
        }
        await async_queries.insert_one(doc)
        print(
            f"✅ Query logged: '{question[:50]}' | "
            f"confidence: {confidence:.2f} | org: {oid}"
        )
        return _normalize(dict(doc))
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] add_query_log error: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

async def add_document(
    title: str,
    content: str,
    org_id: str,                           # REQUIRED — RLS enforced
    category: Optional[str] = None,
    embedding: Optional[List[float]] = None,
) -> Optional[dict]:
    """Insert a new document. org_id is mandatory."""
    oid = _require_org_id(org_id, "add_document")
    try:
        doc = {
            "_id": str(uuid.uuid4()),
            "title": title,
            "content": content,
            "category": category,
            "embedding": embedding,
            "org_id": oid,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await async_documents.insert_one(doc)
        return _normalize(dict(doc), exclude_embedding=True)
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] add_document error: {e}")
        return None


async def get_all_documents(org_id: str) -> List[dict]:
    """Return all documents for an org (no embeddings). org_id is mandatory."""
    oid = _require_org_id(org_id, "get_all_documents")
    try:
        cursor = async_documents.find(
            {"org_id": oid}, {"embedding": 0}
        ).sort("created_at", DESCENDING)
        results = await cursor.to_list(length=1000)
        return [_normalize(r) for r in results]
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] get_all_documents error: {e}")
        return []


async def get_document_by_id(doc_id: str, org_id: str) -> Optional[dict]:
    """Fetch a document by ID, scoped to org. org_id is mandatory."""
    oid = _require_org_id(org_id, "get_document_by_id")
    try:
        # Try string _id first
        doc = await async_documents.find_one(
            {"_id": doc_id, "org_id": oid}, {"embedding": 0}
        )
        if not doc:
            # Try ObjectId
            try:
                doc = await async_documents.find_one(
                    {"_id": ObjectId(doc_id), "org_id": oid}, {"embedding": 0}
                )
            except Exception:
                pass
        return _normalize(doc) if doc else None
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] get_document_by_id error: {e}")
        return None


async def get_document_count(org_id: str) -> int:
    """Return document count scoped to org. org_id is mandatory."""
    oid = _require_org_id(org_id, "get_document_count")
    try:
        return await async_documents.count_documents({"org_id": oid})
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] get_document_count error: {e}")
        return 0


async def delete_document(doc_id: str, org_id: str) -> bool:
    """Delete a document by ID, scoped to org. org_id is mandatory."""
    oid = _require_org_id(org_id, "delete_document")
    try:
        result = await async_documents.delete_one({"_id": doc_id, "org_id": oid})
        if result.deleted_count == 0:
            try:
                result = await async_documents.delete_one(
                    {"_id": ObjectId(doc_id), "org_id": oid}
                )
            except Exception:
                pass
        return result.deleted_count > 0
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] delete_document {doc_id} error: {e}")
        return False


async def update_document(
    doc_id: str,
    org_id: str,                           # REQUIRED — RLS enforced
    title: Optional[str] = None,
    content: Optional[str] = None,
    category: Optional[str] = None,
    embedding: Optional[List[float]] = None,
) -> Optional[dict]:
    """Update a document, scoped to org. org_id is mandatory."""
    oid = _require_org_id(org_id, "update_document")
    try:
        data: dict = {"updated_at": datetime.utcnow().isoformat()}
        if title is not None:     data["title"]     = title
        if content is not None:   data["content"]   = content
        if category is not None:  data["category"]  = category
        if embedding is not None: data["embedding"] = embedding

        filt = {"_id": doc_id, "org_id": oid}
        result = await async_documents.update_one(filt, {"$set": data})
        if result.matched_count == 0:
            try:
                filt["_id"] = ObjectId(doc_id)
                await async_documents.update_one(filt, {"$set": data})
            except Exception:
                pass

        # Re-fetch updated doc (no embedding)
        doc = await async_documents.find_one({"_id": doc_id, "org_id": oid}, {"embedding": 0})
        if not doc:
            try:
                doc = await async_documents.find_one(
                    {"_id": ObjectId(doc_id), "org_id": oid}, {"embedding": 0}
                )
            except Exception:
                pass
        return _normalize(doc) if doc else None
    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] update_document {doc_id} error: {e}")
        return None


async def search_similar_documents(
    query_embedding: List[float],
    org_id: str,                           # REQUIRED — RLS enforced
    match_threshold: float = 0.1,
    match_count: int = 5,
) -> List[dict]:
    """
    Cosine-similarity search across documents scoped to org.
    org_id is mandatory — search will never bleed across tenants.
    """
    oid = _require_org_id(org_id, "search_similar_documents")
    try:
        cursor = async_documents.find(
            {"embedding": {"$exists": True}, "org_id": oid},
            {"_id": 1, "title": 1, "content": 1, "category": 1, "embedding": 1},
        )
        # to_list(length=None) can fail in some Motor versions; use a large limit
        all_docs = await cursor.to_list(length=1000)

        if not all_docs:
            print(f"[DB] No documents found for org_id: {oid}")
            return []

        query_vec = np.array(query_embedding, dtype=np.float64)
        results = []

        for doc in all_docs:
            embedding_data = doc.get("embedding")
            if isinstance(embedding_data, str):
                try:
                    embedding_data = json.loads(embedding_data)
                except Exception:
                    continue

            doc_vec = np.array(embedding_data, dtype=np.float64)
            
            # Dimension check to prevent crash if model changed
            if query_vec.shape != doc_vec.shape:
                print(f"[DB] Dimension mismatch: query({query_vec.shape}) vs doc({doc_vec.shape})")
                continue

            norm = np.linalg.norm(query_vec) * np.linalg.norm(doc_vec)
            if norm == 0:
                continue
            similarity = float(np.dot(query_vec, doc_vec) / norm)
            # Clip to [0.0, 1.0] to satisfy Pydantic validation (le=1.0)
            similarity = max(0.0, min(1.0, similarity))


            if similarity >= match_threshold:
                results.append({
                    "id":         str(doc["_id"]),
                    "title":      doc["title"],
                    "content":    doc["content"],
                    "category":   doc.get("category", "Uncategorized"),
                    "similarity": similarity,
                })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:match_count]

    except RuntimeError:
        raise
    except Exception as e:
        print(f"[DB] search_similar_documents error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# USER OPERATIONS  (not tenant-scoped — users belong to Clerk orgs)
# ─────────────────────────────────────────────────────────────────────────────

async def sync_user(
    clerk_id: str,
    email: str,
    full_name: Optional[str] = None,
    org_id:    Optional[str] = None,
) -> Optional[dict]:
    """
    Sync a Clerk user with the backend database.
    Preserves existing role and status to prevent overwrites from automated syncs.
    """
    try:
        now = datetime.utcnow().isoformat()
        
        # We look for an existing record by clerk_id. 
        # If we have an org_id context, we scope the lookup to that org.
        filt = {"clerk_id": clerk_id}
        if org_id:
            filt["org_id"] = org_id
            
        existing = await async_users.find_one(filt)
        
        user_doc = {
            "clerk_id":  clerk_id,
            "email":     email,
            "full_name": full_name,
            "updated_at": now,
        }
        
        if org_id:
            user_doc["org_id"] = org_id

        if existing:
            # Atomic update: only set the basic profile fields. 
            # We explicitly do NOT overwrite role/status unless they are missing.
            update_data = {"$set": user_doc}
            
            # If for some reason role/status is missing in DB but available from Clerk (future), 
            # we could add $setOnInsert or similar logic, but for now we just maintain stability.
            await async_users.update_one({"_id": existing["_id"]}, update_data)
            user_doc = {**existing, **user_doc}
        else:
            # New user entry
            user_doc["_id"]        = str(uuid.uuid4())
            user_doc["created_at"] = now
            user_doc.setdefault("role", "viewer")   # Default for untagged syncs
            user_doc.setdefault("status", "pending") # Default to pending until approved
            await async_users.insert_one(user_doc)

        print(f"✅ User synced: {email} ({clerk_id}) | Org: {org_id or 'none'}")
        return _normalize(user_doc)
    except Exception as e:
        print(f"[DB] sync_user {clerk_id} error: {e}")
        return None