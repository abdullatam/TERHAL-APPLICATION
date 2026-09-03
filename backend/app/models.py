"""Pydantic domain models shared across routers and services."""
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProviderRole(str, Enum):
    guide = "guide"
    driver = "driver"
    vendor = "vendor"
    animal_operator = "animal_operator"


class Language(str, Enum):
    ar = "ar"
    en = "en"


class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


class Landmark(BaseModel):
    """A tourist attraction in Ma'an governorate — the sole place entity in
    the data model. Ranges from a whole area (Petra, Wadi Musa town) to a
    single monument (the Treasury); `parent_id` is what separates the two.
    A landmark with no parent is a destination in its own right and appears
    in the swipe deck; one with a parent is a stop inside its parent.
    """

    model_config = {"from_attributes": True}

    id: str
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    avg_visit_minutes: int
    accessibility_notes: str
    image_url: Optional[str] = None
    image_attribution: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    source_url: Optional[str] = None

    # Phase 2 depth — present only where the research phase produced it.
    parent_id: Optional[str] = None
    category: Optional[str] = None
    history_en: Optional[str] = None
    history_ar: Optional[str] = None
    significance_en: Optional[str] = None
    significance_ar: Optional[str] = None
    narration_en: Optional[str] = None
    narration_ar: Optional[str] = None
    difficulty: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    requires_guide: Optional[bool] = None
    entrance_fee_notes: Optional[str] = None
    active: bool = True


class ItineraryRequest(BaseModel):
    """Built from the swipe deck: the ids the tourist swiped right on."""

    landmark_ids: list[str] = Field(min_length=1)
    trip_days: int = Field(ge=1, le=14, default=2)
    accessibility_needs: bool = False
    language: Language = Language.en


class TimelineStop(BaseModel):
    kind: str = "landmark"  # "landmark" | "break"
    landmark_id: Optional[str] = None
    name_en: str
    name_ar: str
    image_url: Optional[str] = None
    day: int
    order: int
    start_time: str
    end_time: str
    duration_minutes: int
    travel_minutes_from_prev: int = 0
    accessibility_notes: Optional[str] = None
    difficulty: Optional[str] = None
    requires_guide: Optional[bool] = None


class TimelineDay(BaseModel):
    day: int
    stops: list[TimelineStop]


class ExcludedLandmark(BaseModel):
    landmark_id: str
    name_en: str
    name_ar: str
    reason_en: str
    reason_ar: str


class Itinerary(BaseModel):
    id: str
    trip_days: int
    accessibility_friendly: bool
    days: list[TimelineDay]
    excluded: list[ExcludedLandmark] = []


class Provider(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    role: ProviderRole
    landmark_ids: list[str]
    languages: list[Language]
    rating: float = Field(ge=0, le=5, default=5.0)
    verified: bool = False
    welfare_compliant: bool = False
    accessibility_tags: list[str] = []
    lat: Optional[float] = None
    lon: Optional[float] = None
    hourly_rate_jod: Optional[float] = None
    bio_en: Optional[str] = None
    bio_ar: Optional[str] = None
    photo_url: Optional[str] = None


class PriceLine(BaseModel):
    label_en: str
    label_ar: str
    amount_jod: float


class Quote(BaseModel):
    """Every price the app shows carries its own breakdown and a mock flag —
    nothing displays a bare number the tourist cannot interrogate."""

    total_jod: float
    currency: str = "JOD"
    hours: int
    group_size: int
    breakdown: list[PriceLine]
    is_mock: bool = True


class ProviderWithDistance(Provider):
    distance_km: Optional[float] = None
    quote: Optional[Quote] = None


class BookingCreate(BaseModel):
    provider_id: str
    itinerary_id: Optional[str] = None
    date: date
    start_time: str = "09:00"
    hours: int = Field(ge=1, le=12, default=4)
    group_size: int = Field(ge=1, le=40, default=2)


class Booking(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    provider_id: str
    itinerary_id: Optional[str] = None
    date: date
    start_time: str
    hours: int
    group_size: int
    price_jod: float
    price_is_mock: bool = True
    status: BookingStatus = BookingStatus.confirmed
    created_at: datetime


class BookingDetail(Booking):
    provider: Optional[Provider] = None
    quote: Optional[Quote] = None


class VisionIdentifyResult(BaseModel):
    landmark_id: Optional[str]
    landmark: str
    narration: str
    language: Language
