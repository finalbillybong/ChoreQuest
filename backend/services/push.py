"""Web Push notification service using VAPID / pywebpush.

All external imports (pywebpush, cryptography) are lazy so the app
starts even if these packages are not installed.
"""

import base64
import json
import logging
from urllib.parse import urlparse
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

    Returns (private_key_pem, public_key_urlsafe_b64).
    The private key is stored as PEM for maximum compatibility.
    The public key is an uncompressed EC point, base64url-encoded.
    """
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    private_key = ec.generate_private_key(ec.SECP256R1())

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode()

    return private_pem, public_b64


def _load_private_key(key_str: str):
    """Load an EC private key from any stored format (PEM, DER b64url, raw b64url).

    Returns a cryptography EllipticCurvePrivateKey.
    """
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    if key_str.startswith("-----"):
        return serialization.load_pem_private_key(key_str.encode(), password=None)

    raw = base64.urlsafe_b64decode(key_str + "==")
    if len(raw) == 32:
        return ec.derive_private_key(int.from_bytes(raw, "big"), ec.SECP256R1())

    return serialization.load_der_private_key(raw, password=None)


def _public_key_b64(private_key) -> str:
    """Derive the public key from a private key and return as base64url."""
    from cryptography.hazmat.primitives import serialization

    pub_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return base64.urlsafe_b64encode(pub_bytes).rstrip(b"=").decode()


async def get_vapid_keys(db: AsyncSession) -> tuple[str, str]:
    """Return (private_key, public_b64) — from env, DB, or freshly generated.

    Also verifies that the private key matches the stored public key.
    If they don't match, the keys are regenerated.
    """
    if settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
        return settings.VAPID_PRIVATE_KEY, settings.VAPID_PUBLIC_KEY

    result = await db.execute(
        select(AppSetting).where(AppSetting.key.in_(["vapid_private_key", "vapid_public_key"]))
    )
    stored = {row.key: row.value for row in result.scalars().all()}
    if "vapid_private_key" in stored and "vapid_public_key" in stored:
        # Verify key pair actually matches
        try:
            priv = _load_private_key(stored["vapid_private_key"])
            derived_pub = _public_key_b64(priv)
            if derived_pub == stored["vapid_public_key"]:
                return stored["vapid_private_key"], stored["vapid_public_key"]
            logger.warning(
                "VAPID key pair mismatch — stored public key does not match "
                "private key. Regenerating."
            )
        except Exception:
            logger.warning("VAPID private key unreadable. Regenerating.")
        # Delete stale keys so we regenerate below
        await db.execute(
            delete(AppSetting).where(AppSetting.key.in_(["vapid_private_key", "vapid_public_key"]))
        )
        await db.flush()

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

def _b64url(data: bytes) -> str:
    """Base64url-encode without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _build_vapid_token(private_key, public_key_b64: str, aud: str, sub: str) -> dict:
    """Build VAPID Authorization header from scratch using only cryptography.

    Returns dict with "Authorization" key ready for WebPusher.send().
    No py_vapid involved.
    """
    import time as _time
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, utils

    # JWT header
    header = {"typ": "JWT", "alg": "ES256"}
    # JWT claims
    claims = {
        "aud": aud,
        "exp": int(_time.time()) + (12 * 60 * 60),
        "sub": sub,
    }

    h = _b64url(json.dumps(header, separators=(",", ":")).encode())
    p = _b64url(json.dumps(claims, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}"

    # ES256 signature (DER → raw r||s as per RFC 7518 §3.4)
    der_sig = private_key.sign(
        signing_input.encode(),
        ec.ECDSA(hashes.SHA256()),
    )
    r, s = utils.decode_dss_signature(der_sig)
    raw_sig = r.to_bytes(32, "big") + s.to_bytes(32, "big")

    token = f"{signing_input}.{_b64url(raw_sig)}"

    logger.info(
        "VAPID JWT built:\n"
        "  header:  %s\n"
        "  claims:  %s\n"
        "  token:   %s...%s\n"
        "  k param: %s...%s",
        json.dumps(header),
        json.dumps(claims),
        token[:50], token[-20:],
        public_key_b64[:20], public_key_b64[-10:],
    )

    return {"Authorization": f"vapid t={token},k={public_key_b64}"}


def _send_one(
    subscription_info: dict,
    payload: str,
    vapid_private: str,
    vapid_public: str,
    vapid_claims: dict,
) -> str:
    """Synchronously send a single web push.

    Returns "ok", "gone" (endpoint dead — safe to delete), or "error".
    """
    if not _ensure_pywebpush():
        return "error"

    try:
        from pywebpush import WebPusher
    except ImportError:
        logger.exception("Missing pywebpush")
        return "error"

    # --- Load key ---
    try:
        ec_key = _load_private_key(vapid_private)
    except Exception:
        logger.exception("Failed to load VAPID private key")
        return "error"

    derived_pub = _public_key_b64(ec_key)

    endpoint = subscription_info.get("endpoint", "")
    url = urlparse(endpoint)
    aud = f"{url.scheme}://{url.netloc}"

    logger.info(
        "Push attempt:\n"
        "  endpoint:    %s\n"
        "  aud:         %s\n"
        "  keys match:  %s\n"
        "  sub claim:   %s",
        endpoint,
        aud,
        derived_pub == vapid_public,
        vapid_claims.get("sub"),
    )

    # --- Build VAPID auth header (no py_vapid) ---
    try:
        vapid_headers = _build_vapid_token(
            ec_key, vapid_public, aud, vapid_claims["sub"],
        )
    except Exception:
        logger.exception("VAPID token construction failed")
        return "error"

    # --- Send via WebPusher ---
    try:
        wp = WebPusher(subscription_info)
        resp = wp.send(payload, vapid_headers, ttl=86400, content_encoding="aes128gcm")
    except Exception:
        logger.exception("WebPusher.send failed")
        return "error"

    status_code = getattr(resp, "status_code", None)
    logger.info(
        "Push response: status=%s body=%s",
        status_code,
        getattr(resp, "text", "")[:300],
    )

    if status_code and status_code <= 202:
        return "ok"
    if status_code in (404, 410):
        return "gone"
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

    vapid_private, vapid_public = await get_vapid_keys(db)
    if not vapid_private:
        return 0

    logger.info("Sending push: pub_key=%s...", vapid_public[:20])

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
        vapid_claims = {"sub": settings.VAPID_CLAIM_EMAIL}
        result = _send_one(subscription_info, payload, vapid_private, vapid_public, vapid_claims)
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
