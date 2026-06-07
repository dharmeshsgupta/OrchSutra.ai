"""Rankings service — generates ranking data for the rankings page."""

from typing import List, Dict
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, Index
from collections import defaultdict
import random

from src.db.models import RankingSnapshot


# Color palette for the stacked chart (similar to OpenRouter)
MODEL_COLORS = [
    "#6366f1",  # Indigo
    "#8b5cf6",  # Violet
    "#ec4899",  # Pink
    "#f43f5e",  # Rose
    "#f97316",  # Orange
    "#eab308",  # Yellow
    "#22c55e",  # Green
    "#14b8a6",  # Teal
    "#06b6d4",  # Cyan
    "#3b82f6",  # Blue
    "#a855f7",  # Purple
    "#d946ef",  # Fuchsia
]


class RankingsService:
    """Service for generating rankings and usage statistics."""

    @staticmethod
    def format_tokens(tokens: int) -> str:
        """Format token count for display (e.g., 2.01T, 531B, 413M)."""
        if tokens >= 1_000_000_000_000:  # Trillion
            return f"{tokens / 1_000_000_000_000:.2f}T"
        elif tokens >= 1_000_000_000:  # Billion
            return f"{tokens / 1_000_000_000:.0f}B"
        elif tokens >= 1_000_000:  # Million
            return f"{tokens / 1_000_000:.0f}M"
        elif tokens >= 1_000:  # Thousand
            return f"{tokens / 1_000:.0f}K"
        return str(tokens)

    @staticmethod
    async def get_top_models_chart(db: AsyncSession, weeks: int = 52) -> Dict:
        """Get weekly usage data for the stacked bar chart from DB and map to frontend format."""
        raw_data = await RankingsService._get_distribution_from_db(db, "top_models", weeks=weeks)
        if "weeks" in raw_data:
            for week in raw_data["weeks"]:
                formatted_models = []
                for item in week.pop("items", []):
                    formatted_models.append({
                        "model_id": item["item_id"],
                        "model_name": item["item_name"],
                        "tokens": item["value"],
                        "color": item["color"],
                    })
                week["models"] = formatted_models
                week["total_tokens"] = week.pop("total_value", 0)
        return raw_data

    @staticmethod
    async def get_market_share_chart(db: AsyncSession, weeks: int = 52) -> Dict:
        """Get market share data from DB and map to frontend format."""
        raw_data = await RankingsService._get_distribution_from_db(db, "market_share", weeks=weeks)
        if "weeks" in raw_data:
            for week in raw_data["weeks"]:
                formatted_providers = []
                for item in week.pop("items", []):
                    formatted_providers.append({
                        "provider_id": item["item_id"],
                        "provider_name": item["item_name"],
                        "share_percent": item.get("share_percent", item["value"]),
                        "color": item["color"],
                    })
                week["providers"] = formatted_providers
        return raw_data

    @staticmethod
    async def get_leaderboard(
        db: AsyncSession, 
        period: str = "week"  # "week", "month", "all"
    ) -> Dict:
        """
        Get the LLM leaderboard rankings.
        
        In production:
        SELECT 
            m.id, m.name, m.company_name,
            SUM(u.total_tokens) as tokens,
            RANK() OVER (ORDER BY SUM(u.total_tokens) DESC) as rank
        FROM models m
        JOIN model_usage u ON m.id = u.model_id
        WHERE u.date >= [period_start]
        GROUP BY m.id
        ORDER BY tokens DESC
        LIMIT 50
        """
        
        # MOCK DATA - Replace with actual DB query
        leaderboard_data = [
            {"name": "MiniMax M3.5", "company": "MiniMax", "tokens": 2_010_000_000_000},
            {"name": "Claude Opus 4.6", "company": "Anthropic", "tokens": 769_000_000_000},
            {"name": "Claude Sonnet 4.5", "company": "Anthropic", "tokens": 531_000_000_000},
            {"name": "Grok Code Fast 1", "company": "xAI", "tokens": 413_000_000_000},
            {"name": "MiMo-V2-Flash", "company": "Xiaomi", "tokens": 397_000_000_000},
            {"name": "Gemini 3 Flash Preview", "company": "Google", "tokens": 387_000_000_000},
            {"name": "Claude Opus 4.5", "company": "Anthropic", "tokens": 370_000_000_000},
            {"name": "Gemini 2.5 Flash", "company": "Google", "tokens": 364_000_000_000},
            {"name": "DeepSeek V3.2", "company": "DeepSeek", "tokens": 311_000_000_000},
            {"name": "Gemini 2.5 Flash Lite", "company": "Google", "tokens": 253_000_000_000},
            {"name": "Grok 4.1 Fast", "company": "xAI", "tokens": 241_000_000_000},
            {"name": "GPT-4o", "company": "OpenAI", "tokens": 198_000_000_000},
            {"name": "Llama 3.3 70B", "company": "Meta", "tokens": 156_000_000_000},
            {"name": "Mistral Large 2", "company": "Mistral AI", "tokens": 134_000_000_000},
            {"name": "Command R+", "company": "Cohere", "tokens": 98_000_000_000},
        ]
        
        entries = []
        for i, model in enumerate(leaderboard_data):
            entries.append({
                "rank": i + 1,
                "model_id": str(i + 1),
                "model_name": model["name"],
                "company_name": model["company"],
                "logo_url": None,
                "total_tokens": model["tokens"],
                "tokens_display": RankingsService.format_tokens(model["tokens"]),
                "change_percent": random.uniform(-5, 15),  # Would calculate from previous period
                "trend": random.choice(["up", "down", "stable"]),
            })
        
        period_labels = {
            "week": "This Week",
            "month": "This Month",
            "all": "All Time",
        }
        
        return {
            "period": period_labels.get(period, "This Week"),
            "entries": entries,
            "updated_at": datetime.now().isoformat(),
        }

    @staticmethod
    async def get_rankings_overview(db: AsyncSession) -> Dict:
        chart_data = await RankingsService.get_top_models_chart(db, weeks=52)
        market_share = await RankingsService.get_market_share_chart(db, weeks=52)
        benchmarks = await RankingsService.get_benchmarks(db)
        fastest_models = await RankingsService.get_fastest_models(db)
        top_models = await RankingsService._get_distribution_from_db(db, "top_models", weeks=42)
        categories = await RankingsService.get_categories_chart(db)
        languages = await RankingsService.get_languages_chart(db)
        programming = await RankingsService.get_programming_chart(db)
        tool_calls = await RankingsService.get_tool_calls_chart(db)
        images = await RankingsService.get_images_chart(db)
        leaderboard = await RankingsService.get_leaderboard(db, period="week")

        return {
            "top_models_chart": chart_data,
            "market_share": market_share,
            "benchmarks": benchmarks,
            "fastest_models": fastest_models,
            "top_models": top_models,
            "categories": categories,
            "languages": languages,
            "programming": programming,
            "tool_calls": tool_calls,
            "images": images,
            "leaderboard": leaderboard,
        }
        
        



    @staticmethod
    async def get_benchmarks(db: AsyncSession) -> Dict:
        """Get benchmark data.
        In the future, this can be moved to query a Benchmarks table.
        For now, it returns static data as requested."""
        return {
            "metric": "Intelligence Index Score",
            "points": [
                {"model_id": "b1", "model_name": "Gemini 3.1 Pro Preview", "company_name": "Google", "score": 57.2, "price_per_million": 2.0, "color": "#f7b32b"},
                {"model_id": "b2", "model_name": "GPT-5.4", "company_name": "OpenAI", "score": 57.0, "price_per_million": 2.5, "color": "#43a371"},
                {"model_id": "b3", "model_name": "GPT-5.3-Codex", "company_name": "OpenAI", "score": 54.0, "price_per_million": 1.8, "color": "#31925d"},
                {"model_id": "b4", "model_name": "Claude Opus 4.6", "company_name": "Anthropic", "score": 53.0, "price_per_million": 5.0, "color": "#f9844a"},
                {"model_id": "b5", "model_name": "Claude Sonnet 4.6", "company_name": "Anthropic", "score": 51.7, "price_per_million": 3.2, "color": "#f77f42"},
                {"model_id": "b6", "model_name": "GPT-5.2", "company_name": "OpenAI", "score": 51.3, "price_per_million": 1.9, "color": "#2f8f58"},
            ],
        }

    @staticmethod
    async def get_fastest_models(db: AsyncSession) -> Dict:
        """Get fastest models data.
        In the future, this can be moved to query Performance metrics.
        For now, it returns static data as requested."""
        return {
            "metric": "Highest throughput",
            "points": [
                {"model_id": "f1", "model_name": "gpt-oss-safeguard-20b", "provider_name": "Groq", "throughput_tps": 814, "latency_ms": 75, "price_per_million": 0.07, "color": "#58d3ce"},
                {"model_id": "f2", "model_name": "gpt-oss-20b", "provider_name": "Groq", "throughput_tps": 757, "latency_ms": 82, "price_per_million": 0.07, "color": "#4bc7c2"},
                {"model_id": "f3", "model_name": "gpt-oss-120b", "provider_name": "Groq", "throughput_tps": 385, "latency_ms": 145, "price_per_million": 0.15, "color": "#4bc7c2"},
                {"model_id": "f4", "model_name": "Qwen3 32B", "provider_name": "Groq", "throughput_tps": 318, "latency_ms": 160, "price_per_million": 0.29, "color": "#f06db7"},
                {"model_id": "f5", "model_name": "o3 Mini", "provider_name": "OpenAI", "throughput_tps": 265, "latency_ms": 210, "price_per_million": 1.10, "color": "#43c8c1"},
            ],
        }


    @staticmethod
    def _build_distribution(
        title: str,
        subtitle: str,
        metric: str,
        item_seed: List[Dict],
        total_seed: int,
        weeks: int,
        volatility: float,
    ) -> Dict:
        start = datetime(2025, 12, 15)
        result_weeks = []

        for i in range(weeks):
            week_start = start + timedelta(days=7 * i)
            week_end = week_start + timedelta(days=6)

            total_value = max(
                1,
                int(total_seed * (0.8 + i * 0.02 + (random.random() - 0.5) * 0.15))
            )

            raw = []
            for idx, item in enumerate(item_seed):
                swing = (random.random() - 0.5) * 2 * volatility
                value = max(0.3, item["base_share"] + swing + (idx * 0.03))
                raw.append(value)

            raw_total = sum(raw)
            items = []
            used = 0
            for idx, item in enumerate(item_seed):
                share = (raw[idx] / raw_total) * 100
                val = int(total_value * (share / 100))
                used += val
                items.append({
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "subtitle": item.get("subtitle"),
                    "value": val,
                    "share_percent": round(share, 2),
                    "color": item["color"],
                })

            if items:
                items[0]["value"] += total_value - used

            result_weeks.append({
                "week_start": week_start.strftime("%d %b %Y"),
                "week_end": week_end.strftime("%d %b %Y"),
                "items": items,
                "total_value": total_value,
            })

        return {
            "title": title,
            "subtitle": subtitle,
            "metric": metric,
            "weeks": result_weeks,
        }

    @staticmethod
    async def _get_distribution_from_db(
        db: AsyncSession,
        chart_key: str,
        weeks: int = 52,
    ) -> Dict:
        """Query RankingSnapshot table and build chart response."""
        
        # Calculate date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Query: get all snapshots for this chart type in the date range
        query = (
            select(RankingSnapshot)
            .where(
                RankingSnapshot.chart_key == chart_key,
                RankingSnapshot.snapshot_date >= start_date,
                RankingSnapshot.snapshot_date <= end_date,
            )
            .order_by(RankingSnapshot.snapshot_date.asc())
        )
        
        rows = (await db.execute(query)).scalars().all()
        
        if not rows:
            # Fallback: return empty structure
            return {
                "title": chart_key.replace("_", " ").title(),
                "subtitle": "No data",
                "metric": "tokens",
                "weeks": []
            }
        
        # Group by week
        weekly_groups = defaultdict(list)
        for row in rows:
            week_key = row.snapshot_date.strftime("%Y-W%U")  # ISO week
            weekly_groups[week_key].append(row)
        
        # Build weeks array
        weeks_result = []
        for week_key in sorted(weekly_groups.keys()):
            items_in_week = weekly_groups[week_key]
            week_start = items_in_week[0].snapshot_date
            week_end = week_start + timedelta(days=6)
            
            total_value = sum(item.value for item in items_in_week)
            
            items = [
                {
                    "item_id": item.item_id,
                    "item_name": item.item_name,
                    "subtitle": item.subtitle,
                    "value": item.value,
                    "share_percent": round((item.value / total_value * 100), 2) if total_value else 0,
                    "color": item.color or "#9ca3af",
                }
                for item in items_in_week
            ]
            
            weeks_result.append({
                "week_start": week_start.strftime("%d %b %Y"),
                "week_end": week_end.strftime("%d %b %Y"),
                "items": items,
                "total_value": total_value,
            })
        
        return {
            "title": chart_key.replace("_", " ").title(),
            "subtitle": "Live market data",
            "metric": "tokens",
            "weeks": weeks_result,
        }
    

    @staticmethod
    async def get_categories_chart(db: AsyncSession) -> Dict:
        return await RankingsService._get_distribution_from_db(db, "categories", weeks=42)

    @staticmethod
    async def get_languages_chart(db: AsyncSession) -> Dict:
        return await RankingsService._get_distribution_from_db(db, "languages", weeks=28)

    @staticmethod
    async def get_programming_chart(db: AsyncSession) -> Dict:
        return await RankingsService._get_distribution_from_db(db, "programming", weeks=28)

    @staticmethod
    async def get_tool_calls_chart(db: AsyncSession) -> Dict:
        return await RankingsService._get_distribution_from_db(db, "tool_calls", weeks=13)

    @staticmethod
    async def get_images_chart(db: AsyncSession) -> Dict:
        return await RankingsService._get_distribution_from_db(db, "images", weeks=13)


