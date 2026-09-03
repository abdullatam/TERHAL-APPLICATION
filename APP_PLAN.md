# App Plan — Swipe-to-Plan + Advisor Finder

Implementation plan for the Maan Project app. Written for the executing agent/session:
everything here builds on what is **already in the repo** — read PROJECT.md for the
problem/pitch context and this file for what to build. The feature universe is in
`features.md` (note: the file on disk is named with a trailing space — `features.md ` —
rename it first). Section 8 maps every feature in that file to a scope decision.

**Hard deadline: 8 Sept 2026 (demo).** Everything is scoped against that.

---

## 1. Concept

Two core experiences, replacing the current form-based planner UI:

**A. Swipe-to-Plan ("Tinder for attractions").** The tourist is shown Ma'an
attractions one at a time as full-screen cards (photo, name, 1-line hook, visit
duration, accessibility badge). Swipe right = "I want this", swipe left = skip.
When the deck is exhausted — or the tourist taps "I'm done" early — the app
generates a full trip plan with a day-by-day **timeline** from the approved sites.

**B. Advisor Finder ("Uber for guides").** The tourist sees trip advisors
(guides/drivers) near them on a map with distance, rating, languages, and an
**upfront price** (MOCK pricing for now — clearly labeled, see §7). Tap an advisor →
profile → book. No haggling at the gate; price known before commitment.

The two connect: after a trip plan is generated, the natural next step surfaced in
the UI is "book an advisor for this trip" → Advisor Finder pre-filtered to the
plan's sites.

The existing **camera AI tour guide** and **bilingual chat assistant** stay as-is
(already built, backend routes `/vision/identify` and `/chat`) and live in the app
shell as tabs.

### Bidding is removed (team decision, 3 Sept)

The bidding marketplace from PROJECT.md is **out**. Pricing will come from a
standard formula instead (mock formula now — §7 — swapped for the real one when
the team lands it). Concretely for the executor:

- **Delete** the `bidding` router (`/requests`, `/bids` endpoints), the
  BiddingBoard page, and the `TripRequest`/`Bid` models and API-client methods.
- **Drop** the `trip_requests` and `bids` tables in the same migration that adds
  `bookings` (§3) — don't leave dead tables for judges reading the schema.
- PROJECT.md still pitches bidding as the core innovation — it needs a rewrite to
  match (transparent formula pricing as the fairness mechanism instead of
  competing offers). Flag this to the team; don't silently rewrite the pitch doc
  as part of the build.

---

## 2. What already exists (do not rebuild)

- **Backend:** FastAPI (`backend/app/`), Supabase Postgres via the IPv4 pooler
  (`app/db.py`), Alembic migrations, tables: `landmarks` (25 rows seeded, real
  descriptions EN/AR, CC-licensed images, lat/lon, visit durations), `providers`,
  `itineraries`, `itinerary_stops`, `trip_requests`, `bids` (the last two get
  dropped — bidding is removed, §1). Routes: `/landmarks`, `/itinerary/generate`,
  `/providers`, `/requests`, `/bids` (last two to be deleted), `/vision/identify`,
  `/chat`, `/health`. Note: most routes still read the in-memory `app/store.py`,
  not the DB — see task E1.
- **Frontend:** React + Vite + Tailwind, AR/EN i18n with RTL flip
  (`src/i18n/LanguageContext.jsx`), pages: TripPlanner, BiddingBoard, CameraGuide,
  ProviderDirectory. API client in `src/api/client.js` with a `/api` proxy.
- **Data pipeline:** `scripts/build_dataset.py` (Phase 1 CSVs → `landmarks.py` →
  `python -m app.seed`). **Phase 2 deep data** (`data/phase2/group*.json`: history,
  significance, narration scripts, visiting_info incl. difficulty/best-time) is NOT
  yet wired into the pipeline or DB — task D1 below fixes that, and the swipe cards
  and timeline get much better with it.
- **Gaps to know about:** Group 3 (Dam3a) Phase 2 file doesn't exist yet — build
  against whatever data is present, never block on it. `USH` has no image, `AMS`
  has no coordinates; the deck and map must tolerate both (see §4/§5).

