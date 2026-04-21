import base64
import io
import os
import uuid
import wave
from pathlib import Path
from typing import Any, Dict

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import TTSAgentMessage, TTSAgentProfile, User
from .schemas import (
    ImageAnalyzeRequestSchema,
    ImageAnalyzeResponseSchema,
    ImageGenerateRequestSchema,
    ImageGenerateResponseSchema,
    SpeechGenerateRequestSchema,
    SpeechGenerateResponseSchema,
    TTSAgentCreateRequestSchema,
    TTSAgentGenerateRequestSchema,
    TTSAgentGenerateResponseSchema,
    TTSAgentResponseSchema,
)


class MediaService:
    IMAGE_API_BASE = os.getenv("MEDIA_IMAGE_API_BASE", "https://api.openai.com/v1")
    IMAGE_API_KEY = os.getenv("MEDIA_IMAGE_API_KEY", "")
    IMAGE_MODEL = os.getenv("MEDIA_IMAGE_MODEL", "black-forest-labs/flux.2-klein-4b")
    VISION_MODEL = os.getenv("MEDIA_VISION_MODEL", "gpt-4o-mini")
    IMAGE_FALLBACK_API_BASE = os.getenv("MEDIA_IMAGE_FALLBACK_API_BASE", "")
    IMAGE_FALLBACK_API_KEY = os.getenv("MEDIA_IMAGE_FALLBACK_API_KEY", "")
    IMAGE_FALLBACK_MODEL = os.getenv("MEDIA_IMAGE_FALLBACK_MODEL", "gpt-image-1")
    VISION_FALLBACK_MODEL = os.getenv("MEDIA_VISION_FALLBACK_MODEL", "")

    AUDIO_API_BASE = os.getenv("MEDIA_AUDIO_API_BASE", "https://api.openai.com/v1")
    AUDIO_API_KEY = os.getenv("MEDIA_AUDIO_API_KEY", "")
    AUDIO_MODEL = os.getenv("MEDIA_AUDIO_MODEL", "gpt-4o-mini-tts")
    NVIDIA_MAGPIE_URI = os.getenv("NVIDIA_MAGPIE_URI", "grpc.nvcf.nvidia.com:443")
    NVIDIA_MAGPIE_FUNCTION_ID = os.getenv("NVIDIA_MAGPIE_FUNCTION_ID", "")
    NVIDIA_MAGPIE_SAMPLE_RATE = int(os.getenv("NVIDIA_MAGPIE_SAMPLE_RATE", "22050"))
    NVIDIA_MAGPIE_CHANNELS = int(os.getenv("NVIDIA_MAGPIE_CHANNELS", "1"))
    NVIDIA_MAGPIE_SAMPLE_WIDTH = int(os.getenv("NVIDIA_MAGPIE_SAMPLE_WIDTH", "2"))
    MEDIA_AUDIO_FILES_DIR = os.getenv("MEDIA_AUDIO_FILES_DIR", "static/audio")

    @staticmethod
    def _reload_env() -> None:
        env_path = Path(__file__).resolve().parents[3] / ".env"
        load_dotenv(dotenv_path=env_path, override=False)

    @staticmethod
    def _resolve_image_key() -> str:
        MediaService._reload_env()
        return (
            os.getenv("MEDIA_IMAGE_API_KEY")
            or MediaService.IMAGE_API_KEY
            or os.getenv("OPENAI_API_KEY", "")
        )

    @staticmethod
    def _resolve_audio_key() -> str:
        MediaService._reload_env()
        return (
            os.getenv("MEDIA_AUDIO_API_KEY")
            or MediaService.AUDIO_API_KEY
            or os.getenv("OPENAI_API_KEY", "")
        )

    @staticmethod
    def _resolve_image_base() -> str:
        MediaService._reload_env()
        return os.getenv("MEDIA_IMAGE_API_BASE") or MediaService.IMAGE_API_BASE or "https://api.openai.com/v1"

    @staticmethod
    def _fallback_image_key() -> str:
        return MediaService.IMAGE_FALLBACK_API_KEY or os.getenv("MEDIA_IMAGE_FALLBACK_API_KEY", "")

    @staticmethod
    def _fallback_image_base() -> str:
        return MediaService.IMAGE_FALLBACK_API_BASE or os.getenv("MEDIA_IMAGE_FALLBACK_API_BASE", "")

    @staticmethod
    def _primary_image_model() -> str:
        return (
            os.getenv("MEDIA_IMAGE_MODEL")
            or MediaService.IMAGE_MODEL
            or "black-forest-labs/flux.2-klein-4b"
        )

    @staticmethod
    def _is_flux_model(model_id: str) -> bool:
        lowered = (model_id or "").strip().lower()
        return "black-forest-labs/flux" in lowered or lowered.startswith("flux")

    @staticmethod
    def _is_nvidia_image_base(base_url: str) -> bool:
        lowered = (base_url or "").strip().lower()
        return "integrate.api.nvidia.com" in lowered or "ai.api.nvidia.com" in lowered

    @staticmethod
    def _parse_image_size(size: str | None) -> tuple[int, int]:
        raw = (size or "1024x1024").strip().lower()
        try:
            width_s, height_s = raw.split("x", 1)
            width = max(64, int(width_s))
            height = max(64, int(height_s))
            return width, height
        except Exception:
            return 1024, 1024

    @staticmethod
    def _relative_api_path(path: str) -> str:
        # Keep base_url path segments (e.g. /v1) by avoiding absolute request paths.
        return (path or "").lstrip("/")

    @staticmethod
    def _build_nvidia_genai_body(payload: ImageGenerateRequestSchema, model_name: str = "") -> Dict[str, Any]:
        width, height = MediaService._parse_image_size(payload.size)
        lowered = model_name.lower()
        if "stable-diffusion" in lowered or "sd3" in lowered or "stabilityai" in lowered:
            return {
                "prompt": payload.prompt,
                "seed": 0,
                "cfg_scale": 5.0,
                "aspect_ratio": "16:9",
                "output_format": "jpeg",
            }
        # Default Flux format
        return {
            "prompt": payload.prompt,
            "width": width,
            "height": height,
            "seed": 0,
            "steps": 4,
        }

    @staticmethod
    async def _post_nvidia_genai_with_optional_fallback(
        primary_model: str,
        fallback_model: str,
        payload: ImageGenerateRequestSchema,
    ) -> tuple[httpx.Response, str, str]:
        primary_key = MediaService._resolve_image_key()
        if not primary_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image provider key not configured. Set MEDIA_IMAGE_API_KEY or OPENAI_API_KEY.",
            )

        primary_base = MediaService._resolve_image_base().rstrip("/")
        if "integrate.api.nvidia.com" in primary_base:
            primary_base = primary_base.replace("integrate.api.nvidia.com", "ai.api.nvidia.com")

        primary_headers = {
            "Authorization": f"Bearer {primary_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        primary_body = MediaService._build_nvidia_genai_body(payload, primary_model)
        primary_path = MediaService._relative_api_path(f"genai/{primary_model}")

        async with httpx.AsyncClient(base_url=primary_base, timeout=60.0) as client:
            resp = await client.post(primary_path, json=primary_body, headers=primary_headers)
        if resp.status_code < 400:
            return resp, "primary", primary_model

        if not MediaService._is_retryable_provider_failure(resp):
            return resp, "primary", primary_model

        fallback_key = MediaService._fallback_image_key() or primary_key
        fallback_base = (MediaService._fallback_image_base() or primary_base).rstrip("/")
        if "integrate.api.nvidia.com" in fallback_base:
            fallback_base = fallback_base.replace("integrate.api.nvidia.com", "ai.api.nvidia.com")

        fallback_headers = {
            "Authorization": f"Bearer {fallback_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        fallback_body = MediaService._build_nvidia_genai_body(payload, fallback_model)
        fallback_path = MediaService._relative_api_path(f"genai/{fallback_model}")

        async with httpx.AsyncClient(base_url=fallback_base, timeout=60.0) as client:
            fb_resp = await client.post(fallback_path, json=fallback_body, headers=fallback_headers)
        return fb_resp, "fallback", fallback_model

    @staticmethod
    def _extract_image_content_from_response(data: Dict[str, Any]) -> tuple[str | None, str | None]:
        first_data = (data.get("data") or [{}])[0]
        if first_data.get("b64_json") or first_data.get("url"):
            return first_data.get("b64_json"), first_data.get("url")

        first_artifact = (data.get("artifacts") or [{}])[0]
        if first_artifact.get("base64") or first_artifact.get("image") or first_artifact.get("b64_json"):
            b64_val = first_artifact.get("base64") or first_artifact.get("image") or first_artifact.get("b64_json")
            return b64_val, None

        candidates = [
            data.get("b64_json"),
            data.get("base64"),
            data.get("image_base64"),
            data.get("image"),
            data.get("url"),
        ]
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.strip():
                value = candidate.strip()
                if value.startswith("http://") or value.startswith("https://"):
                    return None, value
                return value, None
        return None, None

    @staticmethod
    def _build_image_request_body(payload: ImageGenerateRequestSchema, model_id: str) -> Dict[str, Any]:
        # FLUX providers often reject OpenAI-only keys like quality/style/size.
        if MediaService._is_flux_model(model_id):
            return {
                "model": model_id,
                "prompt": payload.prompt,
            }

        body: Dict[str, Any] = {
            "model": model_id,
            "prompt": payload.prompt,
            "size": payload.size,
            "response_format": payload.response_format,
        }
        if payload.quality:
            body["quality"] = payload.quality
        if payload.style:
            body["style"] = payload.style
        return body

    @staticmethod
    def _build_minimal_image_body(model_id: str, prompt: str) -> Dict[str, Any]:
        return {
            "model": model_id,
            "prompt": prompt,
        }

    @staticmethod
    def _looks_like_unknown_image_param(resp: httpx.Response) -> bool:
        if resp.status_code < 400:
            return False
        try:
            text = str(resp.json()).lower()
        except Exception:
            text = (resp.text or "").lower()
        return "unknown parameter" in text or "unsupported parameter" in text

    @staticmethod
    async def _try_openai_emergency_image_fallback(payload: ImageGenerateRequestSchema) -> httpx.Response | None:
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return None

        openai_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").strip() or "https://api.openai.com/v1"
        openai_model = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1").strip() or "gpt-image-1"

        # Start with minimal body for compatibility across newer/stricter APIs.
        body: Dict[str, Any] = {
            "model": openai_model,
            "prompt": payload.prompt,
        }

        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(base_url=openai_base, timeout=60.0) as client:
            resp = await client.post(MediaService._relative_api_path("images/generations"), json=body, headers=headers)
            if resp.status_code < 400:
                return resp

            # If minimal fails for non-parameter reasons, return as-is.
            if not MediaService._looks_like_unknown_image_param(resp):
                return resp

            # Retry with expanded OpenAI-style fields only when accepted.
            enriched: Dict[str, Any] = {
                "model": openai_model,
                "prompt": payload.prompt,
                "size": payload.size,
            }
            if payload.quality:
                enriched["quality"] = payload.quality
            if payload.style:
                enriched["style"] = payload.style
            return await client.post(MediaService._relative_api_path("images/generations"), json=enriched, headers=headers)

    @staticmethod
    def _primary_vision_model() -> str:
        return os.getenv("MEDIA_VISION_MODEL") or MediaService.VISION_MODEL or "gpt-4o-mini"

    @staticmethod
    def _fallback_image_model() -> str:
        return (
            MediaService.IMAGE_FALLBACK_MODEL
            or os.getenv("MEDIA_IMAGE_FALLBACK_MODEL", "")
            or "gpt-image-1"
        )

    @staticmethod
    def _fallback_vision_model() -> str:
        return MediaService.VISION_FALLBACK_MODEL or os.getenv("MEDIA_VISION_FALLBACK_MODEL", "")

    @staticmethod
    def _is_retryable_provider_failure(resp: httpx.Response) -> bool:
        if resp.status_code in {401, 402, 403, 429}:
            return True
        try:
            detail = str(resp.json()).lower()
        except Exception:
            detail = (resp.text or "").lower()
        retry_markers = [
            "insufficient",
            "insufficient_quota",
            "rate_limit",
            "balance",
            "quota",
            "model",
            "not found",
            "not available",
            "unsupported",
            "unknown parameter",
        ]
        if resp.status_code in {400, 404, 500, 502, 503, 504}:
            return True
        return any(marker in detail for marker in retry_markers)

    @staticmethod
    async def _post_with_optional_fallback(
        path: str,
        primary_body: Dict[str, Any],
        fallback_body: Dict[str, Any] | None = None,
    ) -> tuple[httpx.Response, str]:
        primary_key = MediaService._resolve_image_key()
        if not primary_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image provider key not configured. Set MEDIA_IMAGE_API_KEY or OPENAI_API_KEY.",
            )

        primary_base = MediaService._resolve_image_base()
        headers = {
            "Authorization": f"Bearer {primary_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(base_url=primary_base, timeout=60.0) as client:
            resp = await client.post(MediaService._relative_api_path(path), json=primary_body, headers=headers)

        if resp.status_code < 400:
            return resp, "primary"

        fallback_key = MediaService._fallback_image_key()
        fallback_base = MediaService._fallback_image_base()
        if not MediaService._is_retryable_provider_failure(resp):
            return resp, "primary"

        # If fallback key/base are not explicitly set, reuse primary provider
        # credentials and base so we can fail over to another model on same API.
        fallback_key = fallback_key or primary_key
        fallback_base = fallback_base or primary_base

        fallback_headers = {
            "Authorization": f"Bearer {fallback_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(base_url=fallback_base, timeout=60.0) as client:
            fb_resp = await client.post(MediaService._relative_api_path(path), json=fallback_body or primary_body, headers=fallback_headers)
        return fb_resp, "fallback"

    @staticmethod
    async def generate_image(payload: ImageGenerateRequestSchema) -> ImageGenerateResponseSchema:
        primary_model = (payload.model or MediaService._primary_image_model()).strip()
        fallback_model = (MediaService._fallback_image_model() or "").strip() or "gpt-image-1"
        if fallback_model == primary_model:
            fallback_model = "gpt-image-1" if primary_model != "gpt-image-1" else primary_model

        primary_base = MediaService._resolve_image_base()
        use_nvidia_genai = MediaService._is_nvidia_image_base(primary_base)

        try:
            if use_nvidia_genai:
                resp, source, used_model = await MediaService._post_nvidia_genai_with_optional_fallback(
                    primary_model=primary_model,
                    fallback_model=fallback_model,
                    payload=payload,
                )
            else:
                used_model = fallback_model if False else primary_model
                primary_body = MediaService._build_image_request_body(payload, primary_model)
                fallback_body = MediaService._build_image_request_body(payload, fallback_model)
                resp, source = await MediaService._post_with_optional_fallback(
                    "/images/generations",
                    primary_body=primary_body,
                    fallback_body=fallback_body,
                )

                # Some providers support /images/generations but reject OpenAI-only
                # fields like response_format/size/style/quality. Retry once minimally.
                if MediaService._looks_like_unknown_image_param(resp):
                    minimal_primary = MediaService._build_minimal_image_body(primary_model, payload.prompt)
                    minimal_fallback = MediaService._build_minimal_image_body(fallback_model, payload.prompt)
                    resp, source = await MediaService._post_with_optional_fallback(
                        "/images/generations",
                        primary_body=minimal_primary,
                        fallback_body=minimal_fallback,
                    )
                used_model = fallback_model if source == "fallback" else primary_model
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        if resp.status_code >= 400:
            # If provider/model fails, attempt OpenAI image fallback when key is available.
            emergency_resp = await MediaService._try_openai_emergency_image_fallback(payload)
            if emergency_resp is not None and emergency_resp.status_code < 400:
                resp = emergency_resp
                source = "fallback"
                fallback_model = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1").strip() or "gpt-image-1"
                used_model = fallback_model

        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=detail)

        data = resp.json()
        b64_json, url = MediaService._extract_image_content_from_response(data)
        if not b64_json and not url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Image provider returned no image content.",
            )

        return ImageGenerateResponseSchema(
            model=used_model,
            provider="nvidia-genai-fallback" if (use_nvidia_genai and source == "fallback") else (
                "nvidia-genai" if use_nvidia_genai else (
                    "openai-compatible-fallback" if source == "fallback" else "openai-compatible"
                )
            ),
            b64_json=b64_json,
            url=url,
        )

    @staticmethod
    async def analyze_image(payload: ImageAnalyzeRequestSchema) -> ImageAnalyzeResponseSchema:
        primary_model = payload.model or MediaService._primary_vision_model()
        fallback_model = payload.model or MediaService._fallback_vision_model() or primary_model
        prompt = payload.prompt.strip()
        if payload.file_name:
            prompt = f"File name: {payload.file_name}\n{prompt}"

        primary_body: Dict[str, Any] = {
            "model": primary_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": payload.image_data_url}},
                    ],
                }
            ],
        }

        fallback_body = dict(primary_body)
        fallback_body["model"] = fallback_model

        try:
            resp, source = await MediaService._post_with_optional_fallback(
                "/chat/completions",
                primary_body=primary_body,
                fallback_body=fallback_body,
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=detail)

        data = resp.json()
        content = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        return ImageAnalyzeResponseSchema(
            model=fallback_model if source == "fallback" else primary_model,
            provider="openai-compatible-fallback" if source == "fallback" else "openai-compatible",
            analysis=content or "No analysis text returned.",
        )

    @staticmethod
    async def generate_speech(payload: SpeechGenerateRequestSchema) -> SpeechGenerateResponseSchema:
        api_key = MediaService._resolve_audio_key()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio provider key not configured. Set MEDIA_AUDIO_API_KEY or OPENAI_API_KEY.",
            )

        model = payload.model or MediaService.AUDIO_MODEL
        request_body: Dict[str, Any] = {
            "model": model,
            "input": payload.text,
            "voice": payload.voice,
            "format": payload.format,
            "speed": payload.speed,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(base_url=MediaService.AUDIO_API_BASE, timeout=60.0) as client:
            try:
                resp = await client.post(MediaService._relative_api_path("audio/speech"), json=request_body, headers=headers)
            except Exception as exc:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=detail)

        content_type = resp.headers.get("content-type", "audio/mpeg")
        b64_audio = base64.b64encode(resp.content).decode("utf-8")

        return SpeechGenerateResponseSchema(
            model=model,
            provider="openai-compatible",
            mime_type=content_type,
            b64_audio=b64_audio,
        )

    @staticmethod
    async def _ensure_default_tts_agents(db: AsyncSession) -> None:
        existing = (
            await db.execute(
                select(TTSAgentProfile).where(TTSAgentProfile.user_id.is_(None)).where(TTSAgentProfile.provider == "nvidia-magpie")
            )
        ).scalars().first()
        if existing:
            return

        default_agent = TTSAgentProfile(
            user_id=None,
            name="magpie-hindi",
            language_code="hi-IN",
            voice_id="Magpie-Multilingual.EN-US.Aria",
            emotion="Happy",
            provider="nvidia-magpie",
            is_active=True,
        )
        db.add(default_agent)
        await db.commit()

    @staticmethod
    async def list_tts_agents(db: AsyncSession, user: User) -> list[TTSAgentResponseSchema]:
        await MediaService._ensure_default_tts_agents(db)
        rows = (
            await db.execute(
                select(TTSAgentProfile)
                .where((TTSAgentProfile.user_id == user.id) | (TTSAgentProfile.user_id.is_(None)))
                .order_by(TTSAgentProfile.created_at.asc())
            )
        ).scalars().all()
        return [
            TTSAgentResponseSchema(
                id=row.id,
                name=row.name,
                language_code=row.language_code,
                voice_id=row.voice_id,
                emotion=row.emotion or "Neutral",
                provider=row.provider,
                is_active=row.is_active,
            )
            for row in rows
        ]

    @staticmethod
    async def create_tts_agent(db: AsyncSession, user: User, payload: TTSAgentCreateRequestSchema) -> TTSAgentResponseSchema:
        agent = TTSAgentProfile(
            user_id=user.id,
            name=payload.name,
            language_code=payload.language_code,
            voice_id=payload.voice_id,
            emotion=payload.emotion,
            provider="nvidia-magpie",
            is_active=True,
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        return TTSAgentResponseSchema(
            id=agent.id,
            name=agent.name,
            language_code=agent.language_code,
            voice_id=agent.voice_id,
            emotion=agent.emotion or "Neutral",
            provider=agent.provider,
            is_active=agent.is_active,
        )

    @staticmethod
    def _audio_files_dir_path() -> Path:
        base = Path(__file__).resolve().parents[3]
        target = base / MediaService.MEDIA_AUDIO_FILES_DIR
        target.mkdir(parents=True, exist_ok=True)
        return target

    @staticmethod
    def _ensure_wav_container(audio_bytes: bytes, sample_rate_hz: int | None = None) -> bytes:
        # If provider already returned a WAV container, keep as-is.
        if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
            return audio_bytes

        sr = sample_rate_hz or MediaService.NVIDIA_MAGPIE_SAMPLE_RATE
        channels = max(1, MediaService.NVIDIA_MAGPIE_CHANNELS)
        sample_width = max(1, MediaService.NVIDIA_MAGPIE_SAMPLE_WIDTH)

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(sr)
            wav_file.writeframes(audio_bytes)
        return buffer.getvalue()

    @staticmethod
    def _synthesize_nvidia_magpie(text: str, voice_id: str, language_code: str) -> bytes:
        nvidia_api_key = os.getenv("NVIDIA_API_KEY", "").strip() or os.getenv("MEDIA_AUDIO_API_KEY", "").strip()
        function_id = os.getenv("NVIDIA_MAGPIE_FUNCTION_ID", MediaService.NVIDIA_MAGPIE_FUNCTION_ID).strip()
        if not nvidia_api_key:
            raise HTTPException(status_code=400, detail="NVIDIA_API_KEY not configured for Magpie TTS.")
        if not function_id:
            raise HTTPException(status_code=400, detail="NVIDIA_MAGPIE_FUNCTION_ID not configured for Magpie TTS.")

        try:
            import riva.client  # type: ignore
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"nvidia-riva-client not installed: {exc}")

        try:
            auth = riva.client.Auth(
                uri=os.getenv("NVIDIA_MAGPIE_URI", MediaService.NVIDIA_MAGPIE_URI),
                use_ssl=True,
                metadata_args=[
                    ("function-id", function_id),
                    ("authorization", f"Bearer {nvidia_api_key}"),
                ],
            )
            tts_service = riva.client.SpeechSynthesisService(auth)
            resp = tts_service.synthesize(
                text=text,
                language_code=language_code,
                voice_name=voice_id,
            )
            audio_bytes = getattr(resp, "audio", None)
            if not audio_bytes:
                raise RuntimeError("Magpie returned empty audio payload")
            resp_sample_rate = getattr(resp, "sample_rate_hz", None)
            return MediaService._ensure_wav_container(audio_bytes, resp_sample_rate)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Magpie TTS generation failed: {exc}")

    @staticmethod
    async def generate_agent_tts(
        db: AsyncSession,
        user: User,
        payload: TTSAgentGenerateRequestSchema,
    ) -> TTSAgentGenerateResponseSchema:
        agent = (
            await db.execute(
                select(TTSAgentProfile)
                .where(TTSAgentProfile.id == payload.agent_id)
                .where((TTSAgentProfile.user_id == user.id) | (TTSAgentProfile.user_id.is_(None)))
            )
        ).scalars().first()
        if not agent:
            raise HTTPException(status_code=404, detail="TTS agent not found")
        if not agent.is_active:
            raise HTTPException(status_code=400, detail="TTS agent is disabled")

        audio_bytes = MediaService._synthesize_nvidia_magpie(
            text=payload.text,
            voice_id=agent.voice_id,
            language_code=agent.language_code,
        )

        file_name = f"{uuid.uuid4()}.wav"
        file_path = MediaService._audio_files_dir_path() / file_name
        with open(file_path, "wb") as f:
            f.write(audio_bytes)

        relative_path = f"/media/audio/files/{file_name}"
        record = TTSAgentMessage(
            agent_id=agent.id,
            user_id=user.id,
            text_content=payload.text,
            audio_file_path=relative_path,
            mime_type="audio/wav",
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return TTSAgentGenerateResponseSchema(
            message_id=record.id,
            agent_id=agent.id,
            agent_name=agent.name,
            text=payload.text,
            audio_url=relative_path,
            mime_type=record.mime_type,
        )