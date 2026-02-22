"""Self-hosted AuthProvider: local JWT tokens + SQLAlchemy user lookup.

This wraps the existing ``backend.auth`` helpers so existing behaviour
is preserved while allowing the SaaS mode to swap in a Firebase-based
provider later.
"""

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import decode_access_token
from backend.models import User
from backend.providers.auth.base import AuthProvider


class JWTAuthProvider(AuthProvider):

    async def get_current_user(self, request: Request, db: AsyncSession) -> User:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")

        token = auth_header.split(" ", 1)[1]
        payload = await self.validate_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_id = int(payload["sub"])
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return user

    async def validate_token(self, token: str) -> dict | None:
        return decode_access_token(token)
