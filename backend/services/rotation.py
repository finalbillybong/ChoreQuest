"""Shared rotation logic for chore rotation scheduling."""

from datetime import date, datetime, timezone

from backend.models import ChoreRotation, RotationCadence


def should_advance_rotation(rotation: ChoreRotation, now: datetime) -> bool:
    """Determine whether a rotation should advance to the next kid.

    Returns True when enough time has passed since the last rotation
    based on the configured cadence.
    """
    if rotation.last_rotated is None:
        return True

    cadence = _cadence_value(rotation.cadence)
    days_since = (now - rotation.last_rotated).days

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
) -> int:
    """Return the kid ID that should be assigned on ``target_day``
    given the rotation's current state.

    For daily cadence, the kid rotates each day relative to ``reference_day``.
    For all other cadences, the same kid is used for the entire period.
    """
    cadence = _cadence_value(rotation.cadence)
    days_offset = (target_day - reference_day).days

    if cadence == "daily":
        idx = (rotation.current_index + days_offset) % len(rotation.kid_ids)
    else:
        idx = rotation.current_index

    return int(rotation.kid_ids[idx])


def _cadence_value(cadence: RotationCadence | str) -> str:
    """Safely extract the string value from a cadence enum or string."""
    return cadence.value if hasattr(cadence, "value") else str(cadence)
