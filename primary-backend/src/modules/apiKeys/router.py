"""API Keys router — all endpoints require Firebase authentication."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import (
    CreateApiKeySchema,
    CreateApiKeyResponse,
    UpdateApiKeySchema,
    UpdateApiKeyResponseSchema,
    UpdateApiKeyResponseFailedSchema,
    GetApiKeysResponseSchema,
    DeleteApiKeyResponseSchema,
    DeleteApiKeyResponseFailedSchema,
)
from .service import ApiKeyService
from src.db.config import get_db
from src.db.models import User
from src.dependencies import get_current_user


router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("/", response_model=CreateApiKeyResponse)
async def create_api_key(
    body: CreateApiKeySchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await ApiKeyService.create_api_key(body.name, str(user.id), db)
        return CreateApiKeyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=GetApiKeysResponseSchema)
async def get_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        api_keys = await ApiKeyService.get_api_keys(str(user.id), db)
        return GetApiKeysResponseSchema(apiKeys=api_keys)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put(
    "/",
    response_model=UpdateApiKeyResponseSchema,
    responses={411: {"model": UpdateApiKeyResponseFailedSchema}},
)
async def update_api_key(
    body: UpdateApiKeySchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await ApiKeyService.update_api_key_disabled(body.id, str(user.id), body.disabled, db)
        return UpdateApiKeyResponseSchema()
    except Exception as e:
        raise HTTPException(status_code=411, detail="Updating api key unsuccessful")


@router.delete(
    "/{api_key_id}",
    response_model=DeleteApiKeyResponseSchema,
    responses={411: {"model": DeleteApiKeyResponseFailedSchema}},
)
async def delete_api_key(
    api_key_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await ApiKeyService.delete_api_key(api_key_id, str(user.id), db)
        return DeleteApiKeyResponseSchema()
    except Exception as e:
        raise HTTPException(status_code=411, detail="Api key deletion failed")
