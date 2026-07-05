"""API backend: provider adapters + routing + model management."""

from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

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
    SamplingMetricsResponse,
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
    allow_credentials=False,
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

SAMPLING_LOGS: deque[Dict[str, Any]] = deque(maxlen=20000)

SAMPLING_BUCKETS = {
    "top_p": [(0, 0.2), (0.2, 0.5), (0.5, 0.8), (0.8, 1.0), (1.0, None)],
    "temperature": [(0, 0.2), (0.2, 0.5), (0.5, 0.8), (0.8, 1.0), (1.0, None)],
    "frequency_penalty": [(0, 0.2), (0.2, 0.5), (0.5, 1.0), (1.0, 1.5), (1.5, None)],
    "top_k": [(0, 10), (10, 40), (40, 100), (100, 200), (200, None)],
    "input_tokens": [(0, 256), (256, 1000), (1000, 4000), (4000, 16000), (16000, None)],
    "output_tokens": [(0, 256), (256, 1000), (1000, 4000), (4000, 16000), (16000, None)],
}


def _coerce_number(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _extract_param(params: Dict[str, Any], keys: List[str], default: Optional[float]) -> Optional[float]:
    for key in keys:
        if key in params:
            candidate = _coerce_number(params.get(key))
            if candidate is not None:
                return candidate
    return default


def _extract_token_value(usage: Dict[str, Any], keys: List[str]) -> Optional[float]:
    for key in keys:
        if key in usage:
            candidate = _coerce_number(usage.get(key))
            if candidate is not None:
                return candidate
    return None


def _extract_tokens(usage: Dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
    input_tokens = _extract_token_value(
        usage,
        [
            "input_tokens",
            "prompt_tokens",
            "promptTokenCount",
            "promptTokens",
        ],
    )
    output_tokens = _extract_token_value(
        usage,
        [
            "output_tokens",
            "completion_tokens",
            "candidatesTokenCount",
            "completionTokens",
        ],
    )

    if input_tokens is None and output_tokens is None:
        total_tokens = _extract_token_value(usage, ["total_tokens", "totalTokenCount"])
        if total_tokens is not None:
            input_tokens = total_tokens
            output_tokens = 0.0

    return input_tokens, output_tokens


def _bucket_label(lower: float, upper: Optional[float]) -> str:
    if upper is None:
        return f"{int(lower)}+"
    if upper <= 1.0:
        return f"{lower:.1f}-{upper:.1f}"
    return f"{int(lower)}-{int(upper)}"


def _bucket_value(param: str, value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    for lower, upper in SAMPLING_BUCKETS.get(param, []):
        if upper is None and value >= lower:
            return _bucket_label(lower, upper)
        if upper is not None and lower <= value < upper:
            return _bucket_label(lower, upper)
    return None


def _log_sampling_metrics(
    body: ChatRequestSchema,
    metadata: ChatResponseMetadata,
    usage: Dict[str, Any],
) -> None:
    params = body.parameters or {}
    top_p = _extract_param(params, ["top_p", "topP"], 1.0)
    top_k = _extract_param(params, ["top_k", "topK"], 0.0)
    temperature = _extract_param(params, ["temperature", "temp"], 1.0)
    frequency_penalty = _extract_param(params, ["frequency_penalty", "frequency"], 0.0)
    input_tokens, output_tokens = _extract_tokens(usage or {})

    SAMPLING_LOGS.append(
        {
            "timestamp": datetime.utcnow(),
            "model_id": metadata.actual_model_id or body.selected_model_id,
            "provider": metadata.provider_used or "unknown",
            "top_p": top_p,
            "top_k": top_k,
            "temperature": temperature,
            "frequency_penalty": frequency_penalty,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }
    )


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

        _log_sampling_metrics(body, metadata, result.usage)

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


@app.get("/metrics/llm-sampling", response_model=SamplingMetricsResponse)
async def get_llm_sampling_metrics(range: str = "all"):
    now = datetime.utcnow()
    if range == "today":
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range == "7d":
        since = now - timedelta(days=7)
    elif range == "30d":
        since = now - timedelta(days=30)
    else:
        since = None

    filtered = [
        entry
        for entry in SAMPLING_LOGS
        if since is None or entry["timestamp"] >= since
    ]

    totals = {
        "requests": float(len(filtered)),
        "input_tokens": 0.0,
        "output_tokens": 0.0,
    }

    def accumulate(param: str) -> Dict[str, Any]:
        by_model = defaultdict(float)
        by_provider = defaultdict(float)
        buckets = defaultdict(float)
        total = 0.0
        count = 0

        for entry in filtered:
            value = entry.get(param)
            if value is None:
                continue
            total += float(value)
            count += 1

            model_id = entry.get("model_id") or "unknown"
            provider = entry.get("provider") or "unknown"
            by_model[model_id] += float(value)
            by_provider[provider] += float(value)

            bucket = _bucket_value(param, float(value))
            if bucket:
                buckets[bucket] += 1.0

        return {
            "average": total / count if count else None,
            "by_model": [{"name": k, "value": v} for k, v in sorted(by_model.items())],
            "by_provider": [{"name": k, "value": v} for k, v in sorted(by_provider.items())],
            "buckets": [{"name": k, "value": v} for k, v in buckets.items()],
        }

    def accumulate_tokens(param: str) -> Dict[str, Any]:
        by_model = defaultdict(float)
        by_provider = defaultdict(float)
        buckets = defaultdict(float)
        total = 0.0
        count = 0

        for entry in filtered:
            value = entry.get(param)
            if value is None:
                continue
            total += float(value)
            count += 1

            model_id = entry.get("model_id") or "unknown"
            provider = entry.get("provider") or "unknown"
            by_model[model_id] += float(value)
            by_provider[provider] += float(value)

            bucket = _bucket_value(param, float(value))
            if bucket:
                buckets[bucket] += 1.0

        totals[param] = total
        return {
            "average": total / count if count else None,
            "by_model": [{"name": k, "value": v} for k, v in sorted(by_model.items())],
            "by_provider": [{"name": k, "value": v} for k, v in sorted(by_provider.items())],
            "buckets": [{"name": k, "value": v} for k, v in buckets.items()],
        }

    metrics = {
        "top_p": accumulate("top_p"),
        "top_k": accumulate("top_k"),
        "temperature": accumulate("temperature"),
        "frequency_penalty": accumulate("frequency_penalty"),
        "input_tokens": accumulate_tokens("input_tokens"),
        "output_tokens": accumulate_tokens("output_tokens"),
    }

    return SamplingMetricsResponse(range=range, totals=totals, metrics=metrics)