"""Payments router — requires Firebase authentication."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import OnrampResponseSchema, OnrampFailedResponseSchema
from .service import PaymentsService
from src.db.config import get_db
from src.db.models import User
from src.dependencies import get_current_user


router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/onramp",
    response_model=OnrampResponseSchema,
    responses={411: {"model": OnrampFailedResponseSchema}},
)
async def onramp(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        credits = await PaymentsService.onramp(str(user.id), db)
        return OnrampResponseSchema(message="Onramp successful", credits=credits)
    except Exception as e:
        raise HTTPException(status_code=411, detail="Onramp failed")
