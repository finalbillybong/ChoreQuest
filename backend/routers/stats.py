from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
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
    PointType,
    Achievement,
    UserAchievement,
    Notification,
    NotificationType,
)
from backend.schemas import UserResponse, AchievementResponse, AchievementUpdate
from backend.dependencies import get_current_user, require_parent
from backend.services.assignment_generator import auto_generate_week_assignments
from backend.services.stats_helpers import completion_rate
from backend.services.ranks import get_rank
from backend.services.pet_leveling import get_pet_level

router = APIRouter(prefix="/api/stats", tags=["stats"])


# ---------------------------------------------------------------------------
# Static routes FIRST (before parameterised /{user_id})
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current user stats."""
    achievements_count = await _count_achievements(db, current_user.id)
    thirty_days_ago = date.today() - timedelta(days=30)
    total_30d, completed_30d, rate_30d = await completion_rate(
        db, current_user.id, thirty_days_ago,
    )

    rank = get_rank(current_user.total_points_earned or 0)
    config = current_user.avatar_config or {}
    has_pet = config.get("pet") not in (None, "none")
    if has_pet:
        from backend.services.pet_leveling import get_current_pet_xp
        pet_xp = get_current_pet_xp(config)
        pet_info = get_pet_level(pet_xp)
    else:
        pet_info = None

    return {
        "points_balance": current_user.points_balance,
        "total_points_earned": current_user.total_points_earned,
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
        "achievements_count": achievements_count,
        "completion_rate": rate_30d,
        "rank": rank,
        "pet": pet_info,
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


@router.get("/party")
async def get_party(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Family roster visible to all users — kids and parents alike."""
    today = date.today()

    # All active users (parents + kids)
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.role, User.display_name)
    )
    all_users = result.scalars().all()

    kids = [u for u in all_users if u.role == UserRole.kid]
    kid_ids = [k.id for k in kids]

    # Today's assignment counts per kid
    today_totals = await _count_today_assignments_by_kid(db, kid_ids, today) if kid_ids else {}
    today_completed = await _count_today_assignments_by_kid(db, kid_ids, today, completed_only=True) if kid_ids else {}

    # Recent activity: last 48 hours of point transactions + avatar drops
    two_days_ago = today - timedelta(days=2)
    activity_result = await db.execute(
        select(PointTransaction)
        .where(
            PointTransaction.created_at >= str(two_days_ago),
            PointTransaction.amount > 0,
            PointTransaction.type.in_([PointType.chore_complete, PointType.achievement, PointType.event_multiplier]),
        )
        .order_by(PointTransaction.created_at.desc())
        .limit(20)
    )
    recent_txns = activity_result.scalars().all()

    # Avatar drop notifications (last 48h)
    drop_result = await db.execute(
        select(Notification)
        .where(
            Notification.type == NotificationType.avatar_item_drop,
            Notification.created_at >= str(two_days_ago),
        )
        .order_by(Notification.created_at.desc())
        .limit(10)
    )
    recent_drops = drop_result.scalars().all()

    # Build activity feed
    activity = []
    # Map user IDs to names
    name_map = {u.id: u.display_name or u.username for u in all_users}

    for txn in recent_txns:
        activity.append({
            "type": "xp",
            "user_id": txn.user_id,
            "user_name": name_map.get(txn.user_id, "Unknown"),
            "description": txn.description,
            "xp": txn.amount,
            "timestamp": txn.created_at.isoformat() if txn.created_at else None,
        })

    for drop in recent_drops:
        activity.append({
            "type": "avatar_drop",
            "user_id": drop.user_id,
            "user_name": name_map.get(drop.user_id, "Unknown"),
            "description": drop.message,
            "timestamp": drop.created_at.isoformat() if drop.created_at else None,
        })

    activity.sort(key=lambda a: a.get("timestamp") or "", reverse=True)
    activity = activity[:20]

    # Family streak: consecutive days where ALL kids completed at least 1 quest
    family_streak = 0
    if kid_ids:
        for days_back in range(60):
            check_date = today - timedelta(days=days_back)
            all_completed = True
            for kid_id in kid_ids:
                count_result = await db.execute(
                    select(func.count()).select_from(ChoreAssignment).where(
                        ChoreAssignment.user_id == kid_id,
                        ChoreAssignment.date == check_date,
                        ChoreAssignment.status.in_([AssignmentStatus.completed, AssignmentStatus.verified]),
                    )
                )
                if count_result.scalar() == 0:
                    all_completed = False
                    break
            if all_completed:
                family_streak += 1
            else:
                break

    # Combined family XP
    family_total_xp = sum(u.total_points_earned for u in kids)

    # Build members list
    members = []
    for u in all_users:
        rank = get_rank(u.total_points_earned or 0)
        u_config = u.avatar_config or {}
        has_pet = u_config.get("pet") not in (None, "none")
        if has_pet:
            from backend.services.pet_leveling import get_current_pet_xp
            pet_xp = get_current_pet_xp(u_config)
            pet = get_pet_level(pet_xp)
        else:
            pet = None
        member = {
            "id": u.id,
            "display_name": u.display_name or u.username,
            "role": u.role.value,
            "avatar_config": u.avatar_config,
            "current_streak": u.current_streak,
            "total_points_earned": u.total_points_earned,
            "rank": rank,
            "pet": pet,
        }
        if u.role == UserRole.kid:
            member["points_balance"] = u.points_balance
            member["today_completed"] = today_completed.get(u.id, 0)
            member["today_total"] = today_totals.get(u.id, 0)
        members.append(member)

    return {
        "members": members,
        "activity": activity,
        "family_streak": family_streak,
        "family_total_xp": family_total_xp,
    }


