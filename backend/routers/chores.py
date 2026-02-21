import logging
import os
import uuid
from datetime import datetime, date, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, and_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreAssignmentRule,
    ChoreCategory,
    ChoreExclusion,
    ChoreRotation,
    QuestTemplate,
    User,
    UserRole,
    AssignmentStatus,
    PointTransaction,
    PointType,
    SeasonalEvent,
    Notification,
    NotificationType,
    Recurrence,
)
from backend.schemas import (
    ChoreCreate,
    ChoreUpdate,
    ChoreResponse,
    AssignmentResponse,
    AssignmentRuleResponse,
    CategoryCreate,
    CategoryResponse,
    ChoreAssignRequest,
    AssignmentRuleUpdate,
    QuestTemplateResponse,
    RotationResponse,
)
from backend.config import settings
from backend.dependencies import get_current_user, require_parent
from backend.achievements import check_achievements
from backend.websocket_manager import ws_manager
from backend.services.recurrence import should_create_on_day
from backend.services.rotation import get_rotation_kid_for_day

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chores", tags=["chores"])

_CHORE_CHANGED = {"type": "data_changed", "data": {"entity": "chore"}}
_CATEGORY_CHANGED = {"type": "data_changed", "data": {"entity": "category"}}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_chore_or_404(
    db: AsyncSession,
    chore_id: int,
    *,
    active_only: bool = True,
    load_category: bool = False,
) -> Chore:
    """Load a chore by ID, raising 404 if not found."""
    stmt = select(Chore).where(Chore.id == chore_id)
    if active_only:
        stmt = stmt.where(Chore.is_active == True)
    if load_category:
        stmt = stmt.options(selectinload(Chore.category))
    result = await db.execute(stmt)
    chore = result.scalar_one_or_none()
    if chore is None:
        raise HTTPException(status_code=404, detail="Chore not found")
    return chore


async def _reload_chore_with_category(db: AsyncSession, chore_id: int) -> Chore:
    """Reload a chore with its category relationship eagerly loaded."""
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore_id)
        .options(selectinload(Chore.category))
    )
    return result.scalar_one()


