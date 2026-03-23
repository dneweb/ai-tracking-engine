import ollama
from sentence_transformers import SentenceTransformer
from app.config import get_settings
import numpy as np
from typing import List

settings = get_settings()

# Ollama runs locally - no API key needed!

# Initialize local embedding model (for vectors)
print("Loading embedding model...", flush=True)
embedding_model = SentenceTransformer(settings.embedding_model)

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
    Generate answer using local Ollama Llama 3 (FREE, PRIVATE & FAST!)
    
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
        
        # Call local Ollama API
        response = ollama.chat(
            model=settings.chat_model,
            messages=messages,
            options={"temperature": 0.3}  # Lower = more factual
        )
        
        answer = response['message']['content']
        
        return {
            "answer": answer,
            "model": settings.chat_model,
        }
        
    except Exception as e:
        print(f"Chat completion error: {e}")
        return {
            "answer": "Sorry, I couldn't generate an answer.",
            "error": str(e)
        }

def structured_chat_completion(system_prompt: str, user_prompt: str) -> dict:
    """
    Generate structured JSON output using local Ollama.
    """
    try:
        import json
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # We tell Ollama to format output as JSON
        response = ollama.chat(
            model=settings.chat_model,
            messages=messages,
            format='json',
            options={"temperature": 0.1} # very low temp for structured data
        )
        
        content = response['message']['content']
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
