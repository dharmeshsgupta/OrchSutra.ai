"""Gemini provider adapter."""

import os
import time
from typing import Any, Dict, List, Tuple

import httpx

from .base import BaseProviderAdapter, ChatCompletionResult, ChatMessage, ProviderError


class GeminiAdapter(BaseProviderAdapter):
    name = "gemini"

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.base_url = os.getenv("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
        self.timeout = 30.0

    async def _post(self, path: str, payload: Dict[str, Any], params: Dict[str, str]) -> Tuple[httpx.Response, float]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            started = time.perf_counter()
            resp = await client.post(path, json=payload, params=params)
        return resp, self._latency(started)

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: str,
        **kwargs: Any,
    ) -> ChatCompletionResult:
        api_key = self.api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        payload = {
            "contents": [{"parts": [{"text": m.content}], "role": m.role} for m in messages],
        }
        payload.update(kwargs)

        resp, latency_ms = await self._post(f"/models/{model}:generateContent", payload, {"key": api_key})

        if resp.status_code >= 400:
            raise self.normalize_error(ProviderError(
                provider=self.name,
                message=resp.text,
                status_code=resp.status_code,
                raw=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            ))

        data = resp.json()
        candidates = data.get("candidates", [{}])
        content = candidates[0].get("content", {}) if candidates else {}
        parts = content.get("parts", []) if isinstance(content, dict) else []
        text = parts[0].get("text", "") if parts else ""

        return ChatCompletionResult(
            provider=self.name,
            model=data.get("model", model),
            content=text,
            raw=data,
            usage=data.get("usageMetadata", {}),
            status_code=resp.status_code,
            latency_ms=latency_ms,
            stop_reason=candidates[0].get("finishReason") if candidates else None,
        )

    def normalize_error(self, exc: Exception) -> ProviderError:
        if isinstance(exc, ProviderError):
            return exc
        if isinstance(exc, httpx.HTTPStatusError):
            return ProviderError(
                provider=self.name,
                message=str(exc),
                status_code=exc.response.status_code,
                raw=exc.response.text,
            )
        return ProviderError(provider=self.name, message=str(exc))
