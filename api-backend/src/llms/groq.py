"""Groq provider adapter (OpenAI-compatible surface)."""

import os
import time
from typing import Any, Dict, List, Tuple

import httpx

from .base import BaseProviderAdapter, ChatCompletionResult, ChatMessage, ProviderError


class GroqAdapter(BaseProviderAdapter):
    name = "groq"

    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
        self.timeout = 30.0

    async def _post(self, path: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Tuple[httpx.Response, float]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            started = time.perf_counter()
            resp = await client.post(path, json=payload, headers=headers)
        return resp, self._latency(started)

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: str,
        **kwargs: Any,
    ) -> ChatCompletionResult:
        api_key = self.api_key or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not configured")

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{k: v for k, v in msg.__dict__.items() if v is not None} for msg in messages],
        }
        payload.update(kwargs)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        resp, latency_ms = await self._post("/chat/completions", payload, headers)

        if resp.status_code >= 400:
            raise self.normalize_error(ProviderError(
                provider=self.name,
                message=resp.text,
                status_code=resp.status_code,
                raw=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            ))

        data = resp.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})

        return ChatCompletionResult(
            provider=self.name,
            model=data.get("model", model),
            content=message.get("content", ""),
            raw=data,
            usage=data.get("usage", {}),
            status_code=resp.status_code,
            latency_ms=latency_ms,
            stop_reason=choice.get("finish_reason"),
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
