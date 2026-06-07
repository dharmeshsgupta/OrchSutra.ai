"""Ingestion service that fetches external LLM data and stores snapshots."""

import os
from collections import Counter
from datetime import datetime, date
from typing import Any, Dict, List

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from src.db.models import RankingSnapshot, IngestionRun


OPENROUTER_MODELS_URL = os.getenv("OPENROUTER_MODELS_URL", "https://openrouter.ai/api/v1/models")
HUGGINGFACE_MODELS_URL = os.getenv(
    "HUGGINGFACE_MODELS_URL",
    "https://huggingface.co/api/models?sort=downloads&direction=-1&limit=200",
)

MAX_INT32 = 2_147_000_000
DEFAULT_COLOR = "#9ca3af"
COLOR_PALETTE = [
    "#f062b0",
    "#4d90c6",
    "#08b9a7",
    "#ff6b4a",
    "#7f1d9e",
    "#6f61e8",
    "#f7b32b",
    "#43b581",
    "#d9a82f",
    "#ff4d00",
]


def _safe_int(value: Any, default: int = 0) -> int:
    """Convert value to bounded int to avoid DB overflow and bad payloads."""
    try:
        parsed = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(0, min(parsed, MAX_INT32))


def _color_at(index: int) -> str:
    return COLOR_PALETTE[index % len(COLOR_PALETTE)]


def _normalize_provider(name: str) -> str:
    lowered = (name or "unknown").lower()
    if "openai" in lowered or lowered.startswith("gpt"):
        return "OpenAI"
    if "anthropic" in lowered or "claude" in lowered:
        return "Anthropic"
    if "google" in lowered or "gemini" in lowered:
        return "Google"
    if "meta" in lowered or "llama" in lowered:
        return "Meta"
    if "mistral" in lowered:
        return "Mistral"
    if "deepseek" in lowered:
        return "DeepSeek"
    if "qwen" in lowered or "alibaba" in lowered:
        return "Alibaba"
    if "cohere" in lowered:
        return "Cohere"
    if "xai" in lowered or "grok" in lowered:
        return "xAI"
    if "minimax" in lowered:
        return "MiniMax"
    return "Others"


async def _fetch_json(url: str) -> Any:
    """Fetch JSON data from an external endpoint with timeout and headers."""
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        print(f"Failed to fetch {url}: {exc}")
        return None


def _default_categories() -> List[Dict]:
    return [
        {"id": "reasoning", "name": "Reasoning", "subtitle": "category", "value": 520000, "color": "#f062b0"},
        {"id": "chat", "name": "Chat", "subtitle": "category", "value": 420000, "color": "#4d90c6"},
        {"id": "coding", "name": "Coding", "subtitle": "category", "value": 310000, "color": "#08b9a7"},
        {"id": "vision", "name": "Vision", "subtitle": "category", "value": 200000, "color": "#ff6b4a"},
        {"id": "others", "name": "Others", "subtitle": "category", "value": 140000, "color": "#7f1d9e"},
    ]


def _default_languages() -> List[Dict]:
    return [
        {"id": "english", "name": "English", "subtitle": "language", "value": 820000, "color": "#f062b0"},
        {"id": "chinese", "name": "Chinese", "subtitle": "language", "value": 380000, "color": "#1d82e6"},
        {"id": "hindi", "name": "Hindi", "subtitle": "language", "value": 210000, "color": "#08b9a7"},
        {"id": "spanish", "name": "Spanish", "subtitle": "language", "value": 150000, "color": "#f7b32b"},
        {"id": "others", "name": "Others", "subtitle": "language", "value": 150000, "color": "#7f1d9e"},
    ]


def _default_programming() -> List[Dict]:
    return [
        {"id": "python", "name": "Python", "subtitle": "programming", "value": 520000, "color": "#f062b0"},
        {"id": "typescript", "name": "TypeScript", "subtitle": "programming", "value": 180000, "color": "#1d82e6"},
        {"id": "javascript", "name": "JavaScript", "subtitle": "programming", "value": 150000, "color": "#08b9a7"},
        {"id": "java", "name": "Java", "subtitle": "programming", "value": 120000, "color": "#f7b32b"},
        {"id": "others", "name": "Others", "subtitle": "programming", "value": 80000, "color": "#7f1d9e"},
    ]


