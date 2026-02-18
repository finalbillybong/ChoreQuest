from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User
from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/avatar", tags=["avatar"])

# Hardcoded avatar parts catalogue
AVATAR_PARTS: dict[str, list[dict]] = {
    "head": [
        {"id": "head_round", "name": "Round", "svg": '<circle cx="50" cy="40" r="30" fill="{color}"/>'},
        {"id": "head_oval", "name": "Oval", "svg": '<ellipse cx="50" cy="40" rx="25" ry="32" fill="{color}"/>'},
        {"id": "head_square", "name": "Square", "svg": '<rect x="25" y="12" width="50" height="55" rx="8" fill="{color}"/>'},
    ],
    "hair": [
        {"id": "hair_none", "name": "None", "svg": ""},
        {"id": "hair_short", "name": "Short", "svg": '<path d="M25,30 Q50,5 75,30" fill="{color}" stroke="none"/>'},
        {"id": "hair_long", "name": "Long", "svg": '<path d="M20,30 Q50,0 80,30 L85,70 Q50,55 15,70 Z" fill="{color}"/>'},
        {"id": "hair_curly", "name": "Curly", "svg": '<path d="M22,35 Q15,15 35,10 Q50,2 65,10 Q85,15 78,35" fill="{color}"/>'},
        {"id": "hair_spiky", "name": "Spiky", "svg": '<path d="M25,30 L30,8 L40,25 L50,2 L60,25 L70,8 L75,30" fill="{color}"/>'},
    ],
    "eyes": [
        {"id": "eyes_normal", "name": "Normal", "svg": '<circle cx="38" cy="38" r="4" fill="#333"/><circle cx="62" cy="38" r="4" fill="#333"/>'},
        {"id": "eyes_happy", "name": "Happy", "svg": '<path d="M34,38 Q38,34 42,38" stroke="#333" fill="none" stroke-width="2"/><path d="M58,38 Q62,34 66,38" stroke="#333" fill="none" stroke-width="2"/>'},
        {"id": "eyes_wide", "name": "Wide", "svg": '<circle cx="38" cy="38" r="6" fill="white" stroke="#333" stroke-width="1.5"/><circle cx="38" cy="38" r="3" fill="#333"/><circle cx="62" cy="38" r="6" fill="white" stroke="#333" stroke-width="1.5"/><circle cx="62" cy="38" r="3" fill="#333"/>'},
        {"id": "eyes_sleepy", "name": "Sleepy", "svg": '<line x1="33" y1="38" x2="43" y2="38" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><line x1="57" y1="38" x2="67" y2="38" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>'},
    ],
    "mouth": [
        {"id": "mouth_smile", "name": "Smile", "svg": '<path d="M38,52 Q50,62 62,52" stroke="#333" fill="none" stroke-width="2" stroke-linecap="round"/>'},
        {"id": "mouth_grin", "name": "Grin", "svg": '<path d="M36,50 Q50,65 64,50 Z" fill="white" stroke="#333" stroke-width="1.5"/>'},
        {"id": "mouth_neutral", "name": "Neutral", "svg": '<line x1="40" y1="54" x2="60" y2="54" stroke="#333" stroke-width="2" stroke-linecap="round"/>'},
        {"id": "mouth_open", "name": "Open", "svg": '<ellipse cx="50" cy="54" rx="8" ry="5" fill="#333"/>'},
    ],
    "body": [
        {"id": "body_tshirt", "name": "T-Shirt", "svg": '<path d="M30,72 L25,78 L15,75 L20,68 L30,72 L30,100 L70,100 L70,72 L80,68 L85,75 L75,78 L70,72" fill="{color}"/>'},
        {"id": "body_hoodie", "name": "Hoodie", "svg": '<path d="M28,72 L20,68 L12,78 L25,82 L25,100 L75,100 L75,82 L88,78 L80,68 L72,72" fill="{color}"/><path d="M40,72 Q50,80 60,72" fill="none" stroke="{color}" stroke-width="1"/>'},
        {"id": "body_tank", "name": "Tank Top", "svg": '<path d="M35,72 L35,100 L65,100 L65,72" fill="{color}"/>'},
    ],
    "legs": [
        {"id": "legs_pants", "name": "Pants", "svg": '<path d="M30,100 L30,140 L48,140 L48,105 L52,105 L52,140 L70,140 L70,100 Z" fill="{color}"/>'},
        {"id": "legs_shorts", "name": "Shorts", "svg": '<path d="M30,100 L30,120 L48,120 L48,105 L52,105 L52,120 L70,120 L70,100 Z" fill="{color}"/>'},
        {"id": "legs_skirt", "name": "Skirt", "svg": '<path d="M28,100 L25,125 L75,125 L72,100 Z" fill="{color}"/>'},
    ],
    "shoes": [
        {"id": "shoes_sneakers", "name": "Sneakers", "svg": '<rect x="28" y="140" width="20" height="8" rx="4" fill="{color}"/><rect x="52" y="140" width="20" height="8" rx="4" fill="{color}"/>'},
        {"id": "shoes_boots", "name": "Boots", "svg": '<rect x="28" y="132" width="20" height="16" rx="3" fill="{color}"/><rect x="52" y="132" width="20" height="16" rx="3" fill="{color}"/>'},
        {"id": "shoes_none", "name": "Barefoot", "svg": ""},
    ],
    "accessories": [
        {"id": "acc_none", "name": "None", "svg": ""},
        {"id": "acc_glasses", "name": "Glasses", "svg": '<circle cx="38" cy="38" r="8" fill="none" stroke="#333" stroke-width="1.5"/><circle cx="62" cy="38" r="8" fill="none" stroke="#333" stroke-width="1.5"/><line x1="46" y1="38" x2="54" y2="38" stroke="#333" stroke-width="1.5"/>'},
        {"id": "acc_hat", "name": "Hat", "svg": '<rect x="22" y="10" width="56" height="6" rx="2" fill="{color}"/><rect x="30" y="0" width="40" height="14" rx="4" fill="{color}"/>'},
        {"id": "acc_cape", "name": "Cape", "svg": '<path d="M30,72 L15,130 Q50,140 85,130 L70,72" fill="{color}" opacity="0.7"/>'},
        {"id": "acc_bowtie", "name": "Bow Tie", "svg": '<path d="M44,72 L38,68 L38,76 Z" fill="{color}"/><path d="M56,72 L62,68 L62,76 Z" fill="{color}"/><circle cx="50" cy="72" r="2" fill="{color}"/>'},
    ],
}


class AvatarConfig(BaseModel):
    config: dict


# ---------- GET /parts ----------
@router.get("/parts")
async def get_avatar_parts():
    """Return the hardcoded avatar parts catalogue."""
    return AVATAR_PARTS


# ---------- PUT / ----------
@router.put("/")
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
    return {"detail": "Avatar updated", "avatar_config": user.avatar_config}
