"""Models service — reads models / providers from PostgreSQL."""

from typing import List, Dict, Optional
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from src.db.models import Model, Provider, ModelProvider, ModelUsageStat
from .schemas import CreateModelRequest


def _format_tokens(n: int) -> str:
    """Format a raw token count into a human-readable label."""
    if n >= 1_000_000_000_000:
        return f"{n / 1_000_000_000_000:.1f}T"
    if n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.1f}B"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


def _trend_label(pct: float) -> str:
    if pct > 0:
        return f"+{pct:.0f}%"
    if pct < 0:
        return f"{pct:.0f}%"
    return "0%"


class ModelsService:
    @staticmethod
    async def get_models(db: AsyncSession) -> List[Dict]:
        result = await db.execute(select(Model).order_by(Model.name))
        models = result.scalars().all()
        return [
            {
                "id": str(m.id),
                "name": m.name,
                "slug": m.slug,
                "description": m.description,
                "context_window": m.context_window,
                "speed_rating": m.speed_rating,
                "featured": m.featured,
                "logo_url": m.logo_url,
                "release_date": m.release_date,
                "max_tokens": m.max_tokens,
                "company_name": m.company_name,
                "priority": m.priority,
                "fallback_group": m.fallback_group,
                "is_active": m.is_active,
            }
            for m in models
        ]

    @staticmethod
    async def create_model(db: AsyncSession, payload: CreateModelRequest) -> Dict:
        model = Model(
            name=payload.name,
            slug=payload.slug,
            company_name=payload.company_name,
            description=payload.description,
            context_window=payload.context_window,
            max_tokens=payload.max_tokens,
            featured=payload.featured,
            priority=payload.priority,
            fallback_group=payload.fallback_group,
            capabilities=payload.capabilities,
            is_active=payload.is_active,
        )
        db.add(model)
        await db.flush()

        if payload.provider_id:
            mp = ModelProvider(
                model_id=model.id,
                provider_id=payload.provider_id,
                provider_model_id=payload.provider_model_id,
                input_token_cost=payload.input_token_cost,
                output_token_cost=payload.output_token_cost,
                is_active=True,
            )
            db.add(mp)

        await db.commit()
        await db.refresh(model)
        return {
            "id": str(model.id),
            "name": model.name,
            "slug": model.slug,
            "description": model.description,
            "context_window": model.context_window,
            "featured": model.featured,
            "speed_rating": model.speed_rating,
            "logo_url": model.logo_url,
            "release_date": model.release_date,
            "max_tokens": model.max_tokens,
            "company_name": model.company_name,
            "priority": model.priority,
            "fallback_group": model.fallback_group,
            "is_active": model.is_active,
        }

    @staticmethod
    async def set_model_active(db: AsyncSession, model_id: str, is_active: bool) -> Optional[Dict]:
        result = await db.execute(select(Model).where(Model.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            return None
        model.is_active = is_active
        await db.commit()
        await db.refresh(model)
        return {
            "id": str(model.id),
            "name": model.name,
            "slug": model.slug,
            "description": model.description,
            "context_window": model.context_window,
            "featured": model.featured,
            "speed_rating": model.speed_rating,
            "logo_url": model.logo_url,
            "release_date": model.release_date,
            "max_tokens": model.max_tokens,
            "company_name": model.company_name,
            "priority": model.priority,
            "fallback_group": model.fallback_group,
            "is_active": model.is_active,
        }

    @staticmethod
    async def update_model_priority(db: AsyncSession, model_id: str, priority: int) -> Optional[Dict]:
        result = await db.execute(select(Model).where(Model.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            return None
        model.priority = priority
        await db.commit()
        await db.refresh(model)
        return {
            "id": str(model.id),
            "name": model.name,
            "slug": model.slug,
            "description": model.description,
            "context_window": model.context_window,
            "featured": model.featured,
            "speed_rating": model.speed_rating,
            "logo_url": model.logo_url,
            "release_date": model.release_date,
            "max_tokens": model.max_tokens,
            "company_name": model.company_name,
            "priority": model.priority,
            "fallback_group": model.fallback_group,
            "is_active": model.is_active,
        }

    @staticmethod
    async def update_model_fallback(db: AsyncSession, model_id: str, fallback_group: Optional[str]) -> Optional[Dict]:
        result = await db.execute(select(Model).where(Model.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            return None
        model.fallback_group = fallback_group
        await db.commit()
        await db.refresh(model)
        return {
            "id": str(model.id),
            "name": model.name,
            "slug": model.slug,
            "description": model.description,
            "context_window": model.context_window,
            "featured": model.featured,
            "speed_rating": model.speed_rating,
            "logo_url": model.logo_url,
            "release_date": model.release_date,
            "max_tokens": model.max_tokens,
            "company_name": model.company_name,
            "priority": model.priority,
            "fallback_group": model.fallback_group,
            "is_active": model.is_active,
        }

    @staticmethod
    async def get_providers(db: AsyncSession) -> List[Dict]:
        result = await db.execute(select(Provider).order_by(Provider.name))
        providers = result.scalars().all()
        return [
            {
                "id": str(p.id),
                "name": p.name,
                "website": p.website or "",
            }
            for p in providers
        ]

    @staticmethod
    async def get_model_providers(model_id: str, db: AsyncSession) -> List[Dict]:
        result = await db.execute(
            select(ModelProvider)
            .options(selectinload(ModelProvider.provider))
            .where(ModelProvider.model_id == model_id)
        )
        mps = result.scalars().all()
        return [
            {
                "id": str(mp.id),
                "providerId": str(mp.provider_id),
                "providerName": mp.provider.name,
                "providerWebsite": mp.provider.website or "",
                "inputTokenCost": mp.input_token_cost,
                "outputTokenCost": mp.output_token_cost,
            }
            for mp in mps
        ]

    @staticmethod
    async def get_model_by_id(model_id: str, db: AsyncSession) -> Optional[Dict]:
        result = await db.execute(select(Model).where(Model.id == model_id))
        m = result.scalar_one_or_none()
        if not m:
            return None
        return {
            "id": str(m.id),
            "name": m.name,
            "slug": m.slug,
            "description": m.description,
            "context_window": m.context_window,
            "featured": m.featured,
            "speed_rating": m.speed_rating,
            "logo_url": m.logo_url,
            "release_date": m.release_date,
            "max_tokens": m.max_tokens,
            "company_name": m.company_name,
            "priority": m.priority,
            "fallback_group": m.fallback_group,
            "is_active": m.is_active,
        }

    @staticmethod
    async def get_model_by_slug(db: AsyncSession, slug: str) -> Optional[Dict]:
        result = await db.execute(select(Model).where(Model.slug == slug))
        m = result.scalar_one_or_none()
        if not m:
            return None
        return {
            "id": str(m.id),
            "name": m.name,
            "slug": m.slug,
            "description": m.description,
            "context_window": m.context_window,
            "featured": m.featured,
            "speed_rating": m.speed_rating,
            "logo_url": m.logo_url,
            "release_date": m.release_date,
            "max_tokens": m.max_tokens,
            "company_name": m.company_name,
            "priority": m.priority,
            "fallback_group": m.fallback_group,
            "is_active": m.is_active,
        }
        # This is better for URLs than UUIDs.

    @staticmethod
    async def get_model_stats(db: AsyncSession, model_id: str) -> Optional[Dict]:
        """Return weekly token count + trend for a single model."""
        # Fetch the two most recent weekly snapshots
        result = await db.execute(
            select(ModelUsageStat)
            .where(ModelUsageStat.model_id == model_id)
            .order_by(desc(ModelUsageStat.week_start))
            .limit(2)
        )
        rows = result.scalars().all()
        if not rows:
            return None

        this_week = rows[0]
        last_week = rows[1] if len(rows) > 1 else None

        tokens = this_week.total_tokens or 0
        prev_tokens = last_week.total_tokens if last_week else 0

        if prev_tokens and prev_tokens > 0:
            trend_pct = (tokens - prev_tokens) / prev_tokens * 100
        else:
            trend_pct = 0.0

        return {
            "model_id": model_id,
            "weekly_tokens": tokens,
            "weekly_tokens_label": _format_tokens(tokens),
            "trend_percent": round(trend_pct, 1),
            "trend_label": _trend_label(trend_pct),
        }

    @staticmethod
    async def get_all_model_stats(db: AsyncSession) -> List[Dict]:
        """Return weekly stats for every model that has usage data."""
        # Get the latest week_start available per model
        result = await db.execute(
            select(ModelUsageStat).order_by(
                ModelUsageStat.model_id,
                desc(ModelUsageStat.week_start),
            )
        )
        all_rows = result.scalars().all()

        # Group by model_id → keep top 2 per model
        grouped: Dict[str, List] = {}
        for row in all_rows:
            grouped.setdefault(row.model_id, [])
            if len(grouped[row.model_id]) < 2:
                grouped[row.model_id].append(row)

        stats = []
        for model_id, rows in grouped.items():
            this_week = rows[0]
            last_week = rows[1] if len(rows) > 1 else None

            tokens = this_week.total_tokens or 0
            prev_tokens = last_week.total_tokens if last_week else 0

            if prev_tokens and prev_tokens > 0:
                trend_pct = (tokens - prev_tokens) / prev_tokens * 100
            else:
                trend_pct = 0.0

            stats.append({
                "model_id": model_id,
                "weekly_tokens": tokens,
                "weekly_tokens_label": _format_tokens(tokens),
                "trend_percent": round(trend_pct, 1),
                "trend_label": _trend_label(trend_pct),
            })

        return stats
