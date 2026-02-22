"""Abstract base class for authentication providers.

Each deployment mode (self-hosted, SaaS) provides a concrete
implementation.  The rest of the application only depends on this
interface via the ``get_current_user`` dependency.
"""

from abc import ABC, abstractmethod

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import User


class AuthProvider(ABC):

    @abstractmethod
    async def get_current_user(self, request: Request, db: AsyncSession) -> User:
        """Extract and validate credentials from the request, returning
        the authenticated ``User`` or raising an HTTPException."""
        ...

    @abstractmethod
    async def validate_token(self, token: str) -> dict | None:
        """Decode / verify a bearer token and return its payload, or
        ``None`` if the token is invalid or expired."""
        ...
