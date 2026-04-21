"""Auth router — verifies Firebase tokens and manages user sessions."""

from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import VerifyTokenRequest, UserResponse, ProfileResponse
from .service import AuthService
from src.db.config import get_db
from src.db.models import User
from src.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify-token", response_model=UserResponse)
async def verify_token(
    body: VerifyTokenRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Frontend sends Firebase ID token after any sign-in / sign-up.
    Backend verifies it, upserts the user in PostgreSQL,
    and sets an httpOnly cookie with the same token for subsequent requests.
    """
    try:
        user = await AuthService.verify_and_upsert(body.id_token, db)

        # Set httpOnly cookie so browser sends it automatically
        response.set_cookie(
            key="auth",
            value=body.id_token,
            httponly=True,
            max_age=7 * 86400,
            samesite="lax",
        )

        return UserResponse(
            id=str(user.id),
            firebase_uid=user.firebase_uid,
            email=user.email,
            username=user.username,
            phone_number=user.phone_number,
            display_name=user.display_name,
            photo_url=user.photo_url,
            provider=user.provider,
            credits=user.credits,
            created_at=user.created_at,
        )
    except Exception as e:
        print(f"verify-token error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")


@router.get("/profile", response_model=ProfileResponse)
async def profile(user: User = Depends(get_current_user)):
    """Get authenticated user's profile from PostgreSQL."""
    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        photo_url=user.photo_url,
        credits=user.credits,
        provider=user.provider,
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    response.delete_cookie(key="auth")
    return {"message": "Logged out successfully"}