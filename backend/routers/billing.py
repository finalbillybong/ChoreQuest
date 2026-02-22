"""Billing endpoints for SaaS subscription management.

- POST /api/billing/checkout  -- create a Stripe checkout session (parent only)
- GET  /api/billing/status    -- get family subscription status
- POST /api/billing/webhook   -- Stripe webhook receiver (unauthenticated)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.config import settings
from backend.dependencies import require_parent, resolve_family
from backend.models import Family, User
from backend.providers.registry import billing_provider

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


class SubscriptionStatusResponse(BaseModel):
    status: str
    current_period_end: str | None = None
    trial_ends_at: str | None = None


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    if settings.APP_MODE != "saas":
        raise HTTPException(status_code=404, detail="Billing is not available in self-hosted mode")

    result = await billing_provider.create_checkout_session(
        family_id=family.id,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )
    return CheckoutResponse(url=result["url"], session_id=result["session_id"])


@router.get("/status", response_model=SubscriptionStatusResponse)
async def subscription_status(
    family: Family = Depends(resolve_family),
):
    status = await billing_provider.get_subscription_status(family.id)
    return SubscriptionStatusResponse(
        status=status,
        current_period_end=(
            family.subscription_current_period_end.isoformat()
            if family.subscription_current_period_end else None
        ),
        trial_ends_at=(
            family.trial_ends_at.isoformat()
            if family.trial_ends_at else None
        ),
    )


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    if settings.APP_MODE != "saas":
        raise HTTPException(status_code=404)

    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        await billing_provider.handle_webhook(payload, signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook processing failed")

    return {"received": True}