---

## 3. Data model changes

One Alembic migration (plus regenerating mock data):

```
providers            + lat FLOAT NULL, lon FLOAT NULL      -- mock "current location"
                     + hourly_rate_jod FLOAT NULL           -- mock, see §7
                     + bio_en TEXT NULL, bio_ar TEXT NULL
                     + photo_url TEXT NULL                  -- CC/placeholder avatar

bookings (NEW)       id PK, provider_id FK, itinerary_id FK NULL,
                     date DATE, start_time TEXT, hours INT, group_size INT,
                     price_jod FLOAT, price_is_mock BOOL DEFAULT TRUE,
                     status TEXT ('pending'|'confirmed'|'cancelled'),
                     created_at TIMESTAMP

landmarks            + narration_en/med narration_ar TEXT NULL,
                     + history_en/ar TEXT NULL, significance_en/ar TEXT NULL,
                     + difficulty TEXT NULL, best_time_to_visit TEXT NULL,
                     + requires_guide BOOL NULL, category TEXT NULL
                     (all nullable — filled only where Phase 2 data exists)
```

Swipe decisions are **client-side state only** for the MVP (an array of approved
landmark ids in React state). No swipes table. The generated plan is persisted via
the existing `itineraries`/`itinerary_stops` tables.

Expand `data/mock_providers.py` to ~10-12 providers spread across roles and sites,
each with mock lat/lon scattered around Wadi Musa/Petra/Shobak (so the map looks
alive), an hourly rate, bios in both languages, and the existing
`verified`/`welfare_compliant`/`accessibility_tags` fields kept intact (judges are
told to look for those — PROJECT.md §8).

---

## 4. Flow A — Swipe-to-Plan

### Deck contents
Show **macro-level attractions only** in the main deck: `PET`, `LPET`, `SHB`, `UDH`,
`AJF`, `WMU`, `USH`, `OPM`, the wadis (`PET-WFA`, `PET-WSA`, `PET-WMD` count as
outings), plus Pulga's Job B finds. Do **not** mix Petra's sub-monuments
(`PET-TRE`, `PET-MON`, …) into the same deck — approving "Petra" and "Treasury"
as siblings produces nonsense itineraries.

**Petra mini-deck (stretch, only if time):** approving Petra offers "customize your
Petra day" → a second deck of the PET-* monuments that tunes the Petra day's
internal stops. Skip if tight; a fixed sensible Petra route is fine for the demo.

Filter/fallback: a landmark with no image gets a styled fallback card (name +
description on a gradient) — never a broken image. `category` chips (castle/wadi/
macro_site) on cards if D1 lands.

### Interaction
- Full-screen card stack, top card draggable; threshold cross = commit, else spring
  back. Overlay stamps ("ADD ✓" / "SKIP ✕") fade in with drag distance, mirrored
  correctly in RTL. Buttons under the deck do the same for tap users (also the
  accessibility path). Undo button reverses the last swipe.
- Library: `@use-gesture/react` + plain CSS transforms (small, no heavy animation
  dep). Framer Motion acceptable if preferred.
- Progress dots / "X of N". "Done — build my plan" button always visible once ≥1
  site is approved.

### Timeline generation
New endpoint `POST /itinerary/from-selection`
`{approved_landmark_ids: [], trip_days: int, accessibility_needs: bool, language}`.

Deterministic algorithm (no AI call — reliable in a demo, and fast):
1. Drop landmarks failing the accessibility filter when `accessibility_needs`
   (reuse the existing notes-matching logic from `itinerary_service.py`).
2. Order geographically: start from Wadi Musa, then nearest-neighbor by Haversine
   over lat/lon (landmarks with no coords, e.g. `AMS`, go adjacent to their
   nearest named neighbor — hardcode `AMS` → after `WMU`).
3. Pack into days: day starts 08:00, ends ~18:00; each stop consumes
   `avg_visit_minutes` + travel time (Haversine distance at 40 km/h, min 10 min);
   insert a 60-min lunch block ~12:30–13:30; overflow starts the next day. `PET`
   with 480 min is automatically a full day — correct behavior, don't special-case.
