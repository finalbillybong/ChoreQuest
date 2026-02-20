from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreAssignmentRule,
    ChoreExclusion,
    User,
    UserRole,
    AssignmentStatus,
    Notification,
    NotificationType,
    Recurrence,
)
from backend.schemas import TradeRequest
from backend.dependencies import get_current_user, require_parent
from backend.websocket_manager import ws_manager
from backend.services.assignment_generator import auto_generate_week_assignments

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


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
    elif week_start.weekday() != 0:
        raise HTTPException(status_code=400, detail="week_start must be a Monday")

    week_end = week_start + timedelta(days=6)

    # Auto-generate missing assignments for the week
    await auto_generate_week_assignments(db, week_start)

    # Fetch all assignments for the week (exclude soft-deleted chores)
    result = await db.execute(
        select(ChoreAssignment)
        .join(Chore, ChoreAssignment.chore_id == Chore.id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
        .where(
            ChoreAssignment.date >= week_start,
            ChoreAssignment.date <= week_end,
            Chore.is_active == True,
        )
        .order_by(ChoreAssignment.date, ChoreAssignment.id)
    )
    assignments = result.scalars().all()

    # Pre-load per-kid requires_photo overrides in one query
    rule_map: dict[tuple[int, int], ChoreAssignmentRule] = {}
    if assignments:
        rules_result = await db.execute(
            select(ChoreAssignmentRule).where(
                ChoreAssignmentRule.is_active == True,
            )
        )
        for r in rules_result.scalars().all():
            rule_map[(r.chore_id, r.user_id)] = r

    # Group by day
    grouped: dict[str, list] = {}
    for day_offset in range(7):
        day = week_start + timedelta(days=day_offset)
        grouped[day.isoformat()] = []

    for a in assignments:
        day_key = a.date.isoformat()
        if day_key not in grouped:
            continue

        kid_rule = rule_map.get((a.chore_id, a.user_id))
        effective_requires_photo = (
            kid_rule.requires_photo
            if kid_rule is not None
            else (a.chore.requires_photo if a.chore else False)
        )

        entry = _build_assignment_entry(a, effective_requires_photo)
        grouped[day_key].append(entry)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "days": grouped,
    }


def _build_assignment_entry(
    a: ChoreAssignment, effective_requires_photo: bool
) -> dict:
    """Build a calendar assignment dict from a ChoreAssignment with loaded relations."""
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
        "requires_photo": effective_requires_photo,
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
            "requires_photo": effective_requires_photo,
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
    return entry


# ---------------------------------------------------------------------------
# Chore Trading
# ---------------------------------------------------------------------------

async def _get_trade_notification_or_404(
    db: AsyncSession, notification_id: int, current_user: User
) -> Notification:
    """Load and validate a trade notification, raising appropriate errors."""
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
    return notification


