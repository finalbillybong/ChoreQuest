from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.auth import decode_access_token
from backend.models import User, UserRole


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_parent(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.parent, UserRole.admin):
        raise HTTPException(status_code=403, detail="Parent or admin role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


async def require_kid(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.kid:
        raise HTTPException(status_code=403, detail="Kid role required")
    return user
