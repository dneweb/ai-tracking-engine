from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = "mongodb+srv://deep_db_user:kZNVJJI89KHJsbLA@deep.yjgn8aa.mongodb.net/?appName=Deep"
    mongodb_database: str = "ai_tracking"

    # Ollama (local LLM - no API key needed!)
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3"   # matches OLLAMA_MODEL in .env

    # App settings
    app_name: str = "AI Tracking Engine"
    debug: bool = True

    # Model settings
    embedding_model: str = "all-MiniLM-L6-v2"  # Local, free
    chat_model: str = "llama3"                  # Local Ollama model

    model_config = {"env_file": ".env", "extra": "ignore"}

@lru_cache()
def get_settings():
    return Settings()
