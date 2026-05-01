# Migration to add org_id to resolved_topics collection

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "ai_tracking")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DATABASE]

db.resolved_topics.update_many(
    {"org_id": {"$exists": False}},
    {"$set": {"org_id": "default_org"}}
)

print("Added org_id to resolved_topics collection")