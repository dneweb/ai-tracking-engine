import asyncio
import os
import sys
sys.path.append(os.getcwd())
from app.services.db_instance import async_db

async def main():
    docs = await async_db.documents.find().to_list(100)
    print("--- DOCUMENTS ---")
    counts = {}
    for d in docs:
        oid = d.get('org_id', 'NONE')
        counts[oid] = counts.get(oid, 0) + 1
    
    for oid, count in counts.items():
        print(f"Org ID: {oid} | Count: {count}")

if __name__ == "__main__":
    asyncio.run(main())
