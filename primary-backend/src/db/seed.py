"""Seed the database with initial models and providers."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Model, Provider, ModelProvider


SEED_PROVIDERS = [
    {"id": "p1", "name": "OpenAI", "website": "https://openai.com"},
    {"id": "p2", "name": "Anthropic", "website": "https://anthropic.com"},
    {"id": "p3", "name": "Google", "website": "https://deepmind.google"},
    {"id": "p4", "name": "Meta", "website": "https://ai.meta.com"},
]

SEED_MODELS = [
    {"id": "m1", "name": "GPT-4o", "slug": "gpt-4o", "company_name": "OpenAI", "company_website": "https://openai.com"},
    {"id": "m2", "name": "GPT-4 Turbo", "slug": "gpt-4-turbo", "company_name": "OpenAI", "company_website": "https://openai.com"},
    {"id": "m3", "name": "Claude 3.5 Sonnet", "slug": "claude-3.5-sonnet", "company_name": "Anthropic", "company_website": "https://anthropic.com"},
    {"id": "m4", "name": "Claude 3 Opus", "slug": "claude-3-opus", "company_name": "Anthropic", "company_website": "https://anthropic.com"},
    {"id": "m5", "name": "Gemini 1.5 Pro", "slug": "gemini-1.5-pro", "company_name": "Google", "company_website": "https://deepmind.google"},
    {"id": "m6", "name": "Llama 3.1 405B", "slug": "llama-3.1-405b", "company_name": "Meta", "company_website": "https://ai.meta.com"},
]

SEED_MODEL_PROVIDERS = [
    {"id": "mp1", "model_id": "m1", "provider_id": "p1", "input_token_cost": 0.005, "output_token_cost": 0.015},
    {"id": "mp2", "model_id": "m2", "provider_id": "p1", "input_token_cost": 0.01, "output_token_cost": 0.03},
    {"id": "mp3", "model_id": "m3", "provider_id": "p2", "input_token_cost": 0.003, "output_token_cost": 0.015},
    {"id": "mp4", "model_id": "m4", "provider_id": "p2", "input_token_cost": 0.015, "output_token_cost": 0.075},
    {"id": "mp5", "model_id": "m5", "provider_id": "p3", "input_token_cost": 0.0035, "output_token_cost": 0.0105},
    {"id": "mp6", "model_id": "m6", "provider_id": "p4", "input_token_cost": 0.0, "output_token_cost": 0.0},
]


async def seed_database(db: AsyncSession):
    """Insert seed data if tables are empty."""
    result = await db.execute(select(Provider).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # already seeded

    for p in SEED_PROVIDERS:
        db.add(Provider(**p))
    for m in SEED_MODELS:
        db.add(Model(**m))
    await db.flush()
    for mp in SEED_MODEL_PROVIDERS:
        db.add(ModelProvider(**mp))
    await db.commit()
    print("✅ Database seeded with models & providers")
