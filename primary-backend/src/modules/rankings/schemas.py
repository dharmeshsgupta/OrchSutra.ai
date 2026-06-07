"""Rankings schemas for the rankings page API responses."""

from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ModelUsagePoint(BaseModel):
    """Single data point for a model's usage in the stacked chart."""
    model_id: str
    model_name: str
    tokens: int  # Total tokens used
    color: str   # Hex color for the chart


class WeeklyUsageData(BaseModel):
    """One week's worth of usage data for all models."""
    week_start: str  # e.g., "17 Mar 2025"
    week_end: str
    models: List[ModelUsagePoint]
    total_tokens: int


class TopModelsChartResponse(BaseModel):
    """Response for the Top Models stacked bar chart."""
    weeks: List[WeeklyUsageData]
    

class LeaderboardEntry(BaseModel):
    """Single entry in the LLM leaderboard."""
    rank: int
    model_id: str
    model_name: str
    company_name: str
    logo_url: Optional[str] = None
    total_tokens: int  # e.g., "2.01T tokens"
    tokens_display: str  # Formatted string like "2.01T"
    change_percent: Optional[float] = None  # Week over week change
    trend: str = "stable"  # "up", "down", "stable"


class LeaderboardResponse(BaseModel):
    """Response for the LLM Leaderboard section."""
    period: str  # "This Week", "This Month", "All Time"
    entries: List[LeaderboardEntry]
    updated_at: str



    

class MarketSharePoint(BaseModel):
    provider_id: str
    provider_name: str
    share_percent: float
    color: str


class MarketShareWeek(BaseModel):
    week_start: str
    week_end: str
    providers: List[MarketSharePoint]


class MarketShareResponse(BaseModel):
    weeks: List[MarketShareWeek]


class BenchmarkPoint(BaseModel):
    model_id: str
    model_name: str
    company_name: str
    score: float
    price_per_million: float
    color: str


class BenchmarksResponse(BaseModel):
    metric: str
    points: List[BenchmarkPoint]


class FastestModelPoint(BaseModel):
    model_id: str
    model_name: str
    provider_name: str
    throughput_tps: float
    latency_ms: float
    price_per_million: float
    color: str


class FastestModelsResponse(BaseModel):
    metric: str
    points: List[FastestModelPoint]


class DistributionPoint(BaseModel):
    item_id: str
    item_name: str
    value: int
    share_percent: float
    color: str
    subtitle: Optional[str] = None


class DistributionWeek(BaseModel):
    week_start: str
    week_end: str
    items: List[DistributionPoint]
    total_value: int


class DistributionChartResponse(BaseModel):
    title: str
    subtitle: str
    metric: str
    weeks: List[DistributionWeek]
    
    
class RankingsOverviewResponse(BaseModel):
    top_models_chart: TopModelsChartResponse
    market_share: MarketShareResponse
    benchmarks: BenchmarksResponse
    fastest_models: FastestModelsResponse
    top_models: DistributionChartResponse
    categories: DistributionChartResponse
    languages: DistributionChartResponse
    programming: DistributionChartResponse
    tool_calls: DistributionChartResponse
    images: DistributionChartResponse
    leaderboard: LeaderboardResponse