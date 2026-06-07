from typing import Literal, Optional

from pydantic import BaseModel, Field


class ImageGenerateRequestSchema(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    model: Optional[str] = None
    size: str = "1024x1024"
    quality: Optional[Literal["standard", "hd"]] = None
    style: Optional[Literal["vivid", "natural"]] = None
    response_format: Literal["b64_json", "url"] = "b64_json"


class ImageGenerateResponseSchema(BaseModel):
    model: str
    provider: str
    mime_type: str = "image/png"
    b64_json: Optional[str] = None
    url: Optional[str] = None


class ImageAnalyzeRequestSchema(BaseModel):
    image_data_url: str = Field(..., min_length=32)
    file_name: Optional[str] = None
    prompt: str = Field(default="Analyze this image and extract key details, text, and useful context.", min_length=1, max_length=2000)
    model: Optional[str] = None


class ImageAnalyzeResponseSchema(BaseModel):
    model: str
    provider: str
    analysis: str


class SpeechGenerateRequestSchema(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    model: Optional[str] = None
    voice: str = "alloy"
    format: Literal["mp3", "wav", "opus", "aac", "flac", "pcm"] = "mp3"
    speed: float = Field(1.0, ge=0.25, le=4.0)


class SpeechGenerateResponseSchema(BaseModel):
    model: str
    provider: str
    mime_type: str
    b64_audio: str


class TTSAgentCreateRequestSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    language_code: str = Field("en-US", min_length=2, max_length=20)
    voice_id: str = Field(..., min_length=1, max_length=200)
    emotion: str = Field("Neutral", min_length=1, max_length=50)


class TTSAgentResponseSchema(BaseModel):
    id: str
    name: str
    language_code: str
    voice_id: str
    emotion: str
    provider: str
    is_active: bool


class TTSAgentGenerateRequestSchema(BaseModel):
    agent_id: str
    text: str = Field(..., min_length=1, max_length=4000)


class TTSAgentGenerateResponseSchema(BaseModel):
    message_id: str
    agent_id: str
    agent_name: str
    text: str
    audio_url: str
    mime_type: str