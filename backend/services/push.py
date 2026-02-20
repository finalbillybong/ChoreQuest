"""Web Push notification service using VAPID / pywebpush."""

import base64
import json
import logging
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from pywebpush import webpush, WebPushException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models import PushSubscription, AppSetting

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# VAPID key helpers
# ---------------------------------------------------------------------------

def _generate_vapid_keys() -> tuple[str, str]:
    """Generate a new VAPID EC P-256 key pair.

    Returns (private_key_pem, public_key_urlsafe_b64).
    """
    private_key = ec.generate_private_key(ec.SECP256R1())

    # PEM-encoded private key (what pywebpush expects)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    # Uncompressed public key bytes -> URL-safe base64 (what the browser expects)
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode()

    return private_pem, public_b64


async def get_vapid_keys(db: AsyncSession) -> tuple[str, str]:
    """Return (private_pem, public_b64) — from env, DB, or freshly generated."""
    # 1) Prefer env-var config
    if settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
        return settings.VAPID_PRIVATE_KEY, settings.VAPID_PUBLIC_KEY

    # 2) Check DB
    result = await db.execute(
        select(AppSetting).where(AppSetting.key.in_(["vapid_private_key", "vapid_public_key"]))
    )
    stored = {row.key: row.value for row in result.scalars().all()}
    if "vapid_private_key" in stored and "vapid_public_key" in stored:
        return stored["vapid_private_key"], stored["vapid_public_key"]

    # 3) Generate and persist
    priv, pub = _generate_vapid_keys()
    db.add(AppSetting(key="vapid_private_key", value=priv))
    db.add(AppSetting(key="vapid_public_key", value=pub))
    await db.commit()
    logger.info("Generated and stored new VAPID key pair")
    return priv, pub


async def get_vapid_public_key(db: AsyncSession) -> str:
    """Return just the public key (URL-safe base64)."""
    _, pub = await get_vapid_keys(db)
    return pub


# ---------------------------------------------------------------------------
# Send push to a single subscription
# ---------------------------------------------------------------------------

def _send_one(subscription_info: dict, payload: str, vapid_private: str, vapid_claims: dict) -> bool:
    """Synchronously send a single web push. Returns True on success."""
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=vapid_private,
            vapid_claims=vapid_claims,
        )
        return True
    except WebPushException as e:
        status = getattr(e, "response", None)
        status_code = status.status_code if status else None
        if status_code in (404, 410):
            # Subscription expired / unsubscribed
            return False
        logger.warning("Push failed (status=%s): %s", status_code, e)
        return False
    except Exception:
        logger.exception("Unexpected push error")
        return False


# ---------------------------------------------------------------------------
# Send push to a user (all their subscriptions)
# ---------------------------------------------------------------------------

async def send_push_to_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    url: str = "/",
    tag: str | None = None,
) -> int:
    """Send a push notification to all of a user's subscriptions.

    Returns the number of successfully delivered pushes.
    Automatically cleans up expired/invalid subscriptions.
    """
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subs = result.scalars().all()
    if not subs:
        return 0

    vapid_private, _ = await get_vapid_keys(db)
    vapid_claims = {"sub": settings.VAPID_CLAIM_EMAIL}

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "chorequest",
    })

    sent = 0
    dead_ids = []

    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        ok = _send_one(subscription_info, payload, vapid_private, vapid_claims)
        if ok:
            sent += 1
        else:
            dead_ids.append(sub.id)

    # Clean up dead subscriptions
    if dead_ids:
        await db.execute(
            delete(PushSubscription).where(PushSubscription.id.in_(dead_ids))
        )
        await db.commit()

    return sent
