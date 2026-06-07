"""Rankings router — public endpoints for model rankings and usage statistics."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession


from .schemas import (
    TopModelsChartResponse,
    LeaderboardResponse,
    RankingsOverviewResponse,
    MarketShareResponse,
    BenchmarksResponse,
    FastestModelsResponse,
    DistributionChartResponse
)
from .service import RankingsService
from src.db.config import get_db


router = APIRouter(prefix="/rankings", tags=["rankings"])


@router.get("/", response_model=RankingsOverviewResponse)
async def get_rankings_overview(db: AsyncSession = Depends(get_db)):
    """
    Get complete rankings page data including chart and leaderboard.
    
    This endpoint returns all data needed to render the rankings page
    in a single request to minimize latency.
    """
    return await RankingsService.get_rankings_overview(db)


@router.get("/chart", response_model=TopModelsChartResponse)
async def get_top_models_chart(
    weeks: int = Query(default=52, ge=1, le=104, description="Number of weeks of data"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get weekly usage data for the Top Models stacked bar chart.
    
    Returns token usage per model per week, formatted for chart rendering.
    """
    return await RankingsService.get_top_models_chart(db, weeks=weeks)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    period: str = Query(default="week", pattern="^(week|month|all)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the LLM leaderboard for a specific time period.
    
    - **week**: Rankings for the current week
    - **month**: Rankings for the current month  
    - **all**: All-time rankings
    """
    return await RankingsService.get_leaderboard(db, period=period)


@router.get("/market-share", response_model=MarketShareResponse)
async def get_market_share_chart(
    weeks: int = Query(default=52, ge=1, le=104, description="Number of weeks of data"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get market share data for the Market Share pie chart.
    
    Returns percentage market share of each provider over the specified time frame.
    """
    return await RankingsService.get_market_share_chart(db, weeks=weeks)


@router.get("/benchmarks", response_model=BenchmarksResponse)
async def get_benchmarks(
    db: AsyncSession = Depends(get_db)
):
    return await RankingsService.get_benchmarks(db)


@router.get("/fastest", response_model=FastestModelsResponse)
async def get_fastest_models(
    db: AsyncSession = Depends(get_db)
):
    return await RankingsService.get_fastest_models(db)



@router.get("/top-models", response_model=DistributionChartResponse)
async def get_top_models(db: AsyncSession = Depends(get_db)):
    return await RankingsService._get_distribution_from_db(db, "top_models", weeks=42)


@router.get("/categories", response_model=DistributionChartResponse)
async def get_categories(db: AsyncSession = Depends(get_db)):
    return await RankingsService.get_categories_chart(db)


@router.get("/languages", response_model=DistributionChartResponse)
async def get_languages(db: AsyncSession = Depends(get_db)):
    return await RankingsService.get_languages_chart(db)


@router.get("/programming", response_model=DistributionChartResponse)
async def get_programming(db: AsyncSession = Depends(get_db)):
    return await RankingsService.get_programming_chart(db)


@router.get("/tool-calls", response_model=DistributionChartResponse)
async def get_tool_calls(db: AsyncSession = Depends(get_db)):
    return await RankingsService.get_tool_calls_chart(db)


@router.get("/images", response_model=DistributionChartResponse)
async def get_images(db: AsyncSession = Depends(get_db)):
    return await RankingsService.get_images_chart(db)