@router.get("/family/{kid_id}")
async def get_kid_detail(
    kid_id: int,
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Detailed view of a single kid's quests for today. Parent+ only."""
    result = await db.execute(
        select(User).where(User.id == kid_id, User.role == UserRole.kid, User.is_active == True)
    )
    kid = result.scalar_one_or_none()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found")

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    await auto_generate_week_assignments(db, monday)

    result = await db.execute(
        select(ChoreAssignment)
        .join(Chore, ChoreAssignment.chore_id == Chore.id)
        .where(
            ChoreAssignment.user_id == kid_id,
            ChoreAssignment.date == today,
            Chore.is_active == True,
        )
        .options(
            _chore_with_category_loader(),
        )
        .order_by(ChoreAssignment.status, Chore.title)
    )
    assignments = result.scalars().all()

    return {
        "kid": {
            "id": kid.id,
            "display_name": kid.display_name,
            "avatar_config": kid.avatar_config,
            "points_balance": kid.points_balance,
            "current_streak": kid.current_streak,
        },
        "assignments": [_build_kid_assignment(a) for a in assignments],
    }


@router.get("/family")
async def get_family_stats(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Overview of all kids. Parent+ only."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    await auto_generate_week_assignments(db, monday)

    result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = result.scalars().all()

    if not kids:
        return []

    kid_ids = [k.id for k in kids]

    # Batch-load today's assignment counts per kid (total and completed)
    today_totals = await _count_today_assignments_by_kid(db, kid_ids, today)
    today_completed = await _count_today_assignments_by_kid(
        db, kid_ids, today, completed_only=True,
    )

    return [
        {
            "id": kid.id,
            "display_name": kid.display_name,
            "avatar_config": kid.avatar_config,
            "points_balance": kid.points_balance,
            "current_streak": kid.current_streak,
            "today_completed": today_completed.get(kid.id, 0),
            "today_total": today_totals.get(kid.id, 0),
        }
        for kid in kids
    ]


@router.get("/leaderboard")
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Weekly leaderboard. Sum positive PointTransactions for the current week."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    result = await db.execute(
        select(User).where(User.role == UserRole.kid, User.is_active == True)
    )
    kids = result.scalars().all()
    kid_map = {kid.id: kid for kid in kids}

    if not kid_map:
        return []

    # Weekly XP per kid
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
    xp_rows = result.all()

    # Weekly quests per kid
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

    # Build ranked leaderboard: kids with XP first, then the rest
    leaderboard = []
    seen_ids: set[int] = set()
    rank = 1

    for row in xp_rows:
        kid = kid_map.get(row.user_id)
        if kid:
            leaderboard.append(_build_leaderboard_entry(kid, rank, row.weekly_xp or 0, quests_map))
            seen_ids.add(kid.id)
            rank += 1

    for kid_id, kid in kid_map.items():
        if kid_id not in seen_ids:
            leaderboard.append(_build_leaderboard_entry(kid, rank, 0, quests_map))
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

    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id)
    )
    unlocked_map = {
        ua.achievement_id: ua.unlocked_at
        for ua in result.scalars().all()
    }

    return [
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
        for a in achievements
    ]


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

    achievements_count = await _count_achievements(db, user.id)

    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    total_7d, completed_7d, _ = await completion_rate(db, user.id, seven_days_ago)
    total_30d, completed_30d, rate_30d = await completion_rate(db, user.id, thirty_days_ago)

    return {
        "user": UserResponse.model_validate(user),
        "achievements_count": achievements_count,
        "completion_rate_30d": rate_30d,
        "last_7_days": {"completed": completed_7d, "total": total_7d},
        "last_30_days": {"completed": completed_30d, "total": total_30d},
    }


