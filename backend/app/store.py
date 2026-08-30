"""In-memory data store for the MVP demo (no DB wiring needed for the hackathon)."""
import uuid

from app.data.mock_providers import MOCK_PROVIDERS
from app.models import Bid, Itinerary, Provider, TripRequest


class Store:
    def __init__(self) -> None:
        self.providers: dict[str, Provider] = {p.id: p for p in MOCK_PROVIDERS}
        self.itineraries: dict[str, Itinerary] = {}
        self.requests: dict[str, TripRequest] = {}
        self.bids: dict[str, Bid] = {}

    @staticmethod
    def new_id(prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:8]}"


store = Store()