async def _reload_assignment_with_relations(
    db: AsyncSession, assignment_id: int
) -> ChoreAssignment:
    """Reload an assignment with chore (+ category) and user eagerly loaded."""
    result = await db.execute(
        select(ChoreAssignment)
        .where(ChoreAssignment.id == assignment_id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
    )
    return result.scalar_one()


def _quest_assigned_notification(user_id: int, chore: Chore) -> Notification:
    """Build a 'quest assigned' notification for the given user."""
    return Notification(
        user_id=user_id,
        type=NotificationType.chore_assigned,
        title="New Quest Assigned!",
        message=f"You've been given a new quest: '{chore.title}' (+{chore.points} XP)",
        reference_type="chore",
        reference_id=chore.id,
    )


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChoreCategory))
    return [CategoryResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    category = ChoreCategory(
        name=body.name, icon=body.icon, colour=body.colour, is_default=False,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    await ws_manager.broadcast(_CATEGORY_CHANGED, exclude_user=user.id)
    return CategoryResponse.model_validate(category)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreCategory).where(ChoreCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = body.name
    category.icon = body.icon
    category.colour = body.colour
    await db.commit()
    await db.refresh(category)
    await ws_manager.broadcast(_CATEGORY_CHANGED, exclude_user=user.id)
    return CategoryResponse.model_validate(category)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreCategory).where(ChoreCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete a default category")

    await db.delete(category)
    await db.commit()
    await ws_manager.broadcast(_CATEGORY_CHANGED, exclude_user=user.id)
    return None


# ---------------------------------------------------------------------------
# Chores CRUD
# ---------------------------------------------------------------------------

@router.get("")
async def list_chores(
    view: str | None = Query(None, description="library | active"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role in (UserRole.parent, UserRole.admin):
        query = (
            select(Chore)
            .where(Chore.is_active == True)
            .options(selectinload(Chore.category))
        )

        if view == "active":
            query = query.join(
                ChoreAssignmentRule,
                and_(
                    ChoreAssignmentRule.chore_id == Chore.id,
                    ChoreAssignmentRule.is_active == True,
                ),
            ).distinct()

        result = await db.execute(query)
        chores = result.scalars().all()

        # Batch-load rule counts (avoids N+1 per-chore COUNT queries)
        chore_ids = [c.id for c in chores]
        rule_counts: dict[int, int] = {}
        if chore_ids:
            count_result = await db.execute(
                select(
                    ChoreAssignmentRule.chore_id,
                    func.count().label("cnt"),
                )
                .where(
                    ChoreAssignmentRule.chore_id.in_(chore_ids),
                    ChoreAssignmentRule.is_active == True,
                )
                .group_by(ChoreAssignmentRule.chore_id)
            )
            rule_counts = {row.chore_id: row.cnt for row in count_result.all()}

        enriched = []
        for c in chores:
            data = ChoreResponse.model_validate(c).model_dump()
            data["assignment_count"] = rule_counts.get(c.id, 0)
            enriched.append(data)
        return enriched
    else:
        # Kids see only chores assigned to them
        result = await db.execute(
            select(Chore)
            .join(ChoreAssignment, ChoreAssignment.chore_id == Chore.id)
            .where(
                Chore.is_active == True,
                ChoreAssignment.user_id == user.id,
            )
            .options(selectinload(Chore.category))
            .distinct()
        )
        chores = result.scalars().all()

        # Batch-load per-kid photo overrides (avoids N+1 per-chore rule queries)
        chore_ids = [c.id for c in chores]
        photo_overrides: dict[int, bool] = {}
        if chore_ids:
            rule_result = await db.execute(
                select(ChoreAssignmentRule).where(
                    ChoreAssignmentRule.chore_id.in_(chore_ids),
                    ChoreAssignmentRule.user_id == user.id,
                    ChoreAssignmentRule.is_active == True,
                )
            )
            for rule in rule_result.scalars().all():
                photo_overrides[rule.chore_id] = rule.requires_photo

        enriched = []
        for c in chores:
            data = ChoreResponse.model_validate(c).model_dump()
            if c.id in photo_overrides:
                data["requires_photo"] = photo_overrides[c.id]
            enriched.append(data)
        return enriched


@router.post("", response_model=ChoreResponse, status_code=201)
async def create_chore(
    body: ChoreCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    cat_result = await db.execute(
        select(ChoreCategory).where(ChoreCategory.id == body.category_id)
    )
    if cat_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Category not found")

    chore = Chore(
        title=body.title,
        description=body.description,
        points=body.points,
        difficulty=body.difficulty,
        icon=body.icon,
        category_id=body.category_id,
        recurrence=body.recurrence,
        custom_days=body.custom_days,
        requires_photo=body.requires_photo,
        created_by=user.id,
    )
    db.add(chore)
    await db.flush()

    today = date.today()
    for uid in body.assigned_user_ids:
        u_result = await db.execute(select(User).where(User.id == uid))
        if u_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail=f"User {uid} not found")
        db.add(ChoreAssignment(chore_id=chore.id, user_id=uid, date=today))
        db.add(_quest_assigned_notification(uid, chore))

    await db.commit()
    chore = await _reload_chore_with_category(db, chore.id)
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return ChoreResponse.model_validate(chore)


@router.post("/cleanup-all-stale")
async def cleanup_all_stale(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    """Remove ALL stale pending assignments and exclusions across every chore.

    This removes:
    - All pending assignments (past AND future) -- auto-gen will recreate correct ones
    - All ChoreExclusion records (so auto-gen works fresh)
    """
    # Use bulk deletes instead of loading + deleting one by one
    pending_count_result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(ChoreAssignment.status == AssignmentStatus.pending)
    )
    pending_count = pending_count_result.scalar() or 0
    await db.execute(
        delete(ChoreAssignment).where(
            ChoreAssignment.status == AssignmentStatus.pending
        )
    )

    excl_count_result = await db.execute(
        select(func.count()).select_from(ChoreExclusion)
    )
    excl_count = excl_count_result.scalar() or 0
    await db.execute(delete(ChoreExclusion))

    await db.commit()

    return {
        "message": f"Cleaned up {pending_count} pending assignments and {excl_count} exclusions",
        "pending_removed": pending_count,
        "exclusions_removed": excl_count,
    }


@router.get("/{chore_id}", response_model=ChoreResponse)
async def get_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chore = await _get_chore_or_404(db, chore_id, load_category=True)
    return ChoreResponse.model_validate(chore)


@router.put("/{chore_id}", response_model=ChoreResponse)
async def update_chore(
    chore_id: int,
    body: ChoreUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    chore = await _get_chore_or_404(db, chore_id, load_category=True)

    update_data = body.model_dump(exclude_unset=True)
    assigned_user_ids = update_data.pop("assigned_user_ids", None)

    for field, value in update_data.items():
        setattr(chore, field, value)
    chore.updated_at = datetime.now(timezone.utc)

    newly_assigned = []
    if assigned_user_ids is not None:
        today = date.today()
        for uid in assigned_user_ids:
            existing = await db.execute(
                select(ChoreAssignment).where(
                    ChoreAssignment.chore_id == chore_id,
                    ChoreAssignment.user_id == uid,
                    ChoreAssignment.date == today,
                )
            )
            if existing.scalar_one_or_none() is None:
                db.add(ChoreAssignment(chore_id=chore_id, user_id=uid, date=today))
                newly_assigned.append(uid)

        # Remove pending assignments for kids no longer in the list
        stale = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.chore_id == chore_id,
                ChoreAssignment.date == today,
                ChoreAssignment.status == AssignmentStatus.pending,
                ChoreAssignment.user_id.notin_(assigned_user_ids),
            )
        )
        for old in stale.scalars().all():
            await db.delete(old)

    for uid in newly_assigned:
        db.add(_quest_assigned_notification(uid, chore))

    await db.commit()
    chore = await _reload_chore_with_category(db, chore.id)
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return ChoreResponse.model_validate(chore)


@router.delete("/{chore_id}", status_code=204)
async def delete_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    chore = await _get_chore_or_404(db, chore_id)
    chore.is_active = False
    chore.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return None


# ---------------------------------------------------------------------------
# Quest Templates
# ---------------------------------------------------------------------------

@router.get("/templates", response_model=list[QuestTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(QuestTemplate))
    return [QuestTemplateResponse.model_validate(t) for t in result.scalars().all()]


# ---------------------------------------------------------------------------
# Assignment Rules
# ---------------------------------------------------------------------------

@router.get("/{chore_id}/rules", response_model=list[AssignmentRuleResponse])
async def get_assignment_rules(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreAssignmentRule)
        .where(ChoreAssignmentRule.chore_id == chore_id)
        .options(selectinload(ChoreAssignmentRule.user))
    )
    return [AssignmentRuleResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{chore_id}/rotation")
async def get_chore_rotation(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore_id)
    )
    rotation = result.scalar_one_or_none()
    if rotation is None:
        return None
    return RotationResponse.model_validate(rotation)


@router.post("/{chore_id}/assign", status_code=201)
async def assign_chore(
    chore_id: int,
    body: ChoreAssignRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    chore = await _get_chore_or_404(db, chore_id)

    today = date.today()
    submitted_user_ids = {item.user_id for item in body.assignments}

    # Deactivate rules for kids NOT in the submitted list
    existing_rules_result = await db.execute(
        select(ChoreAssignmentRule).where(
            ChoreAssignmentRule.chore_id == chore_id,
            ChoreAssignmentRule.is_active == True,
        )
    )
    removed_user_ids = set()
    for existing_rule in existing_rules_result.scalars().all():
        if existing_rule.user_id not in submitted_user_ids:
            existing_rule.is_active = False
            removed_user_ids.add(existing_rule.user_id)

    # Remove all pending assignments (today and future) for unassigned kids,
    # so that calendar entries are cleaned up when a recurring quest is unassigned.
    if removed_user_ids:
        stale_assignments = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.chore_id == chore_id,
                ChoreAssignment.date >= today,
                ChoreAssignment.status == AssignmentStatus.pending,
                ChoreAssignment.user_id.in_(removed_user_ids),
            )
        )
        for stale in stale_assignments.scalars().all():
            await db.delete(stale)

    # Handle rotation
    rotation_active = (
        body.rotation
        and body.rotation.enabled
        and len(body.assignments) >= 2
    )
    rot_result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore_id)
    )
    existing_rotation = rot_result.scalar_one_or_none()

    if rotation_active:
        kid_ids = [a.user_id for a in body.assignments]
        if existing_rotation:
            existing_rotation.kid_ids = kid_ids
            existing_rotation.cadence = body.rotation.cadence
            existing_rotation.current_index = 0
            existing_rotation.last_rotated = datetime.now(timezone.utc)
        else:
            existing_rotation = ChoreRotation(
                chore_id=chore_id,
                kid_ids=kid_ids,
                cadence=body.rotation.cadence,
                current_index=0,
                last_rotated=datetime.now(timezone.utc),
            )
            db.add(existing_rotation)
            await db.flush()

        # Compute active weekdays for occurrence-based rotation projection
        _active_wd: set[int] = set()
        _has_daily = False
        for _item in body.assignments:
            if _item.recurrence == Recurrence.daily:
                _has_daily = True
                break
            if _item.recurrence == Recurrence.custom and _item.custom_days:
                _active_wd.update(_item.custom_days)
            elif _item.recurrence in (Recurrence.weekly, Recurrence.fortnightly):
                _active_wd.add(chore.created_at.weekday())
        active_weekdays = sorted(_active_wd) if _active_wd and not _has_daily else None

        # Clean stale pending assignments that don't match the new rotation
        stale_result = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.chore_id == chore_id,
                ChoreAssignment.date >= today,
                ChoreAssignment.status == AssignmentStatus.pending,
            )
        )
        removed = 0
        for sa in stale_result.scalars().all():
            expected_kid = get_rotation_kid_for_day(
                existing_rotation, sa.date, today, active_weekdays,
            )
            if int(sa.user_id) != expected_kid:
                await db.delete(sa)
                removed += 1
        logger.debug(
            "Cleaned %d stale pending assignments from %s onward", removed, today,
        )

        # Clear exclusions so auto-gen can recreate the new rotation pattern
        excl_result = await db.execute(
            select(ChoreExclusion).where(
                ChoreExclusion.chore_id == chore_id,
                ChoreExclusion.date >= today,
            )
        )
        excl_count = 0
        for exc in excl_result.scalars().all():
            await db.delete(exc)
            excl_count += 1
        if excl_count:
            logger.debug("Cleared %d exclusions from %s onward", excl_count, today)

    elif existing_rotation:
        await db.delete(existing_rotation)
        existing_rotation = None

    # Determine the rotation kid for today
    rotation_kid_id = None
    if rotation_active and existing_rotation and existing_rotation.kid_ids:
        rotation_kid_id = existing_rotation.kid_ids[existing_rotation.current_index]

    for item in body.assignments:
        # Verify kid exists
        kid_result = await db.execute(select(User).where(User.id == item.user_id))
        if kid_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail=f"User {item.user_id} not found")

        # Upsert assignment rule
        existing = await db.execute(
            select(ChoreAssignmentRule).where(
                ChoreAssignmentRule.chore_id == chore_id,
                ChoreAssignmentRule.user_id == item.user_id,
            )
        )
        rule = existing.scalar_one_or_none()
        if rule:
            rule.recurrence = item.recurrence
            rule.custom_days = item.custom_days
            rule.requires_photo = item.requires_photo
            rule.is_active = True
        else:
            rule = ChoreAssignmentRule(
                chore_id=chore_id,
                user_id=item.user_id,
                recurrence=item.recurrence,
                custom_days=item.custom_days,
                requires_photo=item.requires_photo,
                is_active=True,
            )
            db.add(rule)

        # Create today's assignment if schedule matches
        create_today = should_create_on_day(
            item.recurrence, today, chore.created_at.weekday(), item.custom_days,
        )

        # Rotation filtering: only the current rotation kid gets today's assignment
        if create_today and rotation_kid_id is not None:
            if int(item.user_id) != int(rotation_kid_id):
                create_today = False

        if create_today:
            existing_assignment_result = await db.execute(
                select(ChoreAssignment).where(
                    ChoreAssignment.chore_id == chore_id,
                    ChoreAssignment.user_id == item.user_id,
                    ChoreAssignment.date == today,
                )
            )
            existing_assignment = existing_assignment_result.scalar_one_or_none()
            if existing_assignment is None:
                db.add(ChoreAssignment(
                    chore_id=chore_id,
                    user_id=item.user_id,
                    date=today,
                    status=AssignmentStatus.pending,
                ))
            elif existing_assignment.status in (
                AssignmentStatus.completed,
                AssignmentStatus.verified,
                AssignmentStatus.skipped,
            ):
                # Re-assigning a quest that was already completed/verified/skipped
                # today: reset it to pending so the kid sees it again.
                existing_assignment.status = AssignmentStatus.pending
                existing_assignment.completed_at = None
                existing_assignment.verified_at = None
                existing_assignment.verified_by = None
                existing_assignment.updated_at = datetime.now(timezone.utc)

        db.add(_quest_assigned_notification(item.user_id, chore))

    await db.commit()
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)

    count = len(body.assignments)
    if count == 0:
        return {"message": "All heroes unassigned from this quest"}
    return {"message": f"Quest assigned to {count} hero(es)"}


