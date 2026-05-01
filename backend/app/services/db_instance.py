import os
import certifi
import motor.motor_asyncio
from pymongo import MongoClient

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://deep_db_user:kZNVJJI89KHJsbLA@deep.yjgn8aa.mongodb.net/?appName=Deep"
)
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "ai_tracking")

ca = certifi.where()

# ── Synchronous client
_sync_client = MongoClient(MONGODB_URI, tlsCAFile=ca)
sync_db = _sync_client[MONGODB_DATABASE]

# ── Async Motor client
_async_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI, tlsCAFile=ca)
async_db = _async_client[MONGODB_DATABASE]
