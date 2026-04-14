import json
import httpx
from sentence_transformers import SentenceTransformer
from app.config import get_settings
import numpy as np
from typing import List, Any, Dict, Optional, Tuple

settings = get_settings()

MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

# Initialize local embedding model (for vectors)
print("Loading embedding model...", flush=True)
embedding_model = SentenceTransformer(settings.embedding_model)

def _completion_mistral(
    messages: List[Dict[str, str]],
    temperature: float,
    response_format: Optional[Dict[str, str]] = None,
) -> str:
    s = get_settings()
    body: Dict[str, Any] = {
        "model": s.mistral_model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format is not None:
        body["response_format"] = response_format
    r = httpx.post(
        MISTRAL_CHAT_URL,
        headers={
            "Authorization": f"Bearer {s.mistral_api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=120.0,
    )
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]

def _completion_groq(
    messages: List[Dict[str, str]],
    temperature: float,
    response_format: Optional[Dict[str, str]] = None,
) -> str:
    s = get_settings()
    body: Dict[str, Any] = {
        "model": s.groq_model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format is not None:
        body["response_format"] = response_format
    r = httpx.post(
        GROQ_CHAT_URL,
        headers={
            "Authorization": f"Bearer {s.groq_api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=120.0,
    )
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]

def _chat_with_fallback(
    messages: List[Dict[str, str]],
    temperature: float,
    response_format: Optional[Dict[str, str]] = None,
) -> Tuple[str, str]:
    try:
        content = _completion_mistral(messages, temperature, response_format)
        return content, get_settings().mistral_model
    except Exception as e:
        print(f"Mistral failed: {e}, using Groq instead")
        content = _completion_groq(messages, temperature, response_format)
        return content, get_settings().groq_model

def get_embedding(text: str) -> List[float]:
    """
    Convert text to vector using local model (FREE!)
    Returns: List of 384 numbers representing the text meaning
    """
    try:
        embedding = embedding_model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Convert multiple texts to vectors at once (faster)
    """
    try:
        embeddings = embedding_model.encode(texts)
        return embeddings.tolist()
    except Exception as e:
        print(f"Batch embedding error: {e}")
        return []

def chat_completion(prompt: str, context: str = "") -> dict:
    """
    Generate answer using Mistral, or Groq if Mistral fails.
    
    Args:
        prompt: User's question
        context: Retrieved document content (from RAG)
    
    Returns:
        Dictionary with answer and metadata
    """
    try:
        # Build messages
        messages = []
        
        if context:
            messages.append({
                "role": "system",
                "content": f"You are a helpful assistant. Answer the question based on this context:\n\n{context}"
            })
        else:
            messages.append({
                "role": "system",
                "content": "You are a helpful assistant."
            })
        
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        answer, model_used = _chat_with_fallback(messages, temperature=0.3)
        
        return {
            "answer": answer,
            "model": model_used,
        }
        
    except Exception as e:
        print(f"Chat completion error: {e}")
        return {
            "answer": "Sorry, I couldn't generate an answer.",
            "error": str(e)
        }

def structured_chat_completion(system_prompt: str, user_prompt: str) -> dict:
    """
    Generate structured JSON output using Mistral, or Groq if Mistral fails.
    """
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_format = {"type": "json_object"}
        content, _ = _chat_with_fallback(messages, temperature=0.1, response_format=response_format)
        
        return json.loads(content)
        
    except Exception as e:
        print(f"Structured chat completion error: {e}")
        return {"error": str(e)}

def calculate_confidence(query_embedding: List[float], doc_embedding: List[float]) -> float:
    """
    Calculate how confident we are in the answer
    Based on similarity between question and retrieved document
    
    Returns: Float between 0 and 1 (e.g., 0.85 = 85% confident)
    """
    try:
        # Convert to numpy arrays
        q = np.array(query_embedding)
        d = np.array(doc_embedding)
        
        # Calculate cosine similarity
        similarity = np.dot(q, d) / (np.linalg.norm(q) * np.linalg.norm(d))
        
        # Convert to 0-1 range (similarity is -1 to 1)
        confidence = (similarity + 1) / 2
        
        return float(confidence)
        
    except Exception as e:
        print(f"Confidence calculation error: {e}")
        return 0.5  # Default to 50% if error
