"""Anthropic provider adapter."""

import os
import time
from typing import Any, Dict, List, Tuple

import httpx

from .base import BaseProviderAdapter, ChatCompletionResult, ChatMessage, ProviderError


class AnthropicAdapter(BaseProviderAdapter):
    name = "anthropic"

    def __init__(self) -> None:
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.base_url = os.getenv("ANTHROPIC_API_BASE", "https://api.anthropic.com/v1")
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
        api_key = self.api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [msg.__dict__ for msg in messages],
            "max_tokens": kwargs.pop("max_tokens", 1024),
        }
        payload.update(kwargs)

        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        resp, latency_ms = await self._post("/messages", payload, headers)

        if resp.status_code >= 400:
            raise self.normalize_error(ProviderError(
                provider=self.name,
                message=resp.text,
                status_code=resp.status_code,
                raw=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            ))

        data = resp.json()
        message = data.get("content", [{}])[0] if isinstance(data.get("content"), list) else {}

        return ChatCompletionResult(
            provider=self.name,
            model=data.get("model", model),
            content=message.get("text", message.get("content", "")),
            raw=data,
            usage=data.get("usage", {}),
            status_code=resp.status_code,
            latency_ms=latency_ms,
            stop_reason=data.get("stop_reason"),
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
