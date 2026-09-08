#!/usr/bin/env python3
"""Builds the portfolio PDF from the captured screenshots.

    backend/.venv/bin/python scripts/capture_screens.py      # first
    backend/.venv/bin/python scripts/build_portfolio_pdf.py  # then this

Writes docs/portfolio/Terhal.pdf. Lays the brief and the screens out as HTML
and prints it through Chrome, so the type and spacing are the same ones the
app uses rather than a report-generator's defaults.
"""
from __future__ import annotations

import sys
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
PORTFOLIO = REPO / "docs" / "portfolio"
SCREENS = PORTFOLIO / "screens"
HTML_PATH = PORTFOLIO / "terhal.html"
PDF_PATH = PORTFOLIO / "Terhal.pdf"

# Caption per screenshot. Order here is the order in the PDF.
CAPTIONS = [
    ("01-welcome.png", "Welcome",
     "Opens in English or Arabic; the whole interface mirrors for RTL."),
    ("02-explore-deck.png", "Swipe to plan",
     "Swipe right to add a place, left to skip. Cards carry the real visit "
     "duration, difficulty, and whether a guide is advised."),
    ("03-trip-timeline.png", "The generated plan",
     "A day-by-day timeline built from what was swiped: stops ordered by "
     "geography, with real drive times between them."),
    ("09-trip-arabic.png", "The same screen in Arabic",
     "Not a translation layer bolted on at the end — layout, navigation and "
     "the timeline rail all mirror."),
    ("04-advisors-list.png", "Verified local advisors",
     "Guides, drivers and vendors near the visitor, each showing what this "
     "trip costs before anything is committed to."),
    ("05-advisors-map.png", "Advisors on the map",
     "Distance-sorted, price on the pin. The alternative to negotiating at "
     "the gate with whoever approaches first."),
    ("06-booking-pin.png", "Booking, with the meeting PIN",
     "The visitor holds a PIN. The guide has to be told it in person and "
     "type it in, which is what proves the two actually met."),
    ("10-guide-today.png", "The guide's day",
     "A second app on the same backend. One trip finished and settled at "
     "what it actually ran to; the next waiting on the PIN."),
    ("11-guide-earnings.png", "Guide earnings",
     "Every figure derived from real bookings, and labelled as demo pricing "
     "rather than dressed up as revenue."),
    ("07-camera-guide.png", "Camera guide",
     "Point the phone at a monument and it identifies it, then narrates from "
     "a researched script rather than improvising."),
    ("08-chat.png", "Bilingual assistant",
     "Answers grounded in the same researched dataset, so it declines to "
     "invent what the research does not cover."),
]

BRIEF = """
<h2>What it is</h2>
<p>
  A mobile app for visitors to Ma'an, the Jordanian governorate that contains
  Petra. Nearly all of the region's tourism revenue lands at one monument while
  the rest of the governorate stays invisible, and Ma'an carries the highest
  unemployment rate in Jordan at 29.4%. Terhal is an attempt at the connective
  tissue: help a visitor discover more than the one famous site, turn that into
  a real plan, and put them in front of a verified local guide at a price
  neither side has to argue about.
</p>

<h2>How it works</h2>
<p>
  Planning is a card deck rather than a form. You swipe through the region's
  destinations and the app builds a day-by-day timeline from the ones you kept
  &mdash; ordered by geography, packed against a clock from 08:00 to 18:00,
  with real driving times between stops and anything that will not fit handed
  back with a reason instead of silently dropped. The scheduler is plain
  arithmetic rather than a model call, so the same plan comes out every time.
</p>
<p>
  Booking is the second half. Verified guides appear nearest-first on a map,
  each quoting what <em>this</em> trip would cost. A guide is 25&nbsp;JOD an
  hour &mdash; one rate, the same for everyone, no call-out fee and no group
  surcharge &mdash; which is the whole fairness argument in a single number.
  What is shown before booking is an estimate; the trip is metered between the
  guide starting and ending it, so one that finishes early costs less. Starting
  it needs the visitor's PIN, typed by the guide in front of them, which is
  what proves the meeting actually happened.
</p>

<h2>The data underneath</h2>
<p>
  48 places, 23 of them top-level destinations, each with bilingual
  descriptions, coordinates, researched history and honest accessibility notes,
  illustrated with 42 CC-licensed photographs carrying their attribution.
  Nothing is invented: places that could not be sourced are flagged and left
  out, and the pipeline reports what it skipped every time it runs.
</p>
<p>
  That discipline caught real errors. The accessibility filter originally
  matched the phrase &ldquo;not accessible&rdquo; and so excluded Petra
  entirely &mdash; even though the research says its main trail is
  wheelchair-passable and only the climbs beyond are not. Inverting it to
  default-deny, where a place counts as accessible only when the research
  affirmatively says so, leaves four places out of twenty-three. That is a
  worse-looking number and the true one.
</p>
"""

