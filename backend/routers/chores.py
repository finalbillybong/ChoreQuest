from datetime import datetime, date, timezone

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreCategory,
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
    CategoryCreate,
    CategoryResponse,
)
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
    return None


# ========== Chores ==========

# ---------- GET / ----------
@router.get("", response_model=list[ChoreResponse])
async def list_chores(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role in (UserRole.parent, UserRole.admin):
        # Parents see all active chores
        result = await db.execute(
            select(Chore)
            .where(Chore.is_active == True)
            .options(selectinload(Chore.category))
        )
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
    return [ChoreResponse.model_validate(c) for c in chores]


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

    await db.commit()
    await db.refresh(chore)

    # Eagerly load category for the response
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore.id)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one()
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

    await db.commit()
    await db.refresh(chore)

    # Reload with category
    result = await db.execute(
        select(Chore)
        .where(Chore.id == chore.id)
        .options(selectinload(Chore.category))
    )
    chore = result.scalar_one()
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

    # Save photo proof if provided
    if file and file.size and file.size > 0:
        upload_dir = "/app/data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        contents = await file.read()
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
