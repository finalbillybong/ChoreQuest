from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    Reward,
    RewardRedemption,
    RedemptionStatus,
    User,
    UserRole,
    PointTransaction,
    PointType,
    Notification,
    NotificationType,
)
from backend.schemas import (
    RewardCreate,
    RewardUpdate,
    RewardResponse,
    RedemptionResponse,
)
from backend.dependencies import get_current_user, require_parent
from backend.achievements import check_achievements
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/rewards", tags=["rewards"])


# ── Redemption endpoints (defined BEFORE /{id} so FastAPI doesn't treat
#    "redemptions" as an {id} path parameter) ─────────────────────────────


@router.get("/redemptions", response_model=list[RedemptionResponse])
async def list_redemptions(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List redemptions.  Parents see all; kids see only their own."""
    stmt = select(RewardRedemption).options(
        selectinload(RewardRedemption.reward),
        selectinload(RewardRedemption.user),
    )

    if current_user.role == UserRole.kid:
        stmt = stmt.where(RewardRedemption.user_id == current_user.id)

    if status is not None:
        try:
            status_enum = RedemptionStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        stmt = stmt.where(RewardRedemption.status == status_enum)

    stmt = stmt.order_by(RewardRedemption.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/redemptions/{redemption_id}/approve", response_model=RedemptionResponse)
async def approve_redemption(
    redemption_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Approve a pending redemption (Parent+)."""
    result = await db.execute(
        select(RewardRedemption)
        .options(
            selectinload(RewardRedemption.reward),
            selectinload(RewardRedemption.user),
        )
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if redemption is None:
        raise HTTPException(status_code=404, detail="Redemption not found")
    if redemption.status != RedemptionStatus.pending:
        raise HTTPException(status_code=400, detail="Redemption is not pending")

    redemption.status = RedemptionStatus.approved
    redemption.approved_by = current_user.id
    redemption.approved_at = datetime.now(timezone.utc)

    # Notify the kid
    notif = Notification(
        user_id=redemption.user_id,
        type=NotificationType.reward_approved,
        title="Reward Approved!",
        message=f"Your redemption of '{redemption.reward.title}' has been approved!",
        reference_type="redemption",
        reference_id=redemption.id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(redemption)

    await ws_manager.send_to_user(redemption.user_id, {
        "type": "reward_approved",
        "data": {
            "redemption_id": redemption.id,
            "reward_title": redemption.reward.title,
        },
    })

    # Broadcast so other clients (parent views, etc.) refresh
    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "redemption"}},
        exclude_user=redemption.user_id,
    )

    return redemption


@router.post("/redemptions/{redemption_id}/deny", response_model=RedemptionResponse)
async def deny_redemption(
    redemption_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Deny a pending redemption (Parent+).  Refunds the XP to the kid."""
    result = await db.execute(
        select(RewardRedemption)
        .options(
            selectinload(RewardRedemption.reward),
            selectinload(RewardRedemption.user),
        )
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if redemption is None:
        raise HTTPException(status_code=404, detail="Redemption not found")
    if redemption.status != RedemptionStatus.pending:
        raise HTTPException(status_code=400, detail="Redemption is not pending")

    # Refund points to the kid
    kid_result = await db.execute(select(User).where(User.id == redemption.user_id))
    kid = kid_result.scalar_one_or_none()
    if kid is None:
        raise HTTPException(status_code=404, detail="User not found")

    kid.points_balance += redemption.points_spent

    refund_tx = PointTransaction(
        user_id=kid.id,
        amount=redemption.points_spent,
        type=PointType.reward_redeem,
        description=f"Refund for denied redemption of '{redemption.reward.title}'",
        reference_id=redemption.id,
        created_by=current_user.id,
    )
    db.add(refund_tx)

    redemption.status = RedemptionStatus.denied
    redemption.approved_by = current_user.id
    redemption.approved_at = datetime.now(timezone.utc)

    # Notify the kid
    notif = Notification(
        user_id=kid.id,
        type=NotificationType.reward_denied,
        title="Reward Denied",
        message=(
            f"Your redemption of '{redemption.reward.title}' was denied. "
            f"{redemption.points_spent} XP has been refunded."
        ),
        reference_type="redemption",
        reference_id=redemption.id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(redemption)

    await ws_manager.send_to_user(kid.id, {
        "type": "reward_denied",
        "data": {
            "redemption_id": redemption.id,
            "reward_title": redemption.reward.title,
            "points_refunded": redemption.points_spent,
        },
    })

    return redemption


@router.post("/redemptions/{redemption_id}/fulfill", response_model=RedemptionResponse)
async def fulfill_redemption(
    redemption_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Mark an approved redemption as fulfilled / handed out (Parent+)."""
    result = await db.execute(
        select(RewardRedemption)
        .options(
            selectinload(RewardRedemption.reward),
            selectinload(RewardRedemption.user),
        )
        .where(RewardRedemption.id == redemption_id)
    )
    redemption = result.scalar_one_or_none()
    if redemption is None:
        raise HTTPException(status_code=404, detail="Redemption not found")
    if redemption.status != RedemptionStatus.approved:
        raise HTTPException(status_code=400, detail="Only approved redemptions can be fulfilled")

    redemption.status = RedemptionStatus.fulfilled
    redemption.fulfilled_by = current_user.id
    redemption.fulfilled_at = datetime.now(timezone.utc)

    # Notify the kid
    notif = Notification(
        user_id=redemption.user_id,
        type=NotificationType.reward_approved,
        title="Reward Delivered!",
        message=f"Your reward '{redemption.reward.title}' has been handed out!",
        reference_type="redemption",
        reference_id=redemption.id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(redemption)

    await ws_manager.send_to_user(redemption.user_id, {
        "type": "reward_fulfilled",
        "data": {
            "redemption_id": redemption.id,
            "reward_title": redemption.reward.title,
        },
    })

    # Broadcast data-changed so the parent's own inventory view refreshes
    # (the targeted notification above only goes to the kid)
    await ws_manager.broadcast(
        {"type": "data_changed", "data": {"entity": "redemption"}},
        exclude_user=redemption.user_id,
    )

    return redemption


# ── Reward CRUD endpoints ────────────────────────────────────────────────


@router.get("", response_model=list[RewardResponse])
async def list_rewards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active rewards (all users)."""
    result = await db.execute(
        select(Reward)
        .where(Reward.is_active == True)
        .order_by(Reward.point_cost.asc())
    )
    return result.scalars().all()


@router.post("", response_model=RewardResponse, status_code=201)
async def create_reward(
    body: RewardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Create a new reward (Parent+)."""
    reward = Reward(
        title=body.title,
        description=body.description,
        point_cost=body.point_cost,
        icon=body.icon,
        stock=body.stock,
        auto_approve_threshold=body.auto_approve_threshold,
        created_by=current_user.id,
    )
    db.add(reward)
    await db.commit()
    await db.refresh(reward)

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "reward"}}, exclude_user=current_user.id)

    return reward


