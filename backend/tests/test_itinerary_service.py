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


def test_travel_time_is_computed_from_the_distance():
    """Wadi Musa to Shobak is ~25 km by air, so at 40 km/h the leg should be
    around 35 minutes. Asserting a real value rather than the 10-minute floor,
    which a broken distance calculation would still satisfy."""
    places = [landmark("WMU", minutes=60), landmark("SHB", minutes=60, lat=30.5313, lon=35.5600)]
    stops, _ = build_timeline(request(["WMU", "SHB"], days=1), places)
    assert stops[0].end_time == "09:00"
    assert 25 <= stops[1].travel_minutes_from_prev <= 50
    assert stops[1].start_time > stops[0].end_time


def test_nearby_stops_get_the_minimum_travel_leg():
    places = [landmark("WMU", minutes=60), landmark("PET", lat=30.3221, lon=35.4515)]
    stops, _ = build_timeline(request(["WMU", "PET"], days=1), places)
    assert stops[1].travel_minutes_from_prev == 10


def test_accessibility_filter_excludes_and_explains():
    places = [
        landmark("FLAT", notes="Paved throughout with step-free access."),
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


def test_oversized_stop_does_not_burn_a_day_on_its_way_out():
    """A stop longer than a whole day can never be scheduled. It must be
    excluded without consuming a day, or everything behind it loses that day
    too."""
    places = [
        landmark("HUGE", minutes=900),   # longer than 08:00-18:00
        landmark("NORMAL", minutes=60),
    ]
    stops, excluded = build_timeline(request(["HUGE", "NORMAL"], days=2), places)
    assert [e.landmark_id for e in excluded] == ["HUGE"]
    assert [s.landmark_id for s in stops] == ["NORMAL"]
    assert stops[0].day == 1, "the impossible stop should not have advanced the day"


# ---------------------------------------------------------------------------
# The accessibility verdict, pinned against the real dataset.
#
# This filter decides what a wheelchair user is told they can visit, and it is
# inferred from researched prose rather than a flag. Pinning every real row
# means a reworded note or a change to the matching rules fails here loudly
# instead of quietly promising someone a site they cannot use.
# ---------------------------------------------------------------------------

from app.data.landmarks import LANDMARKS  # noqa: E402
from app.services.itinerary_service import _is_accessible  # noqa: E402

# Only these affirmatively describe step-free or wheelchair-passable access.
ACCESSIBLE_IDS = {
    "PET",   # main trail wheelchair-passable with assistance; climbs are not
    "WMU",   # paved town streets, generally accessible
    "PAM",   # modern museum, step-free from the visitor centre
    "MPL",   # restored museum building, wheelchair accessible per the listing
}


def test_accessibility_verdicts_match_the_researched_notes():
    verdicts = {
        lid: _is_accessible(landmark)
        for lid, landmark in LANDMARKS.items()
        if landmark.parent_id is None and landmark.active
    }
    actual = {lid for lid, ok in verdicts.items() if ok}
    assert actual == ACCESSIBLE_IDS & set(verdicts), (
        f"accessibility verdicts drifted.\n"
        f"  newly allowed: {sorted(actual - ACCESSIBLE_IDS)}\n"
        f"  newly refused: {sorted((ACCESSIBLE_IDS & set(verdicts)) - actual)}"
    )


def test_unsuitability_phrased_without_the_word_inaccessible_is_still_refused():
    """The research says 'no' in whatever words fit; none of these contain
    'not accessible', and all of them mean it."""
    for note in [
        "Flat open desert terrain with easy driving access; no paved paths or "
        "visitor facilities, not set up for wheelchair use without assistance.",
        "Roadside stop with uneven stone paving; not purpose-built for wheelchair access.",
        "Paved village roads, but many homes sit on sloped ground; no dedicated "
        "tourist infrastructure - this is a residential community, not a visitor site.",
        "Isolated desert site off the highway with no paved paths or visitor "
        "facilities; rough, unimproved ground throughout.",
        "Largely destroyed and now within cultivated land; there is no prepared access.",
    ]:
        assert not _is_accessible(landmark("X", notes=note)), note


def test_silence_is_not_treated_as_a_yes():
    assert not _is_accessible(landmark("X", notes=""))
    assert not _is_accessible(landmark("X", notes="A hilltop ruin with fine views."))
