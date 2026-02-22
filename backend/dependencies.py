from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.config import settings
from backend.database import get_db
from backend.models import User, UserRole, Family, FamilyMember, FamilyMemberRole
from backend.providers.registry import auth_provider


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    return await auth_provider.get_current_user(request, db)


async def resolve_family(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Family:
    """Resolve the current user's family.

    In self-hosted mode there is exactly one family; in SaaS mode the
    family is derived from the user's FamilyMember record (or from an
    X-Family-Id header in a future multi-family extension).
    """
    result = await db.execute(
        select(Family)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user.id)
        .limit(1)
    )
    family = result.scalar_one_or_none()
    if family is None:
        raise HTTPException(status_code=400, detail="User is not a member of any family")
    return family


def _family_has_active_subscription(family: Family) -> bool:
    """Return True if the family has an active or trialing subscription,
    or is still within its trial period."""
    if family.subscription_status in ("active", "trialing"):
        return True
    if family.trial_ends_at and family.trial_ends_at > datetime.utcnow():
        return True
    return False


async def require_subscription(
    family: Family = Depends(resolve_family),
    db: AsyncSession = Depends(get_db),
) -> Family:
    """Subscription gate for SaaS mode.

    Counts children in the family.  If the count exceeds the free limit
    and the family has no active subscription (or trial), raises a 402
    with a structured error so the frontend can show an upgrade prompt.

    In self-hosted mode this is a no-op pass-through.
    """
    if settings.APP_MODE != "saas":
        return family

    result = await db.execute(
        select(func.count())
        .select_from(FamilyMember)
        .where(
            FamilyMember.family_id == family.id,
            FamilyMember.role == FamilyMemberRole.child,
        )
    )
    child_count = result.scalar_one()

    if child_count > settings.FREE_CHILD_LIMIT and not _family_has_active_subscription(family):
        msg = (
            "A subscription is required to add child accounts."
            if settings.FREE_CHILD_LIMIT == 0
            else f"A subscription is required for more than {settings.FREE_CHILD_LIMIT} child account(s)."
        )
        raise HTTPException(
            status_code=402,
            detail={
                "error": "subscription_required",
                "message": msg,
                "child_count": child_count,
                "free_limit": settings.FREE_CHILD_LIMIT,
            },
        )

    return family


async def require_parent(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.parent, UserRole.admin):
        raise HTTPException(status_code=403, detail="Parent or admin role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


async def require_kid(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.kid:
        raise HTTPException(status_code=403, detail="Kid role required")
    return user
