import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
URI = os.getenv("MONGODB_URI")
DB = os.getenv("MONGODB_DATABASE")

async def main():
    client = AsyncIOMotorClient(URI)
    db = client[DB]
    users = await db.users.find().to_list(length=10)
    for u in users:
        print(u)

asyncio.run(main())
