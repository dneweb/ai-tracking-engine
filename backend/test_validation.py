import asyncio
import sys
import os

# Add the backend path to sys.path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.database import get_all_documents
from app.models.document import DocumentResponse

async def main():
    docs = await get_all_documents()
    print(f"Got {len(docs)} documents from DB")
    for d in docs:
        try:
            DocumentResponse(**d)
        except Exception as e:
            print(f"Validation failed for document {d.get('id')}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
