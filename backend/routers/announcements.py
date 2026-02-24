from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import Announcement, User, UserRole, Notification, NotificationType
from backend.schemas import AnnouncementCreate, AnnouncementResponse
from backend.dependencies import get_current_user, require_parent
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementResponse])
async def list_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all announcements, newest first. Pinned announcements first."""
    result = await db.execute(
        select(Announcement)
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .limit(50)
    )
    announcements = result.scalars().all()
    items = []
    for a in announcements:
        resp = AnnouncementResponse.model_validate(a)
        resp.creator_name = a.creator.display_name if a.creator else None
        items.append(resp)
    return items


@router.post("", response_model=AnnouncementResponse)
async def create_announcement(
    body: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Post a family announcement (Parent+). Sends push notification to all kids."""
    announcement = Announcement(
        title=body.title,
        message=body.message,
        icon=body.icon,
        is_pinned=body.is_pinned,
        created_by=current_user.id,
    )
    db.add(announcement)

    # Notify all kids in the family
    kids_result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = kids_result.scalars().all()
    for kid in kids:
        db.add(Notification(
            user_id=kid.id,
            type=NotificationType.announcement,
            title=body.title,
            message=body.message,
            reference_type="announcement",
        ))

    await db.commit()
    await db.refresh(announcement)

    # Broadcast via WebSocket
    await ws_manager.broadcast({
        "type": "announcement",
        "data": {"title": body.title, "message": body.message},
    })

    resp = AnnouncementResponse.model_validate(announcement)
    resp.creator_name = current_user.display_name
    return resp


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Delete an announcement (Parent+)."""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.delete(announcement)
    await db.commit()
    return {"ok": True}
