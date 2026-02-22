"""SaaS AuthProvider: Firebase ID token verification + SQLAlchemy user lookup.

On first login the provider auto-creates an internal User record linked via
``firebase_uid``.  Subsequent requests look up by UID for fast resolution.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models import User, UserRole
from backend.providers.auth.base import AuthProvider

logger = logging.getLogger(__name__)

_firebase_app: firebase_admin.App | None = None


def _ensure_firebase_initialised() -> None:
    global _firebase_app
    if _firebase_app is not None:
        return

    if settings.FIREBASE_CREDENTIALS_JSON:
        cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_dict)
    else:
        cred = credentials.ApplicationDefault()

    _firebase_app = firebase_admin.initialize_app(cred, {
        "projectId": settings.FIREBASE_PROJECT_ID,
    })
    logger.info("Firebase Admin SDK initialised for project %s", settings.FIREBASE_PROJECT_ID)


class FirebaseAuthProvider(AuthProvider):

    def __init__(self) -> None:
        _ensure_firebase_initialised()

    async def get_current_user(self, request: Request, db: AsyncSession) -> User:
        token = self._extract_bearer_token(request)
        decoded = await self.validate_token(token)
        if decoded is None:
            raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

        uid: str = decoded["uid"]
        email: str | None = decoded.get("email")
        name: str = decoded.get("name", "")

        # Token may not include displayName on first login; fall back to
        # the Firebase user record which is always up to date.
        if not name or name == email:
            try:
                fb_user = firebase_auth.get_user(uid)
                name = fb_user.display_name or email or uid
            except Exception:
                name = email or uid

        result = await db.execute(
            select(User).where(User.firebase_uid == uid, User.is_active == True)
        )
        user = result.scalar_one_or_none()

        if user is not None:
            return user

        user = await self._provision_user(db, uid=uid, email=email, display_name=name)
        return user

    async def validate_token(self, token: str) -> dict[str, Any] | None:
        try:
            decoded = firebase_auth.verify_id_token(token, check_revoked=True)
            return decoded
        except Exception:
            return None

    # ------------------------------------------------------------------

    @staticmethod
    def _extract_bearer_token(request: Request) -> str:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        return auth_header.split(" ", 1)[1]

    @staticmethod
    async def _provision_user(
        db: AsyncSession,
        *,
        uid: str,
        email: str | None,
        display_name: str,
    ) -> User:
        """Auto-create an internal User on first Firebase login, or re-link
        an existing record if the email already exists (e.g. Firebase account
        was deleted and recreated)."""
        username = email or uid

        existing = await db.execute(
            select(User).where(User.username == username)
        )
        user = existing.scalar_one_or_none()

        if user is not None:
            user.firebase_uid = uid
            user.display_name = display_name
            user.is_active = True
            await db.commit()
            await db.refresh(user)
            logger.info("Re-linked existing user id=%s to new firebase uid=%s", user.id, uid)
            return user

        user = User(
            username=username,
            display_name=display_name,
            password_hash="firebase-managed",
            firebase_uid=uid,
            role=UserRole.admin,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Provisioned new Firebase user id=%s uid=%s", user.id, uid)
        return user