@router.get("/{chore_id}/debug")
async def debug_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    """Debug endpoint: show all DB state for a chore's rotation/assignments."""
    chore = await _get_chore_or_404(db, chore_id, active_only=False)

    rot_result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore_id)
    )
    rotation = rot_result.scalar_one_or_none()

    rules_result = await db.execute(
        select(ChoreAssignmentRule).where(ChoreAssignmentRule.chore_id == chore_id)
    )
    rules = rules_result.scalars().all()

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    assign_result = await db.execute(
        select(ChoreAssignment)
        .where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.date >= week_start,
            ChoreAssignment.date <= week_end,
        )
        .order_by(ChoreAssignment.date)
    )
    assignments = assign_result.scalars().all()

    excl_result = await db.execute(
        select(ChoreExclusion).where(
            ChoreExclusion.chore_id == chore_id,
            ChoreExclusion.date >= week_start,
            ChoreExclusion.date <= week_end,
        )
    )
    exclusions = excl_result.scalars().all()

    return {
        "chore": {
            "id": chore.id,
            "title": chore.title,
            "is_active": chore.is_active,
            "recurrence": chore.recurrence.value,
        },
        "rotation": {
            "id": rotation.id,
            "kid_ids": rotation.kid_ids,
            "kid_ids_types": [type(k).__name__ for k in rotation.kid_ids] if rotation.kid_ids else [],
            "cadence": rotation.cadence.value if rotation.cadence else None,
            "current_index": rotation.current_index,
            "last_rotated": str(rotation.last_rotated) if rotation.last_rotated else None,
        } if rotation else None,
        "rules": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "recurrence": r.recurrence.value,
                "is_active": r.is_active,
            }
            for r in rules
        ],
        "assignments_this_week": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "date": a.date.isoformat(),
                "status": a.status.value if a.status else None,
            }
            for a in assignments
        ],
        "exclusions_this_week": [
            {
                "chore_id": e.chore_id,
                "user_id": e.user_id,
                "date": e.date.isoformat(),
            }
            for e in exclusions
        ],
        "server_today": today.isoformat(),
        "week_start": week_start.isoformat(),
    }


