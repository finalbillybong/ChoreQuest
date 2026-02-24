"""Progress charts data endpoint — XP over time, completions, streaks."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    User, UserRole, ChoreAssignment, AssignmentStatus,
    PointTransaction,
)
from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("")
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return 30-day daily chart data for the current user (or all kids for parents)."""
    today = date.today()
    start = today - timedelta(days=29)

    if current_user.role == UserRole.kid:
        user_ids = [current_user.id]
    else:
        # Parents see aggregated data for all kids
        result = await db.execute(
            select(User.id).where(User.role == UserRole.kid, User.is_active == True)
        )
        user_ids = [row[0] for row in result.all()]

    if not user_ids:
        return {"days": [], "summary": {}}

    # Daily XP earned
    xp_result = await db.execute(
        select(
            func.date(PointTransaction.created_at).label("day"),
            func.sum(PointTransaction.amount).label("xp"),
        )
        .where(
            PointTransaction.user_id.in_(user_ids),
            PointTransaction.amount > 0,
            func.date(PointTransaction.created_at) >= start,
            func.date(PointTransaction.created_at) <= today,
        )
        .group_by(func.date(PointTransaction.created_at))
    )
    xp_by_day = {str(row.day): row.xp or 0 for row in xp_result.all()}

    # Daily completed quests
    completed_result = await db.execute(
        select(
            ChoreAssignment.date,
            func.count().label("completed"),
        )
        .where(
            ChoreAssignment.user_id.in_(user_ids),
            ChoreAssignment.date >= start,
            ChoreAssignment.date <= today,
            ChoreAssignment.status.in_([
                AssignmentStatus.completed, AssignmentStatus.verified,
            ]),
        )
        .group_by(ChoreAssignment.date)
    )
    completed_by_day = {str(row.date): row.completed for row in completed_result.all()}

    # Daily total quests assigned
    total_result = await db.execute(
        select(
            ChoreAssignment.date,
            func.count().label("total"),
        )
        .where(
            ChoreAssignment.user_id.in_(user_ids),
            ChoreAssignment.date >= start,
            ChoreAssignment.date <= today,
        )
        .group_by(ChoreAssignment.date)
    )
    total_by_day = {str(row.date): row.total for row in total_result.all()}

    # Build daily array
    days = []
    for i in range(30):
        d = start + timedelta(days=i)
        ds = str(d)
        total = total_by_day.get(ds, 0)
        completed = completed_by_day.get(ds, 0)
        days.append({
            "date": ds,
            "xp": xp_by_day.get(ds, 0),
            "completed": completed,
            "total": total,
            "rate": round(completed / total, 2) if total > 0 else 0,
        })

    # Summary stats
    total_xp = sum(d["xp"] for d in days)
    total_completed = sum(d["completed"] for d in days)
    total_assigned = sum(d["total"] for d in days)

    return {
        "days": days,
        "summary": {
            "total_xp": total_xp,
            "total_completed": total_completed,
            "total_assigned": total_assigned,
            "avg_daily_xp": round(total_xp / 30, 1),
            "completion_rate": round(total_completed / total_assigned, 2) if total_assigned > 0 else 0,
        },
    }
