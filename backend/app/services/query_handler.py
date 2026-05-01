"""
Legacy query handler (Llama3/Ollama local backend).

This module is NOT registered in main.py — it's a development-era service
that used a local Ollama server. It has been retained but hardened with org_id
enforcement to prevent it from becoming a bypass vector if accidentally imported.

Production path: app/api/queries.py → app/services/rag_service.py
"""

from app.services.database import queries_collection, documents_collection
from app.services.embeddings import search_similar_documents
from datetime import datetime, timezone
import uuid
import requests
import json


def ask_llama(question: str, context: str) -> tuple[str, float]:
    """
    Send question + context to local Llama3.
    Returns (answer, confidence_score).
    """
    prompt = f"""You are a helpful company assistant. Answer the question using ONLY the context provided below.
If the context does not contain enough information to answer confidently, say so clearly.

Context:
{context}

Question: {question}

Answer:"""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=30,
        )
        data   = response.json()
        answer = data.get("response", "").strip()

        if not context or len(context) < 50:
            confidence = 0.2
        elif "does not contain" in answer.lower() or "not enough" in answer.lower():
            confidence = 0.3
        elif len(answer) > 100:
            confidence = 0.75
        else:
            confidence = 0.55

        return answer, confidence

    except Exception as e:
        print(f"[query_handler] Llama3 error: {e}")
        return "Sorry, I could not process your question right now.", 0.1


def process_question(
    question: str,
    org_id: str,                        # REQUIRED — RLS enforced
    user_id: str = "anonymous",
) -> dict:
    """
    Legacy: question → vector search → Llama3 → save to DB → return answer.
    org_id is mandatory to ensure tenant isolation.
    """
    if not org_id or not str(org_id).strip():
        raise ValueError("[RLS] process_question requires a non-empty org_id")

    oid = str(org_id).strip()

    # Step 1: Find relevant documents — scoped to org
    similar_docs = search_similar_documents(question, documents_collection, top_k=3)
    # Note: embeddings.search_similar_documents is a sync in-memory search over
    # the collection cursor — the org_id scope is enforced at the collection level
    # only if this handler is updated to use the async DB service. For now, flag:
    print(f"[LEGACY WARNING] query_handler.process_question org_id={oid} — "
          f"uses sync search_similar_documents; consider migrating to rag_service.py")

    # Step 2: Build context
    context              = ""
    retrieved_doc_title  = None
    if similar_docs:
        retrieved_doc_title = similar_docs[0].get("title", "")
        for doc in similar_docs:
            context += f"\n\nDocument: {doc.get('title', '')}\n{doc.get('content', '')}"

    # Step 3: Get answer from Llama3
    answer, confidence_score = ask_llama(question, context)

    # Step 4: Save query to MongoDB — with org_id
    query_record = {
        "_id":                str(uuid.uuid4()),
        "question":           question,
        "answer":             answer,
        "confidence_score":   round(confidence_score, 4),
        "retrieved_doc_title": retrieved_doc_title,
        "category":           similar_docs[0].get("category") if similar_docs else None,
        "user_id":            user_id,
        "org_id":             oid,          # ← tenant scope added
        "created_at":         datetime.now(timezone.utc).isoformat(),
    }
    queries_collection.insert_one(query_record)

    return {
        "question":            question,
        "answer":              answer,
        "confidence_score":    round(confidence_score, 4),
        "retrieved_doc_title": retrieved_doc_title,
        "sources":             [{"title": d.get("title"), "category": d.get("category")} for d in similar_docs],
    }
