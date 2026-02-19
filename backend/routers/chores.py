from datetime import datetime, date, timezone

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreAssignmentRule,
    ChoreCategory,
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
    Difficulty,
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

router = APIRouter(prefix="/api/chores", tags=["chores"])


# ========== Categories ==========

# ---------- GET /categories ----------
@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChoreCategory))
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]


# ---------- POST /categories ----------
@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    category = ChoreCategory(
        name=body.name,
        icon=body.icon,
        colour=body.colour,
        is_default=False,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "category"}}, exclude_user=user.id)
    return CategoryResponse.model_validate(category)


# ---------- PUT /categories/{id} ----------
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
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "category"}}, exclude_user=user.id)
    return CategoryResponse.model_validate(category)


# ---------- DELETE /categories/{id} ----------
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
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "category"}}, exclude_user=user.id)
    return None


# ========== Chores ==========

# ---------- GET / ----------
@router.get("")
async def list_chores(
    view: str | None = Query(None, description="library | active"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role in (UserRole.parent, UserRole.admin):
        query = select(Chore).where(Chore.is_active == True).options(selectinload(Chore.category))

        if view == "active":
            # Only chores with active assignment rules
            query = query.join(
                ChoreAssignmentRule,
                and_(
                    ChoreAssignmentRule.chore_id == Chore.id,
                    ChoreAssignmentRule.is_active == True,
                ),
            ).distinct()

        result = await db.execute(query)
        chores = result.scalars().all()

        # Enrich with assignment rule counts
        enriched = []
        for c in chores:
            data = ChoreResponse.model_validate(c).model_dump()
            # Count active assignment rules
            rule_count_result = await db.execute(
                select(func.count()).select_from(ChoreAssignmentRule).where(
                    ChoreAssignmentRule.chore_id == c.id,
                    ChoreAssignmentRule.is_active == True,
                )
            )
            data["assignment_count"] = rule_count_result.scalar() or 0
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

        # Override requires_photo with per-kid assignment rule if one exists
        enriched = []
        for c in chores:
            data = ChoreResponse.model_validate(c).model_dump()
            rule_result = await db.execute(
                select(ChoreAssignmentRule).where(
                    ChoreAssignmentRule.chore_id == c.id,
                    ChoreAssignmentRule.user_id == user.id,
                    ChoreAssignmentRule.is_active == True,
                )
            )
            rule = rule_result.scalar_one_or_none()
            if rule is not None:
                data["requires_photo"] = rule.requires_photo
            enriched.append(data)
        return enriched


# ---------- POST / ----------
@router.post("", response_model=ChoreResponse, status_code=201)
async def create_chore(
    body: ChoreCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    # Verify category exists
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

    # Create assignments for today for each assigned user
    today = date.today()
    for uid in body.assigned_user_ids:
        # Verify user exists
        u_result = await db.execute(select(User).where(User.id == uid))
        assigned_user = u_result.scalar_one_or_none()
        if assigned_user is None:
            raise HTTPException(status_code=400, detail=f"User {uid} not found")
        assignment = ChoreAssignment(
            chore_id=chore.id,
            user_id=uid,
            date=today,
        )
        db.add(assignment)

    # Notify assigned kids about the new quest
    for uid in body.assigned_user_ids:
        notif = Notification(
            user_id=uid,
            type=NotificationType.chore_assigned,
            title="New Quest Assigned!",
            message=f"You've been given a new quest: '{chore.title}' (+{chore.points} XP)",
            reference_type="chore",
            reference_id=chore.id,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(chore)

    # Eagerly load category for the response
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore.id)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one()

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "chore"}}, exclude_user=user.id)

    return ChoreResponse.model_validate(chore)


# ---------- GET /{id} ----------
@router.get("/{chore_id}", response_model=ChoreResponse)
async def get_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore_id, Chore.is_active == True)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one_or_none()
    if chore is None:
        raise HTTPException(status_code=404, detail="Chore not found")
    return ChoreResponse.model_validate(chore)


