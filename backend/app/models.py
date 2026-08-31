"""Pydantic domain models shared across routers and services."""
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SiteId(str, Enum):
    petra = "petra"
    little_petra = "little_petra"
    shobak_castle = "shobak_castle"
    wadi_musa = "wadi_musa"
    wadi_trails = "wadi_trails"
    udhruh = "udhruh"


class ProviderRole(str, Enum):
    guide = "guide"
    driver = "driver"
    vendor = "vendor"
    animal_operator = "animal_operator"


class Language(str, Enum):
    ar = "ar"
    en = "en"


class Site(BaseModel):
    id: SiteId
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    avg_visit_minutes: int
    accessibility_notes: str


class Landmark(BaseModel):
    id: str
    site: SiteId
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    image_url: Optional[str] = None
    image_attribution: Optional[str] = None


class ItineraryStop(BaseModel):
    site: SiteId
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
    sites: list[SiteId]
    languages: list[Language]
    rating: float = Field(ge=0, le=5, default=5.0)
    verified: bool = False
    welfare_compliant: bool = False
    accessibility_tags: list[str] = []


class ProviderRegistration(BaseModel):
    name: str
    role: ProviderRole
    sites: list[SiteId]
    languages: list[Language]


class TripRequest(BaseModel):
    id: str
    itinerary_id: str
    site: SiteId
    date: date
    group_size: int
    language: Language
    specialty: Optional[str] = None
    accessibility_needs: bool = False


class TripRequestCreate(BaseModel):
    itinerary_id: str
    site: SiteId
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
    site: Optional[SiteId]
    landmark: str
    narration: str
    language: Language
