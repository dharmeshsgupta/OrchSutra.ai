"""API backend: provider adapters + routing + model management."""

from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.llms.base import ChatMessage, ProviderError
from src.schemas import (
    ChatRequestSchema,
    ChatResponseMetadata,
    ChatResponseSchema,
    CreateModelRequest,
    GetModelsResponseSchema,
    ModelResponse,
    UpdateActiveRequest,
    UpdateFallbackRequest,
    UpdatePriorityRequest,
)

# Load environment variables from .env if present (for provider API keys)
load_dotenv()

from src.llms.registry import registry


app = FastAPI(title="OpenRouter Routing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ─────────── In-memory model store (replace with DB) ───────────
MODEL_STORE: Dict[str, ModelResponse] = {
    "openai/gpt-3.5-turbo": ModelResponse(id="openai/gpt-3.5-turbo", name="GPT-3.5 Turbo", provider_name="openai", provider_model_id="gpt-3.5-turbo", priority=10, fallback_group="standard", is_active=True),
    "openai/gpt-4o": ModelResponse(id="openai/gpt-4o", name="GPT-4o", provider_name="openai", provider_model_id="gpt-4o", priority=10, fallback_group="standard", is_active=True),
    "anthropic/claude-3": ModelResponse(id="anthropic/claude-3", name="Claude 3", provider_name="anthropic", provider_model_id="claude-3", priority=20, fallback_group="standard", is_active=True),
    "groq-llama-3.3-70b": ModelResponse(id="groq-llama-3.3-70b", name="Llama 3.3 70B (Groq)", provider_name="groq", provider_model_id="llama-3.3-70b-versatile", priority=30, fallback_group="standard", is_active=True),
    "gemini/gemini-1.5-flash": ModelResponse(id="gemini/gemini-1.5-flash", name="Gemini 1.5 Flash", provider_name="gemini", provider_model_id="gemini-1.5-flash", priority=40, fallback_group="standard", is_active=True),
    "gemini/gemini-2.0-flash": ModelResponse(id="gemini/gemini-2.0-flash", name="Gemini 2.0 Flash", provider_name="gemini", provider_model_id="gemini-2.0-flash", priority=45, fallback_group="standard", is_active=True),
}


def _get_fallback_queue(selected: ModelResponse, override: List[str] | None) -> List[str]:
    if override:
        return [mid for mid in override if mid != selected.id]
    if not selected.fallback_group:
        return []
    same_group = [m for m in MODEL_STORE.values() if m.fallback_group == selected.fallback_group and m.id != selected.id and m.is_active]
    same_group.sort(key=lambda m: m.priority)
    return [m.id for m in same_group]


def _pick_provider(model_id: str) -> ModelResponse:
    if model_id not in MODEL_STORE:
        raise HTTPException(status_code=404, detail="Model not found")
    model = MODEL_STORE[model_id]
    if not model.is_active:
        raise HTTPException(status_code=400, detail="Selected model is disabled")
    return model


# ─────────── Chat Routing ───────────
@app.post("/chat/completions", response_model=ChatResponseSchema)
async def chat_completions(body: ChatRequestSchema, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # API key is available as credentials.credentials if needed by adapters
    requested_model_id = body.selected_model_id

    if requested_model_id not in MODEL_STORE:
        raise HTTPException(status_code=404, detail="Selected model not found")

    selected = MODEL_STORE[requested_model_id]
    if not selected.is_active and not body.auto_switch:
        raise HTTPException(status_code=400, detail="Selected model is disabled")

    candidates = [requested_model_id]
    if body.auto_switch:
        candidates.extend(_get_fallback_queue(selected, body.fallback_candidates))

    last_reason = None

    for idx, model_id in enumerate(candidates):
        try:
            model_meta = _pick_provider(model_id)
        except HTTPException as exc:
            last_reason = exc.detail
            if body.auto_switch:
                continue
            raise

        try:
            adapter = registry.get(model_meta.provider_name)
        except KeyError:
            last_reason = "provider_not_registered"
            if body.auto_switch:
                continue
            raise HTTPException(status_code=502, detail="Provider not registered")

        try:
            result = await adapter.chat_completion(
                messages=[
                    ChatMessage(
                        role=m.role.value if hasattr(m.role, 'value') else m.role,
                        content=m.content,
                        name=m.name,
                        tool_calls=m.tool_calls,
                        tool_call_id=m.tool_call_id
                    ) for m in body.messages
                ],
                model=model_meta.provider_model_id,
                **body.parameters,
            )
        except Exception as exc:
            if isinstance(exc, ProviderError):
                last_reason = exc.message or str(exc.raw) or "Provider request failed"
            else:
                last_reason = str(exc)
            if not body.auto_switch:
                if isinstance(exc, ProviderError) and exc.status_code:
                    raise HTTPException(status_code=exc.status_code, detail=exc.message or str(exc.raw) or "Provider request failed")
                raise HTTPException(status_code=502, detail=str(exc))
            continue

        metadata = ChatResponseMetadata(
            requested_model_id=requested_model_id,
            actual_model_id=model_id,
            provider_used=model_meta.provider_name,
            fallback_used=idx > 0,
            fallback_reason=None if idx == 0 else last_reason,
            latency_ms=result.latency_ms,
        )

        return ChatResponseSchema(
            content=result.content,
            metadata=metadata,
            usage=result.usage,
            raw=result.raw,
        )

    raise HTTPException(status_code=503, detail=last_reason or "No provider available")


# ─────────── Model management ───────────
@app.get("/models", response_model=GetModelsResponseSchema)
async def list_models():
    return GetModelsResponseSchema(models=list(MODEL_STORE.values()))


@app.post("/models", response_model=ModelResponse)
async def add_model(payload: CreateModelRequest):
    model = ModelResponse(**payload.model_dump())
    MODEL_STORE[model.id] = model
    return model


@app.patch("/models/{model_id}/activate", response_model=ModelResponse)
async def set_model_active(model_id: str, payload: UpdateActiveRequest):
    if model_id not in MODEL_STORE:
        raise HTTPException(status_code=404, detail="Model not found")
    model = MODEL_STORE[model_id].model_copy(update={"is_active": payload.is_active})
    MODEL_STORE[model_id] = model
    return model


@app.patch("/models/{model_id}/priority", response_model=ModelResponse)
async def update_model_priority(model_id: str, payload: UpdatePriorityRequest):
    if model_id not in MODEL_STORE:
        raise HTTPException(status_code=404, detail="Model not found")
    model = MODEL_STORE[model_id].model_copy(update={"priority": payload.priority})
    MODEL_STORE[model_id] = model
    return model


@app.patch("/models/{model_id}/fallback", response_model=ModelResponse)
async def update_model_fallback(model_id: str, payload: UpdateFallbackRequest):
    if model_id not in MODEL_STORE:
        raise HTTPException(status_code=404, detail="Model not found")
    model = MODEL_STORE[model_id].model_copy(update={"fallback_group": payload.fallback_group})
    MODEL_STORE[model_id] = model
    return model


@app.get("/health")
async def health():
    return {"status": "ok", "providers": await registry.health_map()}