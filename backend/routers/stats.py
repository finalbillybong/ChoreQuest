from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import (
    User,
    UserRole,
    Chore,
    ChoreAssignment,
    AssignmentStatus,
    PointTransaction,
    Achievement,
    UserAchievement,
)
from backend.schemas import UserResponse, AchievementResponse, AchievementUpdate
from backend.dependencies import get_current_user, require_parent

router = APIRouter(prefix="/api/stats", tags=["stats"])


# ---------------------------------------------------------------------------
# Static routes FIRST
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current user stats."""
    # Achievements count
    result = await db.execute(
        select(func.count())
        .select_from(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
    )
    achievements_count = result.scalar() or 0

    # Completion rate over last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == current_user.id,
            ChoreAssignment.date >= thirty_days_ago,
        )
    )
    total_30d = result.scalar() or 0

    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == current_user.id,
            ChoreAssignment.date >= thirty_days_ago,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    completed_30d = result.scalar() or 0

    completion_rate = (completed_30d / total_30d * 100) if total_30d > 0 else 0.0

    return {
        "points_balance": current_user.points_balance,
        "total_points_earned": current_user.total_points_earned,
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
        "achievements_count": achievements_count,
        "completion_rate": round(completion_rate, 1),
    }


@router.get("/kids")
async def list_kids(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a lightweight list of all active kids. Any authenticated user can call this."""
    result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = result.scalars().all()
    return [
        {"id": k.id, "display_name": k.display_name or k.username}
        for k in kids
    ]


