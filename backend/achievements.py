from datetime import datetime, date, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import (
    Achievement, UserAchievement, User, ChoreAssignment, AssignmentStatus,
    PointTransaction, PointType, RewardRedemption, Notification, NotificationType,
)
from backend.websocket_manager import ws_manager


async def check_achievements(db: AsyncSession, user: User, *, family_id: int | None = None):
    result = await db.execute(select(Achievement))
    all_achievements = result.scalars().all()

    result = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user.id)
    )
    unlocked_ids = set(result.scalars().all())

    for achievement in all_achievements:
        if achievement.id in unlocked_ids:
            continue
        if await _check_criteria(db, user, achievement.criteria, family_id=family_id):
            await _unlock_achievement(db, user, achievement, family_id=family_id)


async def _check_criteria(db: AsyncSession, user: User, criteria: dict, *, family_id: int | None = None) -> bool:
    ctype = criteria.get("type")

    if ctype == "total_completions":
        result = await db.execute(
            select(func.count()).select_from(ChoreAssignment).where(
                ChoreAssignment.user_id == user.id,
                ChoreAssignment.status.in_([AssignmentStatus.completed, AssignmentStatus.verified]),
            )
        )
        count = result.scalar()
        return count >= criteria["count"]

    elif ctype == "consecutive_days_all_complete":
        return user.current_streak >= criteria["days"]

    elif ctype == "total_points_earned":
        return user.total_points_earned >= criteria["amount"]

    elif ctype == "completion_before_time":
        hour = criteria["hour"]
        result = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.user_id == user.id,
                ChoreAssignment.status.in_([AssignmentStatus.completed, AssignmentStatus.verified]),
                ChoreAssignment.completed_at.isnot(None),
            )
        )
        for assignment in result.scalars().all():
            if assignment.completed_at and assignment.completed_at.hour < hour:
                return True
        return False

    elif ctype == "streak_reached":
        return user.current_streak >= criteria["days"]

    elif ctype == "total_redemptions":
        result = await db.execute(
            select(func.count()).select_from(RewardRedemption).where(
                RewardRedemption.user_id == user.id,
                RewardRedemption.status == "approved",
            )
        )
        count = result.scalar()
        return count >= criteria["count"]

    elif ctype == "all_daily_before_time":
        hour = criteria["hour"]
        today = date.today()
        result = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.user_id == user.id,
                ChoreAssignment.date == today,
                ChoreAssignment.status != AssignmentStatus.skipped,
            )
        )
        assignments = result.scalars().all()
        if not assignments:
            return False
        for a in assignments:
            if a.status == AssignmentStatus.pending:
                return False
            if a.completed_at and a.completed_at.hour >= hour:
                return False
        return True

    elif ctype == "all_daily_completed":
        today = date.today()
        result = await db.execute(
            select(ChoreAssignment).where(
                ChoreAssignment.user_id == user.id,
                ChoreAssignment.date == today,
                ChoreAssignment.status != AssignmentStatus.skipped,
            )
        )
        assignments = result.scalars().all()
        if not assignments:
            return False
        return all(
            a.status in (AssignmentStatus.completed, AssignmentStatus.verified)
            for a in assignments
        )

    elif ctype == "unassigned_chore_completed":
        # This would require tracking if chore was self-claimed
        return False

    return False


async def _unlock_achievement(db: AsyncSession, user: User, achievement: Achievement, *, family_id: int | None = None):
    ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
    db.add(ua)

    # Award bonus XP
    if achievement.points_reward > 0:
        user.points_balance += achievement.points_reward
        user.total_points_earned += achievement.points_reward
        tx = PointTransaction(
            family_id=family_id,
            user_id=user.id,
            amount=achievement.points_reward,
            type=PointType.achievement,
            description=f"Achievement unlocked: {achievement.title}",
            reference_id=achievement.id,
        )
        db.add(tx)

    # Create notification
    notif = Notification(
        family_id=family_id,
        user_id=user.id,
        type=NotificationType.achievement_unlocked,
        title="Achievement Unlocked!",
        message=f"You earned '{achievement.title}' — +{achievement.points_reward} XP!",
        reference_type="achievement",
        reference_id=achievement.id,
    )
    db.add(notif)
    await db.commit()

    await ws_manager.send_to_user(user.id, {
        "type": "achievement_unlocked",
        "data": {"achievement_key": achievement.key, "title": achievement.title, "points": achievement.points_reward},
    })
