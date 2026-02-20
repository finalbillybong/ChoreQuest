from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import PushSubscription
from backend.services.push import get_vapid_public_key

router = APIRouter(prefix="/api/push", tags=["push"])


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


# ---------- GET /vapid-public-key ----------
@router.get("/vapid-public-key")
async def vapid_public_key(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return the VAPID public key so the frontend can subscribe."""
    key = await get_vapid_public_key(db)
    return {"public_key": key}


# ---------- POST /subscribe ----------
@router.post("/subscribe")
async def subscribe(
    body: PushSubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Register a push subscription for the current user."""
    p256dh = body.keys.get("p256dh")
    auth = body.keys.get("auth")
    if not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Missing p256dh or auth keys")

    # Upsert: delete existing with same endpoint for this user, then insert
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == user.id,
            PushSubscription.endpoint == body.endpoint,
        )
    )

    sub = PushSubscription(
        user_id=user.id,
        endpoint=body.endpoint,
        p256dh=p256dh,
        auth=auth,
    )
    db.add(sub)
    await db.commit()
    return {"detail": "Subscribed"}


# ---------- POST /unsubscribe ----------
@router.post("/unsubscribe")
async def unsubscribe(
    body: PushSubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Remove a push subscription for the current user."""
    result = await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == user.id,
            PushSubscription.endpoint == body.endpoint,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"detail": "Unsubscribed"}


# ---------- GET /status ----------
@router.get("/status")
async def push_status(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Check if the current user has any push subscriptions."""
    result = await db.execute(
        select(PushSubscription.id).where(PushSubscription.user_id == user.id).limit(1)
    )
    has_subscription = result.scalar_one_or_none() is not None
    return {"subscribed": has_subscription}
