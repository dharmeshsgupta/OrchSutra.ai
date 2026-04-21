"""Models service — reads models / providers from PostgreSQL."""

from typing import List, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.models import Model, Provider, ModelProvider
from .schemas import CreateModelRequest


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
