from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreRotation,
    User,
    UserRole,
    AssignmentStatus,
    Notification,
    NotificationType,
    Recurrence,
)
from backend.schemas import AssignmentResponse, TradeRequest
from backend.dependencies import get_current_user, require_parent
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


async def _get_assigned_user_ids(db: AsyncSession, chore: Chore) -> list[int]:
    """Determine which user IDs should be assigned to a chore.

    First checks for a ChoreRotation. If none exists, falls back to
    looking at distinct user_ids from past ChoreAssignment records.
    """
    # Check for rotation first
    result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore.id)
    )
    rotation = result.scalar_one_or_none()
    if rotation and rotation.kid_ids:
        return rotation.kid_ids

    # Fall back to distinct assigned users from previous assignments
    result = await db.execute(
        select(ChoreAssignment.user_id)
        .where(ChoreAssignment.chore_id == chore.id)
        .distinct()
    )
    user_ids = list(result.scalars().all())
    return user_ids


async def _auto_generate_assignments(
    db: AsyncSession, week_start: date
) -> None:
    """Auto-generate ChoreAssignment records for recurring chores
    that don't already have records for the given week.
    """
    week_end = week_start + timedelta(days=6)
    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    # Get all active recurring chores
    result = await db.execute(
        select(Chore).where(
            Chore.is_active == True,
            Chore.recurrence != Recurrence.once,
        )
    )
    chores = result.scalars().all()

    for chore in chores:
        user_ids = await _get_assigned_user_ids(db, chore)
        if not user_ids:
            continue

        for day in week_dates:
            should_create = False

            if chore.recurrence == Recurrence.daily:
                should_create = True
            elif chore.recurrence == Recurrence.weekly:
                # Create on the weekday matching the chore's created_at weekday
                if day.weekday() == chore.created_at.weekday():
                    should_create = True
            elif chore.recurrence == Recurrence.custom:
                # custom_days is a list of ints: 0=Mon, 6=Sun
                if chore.custom_days and day.weekday() in chore.custom_days:
                    should_create = True

            if not should_create:
                continue

            for user_id in user_ids:
                # Check if assignment already exists (unique constraint: chore_id, user_id, date)
                result = await db.execute(
                    select(ChoreAssignment).where(
                        ChoreAssignment.chore_id == chore.id,
                        ChoreAssignment.user_id == user_id,
                        ChoreAssignment.date == day,
                    )
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    assignment = ChoreAssignment(
                        chore_id=chore.id,
                        user_id=user_id,
                        date=day,
                        status=AssignmentStatus.pending,
                    )
                    db.add(assignment)

    await db.commit()


@router.get("")
async def get_weekly_calendar(
    week_start: date | None = Query(
        None,
        description="ISO date for the Monday of the desired week (e.g. 2025-01-13)",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Weekly calendar view.

    If no week_start is provided, defaults to the current week's Monday.
    The provided date must be a Monday.
    Auto-generates ChoreAssignment records for recurring chores.
    Returns assignments grouped by day.
    """
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    else:
        if week_start.weekday() != 0:
            raise HTTPException(
                status_code=400,
                detail="week_start must be a Monday",
            )

    week_end = week_start + timedelta(days=6)

    # Auto-generate missing assignments
    await _auto_generate_assignments(db, week_start)

    # Fetch all assignments for the week with chore (+category) and user eager-loaded
    result = await db.execute(
        select(ChoreAssignment)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
        .where(
            ChoreAssignment.date >= week_start,
            ChoreAssignment.date <= week_end,
        )
        .order_by(ChoreAssignment.date, ChoreAssignment.id)
    )
    assignments = result.scalars().all()

    # Group by day — manually build dicts to avoid lazy-load issues
    grouped: dict[str, list] = {}
    for day_offset in range(7):
        day = week_start + timedelta(days=day_offset)
        grouped[day.isoformat()] = []

    for a in assignments:
        day_key = a.date.isoformat()
        if day_key not in grouped:
            continue
        entry = {
            "id": a.id,
            "chore_id": a.chore_id,
            "user_id": a.user_id,
            "date": a.date.isoformat(),
            "status": a.status.value if a.status else "pending",
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            "verified_at": a.verified_at.isoformat() if a.verified_at else None,
            "verified_by": a.verified_by,
            "photo_proof_path": a.photo_proof_path,
        }
        if a.chore:
            entry["chore"] = {
                "id": a.chore.id,
                "title": a.chore.title,
                "description": a.chore.description,
                "points": a.chore.points,
                "difficulty": a.chore.difficulty.value if a.chore.difficulty else None,
                "icon": a.chore.icon,
                "category_id": a.chore.category_id,
                "category": {
                    "id": a.chore.category.id,
                    "name": a.chore.category.name,
                    "icon": a.chore.category.icon,
                    "colour": a.chore.category.colour,
                    "is_default": a.chore.category.is_default,
                } if a.chore.category else None,
                "recurrence": a.chore.recurrence.value if a.chore.recurrence else None,
                "custom_days": a.chore.custom_days,
                "requires_photo": a.chore.requires_photo,
                "is_active": a.chore.is_active,
                "created_by": a.chore.created_by,
                "created_at": a.chore.created_at.isoformat() if a.chore.created_at else None,
            }
        if a.user:
            entry["user"] = {
                "id": a.user.id,
                "username": a.user.username,
                "display_name": a.user.display_name,
                "role": a.user.role.value if a.user.role else None,
                "points_balance": a.user.points_balance,
                "total_points_earned": a.user.total_points_earned,
                "current_streak": a.user.current_streak,
                "longest_streak": a.user.longest_streak,
                "avatar_config": a.user.avatar_config,
                "is_active": a.user.is_active,
                "created_at": a.user.created_at.isoformat() if a.user.created_at else None,
            }
        grouped[day_key].append(entry)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "days": grouped,
    }


@router.post("/trade")
async def propose_trade(
    data: TradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid proposes a chore trade to another kid."""
    # Verify the assignment exists and belongs to the current user
    result = await db.execute(
        select(ChoreAssignment)
        .options(selectinload(ChoreAssignment.chore))
        .where(ChoreAssignment.id == data.assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only trade your own assignments",
        )

    if assignment.status != AssignmentStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Can only trade pending assignments",
        )

    # Verify target user exists and is a kid
    result = await db.execute(
        select(User).where(
            User.id == data.target_user_id,
            User.role == UserRole.kid,
            User.is_active == True,
        )
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found or not a kid")

    if data.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")

    # Create notification for the target kid
    chore_title = assignment.chore.title if assignment.chore else "a chore"
    notification = Notification(
        user_id=data.target_user_id,
        type=NotificationType.trade_proposed,
        title="Chore Trade Proposed",
        message=f"{current_user.display_name} wants to trade '{chore_title}' with you.",
        reference_type="trade",
        reference_id=assignment.id,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    # Send real-time notification
    await ws_manager.send_to_user(
        data.target_user_id,
        {
            "type": "trade_proposed",
            "data": {
                "notification_id": notification.id,
                "from_user": current_user.display_name,
                "assignment_id": assignment.id,
                "chore_title": chore_title,
            },
        },
    )

    return {"message": "Trade proposed", "notification_id": notification.id}


@router.post("/trade/{notification_id}/accept")
async def accept_trade(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid accepts a trade proposal."""
    # Look up the trade notification
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.type == NotificationType.trade_proposed,
            Notification.reference_type == "trade",
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Trade notification not found")

    # Get the assignment
    assignment_id = notification.reference_id
    result = await db.execute(
        select(ChoreAssignment)
        .options(selectinload(ChoreAssignment.chore))
        .where(ChoreAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.status != AssignmentStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Assignment is no longer pending",
        )

    # The proposer is the original owner of the assignment
    proposer_id = assignment.user_id

    # Reassign to the accepting kid
    assignment.user_id = current_user.id
    notification.is_read = True

    # Notify the proposer
    chore_title = assignment.chore.title if assignment.chore else "a chore"
    proposer_notification = Notification(
        user_id=proposer_id,
        type=NotificationType.trade_accepted,
        title="Trade Accepted",
        message=f"{current_user.display_name} accepted your trade for '{chore_title}'.",
        reference_type="trade",
        reference_id=assignment.id,
    )
    db.add(proposer_notification)
    await db.commit()

    # Send real-time notification to the proposer
    await ws_manager.send_to_user(
        proposer_id,
        {
            "type": "trade_accepted",
            "data": {
                "notification_id": proposer_notification.id,
                "accepted_by": current_user.display_name,
                "assignment_id": assignment.id,
                "chore_title": chore_title,
            },
        },
    )

    return {"message": "Trade accepted", "assignment_id": assignment.id}


@router.post("/trade/{notification_id}/deny")
async def deny_trade(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid denies a trade proposal."""
    # Look up the trade notification
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.type == NotificationType.trade_proposed,
            Notification.reference_type == "trade",
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Trade notification not found")

    # Get the assignment to find the proposer
    assignment_id = notification.reference_id
    result = await db.execute(
        select(ChoreAssignment)
        .options(selectinload(ChoreAssignment.chore))
        .where(ChoreAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    proposer_id = assignment.user_id
    notification.is_read = True

    # Notify the proposer
    chore_title = assignment.chore.title if assignment.chore else "a chore"
    proposer_notification = Notification(
        user_id=proposer_id,
        type=NotificationType.trade_denied,
        title="Trade Denied",
        message=f"{current_user.display_name} denied your trade for '{chore_title}'.",
        reference_type="trade",
        reference_id=assignment.id,
    )
    db.add(proposer_notification)
    await db.commit()

    # Send real-time notification to the proposer
    await ws_manager.send_to_user(
        proposer_id,
        {
            "type": "trade_denied",
            "data": {
                "notification_id": proposer_notification.id,
                "denied_by": current_user.display_name,
                "assignment_id": assignment.id,
                "chore_title": chore_title,
            },
        },
    )

    return {"message": "Trade denied", "assignment_id": assignment.id}
