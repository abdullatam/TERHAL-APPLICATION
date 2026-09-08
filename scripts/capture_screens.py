#!/usr/bin/env python3
"""Captures real screenshots of the running app, for the portfolio PDF.

    backend/.venv/bin/python scripts/capture_screens.py

Needs both servers up: the API on 8000 and Vite on 5173.

These are photographs of the running product, not mockups — the app is
driven in a real browser at a phone viewport, with app state seeded through
localStorage so screens that depend on a trip having been planned (the
timeline, the booking, the guide's day) show something real rather than an
empty state.

Uses the installed Chrome rather than downloading a second browser.
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ModuleNotFoundError:  # pragma: no cover
    raise SystemExit(
        "This script needs Playwright, which is not a runtime dependency of the "
        "app:\n    backend/.venv/bin/pip install playwright\n"
        "It drives the Chrome already installed on the machine, so there is no "
        "extra browser download."
    )

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "docs" / "portfolio" / "screens"
APP = "http://127.0.0.1:5173"
API = "http://127.0.0.1:8000"

# iPhone 14 Pro-ish. The app is designed as a phone screen and framed as one.
VIEWPORT = {"width": 402, "height": 874}


def api_get(path: str):
    with urllib.request.urlopen(API + path, timeout=30) as r:
        return json.load(r)


def api_post(path: str, payload: dict):
    request = urllib.request.Request(
        API + path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as r:
        return json.load(r)


def seed_demo_data() -> dict:
    """Create the booking the screenshots need, and pick the places for a trip."""
    deck = api_get("/landmarks?deck=true")
    chosen = [l for l in deck if l["id"] in ("PET", "LPET", "SHB", "WMU")]

    guide = next(p for p in api_get("/providers") if p["role"] == "guide")
    import datetime

    booking = api_post("/bookings", {
        "provider_id": guide["id"],
        "date": datetime.date.today().isoformat(),
        "start_time": "08:00",
        "hours": 5,
        "group_size": 2,
    })
    # Accept it so the tourist sees a confirmed booking with its PIN, and the
    # guide sees a real trip on Today.
    api_post(f"/guide/{guide['id']}/requests/{booking['id']}/accept", {})
    return {"trip_landmarks": chosen, "guide_id": guide["id"], "booking_id": booking["id"]}


def state_script(demo: dict, *, role: str, language: str = "en") -> str:
    """Seed localStorage before the app boots, so screens open with real state."""
    trip = {
        "approved": demo["trip_landmarks"],
        "skipped": [],
        "itinerary": None,
        "tripDays": 2,
        "accessibility": False,
    }
    return f"""
      localStorage.setItem('terhal.onboarded', '1');
      localStorage.setItem('terhal.role', {json.dumps(role)});
      localStorage.setItem('maan.language', {json.dumps(language)});
      localStorage.setItem('maan.trip', {json.dumps(json.dumps(trip))});
      localStorage.setItem('terhal.guide.providerId', {json.dumps(demo['guide_id'])});
    """


def shoot(page, path: str, name: str, *, wait_ms: int = 2600, before=None) -> None:
    page.goto(f"{APP}{path}", wait_until="domcontentloaded")
    if before:
        try:
            before(page)
        except Exception as exc:
            print(f"    ({name}: interaction skipped — {type(exc).__name__})")
    page.wait_for_timeout(wait_ms)
    target = OUT / f"{name}.png"
    page.screenshot(path=str(target))
    print(f"  {name}.png")


def settled(page) -> None:
    """Wait until the screen has finished loading its data.

    The trip timeline builds its itinerary from the API on mount, so a fixed
    pause screenshots a spinner. Waiting for the spinner to leave is the
    difference between a portfolio shot and a loading state.
    """
    try:
        page.wait_for_selector(".animate-spin", state="detached", timeout=20000)
    except Exception:
        pass  # some screens never show one


def open_map(page) -> None:
    """Switch to the map and wait for tiles to actually paint.

    Leaflet renders its markers immediately but streams tiles in behind them,
    so a fixed pause screenshots a blank map with pins floating on nothing.
    """
    page.get_by_text("Map", exact=True).click()
    page.wait_for_selector("img.leaflet-tile-loaded", timeout=20000)
    # One loaded tile is not a painted map; give the rest of the grid a moment.
    page.wait_for_timeout(3500)


def main() -> int:
    for url, what in ((API + "/health", "API"), (APP, "Vite")):
        try:
            urllib.request.urlopen(url, timeout=5)
        except Exception:
            print(f"{what} is not answering. Start both servers first — see README.")
            return 1

    OUT.mkdir(parents=True, exist_ok=True)
    demo = seed_demo_data()
    print(f"seeded booking {demo['booking_id']} for {demo['guide_id']}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")
        context = browser.new_context(
            viewport=VIEWPORT, device_scale_factor=2, locale="en-GB",
        )
        context.add_init_script(state_script(demo, role="traveller"))
        page = context.new_page()

        print("\ntraveller app")
        shoot(page, "/welcome", "01-welcome")
        shoot(page, "/explore", "02-explore-deck", wait_ms=3200)
        shoot(page, "/trip", "03-trip-timeline", wait_ms=2200, before=settled)
        shoot(page, "/advisors", "04-advisors-list", wait_ms=3600)
        shoot(page, "/advisors", "05-advisors-map", wait_ms=2500,
              before=open_map)
        shoot(page, f"/bookings/{demo['booking_id']}", "06-booking-pin", wait_ms=3000)
        shoot(page, "/camera", "07-camera-guide")
        shoot(page, "/chat", "08-chat")

        # The same screens in Arabic, to show the layout mirrors.
        arabic = browser.new_context(
            viewport=VIEWPORT, device_scale_factor=2, locale="ar-JO",
        )
        arabic.add_init_script(state_script(demo, role="traveller", language="ar"))
        ar_page = arabic.new_page()
        print("\narabic (RTL)")
        shoot(ar_page, "/trip", "09-trip-arabic", wait_ms=2200, before=settled)

        print("\nguide app")
        guide_ctx = browser.new_context(
            viewport=VIEWPORT, device_scale_factor=2, locale="en-GB",
        )
        guide_ctx.add_init_script(state_script(demo, role="guide"))
        g = guide_ctx.new_page()
        shoot(g, "/guide", "10-guide-today", wait_ms=2200, before=settled)
        shoot(g, "/guide/earnings", "11-guide-earnings", wait_ms=2200, before=settled)

        browser.close()

    shots = sorted(OUT.glob("*.png"))
    print(f"\n{len(shots)} screenshots in {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
