"""Tests for the timeline packer.

These run against plain ORM objects with no database — the scheduling logic
is pure arithmetic and should stay testable without Postgres.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db_models import LandmarkORM  # noqa: E402
from app.models import ItineraryRequest  # noqa: E402
from app.services.itinerary_service import build_timeline  # noqa: E402

# Roughly Wadi Musa; a hundredth of a degree apart is ~1 km, which lands under
# the 10-minute travel floor so tests are not sensitive to routing arithmetic.
NEAR = 30.3216
LON = 35.4800


def landmark(lid, minutes=60, lat=NEAR, lon=LON, notes="Paved and level.", **kw):
    return LandmarkORM(
        id=lid, name_en=lid, name_ar=lid,
        description_en="", description_ar="",
        avg_visit_minutes=minutes, accessibility_notes=notes,
        lat=lat, lon=lon, **kw,
    )


def request(ids, days=1, accessibility=False):
    return ItineraryRequest(
        landmark_ids=ids, trip_days=days, accessibility_needs=accessibility
    )


def test_route_starts_at_the_home_base():
    """Wadi Musa is where visitors sleep, so a day should begin there even if
    it was swiped last."""
    places = [landmark("SHB", lat=30.5313, lon=35.5600), landmark("WMU")]
    stops, _ = build_timeline(request(["SHB", "WMU"], days=2), places)
    assert stops[0].landmark_id == "WMU"


def test_first_stop_has_no_travel_leg():
    stops, _ = build_timeline(request(["WMU"]), [landmark("WMU")])
    assert stops[0].travel_minutes_from_prev == 0
    assert stops[0].start_time == "08:00"


def test_second_stop_starts_after_travel():
    places = [landmark("WMU", minutes=60), landmark("PET", lat=30.3221, lon=35.4515)]
    stops, _ = build_timeline(request(["WMU", "PET"], days=1), places)
    assert stops[0].end_time == "09:00"
    assert stops[1].travel_minutes_from_prev >= 10
    assert stops[1].start_time > stops[0].end_time


def test_accessibility_filter_excludes_and_explains():
    places = [
        landmark("FLAT", notes="Paved and level throughout."),
        landmark("STEPS", notes="Reached via 800 steps; not accessible for reduced mobility."),
    ]
    stops, excluded = build_timeline(
        request(["FLAT", "STEPS"], accessibility=True), places
    )
    assert [s.landmark_id for s in stops] == ["FLAT"]
    assert len(excluded) == 1
    assert excluded[0].landmark_id == "STEPS"
    # The tourist is told why, in both languages, rather than the stop vanishing.
    assert excluded[0].reason_en and excluded[0].reason_ar


def test_partly_accessible_place_is_kept():
    """Petra's real note: the main trail is passable, the climbs beyond are not.
    Matching only the negative half would drop the biggest attraction in the
    governorate from every accessible itinerary."""
    petra = landmark(
        "PET",
        notes="Main trail from the Siq to the Street of Facades is wheelchair-passable "
              "with assistance on packed sand/gravel; onward climbs to the Monastery "
              "are not accessible for reduced mobility.",
    )
    stops, excluded = build_timeline(request(["PET"], accessibility=True), [petra])
    assert [s.landmark_id for s in stops] == ["PET"]
    assert excluded == []


def test_negated_phrase_is_not_read_as_an_endorsement():
    """'not wheelchair accessible' contains 'wheelchair accessible' — the filter
    must not mistake the negation for a positive signal."""
    place = landmark("LPET", notes="Narrow canyon with uneven rock; not wheelchair accessible.")
    stops, excluded = build_timeline(request(["LPET"], accessibility=True), [place])
    assert stops == []
    assert [e.landmark_id for e in excluded] == ["LPET"]


def test_overflow_is_reported_not_dropped_silently():
    """Three eight-hour days requested inside a single day: two must come back
    as excluded with a reason."""
    places = [landmark(f"L{i}", minutes=480) for i in range(3)]
    stops, excluded = build_timeline(request(["L0", "L1", "L2"], days=1), places)
    assert len(stops) == 1
    assert {e.landmark_id for e in excluded} == {"L1", "L2"}
    assert all("did not fit" in e.reason_en.lower() for e in excluded)


def test_long_stops_roll_onto_later_days():
    places = [landmark(f"L{i}", minutes=480) for i in range(3)]
    stops, excluded = build_timeline(request(["L0", "L1", "L2"], days=3), places)
    assert excluded == []
    assert [s.day for s in stops] == [1, 2, 3]
    # Every day restarts the clock rather than continuing through the night.
    assert all(s.start_time == "08:00" for s in stops)


def test_landmark_without_coordinates_goes_last():
    """Routing cannot place a landmark with no coordinates, and inventing them
    was explicitly refused during the research phase — so it goes to the end."""
    places = [
        landmark("NOCOORD", minutes=15, lat=None, lon=None),
        landmark("WMU", minutes=60),
        landmark("NEARBY", minutes=30, lat=30.3300, lon=35.4900),
    ]
    stops, excluded = build_timeline(request(["NOCOORD", "WMU", "NEARBY"], days=1), places)
    assert excluded == []
    assert stops[-1].landmark_id == "NOCOORD"
    assert stops[-1].travel_minutes_from_prev == 20  # the no-coordinates default


def test_lunch_break_lands_in_the_middle_of_a_long_day():
    places = [
        landmark("A", minutes=180),
        landmark("B", minutes=120),
        landmark("C", minutes=60),
    ]
    stops, _ = build_timeline(request(["A", "B", "C"], days=1), places)
    breaks = [s for s in stops if s.kind == "break"]
    assert len(breaks) == 1
    assert breaks[0].duration_minutes == 60
    assert "12:30" <= breaks[0].start_time <= "14:30"
    assert breaks[0].landmark_id is None


def test_short_day_gets_no_lunch_break():
    """A morning-only trip should not be interrupted by a lunch block."""
    stops, _ = build_timeline(request(["A"]), [landmark("A", minutes=60)])
    assert [s.kind for s in stops] == ["landmark"]


def test_stops_are_numbered_in_visiting_order():
    places = [landmark(f"L{i}", minutes=60) for i in range(3)]
    stops, _ = build_timeline(request(["L0", "L1", "L2"], days=1), places)
    assert [s.order for s in stops] == list(range(1, len(stops) + 1))


def test_empty_selection_produces_nothing_rather_than_crashing():
    stops, excluded = build_timeline(request(["GONE"]), [])
    assert stops == [] and excluded == []