def _default_tool_calls() -> List[Dict]:
    return [
        {"id": "openai-tools", "name": "OpenAI Tool Models", "subtitle": "by openai", "value": 280000, "color": "#08b9a7"},
        {"id": "google-tools", "name": "Google Tool Models", "subtitle": "by google", "value": 180000, "color": "#6f61e8"},
        {"id": "anthropic-tools", "name": "Anthropic Tool Models", "subtitle": "by anthropic", "value": 120000, "color": "#c06ad6"},
        {"id": "others-tools", "name": "Others", "subtitle": "by unknown", "value": 85000, "color": "#f062b0"},
    ]


def _default_images() -> List[Dict]:
    return [
        {"id": "sdxl", "name": "SDXL", "subtitle": "by stabilityai", "value": 160000, "color": "#1d82e6"},
        {"id": "flux", "name": "FLUX", "subtitle": "by black-forest-labs", "value": 48000, "color": "#ff4d00"},
        {"id": "kandinsky", "name": "Kandinsky", "subtitle": "by sber", "value": 33000, "color": "#d9a82f"},
        {"id": "others", "name": "Others", "subtitle": "by unknown", "value": 109000, "color": "#f062b0"},
    ]


def _default_top_models() -> List[Dict]:
    return [
        {"id": "minimax-m3-5", "name": "MiniMax M3.5", "subtitle": "MiniMax", "value": 2010000, "color": "#6366f1"},
        {"id": "claude-sonnet", "name": "Claude Sonnet", "subtitle": "Anthropic", "value": 531000, "color": "#8b5cf6"},
        {"id": "grok-code-fast", "name": "Grok Code Fast", "subtitle": "xAI", "value": 413000, "color": "#ec4899"},
        {"id": "mimo-v2", "name": "MiMo V2", "subtitle": "Xiaomi", "value": 397000, "color": "#f43f5e"},
        {"id": "gemini-flash", "name": "Gemini Flash", "subtitle": "Google", "value": 387000, "color": "#f97316"},
    ]


def _default_market_share() -> List[Dict]:
    return [
        {"id": "openai", "name": "OpenAI", "value": 1460, "color": "#d4a017"},
        {"id": "google", "name": "Google", "value": 1440, "color": "#10b981"},
        {"id": "anthropic", "name": "Anthropic", "value": 1170, "color": "#1d82e6"},
        {"id": "meta", "name": "Meta", "value": 1100, "color": "#ff6b4a"},
        {"id": "deepseek", "name": "DeepSeek", "value": 870, "color": "#f7b32b"},
    ]


def _extract_hf_models(payload: Any) -> List[Dict]:
    if not isinstance(payload, list):
        return []
    models: List[Dict] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        model_id = row.get("id") or row.get("modelId")
        if not model_id:
            continue
        models.append(row)
    return models


def _is_llm_model(model: Dict) -> bool:
    """Heuristic filter to keep LLM/text models and exclude non-LLM assets."""
    model_id = str(model.get("id") or "").lower()
    pipeline_tag = str(model.get("pipeline_tag") or "").lower()
    tags = [str(tag).lower() for tag in (model.get("tags") or [])]
    blob = " ".join([model_id, pipeline_tag] + tags)

    blocked_tokens = (
        "nsfw",
        "image",
        "vision",
        "detector",
        "classification",
        "segmentation",
        "speech",
        "asr",
        "audio",
        "tts",
        "whisper",
    )
    if any(token in blob for token in blocked_tokens):
        return False

    llm_pipeline_tags = {
        "text-generation",
        "text2text-generation",
        "conversational",
        "summarization",
        "translation",
        "question-answering",
    }
    if pipeline_tag in llm_pipeline_tags:
        return True

    llm_tokens = ("llm", "instruct", "chat", "text-generation", "gpt", "llama", "qwen", "gemma", "mistral", "deepseek")
    return any(token in blob for token in llm_tokens)


