"""Pet interaction endpoints — feed, pet, play for small XP bonuses."""
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User
from backend.schemas import PetInteractionRequest
from backend.dependencies import get_current_user
from backend.services.pet_leveling import (
    get_current_pet_xp,
    get_pet_level,
    migrate_pet_xp,
    set_current_pet_xp,
)

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
    config = dict(user.avatar_config or {})
    pet = config.get("pet")
    if not pet or pet == "none":
        raise HTTPException(status_code=400, detail="No pet equipped")

    # ── Daily interaction limit ──
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

    # ── Pet XP (inline — avoid ORM mutation issues) ──
    config = migrate_pet_xp(config)
    old_xp = get_current_pet_xp(config)
    old_level = get_pet_level(old_xp)["level"]
    new_xp = old_xp + xp
    set_current_pet_xp(config, new_xp)

    new_level_info = get_pet_level(new_xp)
    levelup = None
    if new_level_info["level"] > old_level:
        levelup = {
            "old_level": old_level,
            "new_level": new_level_info["level"],
            "name": new_level_info["name"],
            "pet": pet,
        }

    # ── Write interactions into config ──
    config["pet_interactions"] = interactions

    # ── Compute new balances ──
    new_balance = (user.points_balance or 0) + xp
    new_total = (user.total_points_earned or 0) + xp

    # ── Direct SQL UPDATE — bypasses ORM JSON mutation detection entirely ──
    await db.execute(
        text(
            "UPDATE users SET avatar_config = :config, "
            "points_balance = :balance, "
            "total_points_earned = :total "
            "WHERE id = :uid"
        ),
        {
            "config": json.dumps(config),
            "balance": new_balance,
            "total": new_total,
            "uid": user.id,
        },
    )
    await db.commit()

    # Sync in-memory user object so subsequent reads in this request are correct
    user.avatar_config = config
    user.points_balance = new_balance
    user.total_points_earned = new_total

    return {
        "action": body.action,
        "xp_awarded": xp,
        "interactions_remaining": MAX_INTERACTIONS_PER_DAY - interactions["count"],
        "levelup": levelup,
        "new_balance": new_balance,
    }
