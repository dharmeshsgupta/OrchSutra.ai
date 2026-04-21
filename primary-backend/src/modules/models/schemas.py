from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# Company schema
class CompanySchema(BaseModel):
    id: str
    name: str
    website: str


# Model schema
class ModelDetail(BaseModel):
    id: str
    name: str
    slug: str
    company: CompanySchema


class GetModelsResponseSchema(BaseModel):
    models: List[ModelDetail]


# Provider schema
class ProviderSchema(BaseModel):
    id: str
    name: str
    website: str


class GetProvidersResponseSchema(BaseModel):
    providers: List[ProviderSchema]


# Model Provider Mapping schema
class ModelProviderDetail(BaseModel):
    id: str
    providerId: str
    providerName: str
    providerWebsite: str
    inputTokenCost: float
    outputTokenCost: float


class GetModelProvidersResponseSchema(BaseModel):
    providers: List[ModelProviderDetail]


# ─────────── Model management requests ───────────
class CreateModelRequest(BaseModel):
    name: str
    slug: str
    company_name: str
    description: Optional[str] = None
    context_window: int = 4096
    max_tokens: int = 2048
    featured: bool = False
    priority: int = 100
    fallback_group: Optional[str] = None
    capabilities: List[str] = []
    is_active: bool = True
    provider_id: Optional[str] = None
    provider_model_id: Optional[str] = None
    input_token_cost: float = 0.0
    output_token_cost: float = 0.0


class UpdatePriorityRequest(BaseModel):
    priority: int


class UpdateFallbackRequest(BaseModel):
    fallback_group: Optional[str] = None


class UpdateActiveRequest(BaseModel):
    is_active: bool
    
    
class ModelBase(BaseModel):
    """Shared model fields."""
    name: str
    description: Optional[str] = None
    context_window: int
    max_tokens: int
    
class ModelResponse(ModelBase):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    context_window: int
    speed_rating: float
    featured: bool
    logo_url: Optional[str] = None
    release_date: Optional[datetime] = None
    max_tokens: int
    company_name: str
    priority: Optional[int] = None
    fallback_group: Optional[str] = None
    is_active: Optional[bool] = None
    
    class Config:
        from_attributes = True
        
class ParameterRange(BaseModel):
    """Defines min/max/default for a model parameter."""
    min: float
    max: float
    default: float
    
class ModelDetailBasicResponse(BaseModel):
    """full model details for the /models/{id} endpoint"""
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    
    # Pricing
    input_cost_per_million: float
    output_cost_per_million: float
    
    # Capabilities
    capabilities: List[str] = []
    context_window: int
    max_tokens: int
    
    # Parameters with their ranges
    supported_parameters: Dict[str, ParameterRange] = {}
    
    # Benchmark scores
    benchmark_scores: Dict[str, float] = {}
    
    # Metadata
    featured: bool
    categories: str
    release_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
        
# ─────────── Performance Data ───────────
class PerformancePoint(BaseModel):
    """Single data point for charts"""
    data: str
    value: float
    
class ProviderPerformance(BaseModel):
    """Performance matrics for one provider"""
    provider_name: str
    latency: float
    throughput: float
    uptime: float
    latency_history: List[PerformancePoint] = []
    throughput_history: List[PerformancePoint] = []
    
    
# ─────────── Provider Stats ───────────
class ProviderStats(BaseModel):
    """Complete provider info for the providers tab"""
    id: str
    name: str
    region: str
    latency: float
    throughput: float
    uptime: float
    total_context: str
    max_output: str
    input_price: float
    output_price: float
    input_price_high: Optional[float] = None
    output_price_high: Optional[float] = None
    
    
# ─────────── Pricing Data ───────────
class PricingHistory(BaseModel):
    """Historical pricing for charts"""
    weighted_avg_input: float
    weighted_avg_output: float
    input_history: List[PerformancePoint] = []
    output_history: List[PerformancePoint] = []
    providers: List[str] = []
    
    
# ─────────── Benchmark Data ───────────
class BenchmarkScore(BaseModel):
    """Single benchmark result"""
    name: str
    score: float
    description: Optional[str] = None
    

# ─────────── Activity Data ───────────
class ActivityDay(BaseModel):
    """Single day's activity"""
    date: str
    requests: int
    change_percent: Optional[float] = None
    
class ActivityStats(BaseModel):
    """Activity summary + history"""
    total_24h: int
    unique_users_24h: int
    avg_tokens_per_request: int
    daily_history: List[ActivityDay] = []
    

# ─────────── Full Model Detail ───────────
class ModelDetailResponse(BaseModel):
    """
    Complete response for the model detail page.
    This is what the frontend receives.
    """
    id: str
    name: str
    slug: str
    company_name: str
    descriptions: Optional[str] = None
    
    #Basic Stats
    context_window: int
    max_tokens: int
    release_date: Optional[datetime] = None
    featured: bool = False
    
    # These come from related tables
    providers: List[ProviderStats] = []
    benchmarks: List[BenchmarkScore] = []
    
    class Config:
        from_attributes = True