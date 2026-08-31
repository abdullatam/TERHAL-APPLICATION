"""Builds a multi-site day-by-day itinerary from the curated site knowledge base.

Rule-based for the MVP demo: spreads sites across the requested trip length and
excludes sites the accessibility notes flag as unsuitable when accessibility
needs are set. Swap in an LLM-backed reorder/optimizer here post-MVP.
"""
from app.data.sites import SITES
from app.models import Itinerary, ItineraryRequest, ItineraryStop, SiteId
from app.store import store

DEFAULT_ORDER = [
    SiteId.wadi_musa,
    SiteId.petra,
    SiteId.little_petra,
    SiteId.wadi_trails,
    SiteId.shobak_castle,
    SiteId.udhruh,
]

START_TIMES = ["08:00", "13:30", "16:00"]


def generate_itinerary(req: ItineraryRequest) -> Itinerary:
    candidates = [
        s for s in DEFAULT_ORDER
        if not req.accessibility_needs or "not wheelchair" not in SITES[s].accessibility_notes.lower()
        and "not accessible" not in SITES[s].accessibility_notes.lower()
    ] or DEFAULT_ORDER

    max_stops = min(len(candidates), max(1, req.trip_days) * 2)
    chosen = candidates[:max_stops]

    stops: list[ItineraryStop] = []
    for i, site_id in enumerate(chosen):
        site = SITES[site_id]
        stops.append(
            ItineraryStop(
                site=site_id,
                order=i + 1,
                start_time=START_TIMES[i % len(START_TIMES)],
                duration_minutes=site.avg_visit_minutes,
                notes=site.accessibility_notes if req.accessibility_needs else "",
            )
        )

    itinerary = Itinerary(
        id=store.new_id("itin"),
        stops=stops,
        accessibility_friendly=req.accessibility_needs,
    )
    store.itineraries[itinerary.id] = itinerary
    return itinerary
