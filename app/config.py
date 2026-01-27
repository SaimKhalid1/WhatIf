from pydantic import BaseModel
import os

class Settings(BaseModel):
    db_url: str = os.getenv("WHATIF_DB_URL", "sqlite:///./whatif.db")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    cors_origins: list[str] = [
        os.getenv("WHATIF_CORS_ORIGIN", "http://localhost:3000"),
        "http://127.0.0.1:3000",
    ]

settings = Settings()