4. Respect `trip_days` as a cap: if approved sites overflow the days, keep the
   highest-priority ones (deck order approved earliest = highest priority) and list
   the cut ones as "didn't fit — add a day?".
5. Persist via existing `itineraries`/`itinerary_stops`; return the stops with
   per-stop start/end times, travel legs, and day numbers.

### Timeline UI
Vertical day-by-day timeline (Day 1, Day 2…): time column, stop cards (thumb, name,
duration, accessibility/difficulty badges), travel legs as thin connectors with
drive-time labels ("25 min drive"). Actions: remove a stop (regenerates), "Book an
advisor for this trip" → Flow B pre-filtered. Fully bilingual; the timeline mirrors
under RTL.

---

## 5. Flow B — Advisor Finder & Booking

### Map + list
- **Leaflet + react-leaflet + OpenStreetMap tiles** (free, no API key — right call
  for a hackathon). Marker per advisor from `providers.lat/lon`; tourist's own
  position from browser geolocation with graceful fallback to a fixed Wadi Musa
  point (the demo room won't be in Jordan — ship a "demo location" toggle that
  pins the user to Wadi Musa center).
- Bottom sheet / side list mirrors the map: advisor cards sorted by distance —
  photo, name, role, rating, languages, verified badge, distance ("1.2 km away"),
  and the mock price for the current trip context.
- Filters: role (guide/driver), language, verified-only, welfare-compliant (for
  animal operators). These are `GET /providers` query params.

### Advisor profile
Photo, bio (EN/AR), rating, languages, sites covered, badges
(verified / welfare-compliant / accessibility tags), price breakdown, Book button.

### Booking
`POST /bookings` with provider, date, start time, hours (prefilled from the trip
plan if arrived via Flow A), group size → returns the booking `confirmed`
immediately (mock — no availability check, no payment). Confirmation screen shows
a booking code, the price with **"Estimated — demo pricing"** label, and emergency
contact info line (cheap to add, on the features list). A "My bookings" page lists
past bookings (`GET /bookings`).

Endpoints: `GET /providers` (extended with `near=lat,lon`, `role`, `language`,
computed `distance_km` + `quoted_price` in the response), `POST /bookings`,
`GET /bookings`, `POST /bookings/{id}/cancel`.

---

## 6. App shell & navigation

Bottom tab bar (mobile-first — judges will see a phone or a narrow window):

1. **Explore** (swipe deck) — default tab
2. **My Trip** (timeline of the current generated plan)
3. **Advisors** (map finder)
4. **Camera** (existing AI camera guide)
5. **Chat** (existing AI assistant)

Language toggle stays in the header. BiddingBoard is deleted (§1);
ProviderDirectory merges into Advisors. Rewrite `App.jsx` routes accordingly.
Keep everything
RTL-correct — this is the most commonly broken thing when adding gesture/map
libraries, test AR mode on every new screen.

---

## 7. Mock pricing (label it everywhere)

Single source of truth `backend/app/services/pricing_service.py`:

```
quote(provider, hours, group_size) =
    base_fee[role]            # guide 15, driver 20, vendor n/a, animal_op 10 (JOD)
  + hourly_rate_jod * hours   # per-provider, seeded 8–15 JOD range
  + 2 JOD * max(0, group_size - 4)
```

Returned as `{total_jod, breakdown: [...], is_mock: true}`. Every UI surface that
shows a price also shows the breakdown on tap (fee-transparency feature) and a
subtle "demo pricing" tag. When real pricing arrives, only this service changes.

---

## 8. features.md mapping

**In this build (MVP demo):**
swipe deck + AI itinerary generation with timeline (reframed "interest selection") ·
real-time map of nearby available providers · provider profile pages ·
search/filter providers · upfront price + fee breakdown transparency (mock) ·
in-app booking confirmation · booking history · cancellation (status flip only) ·
accessibility tagging · welfare-compliance badge · verified badge ·
bilingual AR/EN UI · camera-based AI tour guide (exists) · bilingual AI chat
(exists) · emergency contact info at booking.

