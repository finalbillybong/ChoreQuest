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
    Family,
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
    db: AsyncSession, week_start: date, *, family_id: int | None = None,
) -> None:
    """Generate ChoreAssignment records for recurring chores across a week.

    Slots recorded in ``chore_exclusions`` are skipped so that
    intentionally removed assignments are not recreated.

    This function does NOT advance rotations -- it reads the current
    rotation state and projects forward (useful for calendar views).
    """
    week_end = week_start + timedelta(days=6)
    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    exclusion_set = await _load_exclusion_set(db, week_start, week_end, family_id=family_id)

    chores = await _load_active_chores(db, family_id=family_id)

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


async def generate_daily_assignments(db: AsyncSession, today: date, *, family_id: int | None = None) -> None:
    """Generate assignments for today with rotation advancement.

    Called by the daily reset background task. Unlike the week-based
    generator, this function advances rotations when their cadence
    period has elapsed.  Rotation is only advanced on days when the
    chore actually has an occurrence so that non-active days (e.g.
    weekends for a Mon-Fri custom schedule) don't waste rotation slots.
    """
    now = datetime.utcnow()
    chores = await _load_active_chores(db, family_id=family_id)

    for chore in chores:
        rules = await _load_active_rules(db, chore.id)

        if rules:
            rotation = await _load_rotation(db, chore.id)

            # Pre-compute which rules fire today so we know whether
            # the chore has an occurrence before advancing rotation.
            created_wd = chore.created_at.weekday()
            created_dt = (
                chore.created_at.date()
                if hasattr(chore.created_at, "date")
                else chore.created_at
            )
            active_rules = [
                r for r in rules
                if r.recurrence != Recurrence.once
                and should_create_on_day(
                    r.recurrence, today, created_wd, r.custom_days,
                    created_at_date=created_dt,
                )
            ]

            # Only advance rotation on days the chore actually runs
            if rotation and active_rules and should_advance_rotation(rotation, now):
                advance_rotation(rotation, now)

            for rule in active_rules:
                # Rotation filtering: only generate for the current rotation kid
                if rotation and int(rule.user_id) != int(
                    rotation.kid_ids[rotation.current_index]
                ):
                    continue

                await _create_if_missing(db, chore.id, rule.user_id, today, family_id=chore.family_id)
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
                await _create_if_missing(db, chore.id, uid, today, family_id=chore.family_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _load_active_chores(
    db: AsyncSession, *, family_id: int | None = None,
) -> list[Chore]:
    stmt = select(Chore).where(Chore.is_active == True)
    if family_id is not None:
        stmt = stmt.where(Chore.family_id == family_id)
    result = await db.execute(stmt)
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
    db: AsyncSession, start: date, end: date,
    *, family_id: int | None = None,
) -> set[tuple[int, int, date]]:
    stmt = select(ChoreExclusion).where(
        ChoreExclusion.date >= start,
        ChoreExclusion.date <= end,
    )
    if family_id is not None:
        stmt = stmt.where(ChoreExclusion.family_id == family_id)
    result = await db.execute(stmt)
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
    db: AsyncSession, chore_id: int, user_id: int, day: date,
    *, family_id: int | None = None,
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
                family_id=family_id,
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
    active_weekdays = _collect_active_weekdays(rules, chore) if rotation else None

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
                expected_kid = get_rotation_kid_for_day(
                    rotation, day, today, active_weekdays,
                )
                if int(rule.user_id) != expected_kid:
                    continue

            if (chore.id, rule.user_id, day) in exclusion_set:
                continue

            await _create_if_missing(db, chore.id, rule.user_id, day, family_id=chore.family_id)


def _collect_active_weekdays(
    rules: list[ChoreAssignmentRule], chore: Chore,
) -> list[int] | None:
    """Determine the set of weekdays on which a chore has occurrences.

    Returns ``None`` when the chore runs every day (no filtering needed).
    """
    weekdays: set[int] = set()
    for rule in rules:
        if rule.recurrence in (Recurrence.once,):
            continue
        if rule.recurrence == Recurrence.daily:
            return None  # Runs every day — calendar-day counting is fine
        if rule.recurrence == Recurrence.custom and rule.custom_days:
            weekdays.update(rule.custom_days)
        elif rule.recurrence in (Recurrence.weekly, Recurrence.fortnightly):
            weekdays.add(chore.created_at.weekday())
    return sorted(weekdays) if weekdays else None


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
            await _create_if_missing(db, chore.id, user_id, day, family_id=chore.family_id)
