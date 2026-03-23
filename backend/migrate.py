# Migration script to move data FROM Supabase TO MongoDB Atlas
from supabase import create_client
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Connect both databases
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
mongo = MongoClient(os.getenv("MONGODB_URI"))
db = mongo[os.getenv("MONGODB_DATABASE", "ai_tracking")]

def migrate():
    print("Starting migration...")
    
    # Migrate documents
    docs = supabase.table("documents").select("*").execute().data
    if docs:
        db["documents"].insert_many(docs)
        print(f"Migrated {len(docs)} documents")
    
    # Migrate queries
    queries = supabase.table("queries").select("*").execute().data
    if queries:
        db["queries"].insert_many(queries)
        print(f"Migrated {len(queries)} queries")
    
    # Migrate users
    users = supabase.table("users").select("*").execute().data
    if users:
        db["users"].insert_many(users)
        print(f"Migrated {len(users)} users")
    
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
