from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import Notification, Family
from backend.schemas import NotificationResponse
from backend.dependencies import get_current_user, resolve_family, require_subscription

router = APIRouter(prefix="/api/notifications", tags=["notifications"], dependencies=[Depends(require_subscription)])


# ---------- GET / ----------
@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """List notifications for the current user."""
    stmt = select(Notification).where(
        Notification.user_id == user.id,
        Notification.family_id == family.id,
    )

    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    stmt = stmt.order_by(Notification.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return [NotificationResponse.model_validate(n) for n in notifications]


# ---------- GET /unread-count ----------
@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Return the count of unread notifications for the current user."""
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.family_id == family.id,
            Notification.is_read == False,
        )
    )
    count = result.scalar()
    return {"count": count}


# ---------- POST /{id}/read ----------
@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Mark a single notification as read (must belong to the current user)."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.family_id == family.id,
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your notification")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationResponse.model_validate(notification)


# ---------- POST /read-all ----------
@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Mark all notifications as read for the current user."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.family_id == family.id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"detail": "All notifications marked as read"}
