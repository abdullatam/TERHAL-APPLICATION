"""SQLAlchemy ORM tables, mirroring the Pydantic models in app/models.py."""
from datetime import date

from sqlalchemy import ARRAY, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class LandmarkORM(Base):
    """Every tourist attraction in Ma'an governorate — no separate "site"
    grouping above it; a whole area (Petra) and a single monument (the
    Treasury) are both just rows here, each with its own visit duration
    and accessibility notes.
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


class ItineraryORM(Base):
    __tablename__ = "itineraries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    accessibility_friendly: Mapped[bool] = mapped_column(Boolean, default=False)

    stops: Mapped[list["ItineraryStopORM"]] = relationship(
        back_populates="itinerary", order_by="ItineraryStopORM.order", cascade="all, delete-orphan"
    )


class ItineraryStopORM(Base):
    __tablename__ = "itinerary_stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    itinerary_id: Mapped[str] = mapped_column(ForeignKey("itineraries.id"))
    landmark_id: Mapped[str] = mapped_column(ForeignKey("landmarks.id"))
    order: Mapped[int] = mapped_column("stop_order", Integer)
    start_time: Mapped[str] = mapped_column(String)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(Text, default="")

    itinerary: Mapped["ItineraryORM"] = relationship(back_populates="stops")


class TripRequestORM(Base):
    __tablename__ = "trip_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    itinerary_id: Mapped[str] = mapped_column(ForeignKey("itineraries.id"))
    landmark_id: Mapped[str] = mapped_column(ForeignKey("landmarks.id"))
    date: Mapped[date] = mapped_column(Date)
    group_size: Mapped[int] = mapped_column(Integer)
    language: Mapped[str] = mapped_column(String)
    specialty: Mapped[str | None] = mapped_column(String, nullable=True)
    accessibility_needs: Mapped[bool] = mapped_column(Boolean, default=False)


class BidORM(Base):
    __tablename__ = "bids"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("trip_requests.id"))
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"))
    price: Mapped[float] = mapped_column()
    message: Mapped[str] = mapped_column(Text, default="")
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)
