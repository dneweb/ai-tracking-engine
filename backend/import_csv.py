import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv("MONGODB_URI", "mongodb+srv://deep_db_user:kZNVJJI89KHJsbLA@deep.yjgn8aa.mongodb.net/?appName=Deep"))
db = client["ai_tracking"]

# CSV file paths
csv_files = {
    "users": "/Users/commerciaxinfotech/Downloads/users_rows.csv",
    "queries": "/Users/commerciaxinfotech/Downloads/queries_rows.csv",
    "documents": "/Users/commerciaxinfotech/Downloads/documents_rows.csv",
}

for collection_name, file_path in csv_files.items():
    try:
        # Read CSV
        df = pd.read_csv(file_path)

        # Clean NaN values — MongoDB doesn't accept NaN
        df = df.where(pd.notnull(df), None)

        # Clear existing data in collection before importing
        db[collection_name].delete_many({})

        # Insert records
        records = df.to_dict("records")
        if records:
            db[collection_name].insert_many(records)
            print(f"✅ {collection_name}: {len(records)} records imported successfully")
        else:
            print(f"⚠️ {collection_name}: CSV file is empty")

    except FileNotFoundError:
        print(f"❌ {collection_name}: File not found at {file_path}")
    except Exception as e:
        print(f"❌ {collection_name}: Error — {str(e)}")

print("\nDone! Check your MongoDB Atlas dashboard to verify.")
