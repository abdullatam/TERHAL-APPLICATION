"""Ma'an Passport — derived from booking history, not a new data model.

A stamp means "you were actually taken here": a confirmed booking whose date
has passed, with an advisor whose `landmark_ids` cover that landmark. Nothing
is persisted, so there is no second source of truth to drift from the bookings
table.

The set of collectable stamps is the top-level destinations — the same 21 rows
the swipe deck shows. Stamping every rock-cut facade inside Petra separately
would make the passport unwinnable.
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import BookingORM, LandmarkORM, ProviderORM
from app.models import BookingStatus, Passport, PassportStamp

router = APIRouter(prefix="/passport", tags=["passport"])


@router.get("", response_model=Passport)
def get_passport(db: Session = Depends(get_db)) -> Passport:
    # Collectable set: active top-level destinations, in deck order.
    landmarks = db.scalars(
        select(LandmarkORM)
        .where(LandmarkORM.parent_id.is_(None), LandmarkORM.active.is_(True))
        .order_by(LandmarkORM.name_en)
    ).all()

    # Earned set: landmarks covered by a past, confirmed booking.
    earned: dict[str, tuple[date, str]] = {}
    bookings = db.scalars(
        select(BookingORM)
        .where(BookingORM.status == BookingStatus.confirmed.value)
        .order_by(BookingORM.date)
    ).all()
    today = date.today()
    for booking in bookings:
        if booking.date > today:
            continue  # a trip you have not taken yet earns nothing
        provider = db.get(ProviderORM, booking.provider_id)
        if provider is None:
            continue
        for landmark_id in provider.landmark_ids or []:
            # Keep the earliest visit, so a stamp shows when you first went.
            if landmark_id not in earned:
                earned[landmark_id] = (booking.date, booking.id)

    stamps: list[PassportStamp] = []
    for row in landmarks:
        hit = earned.get(row.id)
        if hit:
            stamps.append(
                PassportStamp(
                    landmark_id=row.id,
                    name_en=row.name_en,
                    name_ar=row.name_ar,
                    image_url=row.image_url,
                    stamped=True,
                    stamped_on=hit[0],
                    booking_id=hit[1],
                )
            )
        else:
            stamps.append(
                PassportStamp(
                    landmark_id=row.id,
                    name_en=row.name_en,
                    name_ar=row.name_ar,
                    image_url=row.image_url,
                    stamped=False,
                    locked_reason_en="Book an advisor who covers this place",
                    locked_reason_ar="احجز مرشداً يغطي هذا المكان",
                )
            )

    # Stamped first, so the passport reads as a record rather than a to-do list.
    stamps.sort(key=lambda s: (not s.stamped, s.name_en))
    collected = sum(1 for s in stamps if s.stamped)
    total = len(stamps)
    return Passport(
        collected=collected,
        total=total,
        percent=round(collected / total * 100) if total else 0,
        stamps=stamps,
    )
