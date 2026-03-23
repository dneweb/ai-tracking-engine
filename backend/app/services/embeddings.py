from sentence_transformers import SentenceTransformer
import numpy as np

# This runs locally, no API key needed, completely free
model = SentenceTransformer('all-MiniLM-L6-v2')

def generate_embedding(text: str) -> list:
    """Convert text to vector embedding using local model"""
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

def search_similar_documents(query_text: str, documents_collection, top_k: int = 3):
    """
    Search for similar documents using vector similarity
    Falls back to text search if vector search is not available
    """
    query_embedding = generate_embedding(query_text)
    
    try:
        # MongoDB Atlas Vector Search
        pipeline = [
            {
                "$search": {
                    "index": "default",
                    "knnBeta": {
                        "vector": query_embedding,
                        "path": "embedding",
                        "k": top_k
                    }
                }
            },
            {
                "$project": {
                    "title": 1,
                    "content": 1,
                    "category": 1,
                    "score": {"$meta": "searchScore"}
                }
            }
        ]
        results = list(documents_collection.aggregate(pipeline))
        return results
    except Exception as e:
        print(f"Vector search failed, falling back to text search: {e}")
        # Fallback to text search
        # Note: requires a text index on title/content in MongoDB
        results = list(documents_collection.find(
            {"$text": {"$search": query_text}},
            {"title": 1, "content": 1, "category": 1}
        ).limit(top_k))
        return results
