"""Provider adapter contracts and shared DTOs.

Each adapter only handles provider-specific auth and payload mapping.
Routing logic lives outside.
"""

from __future__ import annotations

import abc
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ChatMessage:
    role: str
    content: Optional[str] = None
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


@dataclass
class ChatCompletionResult:
    provider: str
    model: str
    content: str
    raw: Dict[str, Any] = field(default_factory=dict)
    usage: Dict[str, Any] = field(default_factory=dict)
    status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    stop_reason: Optional[str] = None


@dataclass
class ProviderError(Exception):
    provider: str
    message: str
    status_code: Optional[int] = None
    raw: Any = None

    def __post_init__(self) -> None:
        super().__init__(self.message)


class BaseProviderAdapter(abc.ABC):
    """Common interface every provider adapter must follow."""

    name: str

    @abc.abstractmethod
    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: str,
        **kwargs: Any,
    ) -> ChatCompletionResult:
        """Send chat completion to the provider and return normalized output."""

    async def list_models(self) -> List[str]:
        """Optional: list provider models."""
        return []

    async def health(self) -> bool:
        """Optional health check; default True."""
        return True

    def normalize_error(self, exc: Exception) -> ProviderError:
        """Convert provider-specific errors to a stable shape."""
        return ProviderError(provider=self.name, message=str(exc))

    def _latency(self, started: float) -> float:
        return round((time.perf_counter() - started) * 1000, 2)
