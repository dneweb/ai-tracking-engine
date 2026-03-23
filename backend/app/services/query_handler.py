from app.services.database import queries_collection, documents_collection
from app.services.embeddings import search_similar_documents
from datetime import datetime, timezone
import uuid
import requests
import json

def ask_llama(question: str, context: str) -> tuple[str, float]:
    """
    Send question + context to local Llama3
    Returns (answer, confidence_score)
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
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        data = response.json()
        answer = data.get("response", "").strip()
        
        # Calculate confidence based on context quality
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
        print(f"Llama3 error: {e}")
        return "Sorry, I could not process your question right now.", 0.1

def process_question(question: str, user_id: str = "anonymous") -> dict:
    """
    Main function: take question → find docs → ask Llama3 → save to DB → return answer
    """
    # Step 1: Find relevant documents using vector search
    similar_docs = search_similar_documents(question, documents_collection, top_k=3)
    
    # Step 2: Build context from found documents
    context = ""
    retrieved_doc_title = None
    if similar_docs:
        retrieved_doc_title = similar_docs[0].get("title", "")
        for doc in similar_docs:
            context += f"\n\nDocument: {doc.get('title', '')}\n{doc.get('content', '')}"
    
    # Step 3: Get answer from local Llama3
    answer, confidence_score = ask_llama(question, context)
    
    # Step 4: Save query to MongoDB
    query_record = {
        "_id": str(uuid.uuid4()),
        "question": question,
        "answer": answer,
        "confidence_score": round(confidence_score, 4),
        "retrieved_doc_title": retrieved_doc_title,
        "category": similar_docs[0].get("category") if similar_docs else None,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    queries_collection.insert_one(query_record)
    
    return {
        "question": question,
        "answer": answer,
        "confidence_score": round(confidence_score, 4),
        "retrieved_doc_title": retrieved_doc_title,
        "sources": [{"title": d.get("title"), "category": d.get("category")} for d in similar_docs]
    }
