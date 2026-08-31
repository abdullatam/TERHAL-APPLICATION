"""Pydantic domain models shared across routers and services."""
from datetime import date
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


class Landmark(BaseModel):
    """A tourist attraction in Ma'an governorate — the sole place entity in
    the data model. Ranges from a whole area (Petra, Wadi Musa town) to a
    single monument (the Treasury, the Siq) — there's no separate "site"
    grouping above it, every attraction stands on its own.
    """

    id: str
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    avg_visit_minutes: int
    accessibility_notes: str
    image_url: Optional[str] = None
    image_attribution: Optional[str] = None


class ItineraryStop(BaseModel):
    landmark_id: str
    order: int
    start_time: str
    duration_minutes: int
    notes: str = ""


class ItineraryRequest(BaseModel):
    interests: list[str]
    trip_days: int = Field(ge=1, le=14)
    accessibility_needs: bool = False
    language: Language = Language.en


class Itinerary(BaseModel):
    id: str
    stops: list[ItineraryStop]
    accessibility_friendly: bool


class Provider(BaseModel):
    id: str
    name: str
    role: ProviderRole
    landmark_ids: list[str]
    languages: list[Language]
    rating: float = Field(ge=0, le=5, default=5.0)
    verified: bool = False
    welfare_compliant: bool = False
    accessibility_tags: list[str] = []


class ProviderRegistration(BaseModel):
    name: str
    role: ProviderRole
    landmark_ids: list[str]
    languages: list[Language]


class TripRequest(BaseModel):
    id: str
    itinerary_id: str
    landmark_id: str
    date: date
    group_size: int
    language: Language
    specialty: Optional[str] = None
    accessibility_needs: bool = False


class TripRequestCreate(BaseModel):
    itinerary_id: str
    landmark_id: str
    date: date
    group_size: int = Field(ge=1)
    language: Language = Language.en
    specialty: Optional[str] = None
    accessibility_needs: bool = False


class Bid(BaseModel):
    id: str
    request_id: str
    provider_id: str
    price: float
    message: str = ""
    accepted: bool = False


class BidCreate(BaseModel):
    provider_id: str
    price: float = Field(gt=0)
    message: str = ""


class VisionIdentifyResult(BaseModel):
    landmark_id: Optional[str]
    landmark: str
    narration: str
    language: Language
