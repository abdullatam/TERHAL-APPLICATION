"""Tests for the guide rate and the trip meter.

The guide rate is the number the whole fairness pitch rests on: one visible
price, the same for every guide, with no room to haggle. If it drifts, the
pitch stops being true — so it is pinned here.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models import Language, Provider, ProviderRole  # noqa: E402
from app.services.pricing_service import (  # noqa: E402
    GUIDE_HOURLY_JOD,
    billable_minutes,
    quote,
    settle,
)


def provider(role=ProviderRole.guide, hourly=25.0):
    return Provider(
        id="p", name="Test", role=role, landmark_ids=[],
        languages=[Language.en], hourly_rate_jod=hourly,
    )


def test_the_agreed_guide_rate_is_25():
    assert GUIDE_HOURLY_JOD == 25.0


def test_guide_estimate_is_rate_times_hours():
    assert quote(provider(), hours=3).total_jod == 75.0
    assert quote(provider(), hours=1).total_jod == 25.0
    assert quote(provider(), hours=8).total_jod == 200.0


def test_guide_price_ignores_group_size():
    """One rate, not a per-head negotiation. A family pays what a couple pays."""
    assert quote(provider(), hours=4, group_size=2).total_jod == 100.0
    assert quote(provider(), hours=4, group_size=12).total_jod == 100.0


def test_guide_price_ignores_the_per_provider_rate():
    """A guide seeded at some other hourly figure still bills the agreed 25 —
    the rate is the platform's, not the individual's."""
    assert quote(provider(hourly=9.0), hours=2).total_jod == 50.0


def test_guide_estimate_is_one_line_a_tourist_can_check():
    breakdown = quote(provider(), hours=2).breakdown
    assert len(breakdown) == 1
    assert breakdown[0].amount_jod == 50.0
    assert "25" in breakdown[0].label_en


def test_estimate_and_settled_price_are_labelled_differently():
    assert quote(provider(), hours=3).is_estimate is True
    assert settle(provider(), 180).is_estimate is False


def test_a_short_trip_costs_less_than_its_estimate():
    """The whole point of metering: nobody is billed for time they did not get."""
    estimated = quote(provider(), hours=4).total_jod
    actual = settle(provider(), 120).total_jod
    assert actual < estimated
    assert actual == 50.0


def test_an_overrunning_trip_costs_more_than_its_estimate():
    assert settle(provider(), 300).total_jod > quote(provider(), hours=4).total_jod


def test_minimum_billed_is_one_hour():
    """A guide who turned up gave up the slot, however short the trip."""
    assert billable_minutes(0) == 60
    assert billable_minutes(5) == 60
    assert billable_minutes(59) == 60
    assert settle(provider(), 10).total_jod == 25.0


def test_time_past_the_first_hour_rounds_up_to_the_quarter_hour():
    assert billable_minutes(61) == 75
    assert billable_minutes(75) == 75
    assert billable_minutes(76) == 90
    assert billable_minutes(120) == 120


def test_settled_price_follows_the_billable_minutes():
    # 100 minutes bills as 105, which is 1.75 h at 25 JOD.
    assert billable_minutes(100) == 105
    assert settle(provider(), 100).total_jod == 43.75


def test_settled_quote_records_the_real_elapsed_time():
    settled = settle(provider(), 137)
    assert settled.elapsed_minutes == 137
    assert "actual" in settled.breakdown[0].label_en


def test_other_roles_keep_their_own_pricing():
    """The 25 JOD decision was about guides. Drivers were not repriced, so they
    still carry a call-out fee and their own hourly rate."""
    driver = quote(provider(role=ProviderRole.driver, hourly=15.0), hours=2)
    assert driver.hourly_rate_jod == 15.0
    assert len(driver.breakdown) >= 2  # call-out fee line still present
    assert driver.total_jod == 20.0 + 15.0 * 2  # base + hourly, not the guide rate


def test_other_roles_still_charge_for_large_groups():
    small = quote(provider(role=ProviderRole.driver, hourly=15.0), hours=2, group_size=2)
    large = quote(provider(role=ProviderRole.driver, hourly=15.0), hours=2, group_size=10)
    assert large.total_jod > small.total_jod


def test_arabic_labels_are_present_on_every_line():
    for priced in (quote(provider(), hours=2), settle(provider(), 90)):
        for line in priced.breakdown:
            assert line.label_ar and line.label_ar != line.label_en
