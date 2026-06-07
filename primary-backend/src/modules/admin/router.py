from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import List, Optional

from src.db.config import get_db
from src.db.models import User, Model, ApiKey
from src.dependencies import get_current_admin_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class AdminStatsResponse(BaseModel):
    total_users: int
    total_models: int
    total_api_keys: int
    total_credits: int

class UserAdminUpdate(BaseModel):
    credits: Optional[int] = None
    is_admin: Optional[bool] = None

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    users_count = await db.scalar(select(func.count(User.id)))
    models_count = await db.scalar(select(func.count(Model.id)))
    api_keys_count = await db.scalar(select(func.count(ApiKey.id)))
    credits_sum = await db.scalar(select(func.sum(User.credits)))
    
    return {
        "total_users": users_count or 0,
        "total_models": models_count or 0,
        "total_api_keys": api_keys_count or 0,
        "total_credits": credits_sum or 0
    }

@router.get("/users")
async def get_all_users(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    result = await db.execute(select(User).order_by(desc(User.created_at)).limit(limit).offset(offset))
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "provider": u.provider,
            "is_admin": u.is_admin,
            "credits": u.credits,
            "created_at": u.created_at
        } for u in users
    ]

@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserAdminUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if update_data.credits is not None:
        user.credits = update_data.credits
        
    if update_data.is_admin is not None:
        user.is_admin = update_data.is_admin
        
    await db.commit()
    
    return {"message": "User updated successfully", "credits": user.credits, "is_admin": user.is_admin}
