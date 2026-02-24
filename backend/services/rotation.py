"""Shared rotation logic for chore rotation scheduling."""

from datetime import date, datetime, timedelta, timezone

from backend.models import ChoreRotation, RotationCadence


def should_advance_rotation(rotation: ChoreRotation, now: datetime) -> bool:
    """Determine whether a rotation should advance to the next kid.

    Returns True when enough calendar days have passed since the last
    rotation based on the configured cadence.  We compare calendar
    dates (not raw timedeltas) so that e.g. Monday 23:00 → Tuesday
    00:01 correctly counts as 1 day for daily cadence.
    """
    if rotation.last_rotated is None:
        return True

    cadence = _cadence_value(rotation.cadence)

    now_date = now.date() if hasattr(now, "date") else now
    last_date = rotation.last_rotated.date() if hasattr(rotation.last_rotated, "date") else rotation.last_rotated
    days_since = (now_date - last_date).days

    thresholds = {
        "daily": 1,
        "weekly": 7,
        "fortnightly": 14,
        "monthly": 30,
    }
    return days_since >= thresholds.get(cadence, 7)


def advance_rotation(rotation: ChoreRotation, now: datetime) -> None:
    """Advance the rotation to the next kid and record the timestamp."""
    rotation.current_index = (rotation.current_index + 1) % len(rotation.kid_ids)
    rotation.last_rotated = now


def get_rotation_kid_for_day(
    rotation: ChoreRotation,
    target_day: date,
    reference_day: date,
    active_weekdays: list[int] | None = None,
) -> int:
    """Return the kid ID that should be assigned on ``target_day``
    given the rotation's current state.

    For daily cadence, the kid rotates each *occurrence* relative to
    ``reference_day``.  When *active_weekdays* is supplied (e.g. from a
    custom-days schedule), only those weekdays count as occurrences;
    otherwise every calendar day counts.

    For all other cadences, the same kid is used for the entire period.
    """
    cadence = _cadence_value(rotation.cadence)

    if cadence == "daily":
        if active_weekdays is not None:
            offset = _count_occurrences(reference_day, target_day, active_weekdays)
        else:
            offset = (target_day - reference_day).days
        idx = (rotation.current_index + offset) % len(rotation.kid_ids)
    else:
        idx = rotation.current_index

    return int(rotation.kid_ids[idx])


def _count_occurrences(start: date, end: date, weekdays: list[int]) -> int:
    """Count how many *weekday* occurrences fall in the range (start, end].

    Returns a negative number when *end* < *start*.
    """
    if start == end or not weekdays:
        return 0

    forward = end >= start
    a, b = (start, end) if forward else (end, start)

    total_days = (b - a).days
    full_weeks, remaining = divmod(total_days, 7)

    wd_set = set(weekdays)
    count = full_weeks * len(wd_set)
    for i in range(1, remaining + 1):
        if (a + timedelta(days=i)).weekday() in wd_set:
            count += 1

    return count if forward else -count


def _cadence_value(cadence: RotationCadence | str) -> str:
    """Safely extract the string value from a cadence enum or string."""
    return cadence.value if hasattr(cadence, "value") else str(cadence)
