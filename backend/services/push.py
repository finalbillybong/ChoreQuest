"""Web Push notification service using VAPID / pywebpush.

All external imports (pywebpush, cryptography) are lazy so the app
starts even if these packages are not installed.
"""

import base64
import json
import logging
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models import PushSubscription, AppSetting

logger = logging.getLogger(__name__)

# Lazy-check for pywebpush availability
_webpush = None
_WebPushException = Exception


def _ensure_pywebpush():
    """Import pywebpush on first use. Returns True if available."""
    global _webpush, _WebPushException
    if _webpush is not None:
        return True
    try:
        from pywebpush import webpush, WebPushException
        _webpush = webpush
        _WebPushException = WebPushException
        return True
    except ImportError:
        logger.warning("pywebpush not installed — push notifications disabled")
        return False


# ---------------------------------------------------------------------------
# VAPID key helpers
# ---------------------------------------------------------------------------

def _generate_vapid_keys() -> tuple[str, str]:
    """Generate a new VAPID EC P-256 key pair.

    Returns (private_key_raw_b64url, public_key_urlsafe_b64).
    Both keys are base64url-encoded (no padding), which is the format
    pywebpush expects.
    """
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    private_key = ec.generate_private_key(ec.SECP256R1())

    # Extract raw 32-byte private scalar — pywebpush expects this as base64url
    raw_private = private_key.private_numbers().private_value.to_bytes(32, "big")
    private_b64 = base64.urlsafe_b64encode(raw_private).rstrip(b"=").decode()

    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode()

    return private_b64, public_b64


def _normalize_private_key(key: str) -> str:
    """Convert a VAPID private key to raw base64url format if it's PEM."""
    if not key.startswith("-----"):
        return key  # already raw base64url
    from cryptography.hazmat.primitives import serialization
    priv = serialization.load_pem_private_key(key.encode(), password=None)
    raw = priv.private_numbers().private_value.to_bytes(32, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


async def get_vapid_keys(db: AsyncSession) -> tuple[str, str]:
    """Return (private_key, public_b64) — from env, DB, or freshly generated."""
    if settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
        return settings.VAPID_PRIVATE_KEY, settings.VAPID_PUBLIC_KEY

    result = await db.execute(
        select(AppSetting).where(AppSetting.key.in_(["vapid_private_key", "vapid_public_key"]))
    )
    stored = {row.key: row.value for row in result.scalars().all()}
    if "vapid_private_key" in stored and "vapid_public_key" in stored:
        return stored["vapid_private_key"], stored["vapid_public_key"]

    try:
        priv, pub = _generate_vapid_keys()
    except ImportError:
        logger.warning("cryptography not installed — cannot generate VAPID keys")
        return "", ""

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

def _send_one(subscription_info: dict, payload: str, vapid_private: str, vapid_claims: dict) -> str:
    """Synchronously send a single web push.

    Returns "ok", "gone" (endpoint dead — safe to delete), or "error".
    """
    if not _ensure_pywebpush():
        return "error"
    try:
        _webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=_normalize_private_key(vapid_private),
            vapid_claims=vapid_claims,
            ttl=86400,
        )
        return "ok"
    except _WebPushException as e:
        status = getattr(e, "response", None)
        status_code = status.status_code if status else None
        if status_code in (404, 410):
            return "gone"
        logger.warning("Push failed (status=%s): %s", status_code, e)
        return "error"
    except Exception:
        logger.exception("Unexpected push error")
        return "error"


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
    if not _ensure_pywebpush():
        return 0

    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subs = result.scalars().all()
    if not subs:
        return 0

    vapid_private, _ = await get_vapid_keys(db)
    if not vapid_private:
        return 0

    vapid_claims = {"sub": settings.VAPID_CLAIM_EMAIL}

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "chorequest",
    })

    sent = 0
    gone_ids = []

    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        result = _send_one(subscription_info, payload, vapid_private, vapid_claims)
        if result == "ok":
            sent += 1
        elif result == "gone":
            gone_ids.append(sub.id)
        # "error" → transient failure, keep subscription for next time

    if gone_ids:
        await db.execute(
            delete(PushSubscription).where(PushSubscription.id.in_(gone_ids))
        )
        await db.commit()

    return sent
