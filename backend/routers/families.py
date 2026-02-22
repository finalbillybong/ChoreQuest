"""Family management endpoints for SaaS onboarding.

POST /api/families      -- create a new family (SaaS only, authenticated)
POST /api/families/join  -- join an existing family via invite code
GET  /api/families/me   -- get current user's family info
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import (
    Family, FamilyMember, FamilyMemberRole, User, UserRole, InviteCode,
)
from backend.seed import seed_family_data

router = APIRouter(prefix="/api/families", tags=["families"])


class FamilyCreateRequest(BaseModel):
    name: str


class FamilyJoinRequest(BaseModel):
    invite_code: str


class FamilyResponse(BaseModel):
    id: int
    name: str
    subscription_status: str
    trial_ends_at: str | None = None


@router.post("", response_model=FamilyResponse)
async def create_family(
    body: FamilyCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if settings.APP_MODE != "saas":
        raise HTTPException(status_code=404, detail="Not available in self-hosted mode")

    existing = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == user.id).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="You already belong to a family")

    trial_end = datetime.utcnow() + timedelta(days=settings.TRIAL_DAYS)

    family = Family(
        name=body.name.strip(),
        owner_user_id=user.id,
        trial_ends_at=trial_end,
    )
    db.add(family)
    await db.flush()

    db.add(FamilyMember(
        family_id=family.id,
        user_id=user.id,
        role=FamilyMemberRole.parent,
    ))
    await db.commit()
    await db.refresh(family)

    # Seed default categories and starter quests for the new family
    await seed_family_data(db, family.id, user.id)

    return FamilyResponse(
        id=family.id,
        name=family.name,
        subscription_status=family.subscription_status or "none",
        trial_ends_at=trial_end.isoformat(),
    )


@router.post("/join", response_model=FamilyResponse)
async def join_family(
    body: FamilyJoinRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join an existing family using an invite code."""
    existing = await db.execute(
        select(FamilyMember).where(FamilyMember.user_id == user.id).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="You already belong to a family")

    result = await db.execute(
        select(InviteCode).where(InviteCode.code == body.invite_code.strip())
    )
    invite = result.scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite code has expired")
    if invite.times_used >= invite.max_uses:
        raise HTTPException(status_code=400, detail="Invite code has been fully used")

    if invite.family_id is None:
        raise HTTPException(status_code=400, detail="Invite code is not linked to a family")

    family_result = await db.execute(
        select(Family).where(Family.id == invite.family_id)
    )
    family = family_result.scalar_one_or_none()
    if family is None:
        raise HTTPException(status_code=400, detail="Family not found")

    fm_role = (
        FamilyMemberRole.parent
        if invite.role in (UserRole.admin, UserRole.parent)
        else FamilyMemberRole.child
    )

    # Update the user's role to match the invite
    user.role = invite.role
    db.add(FamilyMember(
        family_id=family.id,
        user_id=user.id,
        role=fm_role,
    ))
    invite.times_used += 1
    await db.commit()
    await db.refresh(family)

    return FamilyResponse(
        id=family.id,
        name=family.name,
        subscription_status=family.subscription_status or "none",
        trial_ends_at=family.trial_ends_at.isoformat() if family.trial_ends_at else None,
    )


@router.get("/me", response_model=FamilyResponse | None)
async def get_my_family(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Family)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user.id)
        .limit(1)
    )
    family = result.scalar_one_or_none()
    if family is None:
        return None

    return FamilyResponse(
        id=family.id,
        name=family.name,
        subscription_status=family.subscription_status or "none",
        trial_ends_at=family.trial_ends_at.isoformat() if family.trial_ends_at else None,
    )
