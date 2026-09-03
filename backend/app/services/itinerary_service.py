"""Turns a set of swiped-right landmarks into a day-by-day timeline.

Deliberately deterministic — no model call. A demo itinerary has to be
identical every time it is generated, has to survive a dead network, and
has to be explainable to a judge who asks "why is Shobak on day two?".
The answer is always: geography, opening hours and arithmetic.

Ordering is nearest-neighbour over real coordinates; packing walks a clock
from 08:00 to 18:00 adding travel time between stops and a lunch break in
the middle of the day. Anything that will not fit inside the requested
number of days comes back in `excluded` with a reason rather than being
silently dropped.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import ItineraryORM, ItineraryStopORM, LandmarkORM
from app.models import (
    ExcludedLandmark,
    Itinerary,
    ItineraryRequest,
    TimelineDay,
    TimelineStop,
)
from app.services.geo import haversine_km

DAY_START = 8 * 60          # 08:00
DAY_END = 18 * 60           # 18:00
LUNCH_EARLIEST = 12 * 60 + 30
LUNCH_LATEST = 14 * 60 + 30
LUNCH_MINUTES = 60
AVERAGE_SPEED_KMH = 40      # mountain roads around Petra, not motorway speed
MIN_TRAVEL_MINUTES = 10
DEFAULT_TRAVEL_MINUTES = 20  # used when a landmark has no coordinates

# The town where visitors actually stay, so routes start and end near it.
HOME_BASE_ID = "WMU"
HOME_BASE_FALLBACK = (30.3216568, 35.4800889)

# Accessibility notes are researched prose, not a flag, and some describe a
# place that is partly reachable: Petra's main trail is wheelchair-passable
# while the climbs beyond it are not. Matching "not accessible" alone would
# throw away the governorate's main attraction for the exact users the filter
# exists to serve, so a negative is only decisive when nothing positive
# survives alongside it.
NEGATIVE_MARKERS = (
    "not wheelchair accessible",
    "not wheelchair-accessible",
    "not accessible",
)
POSITIVE_MARKERS = (
    "wheelchair-passable",
    "wheelchair passable",
    "wheelchair accessible",
    "wheelchair-accessible",
    "step-free",
    "generally accessible",
)


def _hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _coords(landmark: LandmarkORM) -> tuple[float, float] | None:
    if landmark.lat is None or landmark.lon is None:
        return None
    return (landmark.lat, landmark.lon)


def _travel_minutes(prev: LandmarkORM | None, nxt: LandmarkORM) -> int:
    if prev is None:
        return 0
    a, b = _coords(prev), _coords(nxt)
    if a is None or b is None:
        return DEFAULT_TRAVEL_MINUTES
    minutes = haversine_km(a, b) / AVERAGE_SPEED_KMH * 60
    return max(MIN_TRAVEL_MINUTES, int(round(minutes / 5) * 5))


def _is_accessible(landmark: LandmarkORM) -> bool:
    notes = (landmark.accessibility_notes or "").lower()
    if not any(marker in notes for marker in NEGATIVE_MARKERS):
        return True

    # Remove the negative phrases before looking for a positive one, so
    # "not wheelchair accessible" cannot read as an endorsement of itself.
    remainder = notes
    for marker in NEGATIVE_MARKERS:
        remainder = remainder.replace(marker, " ")
    return any(marker in remainder for marker in POSITIVE_MARKERS)


def _order_route(landmarks: list[LandmarkORM]) -> list[LandmarkORM]:
    """Nearest-neighbour from the home base. Landmarks with no coordinates
    cannot be routed, so they keep their swipe order and go last rather than
    being given invented coordinates."""
    placed = [l for l in landmarks if _coords(l)]
    unplaceable = [l for l in landmarks if not _coords(l)]
    if not placed:
        return unplaceable

    start = next((l for l in placed if l.id == HOME_BASE_ID), None)
    if start is None:
        start = min(placed, key=lambda l: haversine_km(_coords(l), HOME_BASE_FALLBACK))

    route = [start]
    remaining = [l for l in placed if l.id != start.id]
    while remaining:
        last = _coords(route[-1])
        nxt = min(remaining, key=lambda l: haversine_km(last, _coords(l)))
        route.append(nxt)
        remaining.remove(nxt)
    return route + unplaceable


def _timeline_stop(landmark: LandmarkORM, day: int, order: int, start: int,
                   travel: int) -> TimelineStop:
    return TimelineStop(
        kind="landmark",
        landmark_id=landmark.id,
        name_en=landmark.name_en,
        name_ar=landmark.name_ar,
        image_url=landmark.image_url,
        day=day,
        order=order,
        start_time=_hhmm(start),
        end_time=_hhmm(start + landmark.avg_visit_minutes),
        duration_minutes=landmark.avg_visit_minutes,
        travel_minutes_from_prev=travel,
        accessibility_notes=landmark.accessibility_notes,
        difficulty=landmark.difficulty,
        requires_guide=landmark.requires_guide,
    )


def _lunch_stop(day: int, order: int, start: int) -> TimelineStop:
    return TimelineStop(
        kind="break",
        landmark_id=None,
        name_en="Lunch break",
        name_ar="استراحة الغداء",
        day=day,
        order=order,
        start_time=_hhmm(start),
        end_time=_hhmm(start + LUNCH_MINUTES),
        duration_minutes=LUNCH_MINUTES,
    )


def build_timeline(req: ItineraryRequest, landmarks: list[LandmarkORM]
                   ) -> tuple[list[TimelineStop], list[ExcludedLandmark]]:
    excluded: list[ExcludedLandmark] = []
    candidates = landmarks

    if req.accessibility_needs:
        keep = []
        for landmark in candidates:
            if _is_accessible(landmark):
                keep.append(landmark)
            else:
                excluded.append(ExcludedLandmark(
                    landmark_id=landmark.id,
                    name_en=landmark.name_en,
                    name_ar=landmark.name_ar,
                    reason_en="Not suitable for reduced mobility",
                    reason_ar="غير مناسب لذوي الحركة المحدودة",
                ))
        candidates = keep

    route = _order_route(candidates)

    stops: list[TimelineStop] = []
    day, clock, order = 1, DAY_START, 0
    previous: LandmarkORM | None = None
    lunch_placed = False

    for landmark in route:
        travel = _travel_minutes(previous, landmark)

        if (not lunch_placed and LUNCH_EARLIEST <= clock <= LUNCH_LATEST
                and clock + LUNCH_MINUTES <= DAY_END):
            order += 1
            stops.append(_lunch_stop(day, order, clock))
            clock += LUNCH_MINUTES
            lunch_placed = True

        start = clock + travel
        if start + landmark.avg_visit_minutes > DAY_END:
            # Does not fit today: roll to tomorrow if the trip is long enough.
            if day < req.trip_days:
                day += 1
                clock, previous, lunch_placed = DAY_START, None, False
                travel, start = 0, DAY_START
            if start + landmark.avg_visit_minutes > DAY_END:
                excluded.append(ExcludedLandmark(
                    landmark_id=landmark.id,
                    name_en=landmark.name_en,
                    name_ar=landmark.name_ar,
                    reason_en=f"Did not fit in {req.trip_days} day(s)",
                    reason_ar=f"لم يتّسع له البرنامج خلال {req.trip_days} يوم",
                ))
                continue

        order += 1
        stops.append(_timeline_stop(landmark, day, order, start, travel))
        clock = start + landmark.avg_visit_minutes
        previous = landmark

    return stops, excluded


def _group_days(stops: list[TimelineStop]) -> list[TimelineDay]:
    days: dict[int, list[TimelineStop]] = {}
    for stop in stops:
        days.setdefault(stop.day, []).append(stop)
    return [TimelineDay(day=d, stops=days[d]) for d in sorted(days)]


def generate_from_selection(db: Session, req: ItineraryRequest) -> Itinerary:
    found = db.scalars(
        select(LandmarkORM).where(LandmarkORM.id.in_(req.landmark_ids))
    ).all()
    # Preserve swipe order: it is the tourist's own priority ranking, and it
    # decides who gets cut when the trip is too short.
    by_id = {l.id: l for l in found}
    ordered = [by_id[i] for i in req.landmark_ids if i in by_id]

    stops, excluded = build_timeline(req, ordered)

    itinerary = ItineraryORM(
        id=f"itin-{uuid.uuid4().hex[:8]}",
        accessibility_friendly=req.accessibility_needs,
        trip_days=max(1, max((s.day for s in stops), default=1)),
    )
    db.add(itinerary)
    for stop in stops:
        db.add(ItineraryStopORM(
            itinerary_id=itinerary.id,
            landmark_id=stop.landmark_id,
            kind=stop.kind,
            day=stop.day,
            order=stop.order,
            start_time=stop.start_time,
            duration_minutes=stop.duration_minutes,
            travel_minutes=stop.travel_minutes_from_prev,
            notes=stop.accessibility_notes or "",
        ))
    db.commit()

    return Itinerary(
        id=itinerary.id,
        trip_days=itinerary.trip_days,
        accessibility_friendly=itinerary.accessibility_friendly,
        days=_group_days(stops),
        excluded=excluded,
    )


def load_itinerary(db: Session, itinerary_id: str) -> Itinerary | None:
    itinerary = db.get(ItineraryORM, itinerary_id)
    if itinerary is None:
        return None

    landmark_ids = [s.landmark_id for s in itinerary.stops if s.landmark_id]
    landmarks = {
        l.id: l for l in db.scalars(
            select(LandmarkORM).where(LandmarkORM.id.in_(landmark_ids))
        ).all()
    }

    stops: list[TimelineStop] = []
    for row in sorted(itinerary.stops, key=lambda s: (s.day, s.order)):
        start = int(row.start_time[:2]) * 60 + int(row.start_time[3:])
        landmark = landmarks.get(row.landmark_id) if row.landmark_id else None
        if landmark is None:
            stops.append(_lunch_stop(row.day, row.order, start))
            continue
        stops.append(_timeline_stop(landmark, row.day, row.order, start, row.travel_minutes))

    return Itinerary(
        id=itinerary.id,
        trip_days=itinerary.trip_days,
        accessibility_friendly=itinerary.accessibility_friendly,
        days=_group_days(stops),
        excluded=[],
    )
