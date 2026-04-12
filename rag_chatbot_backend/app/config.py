from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "RAG Chatbot Backend"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    database_url: str

    # Backward-compatible with older .env files.
    default_user_id: str | None = None

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    admin_seed_user_id: str = "00000000-0000-0000-0000-000000000001"
    admin_seed_username: str = "admin"
    admin_seed_email: str = "admin@company.com"
    admin_seed_password: str = "admin123"

    gemini_api_key: str
    gemini_chat_model: str = "gemini-2.0-flash"
    gemini_title_model: str = "gemini-1.5-flash"

    ollama_base_url: str = "http://localhost:11434"
    ollama_embed_model: str = "embeddinggemma"

    chunk_size: int = 1000
    chunk_overlap: int = 200
    semantic_chunking_enabled: bool = True
    semantic_similarity_threshold: float = 0.22
    semantic_min_sentences_per_chunk: int = 2
    top_k_chunks: int = 5

    storage_dir: str = "storage/uploads"

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
