from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import User
from src.db.config import get_db
from src.dependencies import get_current_user

from .schemas import (
    ImageAnalyzeRequestSchema,
    ImageAnalyzeResponseSchema,
    ImageGenerateRequestSchema,
    ImageGenerateResponseSchema,
    SpeechGenerateRequestSchema,
    SpeechGenerateResponseSchema,
    TTSAgentCreateRequestSchema,
    TTSAgentGenerateRequestSchema,
    TTSAgentGenerateResponseSchema,
    TTSAgentResponseSchema,
)
from .service import MediaService


router = APIRouter(prefix="/media", tags=["media"])


@router.post("/image/generate", response_model=ImageGenerateResponseSchema)
async def generate_image(
    body: ImageGenerateRequestSchema,
    user: User = Depends(get_current_user),
):
    return await MediaService.generate_image(body)


@router.post("/image/analyze", response_model=ImageAnalyzeResponseSchema)
async def analyze_image(
    body: ImageAnalyzeRequestSchema,
    user: User = Depends(get_current_user),
):
    return await MediaService.analyze_image(body)


@router.post("/audio/generate", response_model=SpeechGenerateResponseSchema)
async def generate_audio(
    body: SpeechGenerateRequestSchema,
    user: User = Depends(get_current_user),
):
    return await MediaService.generate_speech(body)


@router.get("/tts/agents", response_model=list[TTSAgentResponseSchema])
async def list_tts_agents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await MediaService.list_tts_agents(db, user)


@router.post("/tts/agents", response_model=TTSAgentResponseSchema)
async def create_tts_agent(
    body: TTSAgentCreateRequestSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await MediaService.create_tts_agent(db, user, body)


@router.post("/tts/generate", response_model=TTSAgentGenerateResponseSchema)
async def generate_tts_from_agent(
    body: TTSAgentGenerateRequestSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await MediaService.generate_agent_tts(db, user, body)