@router.put("/rules/{rule_id}", response_model=AssignmentRuleResponse)
async def update_assignment_rule(
    rule_id: int,
    body: AssignmentRuleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreAssignmentRule)
        .where(ChoreAssignmentRule.id == rule_id)
        .options(selectinload(ChoreAssignmentRule.user))
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return AssignmentRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_assignment_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(ChoreAssignmentRule).where(ChoreAssignmentRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")

    rule.is_active = False
    await db.commit()
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return None


# ---------------------------------------------------------------------------
# Chore Lifecycle (complete / verify / uncomplete / skip)
# ---------------------------------------------------------------------------

@router.post("/{chore_id}/complete", response_model=AssignmentResponse)
async def complete_chore(
    chore_id: int,
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ChoreAssignment)
        .where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.user_id == user.id,
            ChoreAssignment.date == today,
            ChoreAssignment.status == AssignmentStatus.pending,
        )
        .options(selectinload(ChoreAssignment.chore))
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No pending assignment found for this chore today",
        )

    chore = assignment.chore

    # Determine if photo is required: per-kid rule overrides chore-level
    requires_photo = chore.requires_photo
    rule_result = await db.execute(
        select(ChoreAssignmentRule).where(
            ChoreAssignmentRule.chore_id == chore_id,
            ChoreAssignmentRule.user_id == user.id,
            ChoreAssignmentRule.is_active == True,
        )
    )
    rule = rule_result.scalar_one_or_none()
    if rule is not None:
        requires_photo = rule.requires_photo

    if requires_photo and (file is None or (hasattr(file, "size") and file.size == 0)):
        raise HTTPException(
            status_code=400,
            detail="Photo proof is required for this quest. Please attach a photo.",
        )

    # Save photo proof if provided
    if file and file.size and file.size > 0:
        allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP")
        contents = await file.read()
        max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(contents) > max_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")
        upload_dir = "/app/data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        assignment.photo_proof_path = filename

    assignment.status = AssignmentStatus.completed
    assignment.completed_at = now
    assignment.updated_at = now

    await db.commit()

    # Notify parents for approval
    parent_result = await db.execute(
        select(User.id).where(
            User.role.in_([UserRole.parent, UserRole.admin]),
            User.is_active == True,
        )
    )
    parent_ids = [row[0] for row in parent_result.all()]

    await ws_manager.send_to_parents(
        {
            "type": "chore_completed",
            "data": {
                "chore_id": chore.id,
                "chore_title": chore.title,
                "user_id": user.id,
                "user_display_name": user.display_name,
                "points": chore.points,
                "assignment_id": assignment.id,
            },
        },
        parent_ids,
    )

    for pid in parent_ids:
        db.add(Notification(
            user_id=pid,
            type=NotificationType.chore_completed,
            title="Quest Awaiting Approval",
            message=f"{user.display_name} completed '{chore.title}' - tap to approve (+{chore.points} XP)",
            reference_type="chore_assignment",
            reference_id=assignment.id,
        ))
    await db.commit()

    assignment = await _reload_assignment_with_relations(db, assignment.id)
    return AssignmentResponse.model_validate(assignment)


