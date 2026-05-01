# Migration to add org_id to documents collection
# Since this is MongoDB, not PostgreSQL, this is a Python script to update the collection

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "ai_tracking")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DATABASE]

# Add org_id to all existing documents
# For existing data, set org_id to "default_org" or handle as needed
# In production, you might need to backfill based on user ownership

db.documents.update_many(
    {"org_id": {"$exists": False}},
    {"$set": {"org_id": "default_org"}}  # Or handle appropriately
)

print("Added org_id to documents collection")

# Note: In MongoDB, we don't have indexes like SQL, but we can create them if needed
# db.documents.create_index("org_id")