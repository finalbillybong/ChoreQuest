"""Pet interaction endpoints — feed, pet, play for small XP bonuses."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from backend.database import get_db
from backend.models import User
from backend.schemas import PetInteractionRequest
from backend.dependencies import get_current_user
from backend.services.pet_leveling import award_pet_xp

router = APIRouter(prefix="/api/pets", tags=["pets"])

# XP awarded per interaction type
PET_INTERACTION_XP = {"feed": 2, "pet": 1, "play": 3}
MAX_INTERACTIONS_PER_DAY = 3


@router.post("/interact")
async def pet_interact(
    body: PetInteractionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Interact with your equipped pet (feed/pet/play) for a small XP bonus.

    Limited to 3 interactions per day (stored in avatar_config).
    Awards both pet XP and user points.
    """
    config = user.avatar_config or {}
    pet = config.get("pet")
    if not pet or pet == "none":
        raise HTTPException(status_code=400, detail="No pet equipped")

    # Track daily interactions in avatar_config
    today_str = date.today().isoformat()
    interactions = config.get("pet_interactions", {})
    if interactions.get("date") != today_str:
        interactions = {"date": today_str, "count": 0, "actions": []}

    if interactions["count"] >= MAX_INTERACTIONS_PER_DAY:
        raise HTTPException(
            status_code=400,
            detail=f"Your pet is tired! Max {MAX_INTERACTIONS_PER_DAY} interactions per day.",
        )

    xp = PET_INTERACTION_XP.get(body.action, 1)
    interactions["count"] += 1
    interactions["actions"].append(body.action)

    levelup = award_pet_xp(user, xp)

    # Merge interactions into avatar_config (award_pet_xp may have replaced it)
    user.avatar_config = {**(user.avatar_config or {}), "pet_interactions": interactions}
    flag_modified(user, "avatar_config")

    # Award user XP (points balance + lifetime total)
    user.points_balance = (user.points_balance or 0) + xp
    user.total_points_earned = (user.total_points_earned or 0) + xp

    await db.commit()

    return {
        "action": body.action,
        "xp_awarded": xp,
        "interactions_remaining": MAX_INTERACTIONS_PER_DAY - interactions["count"],
        "levelup": levelup,
        "new_balance": user.points_balance,
    }
