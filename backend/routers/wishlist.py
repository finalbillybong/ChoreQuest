from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models import WishlistItem, Reward, User, UserRole, Family
from backend.schemas import (
    WishlistCreate,
    WishlistUpdate,
    WishlistResponse,
    WishlistConvertRequest,
    RewardResponse,
)
from backend.dependencies import get_current_user, require_parent, resolve_family, require_subscription
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"], dependencies=[Depends(require_subscription)])


# ---------- GET / ----------
@router.get("", response_model=list[WishlistResponse])
async def list_wishlist(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Kids see their own wishlist items; parents/admins see all."""
    stmt = select(WishlistItem).options(selectinload(WishlistItem.user))

    if user.role == UserRole.kid:
        stmt = stmt.where(WishlistItem.user_id == user.id)

    stmt = stmt.order_by(WishlistItem.created_at.desc())

    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        WishlistResponse(
            **{
                c.key: getattr(item, c.key)
                for c in WishlistItem.__table__.columns
            },
            user_display_name=item.user.display_name or item.user.username if item.user else None,
        )
        for item in items
    ]


# ---------- POST / ----------
@router.post("", response_model=WishlistResponse, status_code=201)
async def add_wishlist_item(
    body: WishlistCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Add a new wishlist item (typically by a kid)."""
    item = WishlistItem(
        user_id=user.id,
        family_id=family.id,
        title=body.title,
        url=body.url,
        image_url=body.image_url,
        notes=body.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "wishlist"}}, exclude_user=user.id)
    return WishlistResponse.model_validate(item)


# ---------- PUT /{id} ----------
@router.put("/{item_id}", response_model=WishlistResponse)
async def update_wishlist_item(
    item_id: int,
    body: WishlistUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Update a wishlist item (owner only)."""
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.family_id == family.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Wishlist item not found")

    if item.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only update your own wishlist items")

    if body.title is not None:
        item.title = body.title
    if body.url is not None:
        item.url = body.url
    if body.image_url is not None:
        item.image_url = body.image_url
    if body.notes is not None:
        item.notes = body.notes

    item.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(item)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "wishlist"}}, exclude_user=user.id)
    return WishlistResponse.model_validate(item)


# ---------- DELETE /{id} ----------
@router.delete("/{item_id}")
async def delete_wishlist_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """Remove a wishlist item (owner or parent/admin)."""
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.family_id == family.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Wishlist item not found")

    is_owner = item.user_id == user.id
    is_parent_or_admin = user.role in (UserRole.parent, UserRole.admin)

    if not is_owner and not is_parent_or_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")

    await db.delete(item)
    await db.commit()
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "wishlist"}}, exclude_user=user.id)
    return {"detail": "Wishlist item deleted"}


# ---------- POST /{id}/convert ----------
@router.post("/{item_id}/convert", response_model=RewardResponse)
async def convert_to_reward(
    item_id: int,
    body: WishlistConvertRequest,
    db: AsyncSession = Depends(get_db),
    parent: User = Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    """Convert a wishlist item to a reward (parent+ only). Creates a Reward and links it."""
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.family_id == family.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Wishlist item not found")

    if item.converted_to_reward_id is not None:
        raise HTTPException(status_code=400, detail="Item has already been converted to a reward")

    reward = Reward(
        title=item.title,
        description=item.notes,
        point_cost=body.point_cost,
        icon=None,
        stock=1,
        is_active=True,
        created_by=parent.id,
        family_id=family.id,
    )
    db.add(reward)
    await db.flush()

    # Remove the wish now that it's been converted to a reward
    kid_user_id = item.user_id
    await db.delete(item)

    await db.commit()
    await db.refresh(reward)
    # Notify the kid that their wish was converted, and broadcast wishlist change
    await ws_manager.send_to_user(kid_user_id, {"type": "data_changed", "data": {"entity": "wishlist"}})
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "reward"}}, exclude_user=parent.id)
    return RewardResponse.model_validate(reward)
