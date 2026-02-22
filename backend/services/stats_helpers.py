"""Shared query helpers for computing assignment completion statistics."""

from datetime import date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import ChoreAssignment, AssignmentStatus


async def count_assignments(
    db: AsyncSession,
    user_id: int,
    since: date,
    *,
    family_id: int | None = None,
    completed_only: bool = False,
) -> int:
    """Count chore assignments for a user since a given date.

    Args:
        db: Database session.
        user_id: The user whose assignments to count.
        since: Count assignments on or after this date.
        family_id: If provided, only count assignments for this family.
        completed_only: If True, only count completed/verified assignments.
    """
    stmt = (
        select(func.count())
        .select_from(ChoreAssignment)
        .where(
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date >= since,
        )
    )
    if family_id is not None:
        stmt = stmt.where(ChoreAssignment.family_id == family_id)
    if completed_only:
        stmt = stmt.where(
            ChoreAssignment.status.in_(
                [AssignmentStatus.completed, AssignmentStatus.verified]
            )
        )
    result = await db.execute(stmt)
    return result.scalar() or 0


async def completion_rate(
    db: AsyncSession,
    user_id: int,
    since: date,
    *,
    family_id: int | None = None,
) -> tuple[int, int, float]:
    """Compute assignment completion stats for a user since a given date.

    Returns:
        (total, completed, rate_percentage)
    """
    total = await count_assignments(db, user_id, since, family_id=family_id)
    completed = await count_assignments(db, user_id, since, family_id=family_id, completed_only=True)
    rate = (completed / total * 100) if total > 0 else 0.0
    return total, completed, round(rate, 1)
