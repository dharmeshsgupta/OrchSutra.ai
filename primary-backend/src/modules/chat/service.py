import os
import json
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import ChatRequestSchema, ChatResponseSchema


class ChatService:
    """Delegates chat handling to the api-backend routing service."""

    API_BACKEND_URL = os.getenv("API_BACKEND_URL", "http://localhost:3000")
    API_BACKEND_TOKEN = os.getenv("API_BACKEND_TOKEN", "")
    OPENAI_FALLBACK_MODEL = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-5.4")
    GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3-flash-preview")
    ANTHROPIC_FALLBACK_MODEL = os.getenv("ANTHROPIC_FALLBACK_MODEL", "claude-sonnet-4-6")
    UNMAPPED_MODEL_PROVIDER = os.getenv("UNMAPPED_MODEL_PROVIDER", "gemini").strip().lower()

    @staticmethod
    def _api_backend_url() -> str:
        return os.getenv("API_BACKEND_URL", ChatService.API_BACKEND_URL).strip()

    @staticmethod
    def _api_backend_token() -> str:
        return os.getenv("API_BACKEND_TOKEN", ChatService.API_BACKEND_TOKEN).strip()

    PROVIDER_MAP = {
        "openai": "openai",
        "anthropic": "anthropic",
        "google": "gemini",
        "gemini": "gemini",
        "mistral": "mistral",
        "cohere": "cohere",
        "groq": "groq",
        "deepseek": "deepseek",
        "sarvam": "sarvam",
    }

    OPENAI_MODEL_ALIASES = {
        "gpt-4-turbo": OPENAI_FALLBACK_MODEL,
        "gpt-4-turbo-preview": OPENAI_FALLBACK_MODEL,
    }

    GEMINI_MODEL_ALIASES = {
        "gemini-3-flash": GEMINI_FALLBACK_MODEL,
    }

    ANTHROPIC_MODEL_ALIASES = {
        # Keep as passthrough default; add future aliases here if needed.
    }

    @staticmethod
    def _looks_like_gemini_model_id(model_id: str) -> bool:
        return model_id.lower().startswith("gemini-")

    @staticmethod
    def _looks_like_anthropic_model_id(model_id: str) -> bool:
        return model_id.lower().startswith("claude-")

    @staticmethod
    def _infer_direct_provider(model_id: str) -> Optional[str]:
        if ChatService._looks_like_openai_model_id(model_id):
            return "openai"
        if ChatService._looks_like_gemini_model_id(model_id):
            return "gemini"
        if ChatService._looks_like_anthropic_model_id(model_id):
            return "anthropic"
        return None

    @staticmethod
    def _fallback_model_for_provider(provider_name: str) -> str:
        if provider_name == "openai":
            return ChatService.OPENAI_FALLBACK_MODEL
        if provider_name == "gemini":
            return ChatService.GEMINI_FALLBACK_MODEL
        if provider_name == "anthropic":
            return ChatService.ANTHROPIC_FALLBACK_MODEL
        return ChatService.GEMINI_FALLBACK_MODEL

    @staticmethod
    def _looks_like_openai_model_id(model_id: str) -> bool:
        lowered = model_id.lower()
        return lowered.startswith("gpt-") or lowered.startswith("o1") or lowered.startswith("o3") or lowered.startswith("o4")

    @staticmethod
    def _normalize_provider_model_id(provider_name: str, provider_model_id: str) -> str:
        if provider_name == "openai":
            return ChatService.OPENAI_MODEL_ALIASES.get(provider_model_id, provider_model_id)
        if provider_name == "gemini":
            return ChatService.GEMINI_MODEL_ALIASES.get(provider_model_id, provider_model_id)
        if provider_name == "anthropic":
            return ChatService.ANTHROPIC_MODEL_ALIASES.get(provider_model_id, provider_model_id)
        return provider_model_id

    @staticmethod
    async def _resolve_model_route(db: AsyncSession, model_id: str) -> Tuple[str, str, str, str]:
        # Use a minimal SQL projection so this works even on older DB schemas
        # where newer ORM columns (e.g., models.description) are missing.
        stmt = text(
            """
            SELECT
                m.id AS model_id,
                m.name AS model_name,
                m.slug AS model_slug,
                p.name AS provider_name
            FROM models m
            JOIN model_providers mp ON mp.model_id = m.id
            JOIN providers p ON p.id = mp.provider_id
            WHERE m.id = :model_id
            LIMIT 1
            """
        )
        row = (await db.execute(stmt, {"model_id": model_id})).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Selected model has no active provider mapping")

        provider_name = ChatService.PROVIDER_MAP.get(str(row["provider_name"]).lower().strip())
        if not provider_name:
            raise HTTPException(status_code=400, detail=f"Unsupported provider '{row['provider_name']}' for chat routing")

        model_name = (row["model_name"] or row["model_id"])
        provider_model_id = (row["model_slug"] or row["model_id"])
        normalized_provider_model_id = ChatService._normalize_provider_model_id(provider_name, str(provider_model_id))
        return str(row["model_id"]), str(model_name), normalized_provider_model_id, provider_name

    @staticmethod
    async def _sync_model_to_api_backend(
        client: httpx.AsyncClient,
        model_id: str,
        model_name: str,
        provider_model_id: str,
        provider_name: str,
    ) -> None:
        provider_model_id = (provider_model_id or "").strip()
        if not provider_model_id:
            raise HTTPException(
                status_code=400,
                detail="Provider model id is missing; set model_providers.provider_model_id or model slug",
            )

        payload = {
            "id": model_id,
            "name": model_name,
            "provider_name": provider_name,
            "provider_model_id": provider_model_id,
            "description": None,
            "priority": 100,
            "fallback_group": None,
            "is_active": True,
            "capabilities": ["chat"],
        }

        sync_url = ChatService._api_backend_url().rstrip("/") + "/models"
        resp = await client.post(sync_url, json=payload)
        if resp.status_code >= 400:
            detail = resp.text
            try:
                detail = resp.json().get("detail", detail)
            except Exception:
                pass
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Model sync failed: {detail}")

    @staticmethod
    async def _sync_direct_provider_model(
        client: httpx.AsyncClient,
        model_id: str,
        provider_name: str,
        provider_model_id: Optional[str] = None,
    ) -> None:
        effective_provider_model_id = ChatService._normalize_provider_model_id(
            provider_name,
            provider_model_id or model_id,
        )
        payload = {
            "id": model_id,
            "name": model_id,
            "provider_name": provider_name,
            "provider_model_id": effective_provider_model_id,
            "description": f"Auto-registered direct {provider_name} model",
            "priority": 100,
            "fallback_group": provider_name,
            "is_active": True,
            "capabilities": ["chat"],
        }

        sync_url = ChatService._api_backend_url().rstrip("/") + "/models"
        resp = await client.post(sync_url, json=payload)
        if resp.status_code >= 400:
            detail = resp.text
            try:
                detail = resp.json().get("detail", detail)
            except Exception:
                pass
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Direct model sync failed: {detail}")

    @staticmethod
    async def route_chat(request: ChatRequestSchema, db: AsyncSession) -> ChatResponseSchema:  # db kept for signature compatibility
        target_url = ChatService._api_backend_url().rstrip("/") + "/chat/completions"

        headers = {}
        api_backend_token = ChatService._api_backend_token()
        if api_backend_token:
            headers["Authorization"] = f"Bearer {api_backend_token}"

        try:
            async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
                candidate_ids = [request.selected_model_id]
                if request.auto_switch and request.fallback_candidates:
                    candidate_ids.extend([cid for cid in request.fallback_candidates if cid != request.selected_model_id])

                seen: set[str] = set()
                ordered_candidates: List[str] = []
                for candidate_id in candidate_ids:
                    if candidate_id in seen:
                        continue
                    seen.add(candidate_id)
                    ordered_candidates.append(candidate_id)

                for candidate_id in ordered_candidates:
                    await ChatService._ensure_model_synced(client, db, candidate_id)

                proxy_payload = request.model_dump()
                if request.auto_switch:
                    proxy_payload["fallback_candidates"] = [
                        cid for cid in ordered_candidates if cid != request.selected_model_id
                    ]

                try:
                    response = await client.post(target_url, json=proxy_payload)
                except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
                    # One retry helps absorb short backend restarts.
                    response = await client.post(target_url, json=proxy_payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail: Optional[str]
            try:
                detail = exc.response.json().get("detail")
            except Exception:
                detail = exc.response.text
            raise HTTPException(status_code=exc.response.status_code, detail=detail)
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Unable to connect to routing service at {ChatService._api_backend_url()}. "
                    "Start api-backend and verify API_BACKEND_URL is correct."
                ),
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        try:
            payload = response.json()
        except Exception:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from chat service")

        try:
            return ChatResponseSchema.model_validate(payload)
        except Exception:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unexpected payload from chat service")


    CHAT_MODEL_OPTIONS_RAW = os.getenv("CHAT_MODEL_OPTIONS", "")
    CHAT_DEFAULT_MODEL_ID = os.getenv("CHAT_DEFAULT_MODEL_ID", "")

    @staticmethod
    def _default_chat_model_options() -> List[Dict[str, Any]]:
        return [
            {
                "id": "gemini-3-flash",
                "name": "Gemini 3 Flash",
                "provider_name": "gemini",
                "provider_model_id": "gemini-3-flash-preview",
                "description": "Fast Gemini route",
                "is_default": True,
                "is_active": True,
            },
            {
                "id": "claude-sonnet-4-6",
                "name": "Claude Sonnet 4.6",
                "provider_name": "anthropic",
                "provider_model_id": "claude-sonnet-4-6",
                "description": "Anthropic route",
                "is_default": False,
                "is_active": True,
            },
            {
                "id": "gpt-5.4",
                "name": "GPT-5.4",
                "provider_name": "openai",
                "provider_model_id": "gpt-5.4",
                "description": "OpenAI route",
                "is_default": False,
                "is_active": True,
            },
            {
                "id": "deepseek-chat",
                "name": "DeepSeek Chat",
                "provider_name": "deepseek",
                "provider_model_id": "deepseek-chat",
                "description": "DeepSeek API (OpenAI-compatible)",
                "is_default": False,
                "is_active": True,
            },
            {
                "id": "groq-llama-3.3-70b",
                "name": "Llama 3.3 70B (Groq)",
                "provider_name": "groq",
                "provider_model_id": "llama-3.3-70b-versatile",
                "description": "Groq-hosted Llama 3.3 70B",
                "is_default": False,
                "is_active": True,
            },
            {
                "id": "mistral-small-latest",
                "name": "Mistral Small",
                "provider_name": "mistral",
                "provider_model_id": "mistral-small-latest",
                "description": "Mistral API route",
                "is_default": False,
                "is_active": True,
            },
            {
                "id": "sarvam",
                "name": "Sarvam",
                "provider_name": "sarvam",
                "provider_model_id": "sarvam-m",
                "description": "Sarvam route",
                "is_default": False,
                "is_active": True,
            },
        ]

    @staticmethod
    def get_chat_model_options() -> List[Dict[str, Any]]:
        raw = os.getenv("CHAT_MODEL_OPTIONS", ChatService.CHAT_MODEL_OPTIONS_RAW).strip()
        if not raw:
            options = ChatService._default_chat_model_options()
        else:
            try:
                parsed = json.loads(raw)
                options = parsed if isinstance(parsed, list) else ChatService._default_chat_model_options()
            except Exception:
                options = ChatService._default_chat_model_options()

        # Guard against stale/invalid env values for Sarvam model id.
        for item in options:
            if str(item.get("provider_name", "")).strip().lower() == "sarvam":
                if str(item.get("provider_model_id", "")).strip().lower() == "sarvam":
                    item["provider_model_id"] = "sarvam-m"

        default_model_id = os.getenv("CHAT_DEFAULT_MODEL_ID", ChatService.CHAT_DEFAULT_MODEL_ID)
        if default_model_id:
            for item in options:
                item["is_default"] = item.get("id") == default_model_id

        return options

    @staticmethod
    def _find_catalog_model(model_id: str) -> Optional[Dict[str, Any]]:
        for item in ChatService.get_chat_model_options():
            if item.get("id") == model_id and item.get("is_active", True):
                return item
        return None

    @staticmethod
    async def _ensure_model_synced(client: httpx.AsyncClient, db: AsyncSession, model_id: str) -> None:
        catalog_model = ChatService._find_catalog_model(model_id)
        if catalog_model:
            await ChatService._sync_direct_provider_model(
                client=client,
                model_id=str(catalog_model["id"]),
                provider_name=str(catalog_model["provider_name"]),
                provider_model_id=str(catalog_model["provider_model_id"]),
            )
            return

        direct_provider = ChatService._infer_direct_provider(model_id)
        if direct_provider is not None:
            await ChatService._sync_direct_provider_model(client, model_id, direct_provider)
            return

        try:
            resolved_model_id, model_name, provider_model_id, provider_name = await ChatService._resolve_model_route(db, model_id)
            await ChatService._sync_model_to_api_backend(client, resolved_model_id, model_name, provider_model_id, provider_name)
        except HTTPException as resolve_exc:
            if resolve_exc.status_code != 404:
                raise
            # Legacy DB rows may exist without a model_providers mapping; route them
            # through the configured fallback provider/model instead of hard-failing.
            fallback_provider = ChatService.UNMAPPED_MODEL_PROVIDER
            if fallback_provider not in {"openai", "gemini", "anthropic"}:
                fallback_provider = "gemini"
            await ChatService._sync_direct_provider_model(
                client,
                model_id,
                fallback_provider,
                ChatService._fallback_model_for_provider(fallback_provider),
            )