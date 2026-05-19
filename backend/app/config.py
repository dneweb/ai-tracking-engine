from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = "mongodb+srv://deep_db_user:kZNVJJI89KHJsbLA@deep.yjgn8aa.mongodb.net/?appName=Deep"
    mongodb_database: str = "ai_tracking"

    # Mistral (primary) and Groq (fallback if Mistral fails)
    mistral_api_key: str = ""
    groq_api_key: str = ""
    mistral_model: str = "mistral-small-latest"
    groq_model: str = "llama-3.3-70b-versatile"
    allowed_origins: str = "http://localhost:3000"

    # App settings
    app_name: str = "AI Tracking Engine"
    debug: bool = True

    # Model settings
    embedding_model: str = "mistral-embed"  # API-based, light-weight

    # Stripe configuration
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_starter: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_business: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

@lru_cache()
def get_settings():
    return Settings()