def _extract_openrouter_models(payload: Any) -> List[Dict]:
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return [row for row in payload["data"] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def _build_categories_from_hf(hf_models: List[Dict]) -> List[Dict]:
    if not hf_models:
        return _default_categories()

    task_to_category = {
        "text-generation": "Reasoning",
        "conversational": "Chat",
        "question-answering": "Reasoning",
        "feature-extraction": "Reasoning",
        "fill-mask": "Reasoning",
        "text2text-generation": "Chat",
        "token-classification": "Others",
        "sentence-similarity": "Reasoning",
        "translation": "Chat",
        "summarization": "Chat",
        "text-classification": "Others",
        "text-to-image": "Vision",
        "image-to-text": "Vision",
        "image-classification": "Vision",
    }

    counts: Counter[str] = Counter()
    for model in hf_models:
        downloads = _safe_int(model.get("downloads"), default=1)
        tag = str(model.get("pipeline_tag") or "").lower()
        category = task_to_category.get(tag)
        if not category:
            model_name = str(model.get("id", "")).lower()
            if "code" in model_name:
                category = "Coding"
            elif any(token in model_name for token in ("vision", "image", "vl")):
                category = "Vision"
            else:
                category = "Others"
        counts[category] += downloads

    ordered = ["Reasoning", "Chat", "Coding", "Vision", "Others"]
    return [
        {
            "id": name.lower(),
            "name": name,
            "subtitle": "category",
            "value": _safe_int(counts.get(name, 1), default=1),
            "color": _color_at(i),
        }
        for i, name in enumerate(ordered)
    ]


def _build_languages_from_hf(hf_models: List[Dict]) -> List[Dict]:
    if not hf_models:
        return _default_languages()

    language_tags = {
        "english": ("en", "english"),
        "chinese": ("zh", "chinese", "mandarin"),
        "hindi": ("hi", "hindi"),
        "spanish": ("es", "spanish"),
    }

    counts: Counter[str] = Counter()
    for model in hf_models:
        downloads = _safe_int(model.get("downloads"), default=1)
        tags = [str(tag).lower() for tag in (model.get("tags") or [])]
        text_blob = " ".join(tags) + " " + str(model.get("id", "")).lower()

        matched = False
        for language, aliases in language_tags.items():
            if any(alias in text_blob.split() or alias in text_blob for alias in aliases):
                counts[language] += downloads
                matched = True
                break
        if not matched:
            counts["others"] += downloads

    ordered = ["english", "chinese", "hindi", "spanish", "others"]
    return [
        {
            "id": name,
            "name": name.capitalize(),
            "subtitle": "language",
            "value": _safe_int(counts.get(name, 1), default=1),
            "color": _color_at(i),
        }
        for i, name in enumerate(ordered)
    ]


def _build_programming_from_hf(hf_models: List[Dict]) -> List[Dict]:
    if not hf_models:
        return _default_programming()

    language_tags = {
        "python": ("python", "py"),
        "typescript": ("typescript", "ts"),
        "javascript": ("javascript", "js"),
        "java": ("java",),
    }

    counts: Counter[str] = Counter()
    for model in hf_models:
        downloads = _safe_int(model.get("downloads"), default=1)
        tags = [str(tag).lower() for tag in (model.get("tags") or [])]
        text_blob = " ".join(tags) + " " + str(model.get("id", "")).lower()

        matched = False
        for lang, aliases in language_tags.items():
            if any(alias in text_blob for alias in aliases):
                counts[lang] += downloads
                matched = True
                break
        if not matched:
            counts["others"] += downloads

    ordered = ["python", "typescript", "javascript", "java", "others"]
    return [
        {
            "id": name,
            "name": name.capitalize() if name != "typescript" else "TypeScript",
            "subtitle": "programming",
            "value": _safe_int(counts.get(name, 1), default=1),
            "color": _color_at(i),
        }
        for i, name in enumerate(ordered)
    ]


def _build_images_from_hf(hf_models: List[Dict]) -> List[Dict]:
    if not hf_models:
        return _default_images()

    image_related = []
    for model in hf_models:
        tag = str(model.get("pipeline_tag") or "").lower()
        if tag in {"text-to-image", "image-to-image", "image-classification", "image-to-text"}:
            image_related.append(model)

    if not image_related:
        return _default_images()

    top = sorted(image_related, key=lambda x: _safe_int(x.get("downloads"), 0), reverse=True)[:4]
    rows: List[Dict] = []
    for i, model in enumerate(top):
        model_id = str(model.get("id"))
        rows.append(
            {
                "id": model_id.lower().replace("/", "-"),
                "name": model_id.split("/")[-1][:40],
                "subtitle": f"by {model_id.split('/')[0] if '/' in model_id else 'unknown'}",
                "value": _safe_int(model.get("downloads"), default=1),
                "color": _color_at(i),
            }
        )
    return rows


def _build_top_models_from_hf(hf_models: List[Dict]) -> List[Dict]:
    if not hf_models:
        return _default_top_models()

    top = sorted(hf_models, key=lambda x: _safe_int(x.get("downloads"), 0), reverse=True)[:5]
    rows: List[Dict] = []
    for i, model in enumerate(top):
        model_id = str(model.get("id"))
        provider = model_id.split("/")[0] if "/" in model_id else _normalize_provider(model_id)
        rows.append(
            {
                "id": model_id.lower().replace("/", "-"),
                "name": model_id.split("/")[-1][:50],
                "subtitle": provider,
                "value": _safe_int(model.get("downloads"), default=1),
                "color": _color_at(i),
            }
        )
    return rows


def _build_market_share_from_openrouter(openrouter_models: List[Dict], hf_models: List[Dict]) -> List[Dict]:
    provider_scores: Counter[str] = Counter()

    for model in openrouter_models:
        model_id = str(model.get("id") or model.get("name") or "")
        provider = _normalize_provider(model_id)
        provider_scores[provider] += 1

    for model in hf_models:
        model_id = str(model.get("id") or "")
        provider = _normalize_provider(model_id)
        provider_scores[provider] += max(1, _safe_int(model.get("downloads"), default=1) // 100_000)

    if not provider_scores:
        return _default_market_share()

    top = provider_scores.most_common(5)
    rows: List[Dict] = []
    for i, (provider, score) in enumerate(top):
        rows.append(
            {
                "id": provider.lower().replace(" ", "-"),
                "name": provider,
                "value": _safe_int(score, default=1),
                "color": _color_at(i),
            }
        )
    return rows


def _build_tool_calls_from_openrouter(openrouter_models: List[Dict], hf_models: List[Dict]) -> List[Dict]:
    provider_scores: Counter[str] = Counter()

    for model in openrouter_models:
        model_id = str(model.get("id") or model.get("name") or "")
        provider = _normalize_provider(model_id)
        score = 1
        lowered = model_id.lower()
        if any(token in lowered for token in ("tool", "function", "agent", "reasoning")):
            score += 3
        provider_scores[provider] += score

    for model in hf_models:
        model_id = str(model.get("id") or "")
        tags = [str(tag).lower() for tag in (model.get("tags") or [])]
        text_blob = model_id.lower() + " " + " ".join(tags)
        if any(token in text_blob for token in ("function-calling", "tool-use", "agent", "code")):
            provider = _normalize_provider(model_id)
            provider_scores[provider] += max(1, _safe_int(model.get("downloads"), default=1) // 200_000)

    if not provider_scores:
        return _default_tool_calls()

    top = provider_scores.most_common(4)
    rows: List[Dict] = []
    for i, (provider, score) in enumerate(top):
        rows.append(
            {
                "id": f"{provider.lower().replace(' ', '-')}-tools",
                "name": f"{provider} Tool Models",
                "subtitle": f"by {provider.lower()}",
                "value": _safe_int(score, default=1),
                "color": _color_at(i),
            }
        )
    return rows


async def fetch_external_llm_data() -> Dict[str, List[Dict]]:
    """
    Fetch external LLM market data from internet sources.
    
    Returns:
        Dict with chart_key -> List of items
    """
    
    openrouter_payload = await _fetch_json(OPENROUTER_MODELS_URL)
    huggingface_payload = await _fetch_json(HUGGINGFACE_MODELS_URL)

    openrouter_models = _extract_openrouter_models(openrouter_payload)
    hf_models_all = _extract_hf_models(huggingface_payload)
    hf_models = [model for model in hf_models_all if _is_llm_model(model)]
    if not hf_models:
        hf_models = hf_models_all

    categories_data = _build_categories_from_hf(hf_models)
    languages_data = _build_languages_from_hf(hf_models)
    programming_data = _build_programming_from_hf(hf_models)
    tool_calls_data = _build_tool_calls_from_openrouter(openrouter_models, hf_models)
    images_data = _build_images_from_hf(hf_models_all)
    top_models_data = _build_top_models_from_hf(hf_models)
    market_share_data = _build_market_share_from_openrouter(openrouter_models, hf_models)

    if not categories_data:
        categories_data = _default_categories()
    if not languages_data:
        languages_data = _default_languages()
    if not programming_data:
        programming_data = _default_programming()
    if not tool_calls_data:
        tool_calls_data = _default_tool_calls()
    if not images_data:
        images_data = _default_images()
    if not top_models_data:
        top_models_data = _default_top_models()
    if not market_share_data:
        market_share_data = _default_market_share()

    return {
        "categories": categories_data,
        "languages": languages_data,
        "programming": programming_data,
        "tool_calls": tool_calls_data,
        "images": images_data,
        "top_models": top_models_data,
        "market_share": market_share_data,
    }


async def run_daily_ingestion(
    db: AsyncSession,
    snapshot_date: date = None,
) -> IngestionRun:
    """
    Fetch external data and store snapshots for all chart types.
    
    Args:
        db: AsyncSession for database operations
        snapshot_date: Date to snapshot (defaults to today)
    
    Returns:
        IngestionRun with status and message
    """
    if not snapshot_date:
        snapshot_date = datetime.utcnow().date()
    
    ingestion_run = IngestionRun(
        run_type="daily",
        status="in_progress",
        started_at=datetime.utcnow(),
    )
    db.add(ingestion_run)
    await db.flush()  # Get the ID
    
    try:
        # Fetch from external sources
        data = await fetch_external_llm_data()
        
        # Delete old snapshots for this date (replace old data)
        await db.execute(
            delete(RankingSnapshot).where(
                RankingSnapshot.snapshot_date == snapshot_date
            )
        )
        
        # Insert new snapshots
        total_inserted = 0
        for chart_key, items in data.items():
            for item in items:
                # Calculate share percent if value is available
                total_value = sum(x["value"] for x in items)
                share_percent = (item["value"] / total_value * 100) if total_value else 0
                
                snapshot = RankingSnapshot(
                    snapshot_date=snapshot_date,
                    chart_key=chart_key,
                    item_id=item["id"],
                    item_name=item["name"],
                    subtitle=item.get("subtitle"),
                    value=item["value"],
                    share_percent=round(share_percent, 2),
                    color=item.get("color", "#9ca3af"),
                    source="external",
                )
                db.add(snapshot)
                total_inserted += 1
        
        await db.commit()
        
        # Update ingestion run
        ingestion_run.status = "success"
        ingestion_run.message = f"Inserted {total_inserted} snapshots for {len(data)} chart types"
        ingestion_run.finished_at = datetime.utcnow()
        await db.commit()
        
        return ingestion_run
        
    except Exception as e:
        # Log error and update ingestion run
        await db.rollback()
        ingestion_run.status = "failed"
        ingestion_run.message = f"Ingestion failed: {str(e)}"
        ingestion_run.finished_at = datetime.utcnow()
        db.add(ingestion_run)
        await db.commit()
        
        return ingestion_run