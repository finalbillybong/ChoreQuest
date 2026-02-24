"""Avatar emotes — ephemeral reactions broadcast via WebSocket."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.models import User
from backend.dependencies import get_current_user
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/emotes", tags=["emotes"])

VALID_EMOTES = ["dance", "wave", "cheer", "flex", "sparkle", "highfive"]


class EmoteRequest(BaseModel):
    emote: str = Field(max_length=20)
    target_user_id: int | None = None


@router.post("")
async def send_emote(
    body: EmoteRequest,
    current_user: User = Depends(get_current_user),
):
    """Send an emote — broadcast to all connected users."""
    if body.emote not in VALID_EMOTES:
        raise HTTPException(status_code=400, detail=f"Invalid emote. Valid: {VALID_EMOTES}")

    await ws_manager.broadcast({
        "type": "emote",
        "data": {
            "user_id": current_user.id,
            "user_name": current_user.display_name or current_user.username,
            "emote": body.emote,
            "target_user_id": body.target_user_id,
        },
    })

    return {"status": "sent"}
