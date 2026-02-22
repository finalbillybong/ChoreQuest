from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    SeasonalEvent,
    User,
    UserRole,
    Notification,
    NotificationType,
    Family,
    FamilyMember,
)
from backend.schemas import EventCreate, EventUpdate, EventResponse
from backend.dependencies import get_current_user, require_parent, resolve_family, require_subscription
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/api/events", tags=["events"], dependencies=[Depends(require_subscription)])


def _make_aware(dt: datetime) -> datetime:
    """Treat naive datetimes (from SQLite) as UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _event_to_response(event: SeasonalEvent) -> dict:
    """Build an EventResponse dict with computed is_active based on date range + DB flag."""
    now = datetime.utcnow()
    in_range = _make_aware(event.start_date) <= now <= _make_aware(event.end_date)
    data = EventResponse.model_validate(event).model_dump()
    data["is_active"] = event.is_active and in_range
    return data


# ---------- GET / ----------
@router.get("", response_model=list[EventResponse])
async def list_events(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
    family: Family = Depends(resolve_family),
):
    """List all seasonal events with computed is_active based on current date range."""
    result = await db.execute(
        select(SeasonalEvent)
        .where(SeasonalEvent.family_id == family.id)
        .order_by(SeasonalEvent.start_date.desc())
    )
    events = result.scalars().all()
    return [_event_to_response(e) for e in events]


# ---------- POST / ----------
@router.post("", response_model=EventResponse, status_code=201)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    parent=Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    """Create a new seasonal event (parent+ only)."""
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    event = SeasonalEvent(
        title=body.title,
        description=body.description,
        multiplier=body.multiplier,
        start_date=body.start_date,
        end_date=body.end_date,
        is_active=True,
        created_by=parent.id,
        family_id=family.id,
    )
    db.add(event)
    await db.flush()

    # Notify all kids in the family about the new event
    kid_result = await db.execute(
        select(User.id)
        .join(FamilyMember, FamilyMember.user_id == User.id)
        .where(
            FamilyMember.family_id == family.id,
            User.role == UserRole.kid,
            User.is_active == True,
        )
    )
    for (kid_id,) in kid_result.all():
        multiplier_pct = int((event.multiplier - 1) * 100)
        db.add(Notification(
            user_id=kid_id,
            family_id=family.id,
            type=NotificationType.bonus_points,
            title="Bonus Event Started!",
            message=f"'{event.title}' is live — earn {multiplier_pct}% bonus XP on all quests!",
            reference_type="event",
            reference_id=event.id,
        ))

    await db.commit()
    await db.refresh(event)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "event"}}, exclude_user=parent.id)
    return _event_to_response(event)


# ---------- PUT /{id} ----------
@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    _parent=Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    """Update an existing seasonal event (parent+ only)."""
    result = await db.execute(
        select(SeasonalEvent).where(
            SeasonalEvent.id == event_id,
            SeasonalEvent.family_id == family.id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.multiplier is not None:
        event.multiplier = body.multiplier
    if body.start_date is not None:
        event.start_date = body.start_date
    if body.end_date is not None:
        event.end_date = body.end_date

    # Validate date ordering after potential updates
    if event.end_date <= event.start_date:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    await db.commit()
    await db.refresh(event)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "event"}})
    return _event_to_response(event)


# ---------- POST /{id}/end ----------
@router.post("/{event_id}/end", response_model=EventResponse)
async def end_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _parent=Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    """End a seasonal event early (parent+ only)."""
    result = await db.execute(
        select(SeasonalEvent).where(
            SeasonalEvent.id == event_id,
            SeasonalEvent.family_id == family.id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event.is_active = False
    await db.commit()
    await db.refresh(event)
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "event"}})
    return _event_to_response(event)


# ---------- DELETE /{id} ----------
@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _parent=Depends(require_parent),
    family: Family = Depends(resolve_family),
):
    """Delete a seasonal event (parent+ only)."""
    result = await db.execute(
        select(SeasonalEvent).where(
            SeasonalEvent.id == event_id,
            SeasonalEvent.family_id == family.id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    await ws_manager.broadcast({"type": "data_changed", "data": {"entity": "event"}})
    return {"detail": "Event deleted"}
