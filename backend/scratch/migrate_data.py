import asyncio
import os
import sys
sys.path.append(os.getcwd())
from app.services.db_instance import async_db

async def main():
    TARGET_ORG = "org_efae11f2be5b4bdf" # Friends & co
    
    # Migrate documents
    d_res = await async_db.documents.update_many(
        {"$or": [{"org_id": {"$exists": False}}, {"org_id": None}, {"org_id": "NONE"}]},
        {"$set": {"org_id": TARGET_ORG}}
    )
    
    # Migrate queries
    q_res = await async_db.queries.update_many(
        {"$or": [{"org_id": {"$exists": False}}, {"org_id": None}, {"org_id": "NONE"}]},
        {"$set": {"org_id": TARGET_ORG}}
    )
    
    print(f"✅ Successfully migrated {d_res.modified_count} documents to {TARGET_ORG}")
    print(f"✅ Successfully migrated {q_res.modified_count} queries to {TARGET_ORG}")

if __name__ == "__main__":
    asyncio.run(main())