# ---------- PUT /{id} ----------
@router.put("/{chore_id}", response_model=ChoreResponse)
async def update_chore(
    chore_id: int,
    body: ChoreUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore_id, Chore.is_active == True)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one_or_none()
    if chore is None:
        raise HTTPException(status_code=404, detail="Chore not found")

    update_data = body.model_dump(exclude_unset=True)
    assigned_user_ids = update_data.pop("assigned_user_ids", None)

    for field, value in update_data.items():
        setattr(chore, field, value)

    chore.updated_at = datetime.now(timezone.utc)

    # Handle assignment updates if provided
    newly_assigned = []
    if assigned_user_ids is not None:
        today = date.today()
        for uid in assigned_user_ids:
            # Check if assignment already exists for today
            existing = await db.execute(
                select(ChoreAssignment).where(
                    ChoreAssignment.chore_id == chore_id,
                    ChoreAssignment.user_id == uid,
                    ChoreAssignment.date == today,
                )
            )
            if existing.scalar_one_or_none() is None:
                assignment = ChoreAssignment(
                    chore_id=chore_id,
                    user_id=uid,
                    date=today,
                )
                db.add(assignment)
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

    # Notify newly assigned kids
    for uid in newly_assigned:
        notif = Notification(
            user_id=uid,
            type=NotificationType.chore_assigned,
            title="New Quest Assigned!",
            message=f"You've been given a new quest: '{chore.title}' (+{chore.points} XP)",
            reference_type="chore",
            reference_id=chore.id,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(chore)

    # Reload with category
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore.id)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one()

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "chore"}}, exclude_user=user.id)

    return ChoreResponse.model_validate(chore)


# ---------- DELETE /{id} ----------
@router.delete("/{chore_id}", status_code=204)
async def delete_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    result = await db.execute(
        select(Chore).where(Chore.id == chore_id, Chore.is_active == True)
    )
    chore = result.scalar_one_or_none()
    if chore is None:
        raise HTTPException(status_code=404, detail="Chore not found")

    # Soft delete
    chore.is_active = False
    chore.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "chore"}}, exclude_user=user.id)

    return None


# ========== Quest Templates ==========

@router.get("/templates", response_model=list[QuestTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(QuestTemplate))
    return [QuestTemplateResponse.model_validate(t) for t in result.scalars().all()]


# ========== Assignment Rules ==========

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
    # Verify chore exists
    chore_result = await db.execute(
        select(Chore).where(Chore.id == chore_id, Chore.is_active == True)
    )
    chore = chore_result.scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=404, detail="Quest not found")

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

    # Remove today's pending assignments for unassigned kids
    if removed_user_ids:
        stale_assignments = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.chore_id == chore_id,
                ChoreAssignment.date == today,
                ChoreAssignment.status == AssignmentStatus.pending,
                ChoreAssignment.user_id.in_(removed_user_ids),
            )
        )
        for stale in stale_assignments.scalars().all():
            await db.delete(stale)

    # Handle rotation first (needed for assignment creation logic)
    rotation_active = body.rotation and body.rotation.enabled and len(body.assignments) >= 2
    rot_result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore_id)
    )
    existing_rotation = rot_result.scalar_one_or_none()

    if rotation_active:
        kid_ids = [a.user_id for a in body.assignments]
        if existing_rotation:
            existing_rotation.kid_ids = kid_ids
            existing_rotation.cadence = body.rotation.cadence
            # Reset index if out of bounds
            if existing_rotation.current_index >= len(kid_ids):
                existing_rotation.current_index = 0
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
    elif existing_rotation:
        # Rotation disabled - remove existing rotation
        await db.delete(existing_rotation)
        existing_rotation = None

    # Determine the rotation kid for today (if rotation is active)
    rotation_kid_id = None
    if rotation_active and existing_rotation and existing_rotation.kid_ids:
        rotation_kid_id = existing_rotation.kid_ids[existing_rotation.current_index]

    created_rules = []

    for item in body.assignments:
        # Verify kid exists
        kid_result = await db.execute(select(User).where(User.id == item.user_id))
        if kid_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail=f"User {item.user_id} not found")

        # Check for existing rule
        existing = await db.execute(
            select(ChoreAssignmentRule).where(
                ChoreAssignmentRule.chore_id == chore_id,
                ChoreAssignmentRule.user_id == item.user_id,
            )
        )
        rule = existing.scalar_one_or_none()
        if rule:
            # Update existing rule
            rule.recurrence = item.recurrence
            rule.custom_days = item.custom_days
            rule.requires_photo = item.requires_photo
            rule.is_active = True
        else:
            # Create new rule
            rule = ChoreAssignmentRule(
                chore_id=chore_id,
                user_id=item.user_id,
                recurrence=item.recurrence,
                custom_days=item.custom_days,
                requires_photo=item.requires_photo,
                is_active=True,
            )
            db.add(rule)
        created_rules.append(rule)

        # Create today's assignment if applicable
        should_create = False
        if item.recurrence.value == "once":
            should_create = True
        elif item.recurrence.value == "daily":
            should_create = True
        elif item.recurrence.value == "weekly":
            should_create = today.weekday() == chore.created_at.weekday()
        elif item.recurrence.value == "custom" and item.custom_days:
            should_create = today.weekday() in item.custom_days

        # If rotation is active, only create today's assignment for the current rotation kid
        if should_create and rotation_kid_id is not None and item.user_id != rotation_kid_id:
            should_create = False

        if should_create:
            existing_assignment = await db.execute(
                select(ChoreAssignment).where(
                    ChoreAssignment.chore_id == chore_id,
                    ChoreAssignment.user_id == item.user_id,
                    ChoreAssignment.date == today,
                )
            )
            if existing_assignment.scalar_one_or_none() is None:
                db.add(ChoreAssignment(
                    chore_id=chore_id,
                    user_id=item.user_id,
                    date=today,
                    status=AssignmentStatus.pending,
                ))

        # Notify assigned kid
        notif = Notification(
            user_id=item.user_id,
            type=NotificationType.chore_assigned,
            title="New Quest Assigned!",
            message=f"You've been given a new quest: '{chore.title}' (+{chore.points} XP)",
            reference_type="chore",
            reference_id=chore.id,
        )
        db.add(notif)

    await db.commit()

    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "chore"}},
        exclude_user=user.id,
    )

    count = len(body.assignments)
    if count == 0:
        return {"message": "All heroes unassigned from this quest"}
    return {"message": f"Quest assigned to {count} hero(es)"}


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

    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "chore"}},
        exclude_user=user.id,
    )

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

    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "chore"}},
        exclude_user=user.id,
    )
    return None


