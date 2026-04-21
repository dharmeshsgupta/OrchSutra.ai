from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VerifyTokenRequest(BaseModel):
    """Frontend sends the Firebase ID token after sign-in / sign-up."""
    id_token: str


class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    email: Optional[str] = None
    username: Optional[str] = None
    phone_number: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    provider: Optional[str] = None
    credits: float = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    username: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    credits: float = 0
    provider: Optional[str] = None

    class Config:
        from_attributes = True