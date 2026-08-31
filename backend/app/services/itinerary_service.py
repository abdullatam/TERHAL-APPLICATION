"""Builds a multi-attraction day-by-day itinerary from the curated knowledge base.

Rule-based for the MVP demo: spreads attractions across the requested trip
length and excludes any the accessibility notes flag as unsuitable when
accessibility needs are set. Swap in an LLM-backed reorder/optimizer here
post-MVP.
"""
from app.data.landmarks import LANDMARKS
from app.models import Itinerary, ItineraryRequest, ItineraryStop
from app.store import store

DEFAULT_ORDER = [
    "wadi_musa",
    "petra",
    "little_petra",
    "wadi_trails",
    "shobak_castle",
    "udhruh",
]

START_TIMES = ["08:00", "13:30", "16:00"]


def generate_itinerary(req: ItineraryRequest) -> Itinerary:
    candidates = [
        landmark_id for landmark_id in DEFAULT_ORDER
        if not req.accessibility_needs or (
            "not wheelchair" not in LANDMARKS[landmark_id].accessibility_notes.lower()
            and "not accessible" not in LANDMARKS[landmark_id].accessibility_notes.lower()
        )
    ] or DEFAULT_ORDER

    max_stops = min(len(candidates), max(1, req.trip_days) * 2)
    chosen = candidates[:max_stops]

    stops: list[ItineraryStop] = []
    for i, landmark_id in enumerate(chosen):
        landmark = LANDMARKS[landmark_id]
        stops.append(
            ItineraryStop(
                landmark_id=landmark_id,
                order=i + 1,
                start_time=START_TIMES[i % len(START_TIMES)],
                duration_minutes=landmark.avg_visit_minutes,
                notes=landmark.accessibility_notes if req.accessibility_needs else "",
            )
        )

    itinerary = Itinerary(
        id=store.new_id("itin"),
        stops=stops,
        accessibility_friendly=req.accessibility_needs,
    )
    store.itineraries[itinerary.id] = itinerary
    return itinerary
