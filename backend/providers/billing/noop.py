"""No-op billing provider for self-hosted mode.

All families are treated as having an active subscription so that
subscription gates (Phase 5) never block access.
"""

from typing import Any

from backend.providers.billing.base import BillingProvider


class NoOpBillingProvider(BillingProvider):

    async def create_checkout_session(
        self, family_id: int, success_url: str, cancel_url: str,
    ) -> dict[str, Any]:
        return {"url": success_url, "provider": "none"}

    async def get_subscription_status(self, family_id: int) -> str:
        return "active"

    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        pass
