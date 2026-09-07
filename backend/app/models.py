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
    """A booking's life.

    `pending` is where every booking now starts: the tourist has asked, the
    guide has not answered. It was in this enum unused until the guide app
    gave it a meaning.
    """

    pending = "pending"
    confirmed = "confirmed"
    declined = "declined"
    expired = "expired"
    cancelled = "cancelled"
    # The guide entered the tourist's PIN at the meeting point and the clock
    # is running; then the guide ended it and the real price was settled.
    in_progress = "in_progress"
    completed = "completed"


class LandmarkImage(BaseModel):
    """One image in a landmark's gallery.

    Licence and attribution are required, not optional: an image nobody can
    prove the rights to is worse than no image, and this is a commercial
    product pitch.
    """

    model_config = {"from_attributes": True}

    position: int
    url: str
    source: str
    license: str
    attribution_text: str
    caption_en: Optional[str] = None
    caption_ar: Optional[str] = None


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
    # The gallery behind the hero shot, ordered by position. Empty until the
    # image-sourcing pass fills data/landmark_images.csv for this place.
    images: list["LandmarkImage"] = []
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
    hourly_rate_jod: Optional[float] = None
    # True while this is what the trip is expected to cost; False once it is
    # what the trip did cost. The UI must not present the two the same way.
    is_estimate: bool = True
    # Real minutes between the guide starting and ending the trip, on a
    # settled price only.
    elapsed_minutes: Optional[int] = None
    is_mock: bool = True


class ProviderWithDistance(Provider):
    distance_km: Optional[float] = None
    quote: Optional[Quote] = None


class BookingCreate(BaseModel):
    provider_id: str
    itinerary_id: Optional[str] = None
    # Set when the tourist booked a named offering rather than hours of a
    # guide's time. Nullable so the existing hourly flow keeps working.
    offering_id: Optional[str] = None
    date: date
    start_time: str = "09:00"
    hours: int = Field(ge=1, le=12, default=4)
    group_size: int = Field(ge=1, le=40, default=2)


