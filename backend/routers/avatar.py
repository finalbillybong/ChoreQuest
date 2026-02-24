import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    User, UserRole, AvatarItem, UserAvatarItem, PointTransaction, PointType,
    Notification, NotificationType, AvatarAcquiredVia, AvatarUnlockMethod,
)
from backend.dependencies import get_current_user
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/avatar", tags=["avatar"])

# Avatar parts catalogue — matches the frontend SvgAvatar renderer
AVATAR_PARTS = {
    "head": [
        {"id": "round", "name": "Round"}, {"id": "oval", "name": "Oval"},
        {"id": "square", "name": "Square"}, {"id": "diamond", "name": "Diamond"},
        {"id": "heart", "name": "Heart"}, {"id": "long", "name": "Long"},
        {"id": "triangle", "name": "Triangle"}, {"id": "pear", "name": "Pear"},
        {"id": "wide", "name": "Wide"},
    ],
    "hair": [
        {"id": "none", "name": "None"}, {"id": "short", "name": "Short"},
        {"id": "long", "name": "Long"}, {"id": "spiky", "name": "Spiky"},
        {"id": "curly", "name": "Curly"}, {"id": "mohawk", "name": "Mohawk"},
        {"id": "buzz", "name": "Buzz"}, {"id": "ponytail", "name": "Ponytail"},
        {"id": "bun", "name": "Bun"}, {"id": "pigtails", "name": "Pigtails"},
        {"id": "afro", "name": "Afro"}, {"id": "braids", "name": "Braids"},
        {"id": "wavy", "name": "Wavy"}, {"id": "side_part", "name": "Side Part"},
        {"id": "fade", "name": "Fade"}, {"id": "dreadlocks", "name": "Dreadlocks"},
        {"id": "bob", "name": "Bob"}, {"id": "shoulder", "name": "Shoulder"},
        {"id": "undercut", "name": "Undercut"}, {"id": "twin_buns", "name": "Twin Buns"},
    ],
    "eyes": [
        {"id": "normal", "name": "Normal"}, {"id": "happy", "name": "Happy"},
        {"id": "wide", "name": "Wide"}, {"id": "sleepy", "name": "Sleepy"},
        {"id": "wink", "name": "Wink"}, {"id": "angry", "name": "Angry"},
        {"id": "dot", "name": "Dot"}, {"id": "star", "name": "Star"},
        {"id": "glasses", "name": "Glasses"}, {"id": "sunglasses", "name": "Sunglasses"},
        {"id": "eye_patch", "name": "Eye Patch"}, {"id": "crying", "name": "Crying"},
        {"id": "heart_eyes", "name": "Heart Eyes"}, {"id": "dizzy", "name": "Dizzy"},
        {"id": "closed", "name": "Closed"},
    ],
    "mouth": [
        {"id": "smile", "name": "Smile"}, {"id": "grin", "name": "Grin"},
        {"id": "neutral", "name": "Neutral"}, {"id": "open", "name": "Open"},
        {"id": "tongue", "name": "Tongue"}, {"id": "frown", "name": "Frown"},
        {"id": "surprised", "name": "Surprised"}, {"id": "smirk", "name": "Smirk"},
        {"id": "braces", "name": "Braces"}, {"id": "vampire", "name": "Vampire"},
        {"id": "whistle", "name": "Whistle"}, {"id": "mask", "name": "Mask"},
        {"id": "beard", "name": "Beard"}, {"id": "moustache", "name": "Moustache"},
    ],
    "hat": [
        {"id": "none", "name": "None"}, {"id": "crown", "name": "Crown"},
        {"id": "wizard", "name": "Wizard"}, {"id": "beanie", "name": "Beanie"},
        {"id": "cap", "name": "Cap"}, {"id": "pirate", "name": "Pirate"},
        {"id": "headphones", "name": "Headphones"}, {"id": "tiara", "name": "Tiara"},
        {"id": "horns", "name": "Horns"}, {"id": "bunny_ears", "name": "Bunny Ears"},
        {"id": "cat_ears", "name": "Cat Ears"}, {"id": "halo", "name": "Halo"},
        {"id": "viking", "name": "Viking"},
    ],
    "accessory": [
        {"id": "none", "name": "None"}, {"id": "scarf", "name": "Scarf"},
        {"id": "necklace", "name": "Necklace"}, {"id": "bow_tie", "name": "Bow Tie"},
        {"id": "cape", "name": "Cape"}, {"id": "wings", "name": "Wings"},
        {"id": "shield", "name": "Shield"}, {"id": "sword", "name": "Sword"},
    ],
    "face_extra": [
        {"id": "none", "name": "None"}, {"id": "freckles", "name": "Freckles"},
        {"id": "blush", "name": "Blush"}, {"id": "face_paint", "name": "Face Paint"},
        {"id": "scar", "name": "Scar"}, {"id": "bandage", "name": "Bandage"},
        {"id": "stickers", "name": "Stickers"},
    ],
    "outfit_pattern": [
        {"id": "none", "name": "None"}, {"id": "stripes", "name": "Stripes"},
        {"id": "stars", "name": "Stars"}, {"id": "camo", "name": "Camo"},
        {"id": "tie_dye", "name": "Tie Dye"}, {"id": "plaid", "name": "Plaid"},
    ],
    "pet": [
        {"id": "none", "name": "None"}, {"id": "cat", "name": "Cat"},
        {"id": "dog", "name": "Dog"}, {"id": "dragon", "name": "Dragon"},
        {"id": "owl", "name": "Owl"}, {"id": "bunny", "name": "Bunny"},
        {"id": "phoenix", "name": "Phoenix"},
    ],
}

