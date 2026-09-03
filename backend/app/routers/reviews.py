"""Reviews the traveller has written.

There is no auth and no user table, so "mine" is every review in the
database — a single-user demo. When accounts land, this needs a user filter
and nothing else about it changes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import BookingORM, ProviderORM, ReviewORM
from app.models import ReviewWithContext

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewWithContext])
def list_reviews(db: Session = Depends(get_db)) -> list[ReviewWithContext]:
    rows = db.scalars(
        select(ReviewORM).order_by(ReviewORM.created_at.desc())
    ).all()

    out: list[ReviewWithContext] = []
    for row in rows:
        item = ReviewWithContext.model_validate(row, from_attributes=True)
        provider = db.get(ProviderORM, row.provider_id)
        if provider is not None:
            item.provider_name = provider.name
            item.provider_role = provider.role
        booking = db.get(BookingORM, row.booking_id)
        if booking is not None:
            item.booking_date = booking.date
        out.append(item)
    return out
