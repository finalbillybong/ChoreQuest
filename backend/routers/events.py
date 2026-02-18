from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import SeasonalEvent
from backend.schemas import EventCreate, EventUpdate, EventResponse
from backend.dependencies import get_current_user, require_parent

router = APIRouter(prefix="/api/events", tags=["events"])


def _event_to_response(event: SeasonalEvent) -> dict:
    """Build an EventResponse dict with computed is_active based on date range."""
    now = datetime.now(timezone.utc)
    computed_active = event.start_date <= now <= event.end_date
    data = EventResponse.model_validate(event).model_dump()
    data["is_active"] = computed_active
    return data


# ---------- GET / ----------
@router.get("/", response_model=list[EventResponse])
async def list_events(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List all seasonal events with computed is_active based on current date range."""
    result = await db.execute(select(SeasonalEvent).order_by(SeasonalEvent.start_date.desc()))
    events = result.scalars().all()
    return [_event_to_response(e) for e in events]


# ---------- POST / ----------
@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    parent=Depends(require_parent),
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
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _event_to_response(event)


# ---------- PUT /{id} ----------
@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    _parent=Depends(require_parent),
):
    """Update an existing seasonal event (parent+ only)."""
    result = await db.execute(select(SeasonalEvent).where(SeasonalEvent.id == event_id))
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
    return _event_to_response(event)


# ---------- DELETE /{id} ----------
@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _parent=Depends(require_parent),
):
    """Delete a seasonal event (parent+ only)."""
    result = await db.execute(select(SeasonalEvent).where(SeasonalEvent.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    return {"detail": "Event deleted"}
