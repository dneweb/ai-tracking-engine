import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services.db_instance import async_db

async def main():
    users = await async_db.users.find().to_list(length=10)
    for u in users:
        print(f"User: {u.get('email')}, org: {u.get('org_id')}, role: {u.get('role')}")

asyncio.run(main())
