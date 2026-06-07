"""Database configuration — async SQLAlchemy + asyncpg."""

import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/openrouter",
)
if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        
    # asyncpg requires "ssl=" instead of "sslmode="
    DATABASE_URL = DATABASE_URL.replace("sslmode=", "ssl=")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a DB session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables (run once at startup)."""
    async with engine.begin() as conn:
        from src.db.models import (  # noqa
            User,
            ApiKey,
            Model,
            Provider,
            ModelProvider,
            Payment,
            PerformanceMetric,
            Benchmark,
            RankingSnapshot,
            IngestionRun,
            ModelPreference,
            ChatRequestLog,
            TTSAgentProfile,
            TTSAgentMessage,
            ModelUsageStat,
        )
        await conn.run_sync(Base.metadata.create_all)