# ---------- POST /{id}/complete ----------
@router.post("/{chore_id}/complete", response_model=AssignmentResponse)
async def complete_chore(
    chore_id: int,
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    # 1. Find today's pending assignment for this chore for the current user
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

    # Determine if photo is required: check per-kid rule first, then chore-level
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

    if requires_photo and (file is None or (hasattr(file, 'size') and file.size == 0)):
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

    # Mark as completed (pending parent approval - no points yet)
    assignment.status = AssignmentStatus.completed
    assignment.completed_at = now
    assignment.updated_at = now

    await db.commit()

    # Send WebSocket notification to parents for approval
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

    # Create notification for parents
    for pid in parent_ids:
        notif = Notification(
            user_id=pid,
            type=NotificationType.chore_completed,
            title="Quest Awaiting Approval",
            message=f"{user.display_name} completed '{chore.title}' - tap to approve (+{chore.points} XP)",
            reference_type="chore_assignment",
            reference_id=assignment.id,
        )
        db.add(notif)
    await db.commit()

    await db.refresh(assignment)
    # Reload with relationships for response
    result = await db.execute(
        select(ChoreAssignment)
        .where(ChoreAssignment.id == assignment.id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
    )
    assignment = result.scalar_one()
    return AssignmentResponse.model_validate(assignment)


# ---------- POST /{id}/verify ----------
@router.post("/{chore_id}/verify", response_model=AssignmentResponse)
async def verify_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    # Find a completed (but not yet verified) assignment for today
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

    # Award points now that parent has approved
    # Get active seasonal events for multiplier
    ev_result = await db.execute(
        select(SeasonalEvent).where(
            SeasonalEvent.is_active == True,
            SeasonalEvent.start_date <= now,
            SeasonalEvent.end_date >= now,
        )
    )
    active_events = ev_result.scalars().all()

    multiplier = 1.0
    for event in active_events:
        multiplier *= event.multiplier

    base_tx = PointTransaction(
        user_id=assignment.user_id,
        amount=base_points,
        type=PointType.chore_complete,
        description=f"Completed: {chore.title}",
        reference_id=assignment.id,
    )
    db.add(base_tx)

    total_awarded = base_points

    if multiplier > 1.0:
        bonus_points = int(base_points * multiplier) - base_points
        if bonus_points > 0:
            event_names = ", ".join(e.title for e in active_events)
            bonus_tx = PointTransaction(
                user_id=assignment.user_id,
                amount=bonus_points,
                type=PointType.event_multiplier,
                description=f"Event bonus ({event_names}): {chore.title}",
                reference_id=assignment.id,
            )
            db.add(bonus_tx)
            total_awarded += bonus_points

    # Load assigned user to update points and streak
    kid_result = await db.execute(select(User).where(User.id == assignment.user_id))
    kid = kid_result.scalar_one()

    kid.points_balance += total_awarded
    kid.total_points_earned += total_awarded

    # Update streak
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

    await db.commit()

    # Check achievements
    await check_achievements(db, kid)

    # Notify the kid
    notif = Notification(
        user_id=assignment.user_id,
        type=NotificationType.chore_verified,
        title="Quest Approved!",
        message=f"'{chore.title}' was approved! You earned {total_awarded} XP!",
        reference_type="chore_assignment",
        reference_id=assignment.id,
    )
    db.add(notif)
    await db.commit()

    # Send WebSocket update to the kid
    await ws_manager.send_to_user(
        assignment.user_id,
        {
            "type": "chore_verified",
            "data": {
                "chore_id": chore.id,
                "chore_title": chore.title,
                "points": total_awarded,
                "assignment_id": assignment.id,
            },
        },
    )

    # Reload with relationships
    result = await db.execute(
        select(ChoreAssignment)
        .where(ChoreAssignment.id == assignment.id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
    )
    assignment = result.scalar_one()
    return AssignmentResponse.model_validate(assignment)


# ---------- POST /{id}/uncomplete ----------
@router.post("/{chore_id}/uncomplete", response_model=AssignmentResponse)
async def uncomplete_chore(
    chore_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_parent),
):
    today = date.today()
    now = datetime.now(timezone.utc)

    # Find a completed or verified assignment for today
    result = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.date == today,
            ChoreAssignment.status.in_([AssignmentStatus.completed, AssignmentStatus.verified]),
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=404,
            detail="No completed assignment found to undo for this chore today",
        )

    assigned_user_id = assignment.user_id

    # Find all point transactions for this assignment and reverse them
    tx_result = await db.execute(
        select(PointTransaction).where(
            PointTransaction.user_id == assigned_user_id,
            PointTransaction.reference_id == assignment.id,
            PointTransaction.type.in_([PointType.chore_complete, PointType.event_multiplier]),
        )
    )
    transactions = tx_result.scalars().all()

    total_deducted = 0
    for tx in transactions:
        total_deducted += tx.amount

    # Load the assigned user to deduct points
    assigned_user_result = await db.execute(
        select(User).where(User.id == assigned_user_id)
    )
    assigned_user = assigned_user_result.scalar_one()

    assigned_user.points_balance -= total_deducted
    assigned_user.total_points_earned -= total_deducted

    # Prevent negative balance
    if assigned_user.points_balance < 0:
        assigned_user.points_balance = 0
    if assigned_user.total_points_earned < 0:
        assigned_user.total_points_earned = 0

    # Remove the original point transactions
    for tx in transactions:
        await db.delete(tx)

    # Reset assignment status
    assignment.status = AssignmentStatus.pending
    assignment.completed_at = None
    assignment.verified_at = None
    assignment.verified_by = None
    assignment.updated_at = now

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(ChoreAssignment)
        .where(ChoreAssignment.id == assignment.id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
    )
    assignment = result.scalar_one()

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "chore"}}, exclude_user=user.id)

    return AssignmentResponse.model_validate(assignment)


# ---------- POST /{id}/skip ----------
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

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "chore"}}, exclude_user=user.id)

    # Reload with relationships
    result = await db.execute(
        select(ChoreAssignment)
        .where(ChoreAssignment.id == assignment.id)
        .options(
            selectinload(ChoreAssignment.chore).selectinload(Chore.category),
            selectinload(ChoreAssignment.user),
        )
    )
    assignment = result.scalar_one()
    return AssignmentResponse.model_validate(assignment)
