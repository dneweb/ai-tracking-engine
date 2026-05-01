import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.services.db_instance import async_db

async def main():
    orgs = await async_db.org_settings.find().to_list(100)
    print("--- ORGANIZATIONS ---")
    for o in orgs:
        print(f"ID: {o['org_id']} | Name: {o['org_name']} | Slug: {o['org_slug']}")
    
    users = await async_db.users.find().to_list(100)
    print("\n--- USERS ---")
    for u in users:
        print(f"Email: {u.get('email')} | Org: {u.get('org_id')} | Role: {u.get('role')} | Status: {u.get('status')}")

if __name__ == "__main__":
    asyncio.run(main())