@router.get("/history/{user_id}")
async def get_completion_history(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Completion history. Kids can only view their own."""
    if current_user.role == UserRole.kid and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Kids can only view their own history")

    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    total_7d, completed_7d, _ = await completion_rate(db, user_id, seven_days_ago)
    total_30d, completed_30d, _ = await completion_rate(db, user_id, thirty_days_ago)

    return {
        "user_id": user_id,
        "last_7_days": {"completed": completed_7d, "total": total_7d},
        "last_30_days": {"completed": completed_30d, "total": total_30d},
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


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _chore_with_category_loader():
    """Standard eager-load strategy for assignments that need chore + category."""
    return selectinload(ChoreAssignment.chore).selectinload(Chore.category)


async def _count_achievements(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(UserAchievement)
        .where(UserAchievement.user_id == user_id)
    )
    return result.scalar() or 0


async def _count_today_assignments_by_kid(
    db: AsyncSession,
    kid_ids: list[int],
    today: date,
    *,
    completed_only: bool = False,
) -> dict[int, int]:
    """Batch-count today's assignments per kid, optionally filtered to completed."""
    stmt = (
        select(
            ChoreAssignment.user_id,
            func.count().label("cnt"),
        )
        .join(Chore, ChoreAssignment.chore_id == Chore.id)
        .where(
            ChoreAssignment.user_id.in_(kid_ids),
            ChoreAssignment.date == today,
            Chore.is_active == True,
        )
        .group_by(ChoreAssignment.user_id)
    )
    if completed_only:
        stmt = stmt.where(
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            )
        )
    result = await db.execute(stmt)
    return {row.user_id: row.cnt for row in result.all()}


def _build_leaderboard_entry(
    kid: User, rank: int, weekly_xp: int, quests_map: dict[int, int]
) -> dict:
    return {
        "rank": rank,
        "id": kid.id,
        "display_name": kid.display_name,
        "avatar_config": kid.avatar_config,
        "weekly_xp": weekly_xp,
        "total_xp": kid.total_points_earned or 0,
        "quests_completed": quests_map.get(kid.id, 0),
        "current_streak": kid.current_streak or 0,
    }


def _build_kid_assignment(a: ChoreAssignment) -> dict:
    return {
        "id": a.id,
        "chore_id": a.chore_id,
        "status": a.status.value,
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "verified_at": a.verified_at.isoformat() if a.verified_at else None,
        "photo_proof_path": a.photo_proof_path,
        "chore": {
            "id": a.chore.id,
            "title": a.chore.title,
            "description": a.chore.description,
            "points": a.chore.points,
            "difficulty": a.chore.difficulty.value if a.chore.difficulty else None,
            "category": a.chore.category.name if a.chore.category else None,
            "requires_photo": a.chore.requires_photo,
            "recurrence": a.chore.recurrence.value if a.chore.recurrence else None,
        } if a.chore else None,
    }
