"""API Keys service — CRUD operations backed by PostgreSQL."""

import hashlib
import secrets
from datetime import datetime
from typing import List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from src.db.models import ApiKey


API_KEY_LENGTH = 48
PREFIX_LENGTH = 8


def _generate_api_key() -> str:
    """Generate a random API key: sk-or-v1-<random>"""
    suffix = secrets.token_urlsafe(API_KEY_LENGTH)
    return f"sk-or-v1-{suffix}"


def _hash_key(raw_key: str) -> str:
    """SHA-256 hash of the raw key (we never store plaintext)."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


class ApiKeyService:

    @staticmethod
    async def create_api_key(name: str, user_id: str, db: AsyncSession) -> Dict[str, str]:
        raw_key = _generate_api_key()
        key_hash = _hash_key(raw_key)
        prefix = raw_key[:PREFIX_LENGTH]

        api_key = ApiKey(
            user_id=user_id,
            name=name,
            key_hash=key_hash,
            key_prefix=prefix,
        )
        db.add(api_key)
        await db.commit()
        await db.refresh(api_key)

        return {"id": str(api_key.id), "apiKey": raw_key}

    @staticmethod
    async def get_api_keys(user_id: str, db: AsyncSession) -> List[Dict]:
        result = await db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
        )
        keys = result.scalars().all()

        return [
            {
                "id": str(k.id),
                "apiKey": f"{k.key_prefix}...{'*' * 12}",
                "name": k.name,
                "creditsConsumed": k.credits_consumed,
                "lastUsed": k.last_used.isoformat() if k.last_used else None,
                "disabled": k.disabled,
            }
            for k in keys
        ]

    @staticmethod
    async def update_api_key_disabled(
        api_key_id: str, user_id: str, disabled: bool, db: AsyncSession
    ) -> None:
        result = await db.execute(
            select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.user_id == user_id)
        )
        key = result.scalar_one_or_none()
        if not key:
            raise ValueError("API key not found")
        key.disabled = disabled
        await db.commit()

    @staticmethod
    async def delete_api_key(api_key_id: str, user_id: str, db: AsyncSession) -> None:
        result = await db.execute(
            select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.user_id == user_id)
        )
        key = result.scalar_one_or_none()
        if not key:
            raise ValueError("API key not found")
        await db.delete(key)
        await db.commit()
