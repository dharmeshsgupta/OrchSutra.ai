from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Request schemas
class CreateApiKeySchema(BaseModel):
    name: str


class UpdateApiKeySchema(BaseModel):
    id: str
    disabled: bool


# Response schemas
class CreateApiKeyResponse(BaseModel):
    id: str
    apiKey: str


class UpdateApiKeyResponseSchema(BaseModel):
    message: str = "Updated api key successfully"


class UpdateApiKeyResponseFailedSchema(BaseModel):
    message: str = "Updating api key unsuccessful"


class ApiKeyDetailSchema(BaseModel):
    id: str
    apiKey: str
    name: str
    creditsConsumed: float
    lastUsed: Optional[datetime] = None
    disabled: bool


class GetApiKeysResponseSchema(BaseModel):
    apiKeys: List[ApiKeyDetailSchema]


class DeleteApiKeyResponseSchema(BaseModel):
    message: str = "Api key deleted successfully"


class DeleteApiKeyResponseFailedSchema(BaseModel):
    message: str = "Api key deletion failed"
