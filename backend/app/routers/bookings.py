import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import BookingORM, ProviderORM, ReviewORM
from app.models import (
    Booking,
    BookingCreate,
    BookingDetail,
    BookingStatus,
    Provider,
    Review,
    ReviewCreate,
)
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


@router.get("/{booking_id}/review", response_model=Review | None)
def get_review(booking_id: str, db: Session = Depends(get_db)) -> ReviewORM | None:
    """The existing review for a booking, or null if it has not been reviewed."""
    if db.get(BookingORM, booking_id) is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return db.scalar(select(ReviewORM).where(ReviewORM.booking_id == booking_id))


@router.post("/{booking_id}/review", response_model=Review)
def submit_review(
    booking_id: str, payload: ReviewCreate, db: Session = Depends(get_db)
) -> ReviewORM:
    """Submit or replace the review for a booking.

    A trip is reviewed once, so re-submitting updates the existing row rather
    than stacking duplicates — `reviews.booking_id` is unique.

    A review is only accepted after the trip has happened. A five-star review
    of a trip nobody has taken is worth nothing to the advisor it is meant to
    help, which is the whole point of the feature.
    """
    booking = db.get(BookingORM, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == BookingStatus.cancelled.value:
        raise HTTPException(status_code=409, detail="Cancelled bookings cannot be reviewed")
    if booking.date > date.today():
        raise HTTPException(
            status_code=409, detail="This trip has not happened yet"
        )

    existing = db.scalar(select(ReviewORM).where(ReviewORM.booking_id == booking_id))
    if existing is not None:
        existing.stars = payload.stars
        existing.tags = payload.tags
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        return existing

    row = ReviewORM(
        id=f"rv-{uuid.uuid4().hex[:8]}",
        booking_id=booking_id,
        provider_id=booking.provider_id,
        stars=payload.stars,
        tags=payload.tags,
        comment=payload.comment,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