async def _get_trade_assignment_or_404(
    db: AsyncSession, assignment_id: int
) -> ChoreAssignment:
    """Load a trade's assignment with its chore, raising 404 if missing."""
    result = await db.execute(
        select(ChoreAssignment)
        .options(selectinload(ChoreAssignment.chore))
        .where(ChoreAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("/trade")
async def propose_trade(
    data: TradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid proposes a chore trade to another kid."""
    result = await db.execute(
        select(ChoreAssignment)
        .options(selectinload(ChoreAssignment.chore))
        .where(ChoreAssignment.id == data.assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only trade your own assignments")

    if assignment.status != AssignmentStatus.pending:
        raise HTTPException(status_code=400, detail="Can only trade pending assignments")

    # Verify target user exists and is a kid
    result = await db.execute(
        select(User).where(
            User.id == data.target_user_id,
            User.role == UserRole.kid,
            User.is_active == True,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Target user not found or not a kid")

    if data.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")

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
    notification = await _get_trade_notification_or_404(db, notification_id, current_user)
    assignment = await _get_trade_assignment_or_404(db, notification.reference_id)

    if assignment.status != AssignmentStatus.pending:
        raise HTTPException(status_code=400, detail="Assignment is no longer pending")

    proposer_id = assignment.user_id

    # Reassign to the accepting kid
    assignment.user_id = current_user.id
    notification.is_read = True

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

    await ws_manager.send_to_user(
        current_user.id,
        {
            "type": "trade_accepted",
            "data": {
                "assignment_id": assignment.id,
                "chore_title": chore_title,
            },
        },
    )

    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "assignment"}},
        exclude_user=current_user.id,
    )

    return {"message": "Trade accepted", "assignment_id": assignment.id}


@router.post("/trade/{notification_id}/deny")
async def deny_trade(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kid denies a trade proposal."""
    notification = await _get_trade_notification_or_404(db, notification_id, current_user)
    assignment = await _get_trade_assignment_or_404(db, notification.reference_id)

    proposer_id = assignment.user_id
    notification.is_read = True

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


# ---------------------------------------------------------------------------
# Assignment Removal
# ---------------------------------------------------------------------------

@router.delete("/assignments/{assignment_id}", status_code=204)
async def remove_assignment(
    assignment_id: int,
    all_future: bool = Query(
        False,
        description="Also remove all future pending instances of this chore for the same kid",
    ),
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Remove a pending assignment. Parent+ only.

    Only pending assignments can be removed -- completed, verified, or
    skipped assignments are left intact.

    If ``all_future=true``, every pending assignment for the same
    chore + kid from today onward is also deleted.
    """
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
            detail="Only pending assignments can be removed",
        )

    is_recurring = (
        assignment.chore
        and assignment.chore.recurrence
        and assignment.chore.recurrence != Recurrence.once
    )

    if all_future:
        existing_exclusions = set()
        if is_recurring:
            existing_exclusions = await _load_existing_exclusions(db, assignment)
        await _remove_future_assignments(db, assignment, is_recurring, existing_exclusions)
    else:
        if is_recurring:
            await _add_exclusion_if_new(db, assignment.chore_id, assignment.user_id, assignment.date)
        await db.delete(assignment)

    await db.commit()
    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "assignment"}},
        exclude_user=parent.id,
    )
    return None


async def _load_existing_exclusions(
    db: AsyncSession, assignment: ChoreAssignment
) -> set[tuple[int, int, date]]:
    """Load existing exclusions for the assignment's chore+user from its date onward."""
    result = await db.execute(
        select(ChoreExclusion).where(
            ChoreExclusion.chore_id == assignment.chore_id,
            ChoreExclusion.user_id == assignment.user_id,
            ChoreExclusion.date >= assignment.date,
        )
    )
    return {
        (e.chore_id, e.user_id, e.date) for e in result.scalars().all()
    }


async def _remove_future_assignments(
    db: AsyncSession,
    assignment: ChoreAssignment,
    is_recurring: bool,
    existing_exclusions: set[tuple[int, int, date]],
) -> None:
    """Remove all pending assignments for the same chore+kid from the date onward."""
    future_result = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == assignment.chore_id,
            ChoreAssignment.user_id == assignment.user_id,
            ChoreAssignment.date >= assignment.date,
            ChoreAssignment.status == AssignmentStatus.pending,
        )
    )
    for a in future_result.scalars().all():
        if is_recurring and (a.chore_id, a.user_id, a.date) not in existing_exclusions:
            db.add(ChoreExclusion(
                chore_id=a.chore_id, user_id=a.user_id, date=a.date,
            ))
        await db.delete(a)


async def _add_exclusion_if_new(
    db: AsyncSession, chore_id: int, user_id: int, exclusion_date: date
) -> None:
    """Add a ChoreExclusion if one doesn't already exist for this slot."""
    existing = await db.execute(
        select(ChoreExclusion).where(
            ChoreExclusion.chore_id == chore_id,
            ChoreExclusion.user_id == user_id,
            ChoreExclusion.date == exclusion_date,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(ChoreExclusion(
            chore_id=chore_id, user_id=user_id, date=exclusion_date,
        ))