# Curated colour palettes
AVATAR_COLORS = {
    "head_color": [
        "#ffe0bd", "#ffcc99", "#f5d6b8", "#f8d9c0",
        "#e8b88a", "#d4a373", "#c68642", "#a67c52",
        "#8d5524", "#6b3a2a", "#4a2912", "#3b1f0e",
        "#f0c4a8", "#d4956a", "#b07848", "#8a6642",
    ],
    "hair_color": [
        "#4a3728", "#1a1a2e", "#8b4513", "#d4a017",
        "#c0392b", "#2e86c1", "#7d3c98", "#27ae60",
        "#e74c3c", "#f39c12", "#ecf0f1", "#ff6b9d",
    ],
    "eye_color": [
        "#333333", "#1a5276", "#27ae60", "#8b4513",
        "#7d3c98", "#c0392b", "#2e86c1", "#e74c3c",
    ],
    "mouth_color": [
        "#cc6666", "#e74c3c", "#d4a373", "#c0392b",
        "#ff6b9d", "#a93226", "#8b4513", "#333333",
    ],
    "body_color": [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#a855f7", "#ec4899", "#06b6d4", "#84cc16",
        "#f97316", "#6366f1", "#1a1a2e", "#ecf0f1",
    ],
    "bg_color": [
        "#1a1a2e", "#0f0e17", "#16213e", "#1b4332",
        "#4a1942", "#2d1b69", "#1a3a3a", "#3d0c02",
        "#2e86c1", "#27ae60", "#f39c12", "#8e44ad",
    ],
    "hat_color": [
        "#f39c12", "#e74c3c", "#3b82f6", "#10b981",
        "#a855f7", "#ec4899", "#f59e0b", "#1a1a2e",
        "#c0c0c0", "#f9d71c", "#8b4513", "#ecf0f1",
    ],
    "accessory_color": [
        "#3b82f6", "#ef4444", "#10b981", "#f39c12",
        "#a855f7", "#ec4899", "#c0c0c0", "#f9d71c",
        "#8b4513", "#1a1a2e", "#ecf0f1", "#06b6d4",
    ],
    "pet_color": [
        "#8b4513", "#4a3728", "#f39c12", "#ef4444",
        "#10b981", "#a855f7", "#ecf0f1", "#1a1a2e",
        "#c0c0c0", "#ff6b9d", "#06b6d4", "#f59e0b",
    ],
}


class AvatarConfig(BaseModel):
    config: dict


# ---------- GET /parts ----------
@router.get("/parts")
async def get_avatar_parts():
    """Return the avatar parts catalogue and colour palettes."""
    return {"parts": AVATAR_PARTS, "colors": AVATAR_COLORS}


