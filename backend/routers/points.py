from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    User,
    UserRole,
    PointTransaction,
    PointType,
    AuditLog,
    Notification,
    NotificationType,
)
from backend.services.pet_leveling import award_pet_xp_db
from backend.schemas import (
    BonusRequest,
    AdjustRequest,
    PointTransactionResponse,
    UserResponse,
)
from backend.dependencies import get_current_user, require_parent, require_admin
from backend.achievements import check_achievements
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/points", tags=["points"])


@router.get("/{user_id}", response_model=dict)
async def get_user_points(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user's point balance and transaction history.

    Kids can only view their own balance.
    """
    if current_user.role == UserRole.kid and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Kids can only view their own points")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    stmt = (
        select(PointTransaction)
        .where(PointTransaction.user_id == user_id)
        .order_by(PointTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    tx_result = await db.execute(stmt)
    transactions = tx_result.scalars().all()

    return {
        "user": UserResponse.model_validate(user),
        "balance": user.points_balance,
        "total_earned": user.total_points_earned,
        "transactions": [
            PointTransactionResponse.model_validate(tx) for tx in transactions
        ],
    }


@router.post("/{user_id}/bonus", response_model=PointTransactionResponse)
async def award_bonus(
    user_id: int,
    body: BonusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_parent),
):
    """Award bonus XP to a user (Parent+)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Update the user's balance
    user.points_balance += body.amount
    user.total_points_earned += body.amount

    # Create the point transaction
    tx = PointTransaction(
        user_id=user.id,
        amount=body.amount,
        type=PointType.bonus,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(tx)

    # Notify the kid
    notif = Notification(
        user_id=user.id,
        type=NotificationType.bonus_points,
        title="Bonus Points!",
        message=f"You received {body.amount} bonus XP: {body.description}",
        reference_type="point_transaction",
    )
    db.add(notif)

    # Award pet XP alongside user XP
    pet_levelup = await award_pet_xp_db(db, user, body.amount)
    if pet_levelup:
        db.add(Notification(
            user_id=user.id,
            type=NotificationType.pet_levelup,
            title="Pet Levelled Up!",
            message=f"Your {pet_levelup['pet']} reached level {pet_levelup['new_level']} ({pet_levelup['name']})!",
            reference_type="pet",
        ))

    await db.commit()
    await db.refresh(tx)

    # Check achievements after bonus
    await check_achievements(db, user)

    # WebSocket notification
    await ws_manager.send_to_user(user.id, {
        "type": "bonus_points",
        "data": {
            "amount": body.amount,
            "description": body.description,
            "new_balance": user.points_balance,
        },
    })

    return tx


@router.post("/adjust/{user_id}", response_model=PointTransactionResponse)
async def adjust_points(
    user_id: int,
    body: AdjustRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin point adjustment (can be negative).

    Creates both a PointTransaction and an AuditLog entry for accountability.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent balance from going negative
    if user.points_balance + body.amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Adjustment would result in a negative balance",
        )

    # Update the user's balance
    user.points_balance += body.amount
    if body.amount > 0:
        user.total_points_earned += body.amount

    # Create the point transaction
    tx = PointTransaction(
        user_id=user.id,
        amount=body.amount,
        type=PointType.adjustment,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(tx)

    # Award pet XP for positive adjustments
    if body.amount > 0:
        await award_pet_xp_db(db, user, body.amount)

    # Create audit log entry
    client_ip = request.client.host if request.client else None
    audit = AuditLog(
        user_id=current_user.id,
        action="point_adjustment",
        details={
            "target_user_id": user.id,
            "amount": body.amount,
            "description": body.description,
            "new_balance": user.points_balance,
        },
        ip_address=client_ip,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(tx)

    await ws_manager.send_to_user(user.id, {
        "type": "data_changed",
        "data": {"entity": "points", "new_balance": user.points_balance},
    })

    return tx
