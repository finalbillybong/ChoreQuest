from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User
from backend.dependencies import get_current_user
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/avatar", tags=["avatar"])

# Avatar parts catalogue — matches the frontend SvgAvatar renderer
AVATAR_PARTS = {
    "head": [
        {"id": "round", "name": "Round"},
        {"id": "oval", "name": "Oval"},
        {"id": "square", "name": "Square"},
    ],
    "hair": [
        {"id": "none", "name": "None"},
        {"id": "short", "name": "Short"},
        {"id": "long", "name": "Long"},
        {"id": "spiky", "name": "Spiky"},
        {"id": "curly", "name": "Curly"},
        {"id": "mohawk", "name": "Mohawk"},
    ],
    "eyes": [
        {"id": "normal", "name": "Normal"},
        {"id": "happy", "name": "Happy"},
        {"id": "wide", "name": "Wide"},
        {"id": "sleepy", "name": "Sleepy"},
    ],
    "mouth": [
        {"id": "smile", "name": "Smile"},
        {"id": "grin", "name": "Grin"},
        {"id": "neutral", "name": "Neutral"},
        {"id": "open", "name": "Open"},
    ],
}

# Curated colour palettes
AVATAR_COLORS = {
    "head_color": [
        "#ffcc99", "#f5d6b8", "#d4a373", "#a67c52",
        "#8d5524", "#6b3a2a", "#f8d9c0", "#c68642",
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
    "bg_color": [
        "#1a1a2e", "#0f0e17", "#16213e", "#1b4332",
        "#4a1942", "#2d1b69", "#1a3a3a", "#3d0c02",
        "#2e86c1", "#27ae60", "#f39c12", "#8e44ad",
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
