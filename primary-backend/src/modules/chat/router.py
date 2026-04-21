from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.config import get_db
from .schemas import (
    ChatRequestSchema,
    ChatResponseSchema,
    ChatModelOptionSchema,
    ChatModelOptionsResponse,
)
from .service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions", response_model=ChatResponseSchema)
async def chat_completion(payload: ChatRequestSchema, db: AsyncSession = Depends(get_db)):
    return await ChatService.route_chat(payload, db)


@router.get("/model-options", response_model=ChatModelOptionsResponse)
async def get_chat_model_options():
    items = ChatService.get_chat_model_options()
    return ChatModelOptionsResponse(
        models=[ChatModelOptionSchema(**item) for item in items]
    )