import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import BookingORM, ProviderORM
from app.models import Booking, BookingCreate, BookingDetail, BookingStatus, Provider
from app.services.pricing_service import quote

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _detail(db: Session, row: BookingORM) -> BookingDetail:
    detail = BookingDetail.model_validate(row, from_attributes=True)
    provider_row = db.get(ProviderORM, row.provider_id)
    if provider_row is not None:
        provider = Provider.model_validate(provider_row, from_attributes=True)
        detail.provider = provider
        detail.quote = quote(provider, hours=row.hours, group_size=row.group_size)
    return detail


@router.post("", response_model=BookingDetail)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> BookingDetail:
    provider_row = db.get(ProviderORM, payload.provider_id)
    if provider_row is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider = Provider.model_validate(provider_row, from_attributes=True)
    priced = quote(provider, hours=payload.hours, group_size=payload.group_size)

    # No availability check and no payment capture: this is the mocked half of
    # the flow. The price is stored with its mock flag so a demo booking can
    # never be mistaken for a real one later.
    row = BookingORM(
        id=f"bk-{uuid.uuid4().hex[:6].upper()}",
        provider_id=payload.provider_id,
        itinerary_id=payload.itinerary_id,
        date=payload.date,
        start_time=payload.start_time,
        hours=payload.hours,
        group_size=payload.group_size,
        price_jod=priced.total_jod,
        price_is_mock=priced.is_mock,
        status=BookingStatus.confirmed.value,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _detail(db, row)


@router.get("", response_model=list[BookingDetail])
def list_bookings(db: Session = Depends(get_db)) -> list[BookingDetail]:
    rows = db.scalars(
        select(BookingORM).order_by(BookingORM.created_at.desc())
    ).all()
    return [_detail(db, row) for row in rows]


@router.get("/{booking_id}", response_model=BookingDetail)
def get_booking(booking_id: str, db: Session = Depends(get_db)) -> BookingDetail:
    row = db.get(BookingORM, booking_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _detail(db, row)


@router.post("/{booking_id}/cancel", response_model=Booking)
def cancel_booking(booking_id: str, db: Session = Depends(get_db)) -> BookingORM:
    row = db.get(BookingORM, booking_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    row.status = BookingStatus.cancelled.value
    db.commit()
    db.refresh(row)
    return row