**Mocked/stubbed in UI only:** in-app payment (fake confirm step) · push
notifications (in-app toast on booking) · ratings display (seeded numbers; no
post-trip review form unless time allows — it's a small form, good stretch task).

**Explicitly out (post-MVP — say so in the pitch, don't build):**
auth (all three roles) · admin dashboard/verification workflow · in-app messaging ·
the entire bidding family (request posting, provider offer submission, offer
comparison, counter-offers/negotiation, group bidding — **removed by team
decision**, not merely deferred) · availability calendars · disputes/refunds ·
loyalty/referrals · multi-currency · seasonal pricing · QR/selfie check-in ·
waitlists · corporate mode · earnings dashboard · vendor purchase flow · and the
entire long-tail AI list (passport stamps, recap video, crowd prediction, price-
fairness checker, translation beyond AR/EN, "surprise me" mode, narration
personalization, offline mode, safety alert, cost splitting, oral-history clips,
photo tips, fraud/sentiment detection, hazard reporting, mid-trip re-optimization,
provider-quality alerts, AI bio writing, voice navigation, packing list, smart
guide-matching, personalized recommendations). One narration-adjacent freebie:
if D1 lands, the camera guide can read Phase 2 `narration_script_*` for matched
landmarks — that's a config-level change in `vision_service.py`, worth doing.

---

## 9. Execution order (for the implementing session)

Each step should end with the app runnable and the change verifiably working.

- **E1. DB wiring (prereq):** switch `landmarks`, `providers`, `itineraries`,
  `bookings` reads/writes to the Postgres tables via `app/db.py` sessions,
  retiring `store.py` entirely, and delete the bidding router/models/pages (§1).
  Without this the map/pricing work reads stale mock structures.
- **D1. Phase 2 data → DB:** extend `scripts/build_dataset.py` to overlay
  `data/phase2/group*.json` (history/significance/narration/visiting_info/category)
  onto the landmark records; migration from §3; re-run pipeline + seed. Tolerate
  the missing group 3 file.
- **B1. Migration + mock providers:** provider location/rate/bio columns,
  `bookings` table, expanded `mock_providers.py`, seed.
- **A1. Swipe deck** (frontend) against `GET /landmarks`.
- **A2. `POST /itinerary/from-selection`** + timeline algorithm + tests for the
  packing logic (overflow, accessibility filter, no-coords case).
- **A3. Timeline UI.**
- **B2. Pricing service + extended `GET /providers` + bookings endpoints.**
- **B3. Map finder UI + profile + booking flow.**
- **S1. Shell/nav rework + AR/RTL pass over every new screen.**
- **Stretch (only in this order):** post-trip rating form → Petra mini-deck →
  camera guide narration upgrade.

Definition of done for the demo: swipe 6 cards → tap done → timeline appears →
tap "book an advisor" → map shows advisors → book → confirmation with price
breakdown. That loop, twice (once in Arabic), with zero errors.

---

## 10. Open decisions / risks

1. **PROJECT.md pitch rewrite** — with bidding removed, the pitch's "why not a
   normal booking app" section (§2.1 there) no longer matches the product. The
   fairness story becomes: one transparent, standard pricing formula for every
   verified provider — no ad-hoc negotiation, no loudest-tout-wins. Someone owns
   that rewrite before the demo; it is pitch work, not build work.
2. **`OPM` (Old Petra Museum)** is closed since 2011 (flagged in Phase 2) — exclude
   it from the swipe deck until the team decides; keeping a closed museum in a demo
   itinerary is a judge-visible error.
3. **`AMM`** stays out of the places data (recorded decision pending) — if it comes
   back, it comes back as a *provider* (camp = bookable stay), which fits Flow B.
4. **Geolocation in the demo room** — ship the "demo location = Wadi Musa" toggle
   day one; don't discover this on stage.
5. **Leaflet RTL** — test the map screen in Arabic early; popups/controls can
   misalign under `dir="rtl"`.