@router.get("/{reward_id}", response_model=RewardResponse)
async def get_reward(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get reward details."""
    result = await db.execute(select(Reward).where(Reward.id == reward_id))
    reward = result.scalar_one_or_none()
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found")
    return reward


@router.put("/{reward_id}", response_model=RewardResponse)
async def update_reward(
    reward_id: int,
    body: RewardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Update an existing reward (Parent+)."""
    result = await db.execute(select(Reward).where(Reward.id == reward_id))
    reward = result.scalar_one_or_none()
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reward, field, value)

    reward.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(reward)

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "reward"}}, exclude_user=current_user.id)

    return reward


@router.delete("/{reward_id}", status_code=204)
async def delete_reward(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Soft-delete a reward (Parent+)."""
    result = await db.execute(select(Reward).where(Reward.id == reward_id))
    reward = result.scalar_one_or_none()
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found")

    reward.is_active = False
    reward.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "reward"}}, exclude_user=current_user.id)


@router.post("/{reward_id}/redeem", response_model=RedemptionResponse)
async def redeem_reward(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kid redeems a reward.

    * Validates sufficient balance and stock.
    * Deducts points and creates a negative PointTransaction.
    * Redemption is auto-approved — parents fulfil rewards from the
      Inventory page once they've been handed out in the real world.
    * Checks achievements and sends a WebSocket notification.
    """
    result = await db.execute(select(Reward).where(Reward.id == reward_id))
    reward = result.scalar_one_or_none()
    if reward is None:
        raise HTTPException(status_code=404, detail="Reward not found")
    if not reward.is_active:
        raise HTTPException(status_code=400, detail="Reward is no longer available")

    # Balance check
    if current_user.points_balance < reward.point_cost:
        raise HTTPException(
            status_code=400,
            detail="Insufficient points balance",
        )

    # Stock check
    if reward.stock is not None:
        if reward.stock <= 0:
            raise HTTPException(status_code=400, detail="Reward is out of stock")
        reward.stock -= 1

    # Deduct points
    current_user.points_balance -= reward.point_cost

    # Create negative point transaction
    tx = PointTransaction(
        user_id=current_user.id,
        amount=-reward.point_cost,
        type=PointType.reward_redeem,
        description=f"Redeemed reward: {reward.title}",
        reference_id=reward.id,
    )
    db.add(tx)

    # Always auto-approve — parents fulfil from Inventory when given out
    redemption = RewardRedemption(
        reward_id=reward.id,
        user_id=current_user.id,
        points_spent=reward.point_cost,
        status=RedemptionStatus.approved,
        approved_at=datetime.now(timezone.utc),
    )

    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)

    # Eagerly load relationships for the response
    result = await db.execute(
        select(RewardRedemption)
        .options(
            selectinload(RewardRedemption.reward),
            selectinload(RewardRedemption.user),
        )
        .where(RewardRedemption.id == redemption.id)
    )
    redemption = result.scalar_one()

    # Check achievements after redemption
    await check_achievements(db, current_user)

    # WebSocket notification
    await ws_manager.send_to_user(current_user.id, {
        "type": "reward_redeemed",
        "data": {
            "redemption_id": redemption.id,
            "reward_title": reward.title,
            "points_spent": reward.point_cost,
            "status": "approved",
        },
    })

    return redemption
