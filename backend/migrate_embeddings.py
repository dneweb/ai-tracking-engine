import asyncio
import os
import sys
from typing import List

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.database import async_documents
from app.services.ai_service import get_embeddings_batch
from app.config import get_settings

async def migrate_embeddings():
    """
    Migration script to update all existing document embeddings to the new API-based model (Mistral).
    This script:
    1. Fetches all documents from MongoDB.
    2. Generates new embeddings using the Mistral API.
    3. Updates the documents in MongoDB with the new embeddings.
    """
    print("🚀 Starting embedding migration...")
    
    # 1. Fetch all documents
    cursor = async_documents.find({}, {"_id": 1, "content": 1, "title": 1})
    documents = await cursor.to_list(length=1000)
    
    if not documents:
        print("ℹ️ No documents found to migrate.")
        return

    print(f"📄 Found {len(documents)} documents to re-embed.")
    
    # 2. Extract contents and generate embeddings in batches
    # Mistral API has limits, so we batch them
    batch_size = 10
    total_updated = 0
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        contents = [doc["content"] for doc in batch]
        
        print(f"⏳ Generating embeddings for batch {i//batch_size + 1} ({len(batch)} docs)...")
        
        try:
            new_embeddings = await get_embeddings_batch(contents)
            
            if len(new_embeddings) != len(batch):
                print(f"❌ Error: Expected {len(batch)} embeddings, but got {len(new_embeddings)}.")
                continue
            
            # 3. Update MongoDB
            for doc, emb in zip(batch, new_embeddings):
                await async_documents.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"embedding": emb}}
                )
                total_updated += 1
                
            print(f"✅ Updated {total_updated}/{len(documents)} documents.")
            
        except Exception as e:
            print(f"❌ Batch update failed: {e}")
            
    print(f"🎉 Migration complete! {total_updated} documents updated.")

if __name__ == "__main__":
    asyncio.run(migrate_embeddings())
