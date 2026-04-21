"""Shared FastAPI dependencies for authentication."""

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.firebase_init import verify_id_token
from src.db.config import get_db
from src.db.models import User


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract Firebase ID token from Authorization header or cookie,
    verify it, and return the corresponding User from the database.

    Looks for:
      - Authorization: Bearer <idToken>
      - Cookie: auth=<idToken>
    """
    token: str | None = None

    # 1. Try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # 2. Fallback to cookie
    if not token:
        token = request.cookies.get("auth")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — no token provided",
        )

    # Verify with Firebase
    try:
        decoded = verify_id_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
        )

    firebase_uid: str = decoded.get("uid", "")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing uid",
        )

    # Look up user in DB
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database — please call /auth/verify-token first",
        )

    return user
