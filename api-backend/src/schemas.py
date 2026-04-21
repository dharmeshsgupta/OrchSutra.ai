"""Shared API schemas for chat and model management."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RoleEnum(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    tool = "tool"
    function = "function"


class ChatMessageSchema(BaseModel):
    role: RoleEnum
    content: Optional[str] = None
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


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


class CreateModelRequest(BaseModel):
    id: str
    name: str
    provider_name: str
    provider_model_id: str
    description: Optional[str] = None
    priority: int = 100
    fallback_group: Optional[str] = None
    is_active: bool = True
    capabilities: List[str] = []


class UpdatePriorityRequest(BaseModel):
    priority: int


class UpdateFallbackRequest(BaseModel):
    fallback_group: Optional[str] = None


class UpdateActiveRequest(BaseModel):
    is_active: bool


class ModelResponse(BaseModel):
    id: str
    name: str
    provider_name: str
    provider_model_id: str
    description: Optional[str] = None
    priority: int
    fallback_group: Optional[str]
    is_active: bool
    capabilities: List[str] = []


class GetModelsResponseSchema(BaseModel):
    models: List[ModelResponse]