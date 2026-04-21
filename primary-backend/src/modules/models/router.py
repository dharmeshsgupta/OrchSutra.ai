"""Models router — endpoints used by the dashboard UI."""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import (
    CreateModelRequest,
    UpdateActiveRequest,
    UpdateFallbackRequest,
    UpdatePriorityRequest,
    GetModelsResponseSchema,
    GetProvidersResponseSchema,
    GetModelProvidersResponseSchema,
    ModelResponse,
)
from .service import ModelsService
from src.db.config import get_db


router = APIRouter(prefix="/models", tags=["models"])


@router.get("/", response_model=GetModelsResponseSchema)
async def get_models(db: AsyncSession = Depends(get_db)):
    try:
        models = await ModelsService.get_models(db)
        return GetModelsResponseSchema(models=models)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/", response_model=ModelResponse)
async def create_model(payload: CreateModelRequest, db: AsyncSession = Depends(get_db)):
    try:
        model = await ModelsService.create_model(db, payload)
        return model
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/providers", response_model=GetProvidersResponseSchema)
async def get_providers(db: AsyncSession = Depends(get_db)):
    try:
        providers = await ModelsService.get_providers(db)
        return GetProvidersResponseSchema(providers=providers)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{model_id}/providers", response_model=GetModelProvidersResponseSchema)
async def get_model_providers(model_id: str, db: AsyncSession = Depends(get_db)):
    try:
        providers = await ModelsService.get_model_providers(model_id, db)
        return GetModelProvidersResponseSchema(providers=providers)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single model by ID."""
    try:
        model = await ModelsService.get_model_by_id(model_id, db)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        return model
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{model_id}/activate", response_model=ModelResponse)
async def set_model_active(model_id: str, payload: UpdateActiveRequest, db: AsyncSession = Depends(get_db)):
    model = await ModelsService.set_model_active(db, model_id, payload.is_active)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.patch("/{model_id}/priority", response_model=ModelResponse)
async def update_model_priority(model_id: str, payload: UpdatePriorityRequest, db: AsyncSession = Depends(get_db)):
    model = await ModelsService.update_model_priority(db, model_id, payload.priority)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.patch("/{model_id}/fallback", response_model=ModelResponse)
async def update_model_fallback(model_id: str, payload: UpdateFallbackRequest, db: AsyncSession = Depends(get_db)):
    model = await ModelsService.update_model_fallback(db, model_id, payload.fallback_group)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model