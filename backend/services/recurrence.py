"""Shared recurrence logic for determining when chores should be assigned."""

from datetime import date

from backend.models import Recurrence


def should_create_on_day(
    recurrence: Recurrence,
    target_day: date,
    created_at_weekday: int,
    custom_days: list[int] | None = None,
    *,
    created_at_date: date | None = None,
) -> bool:
    """Determine whether a chore with the given recurrence schedule
    should have an assignment created on ``target_day``.

    Args:
        recurrence: The recurrence type (once, daily, weekly, fortnightly, custom).
        target_day: The date to evaluate.
        created_at_weekday: Weekday (0=Mon) of the chore's creation date,
            used for weekly and fortnightly recurrence.
        custom_days: List of weekday ints for custom recurrence.
        created_at_date: The actual creation date, required for fortnightly
            to determine even/odd week parity.
    """
    if recurrence == Recurrence.once:
        return True
    if recurrence == Recurrence.daily:
        return True
    if recurrence == Recurrence.weekly:
        return target_day.weekday() == created_at_weekday
    if recurrence == Recurrence.fortnightly:
        if target_day.weekday() != created_at_weekday:
            return False
        if created_at_date is None:
            return True
        weeks_diff = (target_day - created_at_date).days // 7
        return weeks_diff % 2 == 0
    if recurrence == Recurrence.custom:
        return bool(custom_days and target_day.weekday() in custom_days)
    return False
