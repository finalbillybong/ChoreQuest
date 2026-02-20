"""SQLAlchemy event hook that automatically sends push notifications
when new Notification rows are flushed to the database.

Import this module once at app startup (e.g. in main.py lifespan) to
activate the hook. No changes to existing notification creation code needed.
"""

import asyncio
import logging
from sqlalchemy import event
from sqlalchemy.orm import Session

from backend.models import Notification
from backend.database import async_session
from backend.services.push import send_push_to_user

logger = logging.getLogger(__name__)

# Event loop reference captured at install time (avoids fragile
# asyncio.get_running_loop() calls inside SQLAlchemy greenlets).
_loop = None


def _after_flush(session: Session, flush_context):
    """Capture newly inserted Notification objects."""
    new_notifs = [
        obj for obj in session.new
        if isinstance(obj, Notification) and obj.user_id is not None
    ]
    if not new_notifs:
        return

    session.info.setdefault("_pending_push", [])
    for n in new_notifs:
        session.info["_pending_push"].append({
            "user_id": n.user_id,
            "title": n.title,
            "body": n.message,
            "tag": n.type.value if n.type else "chorequest",
        })


def _after_commit(session: Session):
    """Fire push notifications as background tasks after successful commit."""
    pending = session.info.pop("_pending_push", [])
    if not pending or _loop is None:
        return

    for item in pending:
        _loop.call_soon_threadsafe(
            _loop.create_task,
            _send_push_safe(
                user_id=item["user_id"],
                title=item["title"],
                body=item["body"],
                tag=item["tag"],
            ),
        )


async def _send_push_safe(user_id: int, title: str, body: str, tag: str):
    """Send push in a fresh DB session so we don't interfere with the caller."""
    try:
        async with async_session() as db:
            sent = await send_push_to_user(db, user_id, title, body, url="/", tag=tag)
            logger.info("Push sent to user %s: %d device(s)", user_id, sent)
    except Exception:
        logger.warning("Push notification failed for user %s", user_id, exc_info=True)


def install_push_hooks():
    """Register SQLAlchemy event listeners. Call once at startup."""
    global _loop
    _loop = asyncio.get_running_loop()
    event.listen(Session, "after_flush", _after_flush)
    event.listen(Session, "after_commit", _after_commit)
    logger.info("Push notification hooks installed (loop=%s)", _loop)