# ---------- PUT / ----------
@router.put("")
async def save_avatar(
    body: AvatarConfig,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Save avatar configuration for the current user."""
    user.avatar_config = body.config
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "user"}}, exclude_user=user.id)
    return {"detail": "Avatar updated", "avatar_config": user.avatar_config}


# ---------- GET /items ----------
@router.get("/items")
async def get_avatar_items(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all avatar items with the current user's unlock status.

    Parents and admins get everything unlocked automatically — the
    shop / unlock mechanic is a gamification layer for kids only.
    """
    items_result = await db.execute(select(AvatarItem))
    all_items = items_result.scalars().all()

    is_parent_or_admin = user.role in (UserRole.parent, UserRole.admin)

    owned_result = await db.execute(
        select(UserAvatarItem.avatar_item_id).where(UserAvatarItem.user_id == user.id)
    )
    owned_ids = set(owned_result.scalars().all())

    result = []
    for item in all_items:
        # Parents/admins: all items unlocked
        if is_parent_or_admin:
            unlocked = True
        else:
            unlocked = item.is_default or item.id in owned_ids
            # Auto-unlock milestone items (XP / streak) on read
            if not unlocked and item.unlock_method == AvatarUnlockMethod.xp and item.unlock_value:
                if user.total_points_earned >= item.unlock_value:
                    db.add(UserAvatarItem(
                        user_id=user.id, avatar_item_id=item.id,
                        acquired_via=AvatarAcquiredVia.milestone,
                    ))
                    unlocked = True
            if not unlocked and item.unlock_method == AvatarUnlockMethod.streak and item.unlock_value:
                if user.longest_streak >= item.unlock_value:
                    db.add(UserAvatarItem(
                        user_id=user.id, avatar_item_id=item.id,
                        acquired_via=AvatarAcquiredVia.milestone,
                    ))
                    unlocked = True

        result.append({
            "id": item.id,
            "category": item.category,
            "item_id": item.item_id,
            "display_name": item.display_name,
            "rarity": item.rarity.value,
            "unlock_method": item.unlock_method.value,
            "unlock_value": item.unlock_value,
            "is_default": item.is_default,
            "unlocked": unlocked,
        })

    await db.commit()
    return result


# ---------- POST /items/{id}/purchase ----------
@router.post("/items/{item_id}/purchase")
async def purchase_avatar_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Purchase an avatar item from the shop using XP points."""
    item_result = await db.execute(select(AvatarItem).where(AvatarItem.id == item_id))
    item = item_result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.is_default:
        raise HTTPException(status_code=400, detail="This item is already free")

    if item.unlock_method != AvatarUnlockMethod.shop:
        raise HTTPException(status_code=400, detail="This item cannot be purchased")

    # Check if already owned
    owned = await db.execute(
        select(UserAvatarItem).where(
            UserAvatarItem.user_id == user.id,
            UserAvatarItem.avatar_item_id == item.id,
        )
    )
    if owned.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already own this item")

    cost = item.unlock_value or 0
    if user.points_balance < cost:
        raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {user.points_balance}")

    # Deduct points
    user.points_balance -= cost
    db.add(PointTransaction(
        user_id=user.id,
        amount=-cost,
        type=PointType.reward_redeem,
        description=f"Avatar item: {item.display_name}",
        reference_id=item.id,
    ))

    # Grant item
    db.add(UserAvatarItem(
        user_id=user.id, avatar_item_id=item.id,
        acquired_via=AvatarAcquiredVia.purchase,
    ))

    await db.commit()
    await db.refresh(user)
    await ws_manager.send_to_user(user.id, {
        "type": "data_changed",
        "data": {"entity": "avatar_items"},
    })

    return {
        "detail": f"Purchased {item.display_name}!",
        "points_balance": user.points_balance,
    }


# ---------- Quest drop helper (called from chores router) ----------
DROP_RATES = {"easy": 0.05, "medium": 0.10, "hard": 0.15, "expert": 0.20}


async def try_quest_drop(db: AsyncSession, user: User, difficulty: str):
    """Roll for a random quest-drop avatar item. Returns the item dict or None."""
    rate = DROP_RATES.get(difficulty, 0.10)
    if random.random() > rate:
        return None

    # Find quest_drop items the user doesn't own
    owned_result = await db.execute(
        select(UserAvatarItem.avatar_item_id).where(UserAvatarItem.user_id == user.id)
    )
    owned_ids = set(owned_result.scalars().all())

    droppable = await db.execute(
        select(AvatarItem).where(
            AvatarItem.unlock_method == AvatarUnlockMethod.quest_drop,
        )
    )
    candidates = [i for i in droppable.scalars().all() if i.id not in owned_ids]
    if not candidates:
        return None

    item = random.choice(candidates)

    db.add(UserAvatarItem(
        user_id=user.id, avatar_item_id=item.id,
        acquired_via=AvatarAcquiredVia.drop,
    ))
    db.add(Notification(
        user_id=user.id,
        type=NotificationType.avatar_item_drop,
        title="Quest Drop!",
        message=f"You found a {item.rarity.value} item: {item.display_name}!",
        reference_type="avatar_item",
        reference_id=item.id,
    ))

    return {
        "id": item.id,
        "category": item.category,
        "item_id": item.item_id,
        "display_name": item.display_name,
        "rarity": item.rarity.value,
    }
