from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import User, VacationPeriod
from backend.schemas import VacationCreate, VacationResponse
from backend.dependencies import require_parent

router = APIRouter(prefix="/api/vacation", tags=["vacation"])


@router.get("", response_model=list[VacationResponse])
async def list_vacations(
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """List all vacation periods."""
    result = await db.execute(
        select(VacationPeriod)
        .where(VacationPeriod.is_active == True)
        .order_by(VacationPeriod.start_date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=VacationResponse, status_code=201)
async def create_vacation(
    body: VacationCreate,
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Create a vacation/blackout period. Parent+ only."""
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    if body.end_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot create vacation in the past")

    vacation = VacationPeriod(
        start_date=body.start_date,
        end_date=body.end_date,
        created_by=parent.id,
    )
    db.add(vacation)
    await db.commit()
    await db.refresh(vacation)
    return vacation


@router.delete("/{vacation_id}", status_code=204)
async def cancel_vacation(
    vacation_id: int,
    parent: User = Depends(require_parent),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a vacation period."""
    result = await db.execute(
        select(VacationPeriod).where(VacationPeriod.id == vacation_id)
    )
    vacation = result.scalar_one_or_none()
    if not vacation:
        raise HTTPException(status_code=404, detail="Vacation not found")

    vacation.is_active = False
    await db.commit()


async def is_vacation_day(db: AsyncSession, check_date: date) -> bool:
    """Check if a given date falls within any active vacation period."""
    result = await db.execute(
        select(VacationPeriod).where(
            VacationPeriod.is_active == True,
            VacationPeriod.start_date <= check_date,
            VacationPeriod.end_date >= check_date,
        )
    )
    return result.scalar_one_or_none() is not None