class Booking(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    provider_id: str
    itinerary_id: Optional[str] = None
    offering_id: Optional[str] = None
    # When the guide's window to answer closes. Null once answered.
    responds_by: Optional[datetime] = None
    date: date
    start_time: str
    hours: int
    group_size: int
    # The estimate agreed at booking. The final figure is final_price_jod.
    price_jod: float
    price_is_mock: bool = True
    status: BookingStatus = BookingStatus.confirmed
    created_at: datetime

    # The trip itself, once it runs.
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    final_price_jod: Optional[float] = None


class BookingDetail(Booking):
    provider: Optional[Provider] = None
    # What it is expected to cost, from the planned timeline.
    quote: Optional[Quote] = None
    # What it did cost, present only once the trip has ended.
    final_quote: Optional[Quote] = None
    # The tourist's meeting-point PIN. Only ever sent to the tourist's own
    # views — the guide is asked to type it, never shown it.
    pin: Optional[str] = None
    elapsed_minutes: Optional[int] = None


class TripStartRequest(BaseModel):
    """The guide types the four digits the tourist is holding."""

    pin: str = Field(min_length=1, max_length=12)


class VisionMode(str, Enum):
    """What the camera is being asked to do — the design's three-way switch."""

    identify = "identify"
    frame = "frame"
    sign = "sign"


class VisionIdentifyResult(BaseModel):
    landmark_id: Optional[str]
    landmark: str
    narration: str
    language: Language
    mode: VisionMode = VisionMode.identify
    # Whether the model actually recognised something in the knowledge base.
    matched: bool = False
    # 0-100. Real, from the model, and the reason the design can show a score.
    confidence: Optional[int] = None
    name_ar: Optional[str] = None
    # "Nabataean tomb · 1st century BCE · Petra"
    subtitle: Optional[str] = None
    # The design's bottom-left chip: "Step back 4 m for the full facade".
    framing_tip: Optional[str] = None
    # Which landmark to add to a trip: a stop's parent is the bookable place.
    add_to_trip_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Ma'an Passport (screen 05)
#
# Derived, not stored. A stamp is a landmark the traveller has actually been
# taken to: a confirmed booking whose date has passed, whose advisor covers
# that landmark. Nothing new is persisted, so there is no second source of
# truth to keep in step with the bookings table.
# ---------------------------------------------------------------------------
class PassportStamp(BaseModel):
    landmark_id: str
    name_en: str
    name_ar: str
    image_url: Optional[str] = None
    # Where it is, so a locked stamp can say how far away it still is rather
    # than repeating the same generic sentence on every row.
    lat: Optional[float] = None
    lon: Optional[float] = None
    stamped: bool
    # Set only when stamped: the booking that earned it.
    stamped_on: Optional[date] = None
    booking_id: Optional[str] = None
    # Set only when not stamped: why it is still locked.
    locked_reason_en: Optional[str] = None
    locked_reason_ar: Optional[str] = None


class Passport(BaseModel):
    collected: int
    total: int
    percent: int
    stamps: list[PassportStamp]


# ---------------------------------------------------------------------------
# Marketplace (screen 06)
#
# Vendors are real rows in the providers table. Their *products* are not
# modelled anywhere — see the TODO on the router. `items` is therefore an
# honest empty list rather than invented stock, and `items_pending` tells the
# UI to say so instead of rendering an empty shelf.
# ---------------------------------------------------------------------------
class MarketItem(BaseModel):
    id: str
    title_en: str
    title_ar: str
    price_jod: float
    image_url: Optional[str] = None


class Maker(BaseModel):
    id: str
    name: str
    role: ProviderRole
    rating: float
    verified: bool
    bio_en: Optional[str] = None
    bio_ar: Optional[str] = None
    photo_url: Optional[str] = None
    # Where they work, resolved to landmark names for display.
    based_at_en: Optional[str] = None
    based_at_ar: Optional[str] = None
    items: list[MarketItem] = []


class Marketplace(BaseModel):
    makers: list[Maker]
    # True while no product catalogue exists in the data model.
    items_pending: bool


# ---------------------------------------------------------------------------
# Post-trip review (screen 07)
# ---------------------------------------------------------------------------
class ReviewCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    tags: list[str] = []
    comment: Optional[str] = None


class Review(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    booking_id: str
    provider_id: str
    stars: int
    tags: list[str] = []
    comment: Optional[str] = None
    created_at: datetime


class ReviewWithContext(Review):
    """A review plus enough of its booking to show it in a list."""

    provider_name: Optional[str] = None
    provider_role: Optional[str] = None
    booking_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Guide app (the provider-facing half)
# ---------------------------------------------------------------------------
class OfferingStatus(str, Enum):
    live = "live"
    paused = "paused"
    draft = "draft"


class OfferingBase(BaseModel):
    title_en: str
    title_ar: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    hours: int = Field(ge=1, le=24)
    max_group: int = Field(ge=1, le=60)
    price_jod: float = Field(ge=0)
    landmark_id: Optional[str] = None
    status: OfferingStatus = OfferingStatus.draft


class OfferingCreate(OfferingBase):
    pass


class OfferingUpdate(BaseModel):
    """Every field optional — this is a PATCH."""

    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    hours: Optional[int] = Field(default=None, ge=1, le=24)
    max_group: Optional[int] = Field(default=None, ge=1, le=60)
    price_jod: Optional[float] = Field(default=None, ge=0)
    landmark_id: Optional[str] = None
    status: Optional[OfferingStatus] = None


class Offering(OfferingBase):
    model_config = {"from_attributes": True}

    id: str
    provider_id: str
    created_at: datetime
    # Derived, not stored: how many bookings this offering has taken.
    trips: int = 0
    # The place it runs at, resolved for display.
    landmark_name_en: Optional[str] = None
    landmark_name_ar: Optional[str] = None


class AvailabilityBlockCreate(BaseModel):
    date: date
    # Omit both for a whole-day block, which is what "Block this day" sends.
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None


class AvailabilityBlock(AvailabilityBlockCreate):
    model_config = {"from_attributes": True}

    id: str
    provider_id: str


class GuideBooking(BookingDetail):
    """A booking as the guide sees it: the tourist's side plus the offering."""

    offering_id: Optional[str] = None
    offering_title_en: Optional[str] = None
    offering_title_ar: Optional[str] = None
    # Hours left to answer, for the Requests countdown. None once answered.
    expires_in_hours: Optional[int] = None


class GuideToday(BaseModel):
    """G1's dashboard numbers, all derived from real bookings."""

    provider_id: str
    provider_name: str
    accepting: bool
    trips_today: int
    earnings_today_jod: float
    pending_count: int
    # Hours until the soonest pending request expires, if there is one.
    soonest_expiry_hours: Optional[int] = None
    schedule: list[GuideBooking] = []


class GuideEarnings(BaseModel):
    """G4. Every figure here is demo pricing, like every price in the app."""

    available_jod: float
    pending_jod: float
    this_month_jod: float
    next_payout: Optional[date] = None
    months: list["EarningsMonth"] = []
    recent: list[GuideBooking] = []
    is_mock: bool = True


class EarningsMonth(BaseModel):
    label: str
    total_jod: float