@router.post("/{chore_id}/verify", response_model=AssignmentResponse)
async def verify_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ChoreAssignment)
        .where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.date == today,
            ChoreAssignment.status == AssignmentStatus.completed,
        )
        .options(selectinload(ChoreAssignment.chore))
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No completed assignment found to verify for this chore today",
        )

    chore = assignment.chore
    base_points = chore.points

    assignment.status = AssignmentStatus.verified
    assignment.verified_at = now
    assignment.verified_by = user.id
    assignment.updated_at = now

    # Calculate event multiplier (use naive UTC to match SQLite storage)
    now_naive = now.replace(tzinfo=None)
    ev_result = await db.execute(
        select(SeasonalEvent).where(
            SeasonalEvent.is_active == True,
            SeasonalEvent.start_date <= now_naive,
            SeasonalEvent.end_date >= now_naive,
        )
    )
    active_events = ev_result.scalars().all()

    multiplier = 1.0
    for event in active_events:
        multiplier *= event.multiplier

    # Award base points
    db.add(PointTransaction(
        user_id=assignment.user_id,
        amount=base_points,
        type=PointType.chore_complete,
        description=f"Completed: {chore.title}",
        reference_id=assignment.id,
    ))
    total_awarded = base_points

    if multiplier > 1.0:
        bonus_points = int(base_points * multiplier) - base_points
        if bonus_points > 0:
            event_names = ", ".join(e.title for e in active_events)
            db.add(PointTransaction(
                user_id=assignment.user_id,
                amount=bonus_points,
                type=PointType.event_multiplier,
                description=f"Event bonus ({event_names}): {chore.title}",
                reference_id=assignment.id,
            ))
            total_awarded += bonus_points

    # Update kid's points and streak
    kid_result = await db.execute(select(User).where(User.id == assignment.user_id))
    kid = kid_result.scalar_one()

    kid.points_balance += total_awarded
    kid.total_points_earned += total_awarded

    if kid.last_streak_date == today:
        pass
    elif kid.last_streak_date is not None and (today - kid.last_streak_date).days == 1:
        kid.current_streak += 1
        kid.last_streak_date = today
    else:
        kid.current_streak = 1
        kid.last_streak_date = today

    if kid.current_streak > kid.longest_streak:
        kid.longest_streak = kid.current_streak

    # Streak milestone notifications
    _STREAK_MILESTONES = (7, 30, 100)
    if kid.current_streak in _STREAK_MILESTONES:
        db.add(Notification(
            user_id=kid.id,
            type=NotificationType.streak_milestone,
            title=f"{kid.current_streak}-Day Streak!",
            message=f"You've completed quests {kid.current_streak} days in a row! Keep it up!",
            reference_type="streak",
        ))

    await db.commit()
    await check_achievements(db, kid)

    # Deactivate assignment rule for one-time quests so they no longer
    # appear as assigned after completion.
    if chore.recurrence == Recurrence.once:
        rule_result = await db.execute(
            select(ChoreAssignmentRule).where(
                ChoreAssignmentRule.chore_id == chore_id,
                ChoreAssignmentRule.user_id == assignment.user_id,
                ChoreAssignmentRule.is_active == True,
            )
        )
        one_time_rule = rule_result.scalar_one_or_none()
        if one_time_rule:
            one_time_rule.is_active = False

    db.add(Notification(
        user_id=assignment.user_id,
        type=NotificationType.chore_verified,
        title="Quest Approved!",
        message=f"'{chore.title}' was approved! You earned {total_awarded} XP!",
        reference_type="chore_assignment",
        reference_id=assignment.id,
    ))
    await db.commit()

    # Roll for quest drop avatar item
    from backend.routers.avatar import try_quest_drop
    drop = await try_quest_drop(db, kid, chore.difficulty.value)
    if drop:
        await db.commit()

    ws_data = {
        "chore_id": chore.id,
        "chore_title": chore.title,
        "points": total_awarded,
        "assignment_id": assignment.id,
    }
    if drop:
        ws_data["avatar_drop"] = drop

    await ws_manager.send_to_user(
        assignment.user_id,
        {"type": "chore_verified", "data": ws_data},
    )

    assignment = await _reload_assignment_with_relations(db, assignment.id)
    return AssignmentResponse.model_validate(assignment)


