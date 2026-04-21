"""Cohere provider adapter."""

import os
import time
from typing import Any, Dict, List, Tuple

import httpx

from .base import BaseProviderAdapter, ChatCompletionResult, ChatMessage, ProviderError


class CohereAdapter(BaseProviderAdapter):
    name = "cohere"

    def __init__(self) -> None:
        self.api_key = os.getenv("COHERE_API_KEY")
        self.base_url = os.getenv("COHERE_API_BASE", "https://api.cohere.ai")
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
        if not self.api_key:
            raise ValueError("COHERE_API_KEY not configured")

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [msg.__dict__ for msg in messages],
        }
        payload.update(kwargs)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        resp, latency_ms = await self._post("/v1/chat", payload, headers)

        if resp.status_code >= 400:
            raise self.normalize_error(ProviderError(
                provider=self.name,
                message=resp.text,
                status_code=resp.status_code,
                raw=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            ))

        data = resp.json()
        message = data.get("text") or data.get("message", {})
        content = message if isinstance(message, str) else message.get("content", "") if isinstance(message, dict) else ""

        return ChatCompletionResult(
            provider=self.name,
            model=data.get("model", model),
            content=content,
            raw=data,
            usage=data.get("usage", {}),
            status_code=resp.status_code,
            latency_ms=latency_ms,
            stop_reason=data.get("finish_reason"),
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
