"""Centralised assignment generation logic.

Used by both the calendar auto-generation endpoint and the daily reset
background task to avoid duplicating the complex scheduling rules.
"""

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import (
    Chore,
    ChoreAssignment,
    ChoreAssignmentRule,
    ChoreExclusion,
    ChoreRotation,
    AssignmentStatus,
    Recurrence,
)
from backend.services.recurrence import should_create_on_day
from backend.services.rotation import (
    get_rotation_kid_for_day,
    should_advance_rotation,
    advance_rotation,
)

logger = logging.getLogger(__name__)


async def auto_generate_week_assignments(
    db: AsyncSession, week_start: date
) -> None:
    """Generate ChoreAssignment records for recurring chores across a week.

    Slots recorded in ``chore_exclusions`` are skipped so that
    intentionally removed assignments are not recreated.

    This function does NOT advance rotations -- it reads the current
    rotation state and projects forward (useful for calendar views).
    """
    week_end = week_start + timedelta(days=6)
    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    exclusion_set = await _load_exclusion_set(db, week_start, week_end)

    chores = await _load_active_chores(db)

    for chore in chores:
        rules = await _load_active_rules(db, chore.id)

        if rules:
            rotation = await _load_rotation(db, chore.id)
            await _generate_from_rules(
                db, chore, rules, rotation, week_dates, exclusion_set,
            )
        else:
            await _generate_legacy(db, chore, week_dates, exclusion_set)

    await db.commit()


async def generate_daily_assignments(db: AsyncSession, today: date) -> None:
    """Generate assignments for today with rotation advancement.

    Called by the daily reset background task. Unlike the week-based
    generator, this function advances rotations when their cadence
    period has elapsed.
    """
    now = datetime.now(timezone.utc)
    chores = await _load_active_chores(db)

    for chore in chores:
        rules = await _load_active_rules(db, chore.id)

        if rules:
            rotation = await _load_rotation(db, chore.id)

            if rotation and should_advance_rotation(rotation, now):
                advance_rotation(rotation, now)

            for rule in rules:
                if rule.recurrence == Recurrence.once:
                    continue

                # Rotation filtering: only generate for the current rotation kid
                if rotation and int(rule.user_id) != int(
                    rotation.kid_ids[rotation.current_index]
                ):
                    continue

                if not should_create_on_day(
                    rule.recurrence, today, chore.created_at.weekday(), rule.custom_days,
                    created_at_date=chore.created_at.date() if hasattr(chore.created_at, 'date') else chore.created_at,
                ):
                    continue

                await _create_if_missing(db, chore.id, rule.user_id, today)
        else:
            # Legacy: chore-level recurrence
            if chore.recurrence == Recurrence.once:
                continue

            if not should_create_on_day(
                chore.recurrence, today, chore.created_at.weekday(), chore.custom_days,
                created_at_date=chore.created_at.date() if hasattr(chore.created_at, 'date') else chore.created_at,
            ):
                continue

            rotation = await _load_rotation(db, chore.id)
            if rotation:
                if should_advance_rotation(rotation, now):
                    advance_rotation(rotation, now)
                user_ids = [rotation.kid_ids[rotation.current_index]]
            else:
                user_ids = await _get_legacy_user_ids(db, chore.id)

            for uid in user_ids:
                await _create_if_missing(db, chore.id, uid, today)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _load_active_chores(db: AsyncSession) -> list[Chore]:
    result = await db.execute(select(Chore).where(Chore.is_active == True))
    return list(result.scalars().all())


async def _load_active_rules(
    db: AsyncSession, chore_id: int
) -> list[ChoreAssignmentRule]:
    result = await db.execute(
        select(ChoreAssignmentRule).where(
            ChoreAssignmentRule.chore_id == chore_id,
            ChoreAssignmentRule.is_active == True,
        )
    )
    return list(result.scalars().all())


