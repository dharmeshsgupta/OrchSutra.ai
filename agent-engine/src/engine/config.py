from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    LLM_ROUTER_BASE_URL: str = "http://localhost:3000"
    ROUTER_CHAT_PATH: str = "/chat/completions"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001"
    ENGINE_MEMORY_DB_PATH: str = "./.engine/memory.sqlite3"
    ENGINE_VECTORSTORE_PATH: str = "./.engine/vectorstore"
    ENGINE_AGENTS_DB_PATH: str = "./.engine/agents.sqlite3"
    USE_VECTOR_RAG: bool = True
    DATABASE_URL: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

config = Settings()