@router.post("/{chore_id}/uncomplete", response_model=AssignmentResponse)
async def uncomplete_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.date == today,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No completed assignment found to undo for this chore today",
        )

    assigned_user_id = assignment.user_id

    # Reverse point transactions
    tx_result = await db.execute(
        select(PointTransaction).where(
            PointTransaction.user_id == assigned_user_id,
            PointTransaction.reference_id == assignment.id,
            PointTransaction.type.in_(
                [PointType.chore_complete, PointType.event_multiplier]
            ),
        )
    )
    transactions = tx_result.scalars().all()
    total_deducted = sum(tx.amount for tx in transactions)

    assigned_user_result = await db.execute(
        select(User).where(User.id == assigned_user_id)
    )
    assigned_user = assigned_user_result.scalar_one()

    assigned_user.points_balance = max(0, assigned_user.points_balance - total_deducted)
    # Note: do NOT decrement total_points_earned — it tracks lifetime XP
    # earned and is used for milestone unlocks (avatar items, achievements).
    # Deducting it would cause kids to lose unlocks when quests are undone.

    for tx in transactions:
        await db.delete(tx)

    assignment.status = AssignmentStatus.pending
    assignment.completed_at = None
    assignment.verified_at = None
    assignment.verified_by = None
    assignment.updated_at = now

    await db.commit()

    assignment = await _reload_assignment_with_relations(db, assignment.id)
    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)
    return AssignmentResponse.model_validate(assignment)


@router.post("/{chore_id}/skip", response_model=AssignmentResponse)
async def skip_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.date == today,
            ChoreAssignment.status == AssignmentStatus.pending,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No pending assignment found to skip for this chore today",
        )

    assignment.status = AssignmentStatus.skipped
    assignment.updated_at = now
    await db.commit()

    await ws_manager.broadcast(_CHORE_CHANGED, exclude_user=user.id)

    assignment = await _reload_assignment_with_relations(db, assignment.id)
    return AssignmentResponse.model_validate(assignment)
