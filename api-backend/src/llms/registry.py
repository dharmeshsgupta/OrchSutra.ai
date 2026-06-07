"""Central provider registry for routing."""

from typing import Dict, List

from .anthropic import AnthropicAdapter
from .base import BaseProviderAdapter
from .cohere import CohereAdapter
from .deepseek import DeepSeekAdapter
from .gemini import GeminiAdapter
from .groq import GroqAdapter
from .mistral import MistralAdapter
from .openai import OpenAIAdapter
from .sarvam import SarvamAdapter


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: Dict[str, BaseProviderAdapter] = {}
        self.register(OpenAIAdapter())
        self.register(AnthropicAdapter())
        self.register(GeminiAdapter())
        self.register(MistralAdapter())
        self.register(CohereAdapter())
        self.register(GroqAdapter())
        self.register(DeepSeekAdapter())
        self.register(SarvamAdapter())

    def register(self, provider: BaseProviderAdapter) -> None:
        self._providers[provider.name] = provider

    def get(self, name: str) -> BaseProviderAdapter:
        if name not in self._providers:
            raise KeyError(f"Provider '{name}' is not registered")
        return self._providers[name]

    def list(self) -> List[str]:
        return sorted(self._providers.keys())

    async def health_map(self) -> Dict[str, bool]:
        result: Dict[str, bool] = {}
        for name, adapter in self._providers.items():
            try:
                result[name] = await adapter.health()
            except Exception:
                result[name] = False
        return result


registry = ProviderRegistry()
