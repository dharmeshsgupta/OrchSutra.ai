"""Seed the database with initial models, providers, and usage stats."""

from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Model, Provider, ModelProvider, ModelUsageStat


SEED_PROVIDERS = [
    {"id": "p1", "name": "OpenAI", "website": "https://openai.com"},
    {"id": "p2", "name": "Anthropic", "website": "https://anthropic.com"},
    {"id": "p3", "name": "Google", "website": "https://deepmind.google"},
    {"id": "p4", "name": "Meta", "website": "https://ai.meta.com"},
]

SEED_MODELS = [
    {
        "id": "m1", "name": "GPT-4o", "slug": "gpt-4o",
        "company_name": "OpenAI", "company_website": "https://openai.com",
        "featured": True, "context_window": 128000, "max_tokens": 4096,
        "description": "OpenAI's flagship multimodal model with vision, audio and text.",
    },
    {
        "id": "m2", "name": "GPT-4 Turbo", "slug": "gpt-4-turbo",
        "company_name": "OpenAI", "company_website": "https://openai.com",
        "context_window": 128000, "max_tokens": 4096,
        "description": "High-intelligence GPT-4 optimised for speed and cost.",
    },
    {
        "id": "m3", "name": "Claude 3.5 Sonnet", "slug": "claude-3-5-sonnet",
        "company_name": "Anthropic", "company_website": "https://anthropic.com",
        "featured": True, "context_window": 200000, "max_tokens": 8192,
        "description": "Anthropic's smartest model — superior reasoning and coding.",
    },
    {
        "id": "m4", "name": "Claude 3 Opus", "slug": "claude-3-opus",
        "company_name": "Anthropic", "company_website": "https://anthropic.com",
        "context_window": 200000, "max_tokens": 4096,
        "description": "Most powerful Claude model for complex tasks.",
    },
    {
        "id": "m5", "name": "Gemini 1.5 Pro", "slug": "gemini-1-5-pro",
        "company_name": "Google", "company_website": "https://deepmind.google",
        "featured": True, "context_window": 1000000, "max_tokens": 8192,
        "description": "Google's long-context model with 1M token window.",
    },
    {
        "id": "m6", "name": "Llama 3.3 70B", "slug": "llama-3-3-70b",
        "company_name": "Meta", "company_website": "https://ai.meta.com",
        "context_window": 128000, "max_tokens": 4096,
        "description": "Meta's powerful open-source model for complex tasks.",
    },
]

SEED_MODEL_PROVIDERS = [
    {"id": "mp1", "model_id": "m1", "provider_id": "p1", "input_token_cost": 0.005, "output_token_cost": 0.015},
    {"id": "mp2", "model_id": "m2", "provider_id": "p1", "input_token_cost": 0.01, "output_token_cost": 0.03},
    {"id": "mp3", "model_id": "m3", "provider_id": "p2", "input_token_cost": 0.003, "output_token_cost": 0.015},
    {"id": "mp4", "model_id": "m4", "provider_id": "p2", "input_token_cost": 0.015, "output_token_cost": 0.075},
    {"id": "mp5", "model_id": "m5", "provider_id": "p3", "input_token_cost": 0.0035, "output_token_cost": 0.0105},
    {"id": "mp6", "model_id": "m6", "provider_id": "p4", "input_token_cost": 0.0, "output_token_cost": 0.0},
]

# Realistic weekly token counts: {model_id: (last_week_tokens, this_week_tokens)}
SEED_USAGE_STATS = {
    "m1": (129_300_000_000, 146_600_000_000),   # GPT-4o:          +13%
    "m2": (95_000_000_000, 89_200_000_000),      # GPT-4 Turbo:     -6%
    "m3": (430_000_000_000, 503_800_000_000),    # Claude 3.5:      +17%
    "m4": (55_000_000_000, 61_200_000_000),      # Claude 3 Opus:   +11%
    "m5": (249_000_000_000, 270_600_000_000),    # Gemini 1.5 Pro:  +9%
    "m6": (93_100_000_000, 89_200_000_000),      # Llama 3.3 70B:   -4%
}


async def seed_database(db: AsyncSession):
    """Insert seed data if tables are empty."""
    p_result = await db.execute(select(Provider).limit(1))
    if p_result.scalar_one_or_none() is None:
        for p in SEED_PROVIDERS:
            db.add(Provider(**p))
        await db.flush()

    m_result = await db.execute(select(Model).limit(1))
    if m_result.scalar_one_or_none() is None:
        for m in SEED_MODELS:
            db.add(Model(**m))
        await db.flush()
        for mp in SEED_MODEL_PROVIDERS:
            db.add(ModelProvider(**mp))
        await db.flush()
        print("Database seeded with models & providers")

    # Seed usage stats (two weeks: last week + this week)
    stat_result = await db.execute(select(ModelUsageStat).limit(1))
    if stat_result.scalar_one_or_none() is None:
        today = date.today()
        # ISO week Monday for this week and last week
        this_monday = today - timedelta(days=today.weekday())
        last_monday = this_monday - timedelta(weeks=1)

        for model_id, (last_tokens, this_tokens) in SEED_USAGE_STATS.items():
            db.add(ModelUsageStat(
                model_id=model_id,
                week_start=last_monday,
                total_tokens=last_tokens,
                request_count=int(last_tokens / 800),
            ))
            db.add(ModelUsageStat(
                model_id=model_id,
                week_start=this_monday,
                total_tokens=this_tokens,
                request_count=int(this_tokens / 800),
            ))
        await db.commit()
        print("Database seeded with model usage stats")