STACK = """
<div class="cols">
  <div>
    <h3>Built with</h3>
    <ul>
      <li>React, Vite, Tailwind &mdash; one build, two apps</li>
      <li>FastAPI, SQLAlchemy, Alembic</li>
      <li>PostgreSQL on Supabase</li>
      <li>Leaflet and OpenStreetMap</li>
      <li>Multimodal vision and chat, grounded on the data</li>
    </ul>
  </div>
  <div>
    <h3>Scale</h3>
    <ul>
      <li>~7,800 lines of Python, ~8,000 of JSX</li>
      <li>48 places, 42 licensed images, 12 advisors</li>
      <li>33 backend tests over pricing and scheduling</li>
      <li>Arabic and English throughout, RTL included</li>
      <li>Built for the Ma'an Hackathon (Irada Program)</li>
    </ul>
  </div>
</div>
"""

CSS = """
@page { size: A4; margin: 14mm 13mm; }
* { box-sizing: border-box; }
body {
  margin: 0; background: #FBF8F4; color: #2B221A;
  font: 400 9.3pt/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }

.cover { padding-top: 6mm; }
.mark { font-size: 26pt; font-weight: 700; letter-spacing: -0.02em; color: #B2543A; }
.cover h1 { font-size: 19pt; font-weight: 700; margin: 3mm 0 1mm; letter-spacing: -0.01em; }
.tagline { font-size: 11pt; color: #5F4B39; margin: 0 0 4mm; max-width: 130mm; }
.meta { font-size: 9pt; color: #857567; border-top: 1px solid #E8DCCC;
        border-bottom: 1px solid #E8DCCC; padding: 3mm 0; margin-bottom: 6mm; }
.meta span { margin-right: 7mm; }
.meta b { color: #2B221A; font-weight: 600; }

h2 { font-size: 11pt; font-weight: 700; margin: 4.5mm 0 1.5mm; color: #B2543A; }
h3 { font-size: 10pt; font-weight: 700; margin: 0 0 2mm; }
p  { margin: 0 0 2.5mm; max-width: 170mm; }
em { font-style: italic; }

.cols { display: flex; gap: 10mm; margin-top: 4mm;
        border-top: 1px solid #E8DCCC; padding-top: 4mm; }
.cols > div { flex: 1; }
ul { margin: 0; padding-left: 4.5mm; }
li { margin-bottom: 1mm; font-size: 9pt; color: #5F4B39; }

.screens-title { font-size: 12pt; font-weight: 700; color: #B2543A; margin: 0 0 4mm; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm 5mm; }
figure { margin: 0; break-inside: avoid; }
figure img {
  height: 97mm; width: auto; display: block; margin: 0 auto;
  border: 1px solid #E8DCCC; border-radius: 2.5mm; background: #fff;
}
figcaption { margin-top: 2mm; }
figcaption b { display: block; font-size: 8.5pt; font-weight: 700; }
figcaption span { display: block; font-size: 7.5pt; line-height: 1.35; color: #6E5B49; }

.foot { margin-top: 4mm; padding-top: 2.5mm; border-top: 1px solid #E8DCCC;
        font-size: 7.5pt; color: #857567; }
"""


def figure(name: str, title: str, caption: str) -> str:
    src = (SCREENS / name).as_uri()
    return (f'<figure><img src="{src}" alt="{title}">'
            f"<figcaption><b>{title}</b><span>{caption}</span></figcaption></figure>")


def build_html() -> str:
    available = [c for c in CAPTIONS if (SCREENS / c[0]).exists()]
    missing = [c[0] for c in CAPTIONS if not (SCREENS / c[0]).exists()]
    if missing:
        print(f"  (missing screenshots, skipped: {', '.join(missing)})")

    pages = []
    pages.append(f"""
      <section class="page cover">
        <div class="mark">Terhal &middot; ترحال</div>
        <h1>Swipe a region into a trip, then book the person who knows it.</h1>
        <p class="tagline">
          A bilingual travel app for Ma'an, Jordan &mdash; and a second app for
          the guides who work there.
        </p>
        <div class="meta">
          <span><b>Role</b> Full-stack &middot; data pipeline, backend, app</span>
          <span><b>Team</b> 3</span>
          <span><b>2026</b></span>
        </div>
        {BRIEF}
        {STACK}
      </section>
    """)

    for start in range(0, len(available), 6):
        chunk = available[start : start + 6]
        heading = "The app" if start == 0 else "The app, continued"
        cards = "".join(figure(*c) for c in chunk)
        pages.append(f"""
          <section class="page">
            <div class="screens-title">{heading}</div>
            <div class="grid">{cards}</div>
            <div class="foot">
              Screenshots of the running application. Prices are labelled in the
              product as demo figures; advisor accounts are seeded, and every
              photograph carries its licence and attribution.
            </div>
          </section>
        """)

    return f"<!doctype html><meta charset='utf-8'><style>{CSS}</style>{''.join(pages)}"


def main() -> int:
    if not SCREENS.exists() or not any(SCREENS.glob("*.png")):
        print("No screenshots yet — run scripts/capture_screens.py first.")
        return 1

    HTML_PATH.write_text(build_html(), encoding="utf-8")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")
        page = browser.new_page()
        page.goto(HTML_PATH.as_uri(), wait_until="load")
        page.wait_for_timeout(1200)  # let the images decode before printing
        page.pdf(path=str(PDF_PATH), format="A4", print_background=True)
        browser.close()

    size_kb = PDF_PATH.stat().st_size // 1024
    print(f"{PDF_PATH.relative_to(REPO)}  ({size_kb} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
