from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessageSchema(BaseModel):
    role: str
    content: str


class ChatRequestSchema(BaseModel):
    messages: List[ChatMessageSchema]
    selected_model_id: str = Field(..., description="Model.id the user selected")
    auto_switch: bool = True
    fallback_candidates: Optional[List[str]] = Field(
        None, description="Optional ordered list of model IDs to override default fallbacks"
    )
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ChatResponseMetadata(BaseModel):
    requested_model_id: str
    actual_model_id: Optional[str]
    provider_used: Optional[str]
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    latency_ms: Optional[float] = None


class ChatResponseSchema(BaseModel):
    content: str
    metadata: ChatResponseMetadata
    usage: Dict[str, Any] = Field(default_factory=dict)
    raw: Dict[str, Any] = Field(default_factory=dict)


class ModelPreferenceRequest(BaseModel):
    selected_model_id: str
    auto_switch: bool = True


class ModelPreferenceResponse(BaseModel):
    selected_model_id: Optional[str]
    auto_switch: bool = True


class ChatModelOptionSchema(BaseModel):
    id: str
    name: str
    provider_name: str
    provider_model_id: str
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True


class ChatModelOptionsResponse(BaseModel):
    models: List[ChatModelOptionSchema]