"""SQLAlchemy ORM tables, mirroring the Pydantic models in app/models.py."""
from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class LandmarkORM(Base):
    """Every tourist attraction in Ma'an governorate. A whole area (Petra) and
    a single monument (the Treasury) are both rows here; `parent_id` is the
    only thing separating a destination from a stop inside one.
    """

    __tablename__ = "landmarks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name_en: Mapped[str] = mapped_column(String)
    name_ar: Mapped[str] = mapped_column(String)
    description_en: Mapped[str] = mapped_column(Text)
    description_ar: Mapped[str] = mapped_column(Text)
    avg_visit_minutes: Mapped[int] = mapped_column(Integer)
    accessibility_notes: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    image_attribution: Mapped[str | None] = mapped_column(String, nullable=True)

    # Ordered so the API never has to sort, and cascade-deleted with the place.
    images: Mapped[list["LandmarkImageORM"]] = relationship(
        "LandmarkImageORM",
        order_by="LandmarkImageORM.position",
        cascade="all, delete-orphan",
        lazy="selectin",  # one extra query for the whole deck, not one per card
    )
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase 2 depth. Nullable throughout — Group 3 was never delivered, so a
    # third of the dataset legitimately has none of this.
    parent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    history_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    history_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    significance_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    significance_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    narration_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    narration_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String, nullable=True)
    best_time_to_visit: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_guide: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    entrance_fee_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class LandmarkImageORM(Base):
    """A gallery of images per landmark, three to a place.

    `landmarks.image_url` stays as it is — it is the single hero shot the swipe
    deck and timeline use. This table is the gallery behind it, so a card can
    open into several views of the same site.

    Unique on (landmark_id, position) so a re-run replaces image 2 of a site
    instead of appending a fourth. Licence and attribution are NOT NULL: an
    image nobody can prove the rights to is worse than no image, and this is a
    commercial product pitch.
    """

    __tablename__ = "landmark_images"
    __table_args__ = (
        UniqueConstraint("landmark_id", "position", name="uq_landmark_image_position"),
        CheckConstraint("position >= 1", name="ck_landmark_image_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    landmark_id: Mapped[str] = mapped_column(ForeignKey("landmarks.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    url: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String)
    license: Mapped[str] = mapped_column(String)
    attribution_text: Mapped[str] = mapped_column(Text)
    caption_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    caption_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    researcher: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ProviderORM(Base):
    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    landmark_ids: Mapped[list[str]] = mapped_column(ARRAY(String))
    languages: Mapped[list[str]] = mapped_column(ARRAY(String))
    rating: Mapped[float] = mapped_column(default=5.0)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    welfare_compliant: Mapped[bool] = mapped_column(Boolean, default=False)
    accessibility_tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # Mock "currently working near here" position, used by the advisor map.
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    hourly_rate_jod: Mapped[float | None] = mapped_column(Float, nullable=True)
    bio_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)


class ItineraryORM(Base):
    __tablename__ = "itineraries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    accessibility_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    trip_days: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    stops: Mapped[list["ItineraryStopORM"]] = relationship(
        back_populates="itinerary",
        order_by="ItineraryStopORM.order",
        cascade="all, delete-orphan",
    )


class ItineraryStopORM(Base):
    __tablename__ = "itinerary_stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    itinerary_id: Mapped[str] = mapped_column(ForeignKey("itineraries.id"))
    # Null for a break (lunch), which is a real row on the timeline but not a place.
    landmark_id: Mapped[str | None] = mapped_column(
        ForeignKey("landmarks.id"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String, default="landmark", server_default="landmark")
    day: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    order: Mapped[int] = mapped_column("stop_order", Integer)
    start_time: Mapped[str] = mapped_column(String)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    travel_minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    notes: Mapped[str] = mapped_column(Text, default="")

    itinerary: Mapped["ItineraryORM"] = relationship(back_populates="stops")


class BookingORM(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"))
    itinerary_id: Mapped[str | None] = mapped_column(
        ForeignKey("itineraries.id"), nullable=True
    )
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[str] = mapped_column(String)
    hours: Mapped[int] = mapped_column(Integer)
    group_size: Mapped[int] = mapped_column(Integer)
    price_jod: Mapped[float] = mapped_column(Float)
    # Every stored price is flagged, so a real price can never be confused with
    # a demo one once the pricing formula lands.
    price_is_mock: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    status: Mapped[str] = mapped_column(String, default="pending")
    # Which offering was booked, when the tourist picked one. Nullable because
    # bookings predate offerings and a guide can still be booked by the hour.
    offering_id: Mapped[str | None] = mapped_column(
        ForeignKey("offerings.id", ondelete="SET NULL"), nullable=True
    )
    # The guide has until this moment to accept or decline. Set on creation.
    responds_by: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ReviewORM(Base):
    """A post-trip review, one per booking.

    New in the Terhal redesign (screen 07). Reviews are stored rather than
    derived because they are user-authored content — there is nothing to
    derive them from. `booking_id` is unique: a trip gets reviewed once, and
    re-submitting updates rather than duplicates.
    """

    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    booking_id: Mapped[str] = mapped_column(
        ForeignKey("bookings.id"), unique=True, index=True
    )
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), index=True)
    stars: Mapped[int] = mapped_column(Integer)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class OfferingORM(Base):
    """A named experience a guide sells — "Sunset ridge walk + supper".

    New for the guide app. The tourist app priced a booking as
    hourly_rate_jod x hours with no concept of a named product, but four of the
    six guide screens display offerings by name, so this is what they display.
    """

    __tablename__ = "offerings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(
        ForeignKey("providers.id", ondelete="CASCADE"), index=True
    )
    title_en: Mapped[str] = mapped_column(String)
    title_ar: Mapped[str] = mapped_column(String)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    hours: Mapped[int] = mapped_column(Integer)
    max_group: Mapped[int] = mapped_column(Integer)
    price_jod: Mapped[float] = mapped_column(Float)
    # Where it runs. Nullable: some offerings are not tied to one place.
    landmark_id: Mapped[str | None] = mapped_column(
        ForeignKey("landmarks.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AvailabilityBlockORM(Base):
    """A date, or a slice of one, the guide has marked unavailable.

    A whole-day block leaves start_time and end_time null — that is what G3's
    "Block this day" writes. A partial block carries both.
    """

    __tablename__ = "availability_blocks"
    __table_args__ = (
        UniqueConstraint(
            "provider_id", "date", "start_time", name="uq_availability_slot"
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider_id: Mapped[str] = mapped_column(
        ForeignKey("providers.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[str | None] = mapped_column(String, nullable=True)
    end_time: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
