"""SQLAlchemy ORM models for the OpenRouter database."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Date, UniqueConstraint
)
from sqlalchemy.orm import relationship
from src.db.config import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ───────────────────────── Users ─────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    firebase_uid = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=True)
    username = Column(String, unique=True, nullable=True)
    phone_number = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    provider = Column(String, nullable=True)          # "email", "google.com", "phone"
    credits = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")


# ───────────────────────── API Keys ─────────────────────────
class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    key_hash = Column(String, nullable=False)         # store hashed version
    key_prefix = Column(String, nullable=False)       # "sk-or-v1-xxxx..." first 12 chars for display
    credits_consumed = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")


# ───────────────────────── Models ─────────────────────────
class Model(Base):
    __tablename__ = "models"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    company_name = Column(String, nullable=False)
    company_website = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    providers = relationship("ModelProvider", back_populates="model", cascade="all, delete-orphan")

    description = Column(Text, nullable=True)  # Can be empty
    context_window = Column(Integer, default=4096)  # Default value
    featured = Column(Boolean, default=False)  # Start as not featured
    speed_rating = Column(Float, default=0.0)  
    logo_url = Column(String, nullable=True)
    release_date = Column(DateTime, nullable=True)
    max_tokens = Column(Integer, default=2048)
    price_per_1m_tokens = Column(Float, default=0.0)  
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    fallback_group = Column(String, nullable=True)
    
    # Capabilities (what the model can do)
    capabilities = Column(JSON, default=list)  # ["text", "vision", "function-calling"]

    # Supported parameters with their ranges
    parameters = Column(JSON, default=dict)
    # Example: {"temperature": {"min": 0, "max": 2, "default": 1}}

    # Pricing (per million tokens)
    input_cost_per_million = Column(Float, default=0.0)
    output_cost_per_million = Column(Float, default=0.0)

    # Benchmark scores
    benchmark_scores = Column(JSON, default=dict)  # {"mmlu": 89.5, "humaneval": 92}

    # Category
    category = Column(String, default="chat")  # chat, embedding, image



# ───────────────────────── Providers ─────────────────────────
class Provider(Base):
    __tablename__ = "providers"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, unique=True, nullable=False)
    website = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model_providers = relationship("ModelProvider", back_populates="provider", cascade="all, delete-orphan")


# ───────────────────── Model ↔ Provider pivot ──────────────────
class ModelProvider(Base):
    __tablename__ = "model_providers"

    id = Column(String, primary_key=True, default=_uuid)
    model_id = Column(String, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    input_token_cost = Column(Float, default=0.0)
    output_token_cost = Column(Float, default=0.0)
    provider_model_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    fallback_group = Column(String, nullable=True)
    capabilities = Column(JSON, default=list)  # ["chat", "tool", "vision", "reasoning"]
    last_health_check = Column(DateTime, nullable=True)

    model = relationship("Model", back_populates="providers")
    provider = relationship("Provider", back_populates="model_providers")


# ───────────────────────── Payments ─────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, default=0.0)
    credits = Column(Integer, default=0)
    payment_type = Column(String, default="onramp")   # "onramp", "purchase", etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")


class PerformanceMetric(Base):
    """
    Stores historical performance data for each provider-model combination.
    One row = one measurement at a specific times.
    """
    __tablename__ = "performance_metrics"

    id = Column(String, primary_key=True, default=_uuid)
    model_id = Column(String, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    
    # Performance measurements
    latency_ms = Column(Float, nullable=True)       # Time to first token (ms)
    throughput_tps = Column(Float, nullable=True)   # Tokens per second
    e2e_latency_ms = Column(Float, nullable=True)   # end-to-end latency
    error_rate = Column(Float, nullable=True)       # % of requests that failed
    
    #When this measurement was taken
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    model = relationship("Model")
    provider = relationship("Provider")
    
    
class Benchmark(Base):
    """
    Benchmark scores for each model.
    One row = one benchmark result for a one model.
    """
    __tablename__ = "benchmarks"

    id = Column(String, primary_key=True, default=_uuid)
    model_id = Column(String, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    
    benchmark_name = Column(String, nullable=False)         # e.g. "mmlu", "humaneval"
    score = Column(Float, nullable=False)                   # e.g. 89.5
    version = Column(String, nullable=True)                 # e.g. "gpt-4.0", "gpt-3.5-turbo"
    tested_at = Column(DateTime, default=datetime.utcnow)   # when this benchmark was run
    
    model = relationship("Model")


class ModelPreference(Base):
    """Persist per-user model selection and auto-switch preference."""

    __tablename__ = "model_preferences"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    selected_model_id = Column(String, ForeignKey("models.id", ondelete="SET NULL"))
    auto_switch = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    model = relationship("Model")


class ChatRequestLog(Base):
    """Observability for routing decisions and fallbacks."""

    __tablename__ = "chat_request_logs"

    id = Column(String, primary_key=True, default=_uuid)
    requested_model_id = Column(String, nullable=False)
    actual_model_id = Column(String, nullable=True)
    provider_used = Column(String, nullable=True)
    fallback_used = Column(Boolean, default=False)
    fallback_reason = Column(Text, nullable=True)
    status = Column(String, default="success")
    latency_ms = Column(Float, nullable=True)
    error_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    request_payload = Column(JSON, default=dict)
    response_payload = Column(JSON, default=dict)
    
    
class RankingSnapshot(Base):
    """
    Stores weekly ranking snapshots for the leaderboard.
    One row = one provider's ranking at a specific week.
    """
    __tablename__ = "ranking_snapshots"

    id = Column(String, primary_key=True, default=_uuid)
    snapshot_date = Column(Date, nullable=False, index=True)
    chart_key = Column(String, nullable=False, index=True)  # e.g. "categories", "languages", "programming"
    item_id = Column(String, nullable=False)  
    item_name = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    value = Column(Integer, nullable=False, default=0)  # tokens, calls, images count
    share_percent = Column(Float, nullable=True)
    color = Column(String, nullable=True)
    source = Column(String, nullable=True)  # "openrouter", "external", etc
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("snapshot_date", "chart_key", "item_id", name="uq_snapshot_item"),
    )
    

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(String, primary_key=True, default=_uuid)
    run_type = Column(String, nullable=False)  # daily, weekly
    status = Column(String, nullable=False)    # success, failed, partial
    message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)


class TTSAgentProfile(Base):
    """Per-agent voice configuration for multilingual TTS."""

    __tablename__ = "tts_agent_profiles"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False, index=True)
    language_code = Column(String, nullable=False, default="en-US")
    voice_id = Column(String, nullable=False)
    emotion = Column(String, nullable=True, default="Neutral")
    provider = Column(String, nullable=False, default="nvidia-magpie")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    messages = relationship("TTSAgentMessage", back_populates="agent", cascade="all, delete-orphan")


class TTSAgentMessage(Base):
    """Stores generated speech output linked to an agent and message text."""

    __tablename__ = "tts_agent_messages"

    id = Column(String, primary_key=True, default=_uuid)
    agent_id = Column(String, ForeignKey("tts_agent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text_content = Column(Text, nullable=False)
    audio_file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False, default="audio/wav")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    agent = relationship("TTSAgentProfile", back_populates="messages")
    user = relationship("User")