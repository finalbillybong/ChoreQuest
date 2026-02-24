from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User, Shoutout, Notification, NotificationType
from backend.schemas import ShoutoutCreate, ShoutoutResponse
from backend.dependencies import get_current_user
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/shoutouts", tags=["shoutouts"])


@router.get("", response_model=list[ShoutoutResponse])
async def list_shoutouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recent shoutouts (last 7 days)."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(Shoutout)
        .where(Shoutout.created_at >= cutoff)
        .order_by(Shoutout.created_at.desc())
        .limit(50)
    )
    shoutouts = result.scalars().all()

    # Build name map
    user_ids = set()
    for s in shoutouts:
        user_ids.add(s.from_user_id)
        user_ids.add(s.to_user_id)

    name_map = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_result.scalars().all():
            name_map[u.id] = u.display_name or u.username

    return [
        ShoutoutResponse(
            id=s.id,
            from_user_id=s.from_user_id,
            from_user_name=name_map.get(s.from_user_id),
            to_user_id=s.to_user_id,
            to_user_name=name_map.get(s.to_user_id),
            message=s.message,
            emoji=s.emoji,
            created_at=s.created_at,
        )
        for s in shoutouts
    ]


@router.post("", response_model=ShoutoutResponse, status_code=201)
async def create_shoutout(
    body: ShoutoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a shoutout to a family member."""
    if body.to_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot shoutout yourself")

    # Verify target exists
    result = await db.execute(
        select(User).where(User.id == body.to_user_id, User.is_active == True)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Rate limit: max 5 shoutouts per user per day
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    count_result = await db.execute(
        select(Shoutout).where(
            Shoutout.from_user_id == current_user.id,
            Shoutout.created_at >= today_start,
        )
    )
    if len(count_result.scalars().all()) >= 5:
        raise HTTPException(status_code=429, detail="Max 5 shoutouts per day")

    shoutout = Shoutout(
        from_user_id=current_user.id,
        to_user_id=body.to_user_id,
        message=body.message,
        emoji=body.emoji,
    )
    db.add(shoutout)

    # Create notification for the recipient
    notification = Notification(
        user_id=body.to_user_id,
        type=NotificationType.shoutout,
        title="Shoutout!",
        message=f"{current_user.display_name} gave you a shoutout: {body.message}",
        reference_type="shoutout",
        reference_id=None,
    )
    db.add(notification)

    await db.commit()
    await db.refresh(shoutout)

    from_name = current_user.display_name or current_user.username
    to_name = target.display_name or target.username

    # WebSocket broadcast
    await ws_manager.broadcast({
        "type": "shoutout",
        "data": {
            "from_user_id": current_user.id,
            "from_user_name": from_name,
            "to_user_id": body.to_user_id,
            "to_user_name": to_name,
            "message": body.message,
            "emoji": body.emoji,
        },
    })

    return ShoutoutResponse(
        id=shoutout.id,
        from_user_id=shoutout.from_user_id,
        from_user_name=from_name,
        to_user_id=shoutout.to_user_id,
        to_user_name=to_name,
        message=shoutout.message,
        emoji=shoutout.emoji,
        created_at=shoutout.created_at,
    )
