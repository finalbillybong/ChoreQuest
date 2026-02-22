"""Abstract base class for billing providers.

Self-hosted mode uses a no-op stub.  SaaS mode will use a Stripe
implementation (Phase 4).
"""

from abc import ABC, abstractmethod
from typing import Any


class BillingProvider(ABC):

    @abstractmethod
    async def create_checkout_session(
        self, family_id: int, success_url: str, cancel_url: str,
    ) -> dict[str, Any]:
        """Create a checkout / payment session and return provider-
        specific metadata (e.g. Stripe session URL)."""
        ...

    @abstractmethod
    async def get_subscription_status(self, family_id: int) -> str:
        """Return the subscription status for a family.

        Expected values: ``"active"``, ``"trialing"``, ``"past_due"``,
        ``"canceled"``, ``"none"``.
        """
        ...

    @abstractmethod
    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        """Process an incoming webhook from the billing provider."""
        ...
