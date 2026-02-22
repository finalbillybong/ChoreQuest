"""Stripe billing provider for SaaS mode.

Handles checkout session creation, subscription status lookups, and
webhook processing.  All subscription state is persisted on the Family
row so the rest of the application can check status without calling
the Stripe API on every request.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import stripe
from sqlalchemy import select

from backend.config import settings
from backend.database import async_session
from backend.models import Family
from backend.providers.billing.base import BillingProvider

logger = logging.getLogger(__name__)


class StripeBillingProvider(BillingProvider):

    def __init__(self) -> None:
        stripe.api_key = settings.STRIPE_SECRET_KEY

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def create_checkout_session(
        self, family_id: int, success_url: str, cancel_url: str,
    ) -> dict[str, Any]:
        async with async_session() as db:
            family = await self._get_family(db, family_id)
            customer_id = await self._ensure_stripe_customer(db, family)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"family_id": str(family_id)},
        )
        return {"url": session.url, "session_id": session.id}

    async def get_subscription_status(self, family_id: int) -> str:
        async with async_session() as db:
            family = await self._get_family(db, family_id)
            return family.subscription_status or "none"

    async def handle_webhook(self, payload: bytes, signature: str) -> None:
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET,
            )
        except stripe.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            raise
        except Exception:
            logger.exception("Error constructing Stripe event")
            raise

        handler = self._EVENT_HANDLERS.get(event["type"])
        if handler:
            await handler(self, event["data"]["object"])
        else:
            logger.debug("Unhandled Stripe event type: %s", event["type"])

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------

    async def _on_checkout_completed(self, session: dict) -> None:
        family_id = int(session["metadata"]["family_id"])
        subscription_id = session.get("subscription")
        if not subscription_id:
            return

        sub = stripe.Subscription.retrieve(subscription_id)
        period_end = datetime.fromtimestamp(
            sub["current_period_end"], tz=timezone.utc,
        )

        async with async_session() as db:
            family = await self._get_family(db, family_id)
            family.stripe_subscription_id = subscription_id
            family.subscription_status = sub["status"]
            family.subscription_current_period_end = period_end
            await db.commit()

        logger.info(
            "Checkout completed: family=%s subscription=%s status=%s",
            family_id, subscription_id, sub["status"],
        )

    async def _on_subscription_updated(self, subscription: dict) -> None:
        family = await self._find_family_by_customer(subscription["customer"])
        if family is None:
            logger.warning(
                "Subscription updated for unknown customer %s",
                subscription["customer"],
            )
            return

        period_end = datetime.fromtimestamp(
            subscription["current_period_end"], tz=timezone.utc,
        )

        async with async_session() as db:
            fam = await self._get_family(db, family.id)
            fam.stripe_subscription_id = subscription["id"]
            fam.subscription_status = subscription["status"]
            fam.subscription_current_period_end = period_end
            await db.commit()

        logger.info(
            "Subscription updated: family=%s status=%s",
            family.id, subscription["status"],
        )

    async def _on_subscription_deleted(self, subscription: dict) -> None:
        family = await self._find_family_by_customer(subscription["customer"])
        if family is None:
            return

        async with async_session() as db:
            fam = await self._get_family(db, family.id)
            fam.subscription_status = "canceled"
            fam.stripe_subscription_id = None
            fam.subscription_current_period_end = None
            await db.commit()

        logger.info("Subscription deleted: family=%s", family.id)

    async def _on_invoice_payment_failed(self, invoice: dict) -> None:
        customer_id = invoice.get("customer")
        if not customer_id:
            return

        family = await self._find_family_by_customer(customer_id)
        if family is None:
            return

        async with async_session() as db:
            fam = await self._get_family(db, family.id)
            fam.subscription_status = "past_due"
            await db.commit()

        logger.info("Invoice payment failed: family=%s", family.id)

    _EVENT_HANDLERS: dict[str, Any] = {
        "checkout.session.completed": _on_checkout_completed,
        "customer.subscription.updated": _on_subscription_updated,
        "customer.subscription.deleted": _on_subscription_deleted,
        "invoice.payment_failed": _on_invoice_payment_failed,
    }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _get_family(db, family_id: int) -> Family:
        result = await db.execute(
            select(Family).where(Family.id == family_id)
        )
        family = result.scalar_one_or_none()
        if family is None:
            raise ValueError(f"Family {family_id} not found")
        return family

    @staticmethod
    async def _find_family_by_customer(customer_id: str) -> Family | None:
        async with async_session() as db:
            result = await db.execute(
                select(Family).where(Family.stripe_customer_id == customer_id)
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def _ensure_stripe_customer(db, family: Family) -> str:
        """Return existing Stripe customer ID or create a new one."""
        if family.stripe_customer_id:
            return family.stripe_customer_id

        customer = stripe.Customer.create(
            name=family.name,
            metadata={"family_id": str(family.id)},
        )
        family.stripe_customer_id = customer.id
        await db.commit()
        return customer.id