async def _load_rotation(
    db: AsyncSession, chore_id: int
) -> ChoreRotation | None:
    result = await db.execute(
        select(ChoreRotation).where(ChoreRotation.chore_id == chore_id)
    )
    return result.scalar_one_or_none()


async def _load_exclusion_set(
    db: AsyncSession, start: date, end: date
) -> set[tuple[int, int, date]]:
    result = await db.execute(
        select(ChoreExclusion).where(
            ChoreExclusion.date >= start,
            ChoreExclusion.date <= end,
        )
    )
    return {
        (e.chore_id, e.user_id, e.date) for e in result.scalars().all()
    }


async def _get_legacy_user_ids(db: AsyncSession, chore_id: int) -> list[int]:
    """Fall back to distinct user IDs from past assignments."""
    result = await db.execute(
        select(ChoreAssignment.user_id)
        .where(ChoreAssignment.chore_id == chore_id)
        .distinct()
    )
    return list(result.scalars().all())


async def _create_if_missing(
    db: AsyncSession, chore_id: int, user_id: int, day: date
) -> bool:
    """Create a pending assignment if one doesn't already exist.

    Returns True if a new assignment was created.
    """
    existing = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == chore_id,
            ChoreAssignment.user_id == user_id,
            ChoreAssignment.date == day,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(
            ChoreAssignment(
                chore_id=chore_id,
                user_id=user_id,
                date=day,
                status=AssignmentStatus.pending,
            )
        )
        logger.debug("Created assignment: chore=%d user=%d day=%s", chore_id, user_id, day)
        return True
    return False


async def _generate_from_rules(
    db: AsyncSession,
    chore: Chore,
    rules: list[ChoreAssignmentRule],
    rotation: ChoreRotation | None,
    week_dates: list[date],
    exclusion_set: set[tuple[int, int, date]],
) -> None:
    """Generate week assignments using per-kid assignment rules."""
    today = date.today()

    for rule in rules:
        if rule.recurrence == Recurrence.once:
            continue

        for day in week_dates:
            if not should_create_on_day(
                rule.recurrence, day, chore.created_at.weekday(), rule.custom_days,
                created_at_date=chore.created_at.date() if hasattr(chore.created_at, 'date') else chore.created_at,
            ):
                continue

            # Rotation filtering
            if rotation and rotation.kid_ids:
                expected_kid = get_rotation_kid_for_day(rotation, day, today)
                if int(rule.user_id) != expected_kid:
                    continue

            if (chore.id, rule.user_id, day) in exclusion_set:
                continue

            await _create_if_missing(db, chore.id, rule.user_id, day)


async def _generate_legacy(
    db: AsyncSession,
    chore: Chore,
    week_dates: list[date],
    exclusion_set: set[tuple[int, int, date]],
) -> None:
    """Generate week assignments using chore-level recurrence (legacy path)."""
    if chore.recurrence == Recurrence.once:
        return

    # Determine assigned user IDs
    rules_result = await db.execute(
        select(ChoreAssignmentRule.user_id).where(
            ChoreAssignmentRule.chore_id == chore.id,
            ChoreAssignmentRule.is_active == True,
        )
    )
    user_ids = list(rules_result.scalars().all())

    if not user_ids:
        rotation = await _load_rotation(db, chore.id)
        if rotation and rotation.kid_ids:
            user_ids = [int(kid_id) for kid_id in rotation.kid_ids]
        else:
            user_ids = await _get_legacy_user_ids(db, chore.id)

    if not user_ids:
        return

    for day in week_dates:
        if not should_create_on_day(
            chore.recurrence, day, chore.created_at.weekday(), chore.custom_days,
            created_at_date=chore.created_at.date() if hasattr(chore.created_at, 'date') else chore.created_at,
        ):
            continue

        for user_id in user_ids:
            if (chore.id, user_id, day) in exclusion_set:
                continue
            await _create_if_missing(db, chore.id, user_id, day)
