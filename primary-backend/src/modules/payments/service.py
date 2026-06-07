"""Payments service — backed by PostgreSQL."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.models import User, Payment

ONRAMP_AMOUNT = 1000


class PaymentsService:

    @staticmethod
    async def onramp(user_id: str, db: AsyncSession) -> int:
        """Add credits to the user and record a payment."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        user.credits += ONRAMP_AMOUNT

        payment = Payment(
            user_id=user_id,
            amount=ONRAMP_AMOUNT,
            credits=ONRAMP_AMOUNT,
            payment_type="onramp",
        )
        db.add(payment)
        await db.commit()
        await db.refresh(user)

        return int(user.credits)