@router.get("/family")
async def get_family_stats(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Overview of all kids. Parent+ only."""
    result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = result.scalars().all()

    today = date.today()
    family = []
    for kid in kids:
        # Today's assignment counts — only for active chores
        result = await db.execute(
            select(func.count())
            .select_from(ChoreAssignment)
            .join(Chore, ChoreAssignment.chore_id == Chore.id)
            .where(
                ChoreAssignment.user_id == kid.id,
                ChoreAssignment.date == today,
                Chore.is_active == True,
            )
        )
        today_total = result.scalar() or 0

        result = await db.execute(
            select(func.count())
            .select_from(ChoreAssignment)
            .join(Chore, ChoreAssignment.chore_id == Chore.id)
            .where(
                ChoreAssignment.user_id == kid.id,
                ChoreAssignment.date == today,
                Chore.is_active == True,
                ChoreAssignment.status.in_(
                    [AssignmentStatus.completed, AssignmentStatus.verified]
                ),
            )
        )
        today_completed = result.scalar() or 0

        family.append(
            {
                "id": kid.id,
                "display_name": kid.display_name,
                "avatar_config": kid.avatar_config,
                "points_balance": kid.points_balance,
                "current_streak": kid.current_streak,
                "today_completed": today_completed,
                "today_total": today_total,
            }
        )

    return family


@router.get("/leaderboard")
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Weekly leaderboard. Sum positive PointTransactions for the current week."""
    today = date.today()
    # Monday = 0 in Python's weekday()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    # Get all kid users
    result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = result.scalars().all()
    kid_map = {kid.id: kid for kid in kids}

    if not kid_map:
        return []

    # Sum positive transactions for the current week, grouped by user
    result = await db.execute(
        select(
            PointTransaction.user_id,
            func.sum(PointTransaction.amount).label("weekly_xp"),
        )
        .where(
            PointTransaction.user_id.in_(list(kid_map.keys())),
            PointTransaction.amount > 0,
            func.date(PointTransaction.created_at) >= monday,
            func.date(PointTransaction.created_at) <= sunday,
        )
        .group_by(PointTransaction.user_id)
        .order_by(func.sum(PointTransaction.amount).desc())
    )
    rows = result.all()

    # Count completed/verified quests this week per kid
    quest_result = await db.execute(
        select(
            ChoreAssignment.user_id,
            func.count().label("quests_done"),
        )
        .where(
            ChoreAssignment.user_id.in_(list(kid_map.keys())),
            ChoreAssignment.date >= monday,
            ChoreAssignment.date <= sunday,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
        .group_by(ChoreAssignment.user_id)
    )
    quests_map = {row.user_id: row.quests_done for row in quest_result.all()}

    # Build a set of kids who had transactions
    seen_ids = set()
    leaderboard = []
    rank = 1
    for row in rows:
        kid = kid_map.get(row.user_id)
        if kid:
            leaderboard.append(
                {
                    "rank": rank,
                    "id": kid.id,
                    "display_name": kid.display_name,
                    "avatar_config": kid.avatar_config,
                    "weekly_xp": row.weekly_xp or 0,
                    "total_xp": kid.total_points_earned or 0,
                    "quests_completed": quests_map.get(kid.id, 0),
                    "current_streak": kid.current_streak or 0,
                }
            )
            seen_ids.add(kid.id)
            rank += 1

    # Include kids with zero XP this week
    for kid_id, kid in kid_map.items():
        if kid_id not in seen_ids:
            leaderboard.append(
                {
                    "rank": rank,
                    "id": kid.id,
                    "display_name": kid.display_name,
                    "avatar_config": kid.avatar_config,
                    "weekly_xp": 0,
                    "total_xp": kid.total_points_earned or 0,
                    "quests_completed": quests_map.get(kid_id, 0),
                    "current_streak": kid.current_streak or 0,
                }
            )
            rank += 1

    return leaderboard


@router.get("/achievements/all")
async def get_all_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all achievements with unlock status for the current user."""
    result = await db.execute(select(Achievement).order_by(Achievement.sort_order))
    achievements = result.scalars().all()

    # Get user's unlocked achievements
    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id)
    )
    user_achievements = result.scalars().all()
    unlocked_map = {ua.achievement_id: ua.unlocked_at for ua in user_achievements}

    items = []
    for a in achievements:
        items.append(
            AchievementResponse(
                id=a.id,
                key=a.key,
                title=a.title,
                description=a.description,
                icon=a.icon,
                points_reward=a.points_reward,
                criteria=a.criteria,
                sort_order=a.sort_order,
                unlocked=a.id in unlocked_map,
                unlocked_at=unlocked_map.get(a.id),
            )
        )

    return items


# ---------------------------------------------------------------------------
# Parameterised routes AFTER static ones
# ---------------------------------------------------------------------------


@router.get("/{user_id}")
async def get_user_stats(
    user_id: int,
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Detailed stats for a specific user. Parent+ only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Achievements count
    result = await db.execute(
        select(func.count())
        .select_from(UserAchievement)
        .where(UserAchievement.user_id == user.id)
    )
    achievements_count = result.scalar() or 0

    # Completion rate over last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user.id,
            ChoreAssignment.date >= thirty_days_ago,
        )
    )
    total_30d = result.scalar() or 0

    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user.id,
            ChoreAssignment.date >= thirty_days_ago,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    completed_30d = result.scalar() or 0

    completion_rate = (completed_30d / total_30d * 100) if total_30d > 0 else 0.0

    # 7-day breakdown
    seven_days_ago = date.today() - timedelta(days=7)
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user.id,
            ChoreAssignment.date >= seven_days_ago,
        )
    )
    total_7d = result.scalar() or 0

    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user.id,
            ChoreAssignment.date >= seven_days_ago,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    completed_7d = result.scalar() or 0

    return {
        "user": UserResponse.model_validate(user),
        "achievements_count": achievements_count,
        "completion_rate_30d": round(completion_rate, 1),
        "last_7_days": {
            "completed": completed_7d,
            "total": total_7d,
        },
        "last_30_days": {
            "completed": completed_30d,
            "total": total_30d,
        },
    }


@router.get("/history/{user_id}")
async def get_completion_history(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Completion history. Kids can only view their own."""
    # Permission check: kids can only view their own history
    if current_user.role == UserRole.kid and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Kids can only view their own history")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    # 7-day counts
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date >= seven_days_ago,
        )
    )
    total_7d = result.scalar() or 0

    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date >= seven_days_ago,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    completed_7d = result.scalar() or 0

    # 30-day counts
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date >= thirty_days_ago,
        )
    )
    total_30d = result.scalar() or 0

    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date >= thirty_days_ago,
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            ),
        )
    )
    completed_30d = result.scalar() or 0

    return {
        "user_id": user_id,
        "last_7_days": {
            "completed": completed_7d,
            "total": total_7d,
        },
        "last_30_days": {
            "completed": completed_30d,
            "total": total_30d,
        },
    }


@router.put("/achievements/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    data: AchievementUpdate,
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Update achievement points_reward value. Parent+ only."""
    result = await db.execute(
        select(Achievement).where(Achievement.id == achievement_id)
    )
    achievement = result.scalar_one_or_none()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    achievement.points_reward = data.points_reward
    await db.commit()
    await db.refresh(achievement)

    return AchievementResponse(
        id=achievement.id,
        key=achievement.key,
        title=achievement.title,
        description=achievement.description,
        icon=achievement.icon,
        points_reward=achievement.points_reward,
        criteria=achievement.criteria,
        sort_order=achievement.sort_order,
        unlocked=False,
        unlocked_at=None,
    )
