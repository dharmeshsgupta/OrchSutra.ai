"""Auth service — verifies Firebase tokens and upserts users in PostgreSQL."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.firebase_init import verify_id_token
from src.db.models import User


class AuthService:

    @staticmethod
    async def verify_and_upsert(id_token: str, db: AsyncSession) -> User:
        """
        1. Verify the Firebase ID token.
        2. Upsert the user in PostgreSQL (create on first login).
        3. Return the User ORM object.
        """
        decoded = verify_id_token(id_token)

        firebase_uid: str = decoded["uid"]
        email: str | None = decoded.get("email")
        phone_number: str | None = decoded.get("phone_number")
        display_name: str | None = decoded.get("name")
        photo_url: str | None = decoded.get("picture")

        # Determine auth provider
        sign_in_provider = "password"
        firebase_info = decoded.get("firebase", {})
        if firebase_info.get("sign_in_provider"):
            sign_in_provider = firebase_info["sign_in_provider"]

        # Look up existing user
        result = await db.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update fields that may have changed (e.g. Google profile pic)
            if email and not user.email:
                user.email = email
            if display_name:
                user.display_name = display_name
            if photo_url:
                user.photo_url = photo_url
            if phone_number and not user.phone_number:
                user.phone_number = phone_number
            user.provider = sign_in_provider
        else:
            # Create new user
            username = email.split("@")[0] if email else firebase_uid[:16]
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                username=username,
                phone_number=phone_number,
                display_name=display_name,
                photo_url=photo_url,
                provider=sign_in_provider,
                credits=0,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_user_by_firebase_uid(firebase_uid: str, db: AsyncSession) -> User | None:
        result = await db.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(user_id: str, db: AsyncSession) -> User | None:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()