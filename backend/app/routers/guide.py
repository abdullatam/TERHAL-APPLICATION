"""The provider-facing half of Terhal.

Every endpoint here is scoped to one provider and reads the *same* tables the
tourist app writes. A booking a tourist creates on the Advisor Profile screen
is the row a guide sees on Today and answers on Requests — there is no separate
guide-side store.

On identity: this product has no authentication on either side, so "who am I"
arrives as an explicit `provider_id`. The guide app asks the user to pick which
seeded provider they are and remembers it locally. That is a demo affordance,
labelled as one in the UI, rather than a login dressed up to look real — the
provider registration and verification flow is still unbuilt (PROJECT.md §5).
When real auth lands, these signatures lose `provider_id` and read it from the
session instead; nothing else about them changes.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import (
    AvailabilityBlockORM,
    BookingORM,
    LandmarkORM,
    OfferingORM,
    ProviderORM,
)
from app.models import (
    AvailabilityBlock,
    AvailabilityBlockCreate,
    BookingStatus,
    EarningsMonth,
    GuideBooking,
    GuideEarnings,
    GuideToday,
    Offering,
    OfferingCreate,
    OfferingStatus,
    OfferingUpdate,
    Provider,
    TripStartRequest,
)
from app.routers.bookings import elapsed_minutes
from app.services.pricing_service import quote, settle

router = APIRouter(prefix="/guide", tags=["guide"])

# How long a guide has to answer a request before it lapses. The Requests
# screen counts down against this.
RESPOND_WITHIN = timedelta(hours=24)


def _provider(db: Session, provider_id: str) -> ProviderORM:
    row = db.get(ProviderORM, provider_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    return row


def _expires_in_hours(row: BookingORM) -> int | None:
    """Whole hours left to answer, or None once the booking has been answered."""
    if row.status != BookingStatus.pending.value or row.responds_by is None:
        return None
    deadline = row.responds_by
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    remaining = deadline - datetime.now(timezone.utc)
    return max(0, int(remaining.total_seconds() // 3600))


def _guide_booking(db: Session, row: BookingORM, provider: ProviderORM) -> GuideBooking:
    item = GuideBooking.model_validate(row, from_attributes=True)
    item.provider = Provider.model_validate(provider, from_attributes=True)
    item.quote = quote(item.provider, hours=row.hours, group_size=row.group_size)
    item.expires_in_hours = _expires_in_hours(row)

    # The guide must never receive the PIN. The whole handshake is that the
    # tourist holds it and the guide has to be told it in person; sending it
    # here would let the guide start a trip they never turned up to.
    item.pin = None

    item.elapsed_minutes = elapsed_minutes(row)
    if row.started_at is not None:
        item.final_quote = settle(
            item.provider, item.elapsed_minutes or 0, group_size=row.group_size
        )
    if row.offering_id:
        offering = db.get(OfferingORM, row.offering_id)
        if offering is not None:
            item.offering_title_en = offering.title_en
            item.offering_title_ar = offering.title_ar
    return item


def _bookings_for(db: Session, provider_id: str, *, statuses=None, on=None):
    stmt = select(BookingORM).where(BookingORM.provider_id == provider_id)
    if statuses:
        stmt = stmt.where(BookingORM.status.in_(statuses))
    if on is not None:
        stmt = stmt.where(BookingORM.date == on)
    return db.scalars(stmt.order_by(BookingORM.date, BookingORM.start_time)).all()


# ---------------------------------------------------------------------------
# Who can sign in — the demo identity picker's source
# ---------------------------------------------------------------------------
@router.get("/providers", response_model=list[Provider])
def signable_providers(db: Session = Depends(get_db)) -> list[ProviderORM]:
    """Providers a demo user can act as, since there is no real login yet."""
    return list(db.scalars(select(ProviderORM).order_by(ProviderORM.name)).all())


# ---------------------------------------------------------------------------
# G1 — Today
# ---------------------------------------------------------------------------
@router.get("/{provider_id}/today", response_model=GuideToday)
def today(provider_id: str, db: Session = Depends(get_db)) -> GuideToday:
    provider = _provider(db, provider_id)
    at = date.today()

    # A trip leaves `confirmed` the moment the guide starts it, so the running
    # and finished ones have to be listed too or today's work disappears from
    # the screen precisely when it is happening.
    confirmed_today = _bookings_for(
        db,
        provider_id,
        statuses=[
            BookingStatus.confirmed.value,
            BookingStatus.in_progress.value,
            BookingStatus.completed.value,
        ],
        on=at,
    )
    pending = _bookings_for(db, provider_id, statuses=[BookingStatus.pending.value])

    schedule = [_guide_booking(db, row, provider) for row in confirmed_today]
    expiries = [h for h in (_expires_in_hours(row) for row in pending) if h is not None]

    # "Accepting new requests" is the absence of a whole-day block on today.
    blocked_today = db.scalar(
        select(func.count())
        .select_from(AvailabilityBlockORM)
        .where(
            AvailabilityBlockORM.provider_id == provider_id,
            AvailabilityBlockORM.date == at,
            AvailabilityBlockORM.start_time.is_(None),
        )
    )

    return GuideToday(
        provider_id=provider.id,
        provider_name=provider.name,
        accepting=not blocked_today,
        trips_today=len(schedule),
        # Settled where a trip has finished, estimated where it has not — so
        # the day's total stops being a guess as the day goes on.
        earnings_today_jod=round(
            sum(b.final_price_jod if b.final_price_jod is not None else b.price_jod
                for b in confirmed_today),
            2,
        ),
        pending_count=len(pending),
        soonest_expiry_hours=min(expiries) if expiries else None,
        schedule=schedule,
    )


# ---------------------------------------------------------------------------
# G2 — Requests: accept or decline. Not bidding.
# ---------------------------------------------------------------------------
@router.get("/{provider_id}/requests", response_model=list[GuideBooking])
def requests(
    provider_id: str,
    bucket: str = Query(default="new", pattern="^(new|accepted|declined)$"),
    db: Session = Depends(get_db),
) -> list[GuideBooking]:
    provider = _provider(db, provider_id)
    statuses = {
        "new": [BookingStatus.pending.value],
        "accepted": [BookingStatus.confirmed.value],
        # Expired requests belong with the declined ones: both are answered-no.
        "declined": [BookingStatus.declined.value, BookingStatus.expired.value],
    }[bucket]
    rows = _bookings_for(db, provider_id, statuses=statuses)
    return [_guide_booking(db, row, provider) for row in rows]


@router.post("/{provider_id}/requests/{booking_id}/accept", response_model=GuideBooking)
def accept(provider_id: str, booking_id: str, db: Session = Depends(get_db)) -> GuideBooking:
    provider = _provider(db, provider_id)
    row = db.get(BookingORM, booking_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Request not found")
    if row.status != BookingStatus.pending.value:
        raise HTTPException(
            status_code=409, detail=f"This request is already {row.status}"
        )
    row.status = BookingStatus.confirmed.value
    db.commit()
    db.refresh(row)
    return _guide_booking(db, row, provider)


@router.post("/{provider_id}/requests/{booking_id}/decline", response_model=GuideBooking)
def decline(provider_id: str, booking_id: str, db: Session = Depends(get_db)) -> GuideBooking:
    provider = _provider(db, provider_id)
    row = db.get(BookingORM, booking_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Request not found")
    if row.status != BookingStatus.pending.value:
        raise HTTPException(
            status_code=409, detail=f"This request is already {row.status}"
        )
    row.status = BookingStatus.declined.value
    db.commit()
    db.refresh(row)
    return _guide_booking(db, row, provider)


# ---------------------------------------------------------------------------
# Running a trip — the meeting-point handshake and the meter
#
# The tourist's app shows a PIN. The guide types it in front of them, which is
# what proves the two actually met, and that starts the clock. Ending the trip
# settles the real price from measured time, so a trip that runs short costs
# less than its estimate.
# ---------------------------------------------------------------------------
@router.post("/{provider_id}/trips/{booking_id}/start", response_model=GuideBooking)
def start_trip(
    provider_id: str,
    booking_id: str,
    payload: TripStartRequest,
    db: Session = Depends(get_db),
) -> GuideBooking:
    provider = _provider(db, provider_id)
    row = db.get(BookingORM, booking_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    if row.status == BookingStatus.in_progress.value:
        raise HTTPException(status_code=409, detail="This trip has already started")
    if row.status != BookingStatus.confirmed.value:
        raise HTTPException(
            status_code=409,
            detail=f"A {row.status} booking cannot be started",
        )
    if not row.pin or payload.pin.strip() != row.pin:
        # Deliberately says nothing about the real code.
        raise HTTPException(status_code=403, detail="That PIN does not match")

    row.status = BookingStatus.in_progress.value
    row.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _guide_booking(db, row, provider)


@router.post("/{provider_id}/trips/{booking_id}/end", response_model=GuideBooking)
def end_trip(
    provider_id: str, booking_id: str, db: Session = Depends(get_db)
) -> GuideBooking:
    provider = _provider(db, provider_id)
    row = db.get(BookingORM, booking_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    if row.status != BookingStatus.in_progress.value:
        raise HTTPException(status_code=409, detail="This trip is not running")

    row.ended_at = datetime.now(timezone.utc)
    row.status = BookingStatus.completed.value
    minutes = max(0, int((row.ended_at - row.started_at).total_seconds() // 60))
    row.final_price_jod = settle(
        Provider.model_validate(provider, from_attributes=True),
        minutes,
        group_size=row.group_size,
    ).total_jod
    db.commit()
    db.refresh(row)
    return _guide_booking(db, row, provider)


# ---------------------------------------------------------------------------
# G3 — Calendar and availability
# ---------------------------------------------------------------------------
@router.get("/{provider_id}/calendar", response_model=list[GuideBooking])
def calendar(
    provider_id: str,
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
) -> list[GuideBooking]:
    """Every booking in a month, whatever its state, so the legend can colour it."""
    provider = _provider(db, provider_id)
    stmt = select(BookingORM).where(BookingORM.provider_id == provider_id)
    if month:
        year, mon = (int(part) for part in month.split("-"))
        start = date(year, mon, 1)
        end = date(year + (mon == 12), (mon % 12) + 1, 1)
        stmt = stmt.where(BookingORM.date >= start, BookingORM.date < end)
    rows = db.scalars(stmt.order_by(BookingORM.date, BookingORM.start_time)).all()
    return [_guide_booking(db, row, provider) for row in rows]


@router.get("/{provider_id}/availability", response_model=list[AvailabilityBlock])
def list_blocks(
    provider_id: str,
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
) -> list[AvailabilityBlockORM]:
    _provider(db, provider_id)
    stmt = select(AvailabilityBlockORM).where(
        AvailabilityBlockORM.provider_id == provider_id
    )
    if month:
        year, mon = (int(part) for part in month.split("-"))
        start = date(year, mon, 1)
        end = date(year + (mon == 12), (mon % 12) + 1, 1)
        stmt = stmt.where(
            AvailabilityBlockORM.date >= start, AvailabilityBlockORM.date < end
        )
    return list(db.scalars(stmt.order_by(AvailabilityBlockORM.date)).all())


@router.post("/{provider_id}/availability", response_model=AvailabilityBlock)
def add_block(
    provider_id: str,
    payload: AvailabilityBlockCreate,
    db: Session = Depends(get_db),
) -> AvailabilityBlockORM:
    _provider(db, provider_id)
    # Postgres treats NULLs as distinct in a unique index, so a whole-day block
    # would happily insert twice. Check explicitly instead.
    clash = db.scalar(
        select(AvailabilityBlockORM).where(
            AvailabilityBlockORM.provider_id == provider_id,
            AvailabilityBlockORM.date == payload.date,
            AvailabilityBlockORM.start_time.is_(payload.start_time)
            if payload.start_time is None
            else AvailabilityBlockORM.start_time == payload.start_time,
        )
    )
    if clash is not None:
        return clash  # idempotent: blocking a blocked day is not an error

    row = AvailabilityBlockORM(
        id=f"blk-{uuid.uuid4().hex[:8]}",
        provider_id=provider_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reason=payload.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{provider_id}/availability/{block_id}", status_code=204)
def remove_block(provider_id: str, block_id: str, db: Session = Depends(get_db)) -> None:
    """"Open a slot" — the inverse of blocking it."""
    row = db.get(AvailabilityBlockORM, block_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Block not found")
    db.delete(row)
    db.commit()


# ---------------------------------------------------------------------------
# G4 — Earnings. Mocked, and said so.
# ---------------------------------------------------------------------------
@router.get("/{provider_id}/earnings", response_model=GuideEarnings)
def earnings(provider_id: str, db: Session = Depends(get_db)) -> GuideEarnings:
    """Totals over real bookings, at prices that are demo pricing throughout.

    `is_mock` is always true and the UI must show the same amber disclosure it
    shows anywhere else a price appears. No money has moved: there is no
    payment provider, no payout schedule and no account behind any of this.
    """
    provider = _provider(db, provider_id)
    rows = _bookings_for(db, provider_id)
    today_ = date.today()

    confirmed = [r for r in rows if r.status == BookingStatus.confirmed.value]
    # "Available" = trips already delivered. "Pending" = accepted but upcoming.
    available = sum(r.price_jod for r in confirmed if r.date < today_)
    upcoming = sum(r.price_jod for r in confirmed if r.date >= today_)
    this_month = sum(
        r.price_jod
        for r in confirmed
        if (r.date.year, r.date.month) == (today_.year, today_.month)
    )

    # Six months back, oldest first, so the chart reads left to right.
    months: list[EarningsMonth] = []
    for offset in range(5, -1, -1):
        y, m = today_.year, today_.month - offset
        while m <= 0:
            m += 12
            y -= 1
        total = sum(
            r.price_jod for r in confirmed if (r.date.year, r.date.month) == (y, m)
        )
        months.append(
            EarningsMonth(label=date(y, m, 1).strftime("%b"), total_jod=round(total, 2))
        )

    recent = sorted(confirmed, key=lambda r: r.date, reverse=True)[:6]
    return GuideEarnings(
        available_jod=round(available, 2),
        pending_jod=round(upcoming, 2),
        this_month_jod=round(this_month, 2),
        # No payout schedule exists; left null rather than inventing a date.
        next_payout=None,
        months=months,
        recent=[_guide_booking(db, r, provider) for r in recent],
        is_mock=True,
    )


# ---------------------------------------------------------------------------
# G5 — Offerings
# ---------------------------------------------------------------------------
def _offering(db: Session, row: OfferingORM) -> Offering:
    item = Offering.model_validate(row, from_attributes=True)
    item.trips = (
        db.scalar(
            select(func.count())
            .select_from(BookingORM)
            .where(
                BookingORM.offering_id == row.id,
                BookingORM.status == BookingStatus.confirmed.value,
            )
        )
        or 0
    )
    if row.landmark_id:
        landmark = db.get(LandmarkORM, row.landmark_id)
        if landmark is not None:
            item.landmark_name_en = landmark.name_en
            item.landmark_name_ar = landmark.name_ar
    return item


@router.get("/{provider_id}/offerings", response_model=list[Offering])
def list_offerings(provider_id: str, db: Session = Depends(get_db)) -> list[Offering]:
    _provider(db, provider_id)
    rows = db.scalars(
        select(OfferingORM)
        .where(OfferingORM.provider_id == provider_id)
        # Live first, then paused, then drafts — the order G5 shows them in.
        .order_by(OfferingORM.status, OfferingORM.created_at)
    ).all()
    order = {"live": 0, "paused": 1, "draft": 2}
    rows = sorted(rows, key=lambda r: (order.get(r.status, 3), r.created_at))
    return [_offering(db, row) for row in rows]


@router.post("/{provider_id}/offerings", response_model=Offering)
def create_offering(
    provider_id: str, payload: OfferingCreate, db: Session = Depends(get_db)
) -> Offering:
    _provider(db, provider_id)
    row = OfferingORM(
        id=f"off-{uuid.uuid4().hex[:8]}",
        provider_id=provider_id,
        **payload.model_dump(exclude={"status"}),
        status=payload.status.value,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _offering(db, row)


@router.patch("/{provider_id}/offerings/{offering_id}", response_model=Offering)
def update_offering(
    provider_id: str,
    offering_id: str,
    payload: OfferingUpdate,
    db: Session = Depends(get_db),
) -> Offering:
    row = db.get(OfferingORM, offering_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Offering not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value.value if isinstance(value, OfferingStatus) else value)
    db.commit()
    db.refresh(row)
    return _offering(db, row)


@router.delete("/{provider_id}/offerings/{offering_id}", status_code=204)
def delete_offering(
    provider_id: str, offering_id: str, db: Session = Depends(get_db)
) -> None:
    row = db.get(OfferingORM, offering_id)
    if row is None or row.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Offering not found")
    db.delete(row)
    db.commit()


# ---------------------------------------------------------------------------
# G6 — Profile
# ---------------------------------------------------------------------------
@router.get("/{provider_id}/profile", response_model=Provider)
def profile(provider_id: str, db: Session = Depends(get_db)) -> ProviderORM:
    return _provider(db, provider_id)


@router.patch("/{provider_id}/profile", response_model=Provider)
def update_profile(
    provider_id: str, payload: dict, db: Session = Depends(get_db)
) -> ProviderORM:
    """Edit the fields a provider owns.

    Deliberately narrow. `verified` and `welfare_compliant` are *not* editable
    here — a provider marking themselves verified would make the badge
    worthless, and awarding it is what the unbuilt verification flow is for.
    """
    row = _provider(db, provider_id)
    editable = {
        "name",
        "bio_en",
        "bio_ar",
        "languages",
        "landmark_ids",
        "hourly_rate_jod",
        "accessibility_tags",
    }
    unknown = set(payload) - editable
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Not editable here: {', '.join(sorted(unknown))}",
        )
    for field, value in payload.items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row
