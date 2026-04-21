"""Database configuration — async SQLAlchemy + asyncpg."""

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/openrouter",
)

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
        )
        await conn.run_sync(Base.metadata.create_all)
