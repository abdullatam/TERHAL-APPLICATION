<div align="center">

# Terhal · ترحال

**Swipe the places you want. Get a day-by-day plan. Book a local guide at a price you can see up front.**

Built for the Ma'an Hackathon for Entrepreneurship (Irada Program) · Ma'an governorate, Jordan

`FastAPI` · `Postgres` · `React 18` · `Tailwind 3` · `Leaflet` · Arabic + English throughout

</div>

---

Petra takes about 900,000 visitors a year. Almost all of them arrive from
Amman, spend four hours in the Siq, and leave. The rest of Ma'an governorate —
Shobak's crusader castle, Udhruh's Roman fortress, the Neolithic villages at
Beidha and Ba'ja, the harissa Ma'an is famous for across Jordan — is an hour's
drive away and sees close to none of it.

Terhal is two apps on one backend. Tourists discover, plan and book; local
guides list what they offer, take the requests and get paid. No commission
model, no bidding war, no opaque pricing.

**[PROJECT.md](PROJECT.md)** has the problem and the pitch ·
**[APP_PLAN.md](APP_PLAN.md)** has the build plan ·
**[GUIDE_APP_PLAN.md](GUIDE_APP_PLAN.md)** has the four architecture decisions
behind the provider side.

---

## Contents

1. [Quick start](#quick-start)
2. [The demo loop](#the-demo-loop) — what to click, in order
3. [The two apps](#the-two-apps)
4. [Architecture](#architecture)
5. [The data pipeline](#the-data-pipeline)
6. [AI features](#ai-features)
7. [Bilingual and RTL](#bilingual-and-rtl)
8. [Real vs mocked](#what-is-real-and-what-is-mocked) — **read before demoing**
9. [Scripts](#scripts)
10. [Tests](#tests)
11. [Troubleshooting](#troubleshooting)
12. [Known gaps](#known-gaps)
13. [Who did what](#who-did-what)

---

## Quick start

Two processes. **Both are needed** — the frontend is useless without the API.

### 1. Backend — port 8000

```bash
cd backend
python3.12 -m venv .venv                 # 3.12 specifically; see below
.venv/bin/pip install -r requirements.txt
cp .env.example .env                     # then fill it in; see the table
.venv/bin/alembic upgrade head           # create/update the tables
.venv/bin/python -m app.seed             # load the researched places and demo guides
.venv/bin/uvicorn app.main:app --port 8000 --reload
```

> **Python 3.12, not 3.13 or 3.14.** `psycopg[binary]==3.2.3` publishes no
> wheel for 3.14, and pip falls back to building from source, which needs
> `libpq` and fails on a clean Mac. An earlier version of this README blamed
> `pydantic-core` — that was wrong, and cost somebody an afternoon.

Check it came up: <http://127.0.0.1:8000/docs> is the generated OpenAPI page,
and `curl 127.0.0.1:8000/health` should answer.

### 2. Frontend — port 5173

```bash
cd frontend
npm install
npm run dev
```

Open the URL **Vite prints**, not a hardcoded one — if something else already
holds 5173 (a stray Docker container will) Vite silently moves to 5174 and the
old port serves the other app. This has wasted debugging time before.

`npm run dev` also prints a Network URL. Open that on a real phone on the same
wifi to demo properly, or *Add to Home Screen* to run it fullscreen. It is
designed as a phone screen and sits in a phone-shaped frame on a laptop.

### Environment

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Supabase **connection pooler** string (`...pooler.supabase.com:6543`), *not* the direct one — the direct host is IPv6-only and will not resolve on most networks. Ask Mahdi; deliberately not in git |
| `OPENAI_API_KEY` | chat + camera | Both AI features prefer OpenAI |
| `ANTHROPIC_API_KEY` | chat + camera fallback | Either key alone works. With neither, both features return a clear error and the rest of the app is unaffected |
| `ALLOWED_ORIGINS` | CORS | Defaults to `http://localhost:5173` |
| `OPENAI_CHAT_MODEL` · `OPENAI_VISION_MODEL` | optional | Both default to `gpt-4o-mini` |

`backend/.env` is gitignored. **Never commit a key.** If one reaches a
transcript, a screenshot or a chat message, rotate it — do not just delete the
line.

---

## The demo loop

Follow this in order; it is the path everything was built and tested against.

| # | Screen | What to show |
|---|---|---|
| 1 | **Splash → onboarding** | Brand lockup, then three screens: discover / plan / experience. Skippable, shown once per device (`terhal.onboarded` in localStorage — clear site data to see it again) |
| 2 | **Choose role** | Traveller or local guide. This is the fork between the two apps, and either side can cross back over from its profile |
| 3 | **Explore** | Swipe right to add a place to the trip, left to skip. Tap a card for researched history, the photo gallery and honest accessibility notes |
| 4 | **My Trip** | Day-by-day timeline with real travel times between stops. Set trip length and accessible-routes-only; it rebuilds live. **Anything that will not fit comes back with a reason** instead of vanishing |
| 5 | **Advisors** | Local guides and drivers on a Leaflet map, nearest first, each showing what *this* trip would cost before you commit |
| 6 | **Book** | Pick one, confirm, get a booking reference and a full price breakdown. The request lands as `pending` — the guide has 24 hours |
| 7 | **Camera guide** | Point at a monument. Three modes: *Identify* names it and narrates, *Best frame* gives photographic advice, *Read sign* transcribes and translates an information board |
| 8 | **Chat** | Bilingual assistant that only knows what the app knows |
| 9 | **Passport** | Stamps for places you have actually been taken to, from real bookings |
| 10 | **Guide side** | Switch role: the request you just made is sitting in *Requests*. Accept it and watch the tourist's booking flip to `confirmed` |

Step 10 is the one worth rehearsing — it is the only point where both halves of
the product visibly touch the same database.

---

## The two apps

One build, one backend, one database. A role gate decides which shell you get.

### Tourist — 15 screens

Splash · Onboarding · Choose role · Explore · My Trip · Advisors ·
Advisor profile *(booking happens here)* · Booking confirmed · Bookings ·
Post-trip review · Camera guide · Chat · Passport · Marketplace · Profile

### Guide — 6 screens

| Screen | Does |
|---|---|
| **Today** | What is happening today, and the pending-request count |
| **Requests** | Accept or decline. 24-hour window, then it expires |
| **Calendar** | Block days you are unavailable |
| **Earnings** | Month by month, from confirmed bookings only |
| **Offerings** | Create, edit and delete what you offer |
| **Profile** | Editable bio and rate. **Not** editable: the verified and welfare badges — a provider marking themselves verified would make the badge worthless |

There is **no authentication anywhere**, on either side. Rather than build a
login form implying an account system that does not exist, the guide app opens
a labelled demo identity picker: choose which seeded provider to act as, and it
says plainly that this is what it is doing.

---

## Architecture

```
                         ┌──────────────────────────────┐
   tourist  ───┐         │  FastAPI  (backend/app)      │
               ├────────▶│                              │
   guide    ───┘         │  routers/                    │
   one React build,      │    landmarks   deck + detail │
   role-gated shell      │    itinerary   the packer    │
                         │    providers   guides + map  │
                         │    bookings    request→accept│
                         │    guide       16 endpoints  │
                         │    passport    stamps        │
                         │    marketplace makers        │
                         │    reviews     post-trip     │
                         │    chat        assistant     │
                         │    vision      camera guide  │
                         └───────────┬──────────────────┘
                                     │  SQLAlchemy 2.0
                                     ▼
                         ┌──────────────────────────────┐
                         │  Postgres (Supabase)         │
                         │  landmarks · landmark_images │
                         │  providers · bookings        │
                         │  offerings · availability    │
                         │  reviews   · passport stamps │
                         └──────────────────────────────┘
```

33 endpoints across 10 routers. Alembic owns the schema; `app.seed` loads the
researched data.

**Frontend layout.** 22 pages, 22 routes. `components/Shell.jsx` is the phone
frame, tourist tab bar and top bar; `components/GuideShell.jsx` is the guide
equivalent. Trip state lives in `state/TripContext.jsx` and persists to
localStorage, so a phone locking itself mid-demo does not throw away a
hand-built plan.

**`tailwind.config.js` is the single source of colour.** The six brand hexes,
the secondary ink ramp, the surface tints. The old `sand`/`rose` scales were
deleted rather than aliased — two overlapping colour systems is how a palette
drifts. If you need a colour, add it there, not inline.

---

## The data pipeline

`backend/app/data/landmarks.py` is **generated. Never edit it by hand.**

```
data/scraped_group_*.csv    Phase 1: names, coordinates, descriptions, licensed images
data/phase2/*.json          Phase 2: history, significance, narration, visiting info
data/landmark_images.csv    the photo gallery, three per place
        │
        │   python scripts/build_dataset.py
        ▼
backend/app/data/landmarks.py
        │
        │   .venv/bin/python -m app.seed
        │   backend/.venv/bin/python scripts/load_images.py --commit
        ▼
   Postgres
```

Re-run those after anyone changes a research file.
[data/README.md](data/README.md) has the field contract;
[PLAN.md](PLAN.md) §4 has the sourcing and image-licensing rules.

### The rule that matters

**Nothing in the dataset is invented.** A place that could not be sourced is
flagged and skipped, not filled in — which is why every script reports what it
left out. A photo nobody can prove the rights to is worse than no photo, so the
`landmark_images` table makes licence and attribution `NOT NULL`, the loader
rejects **NC** and **ND**, and a place with no free-licensed photo renders a
placeholder reading *"No free-licensed photo yet."* That placeholder is a
feature. Do not fill it with a generic stand-in — a CC0 photo of chicken mandi
is not a photo of a named restaurant.

Subject verification has bitten this project repeatedly, so candidates are
checked four ways before use: EXIF coordinates against the place's own, the
building compared against the photo already in position 1, a hash against every
image already on disk, and the file page's own description rather than the
search snippet. That process has caught a Qasr al-Bint 40 km from Petra, photos
of Beidha filed under Ammarin, and a "new" photo byte-identical to one already
shipping.

Images are **self-hosted** in `data/images/`, served at `/images/...`. Commons
rate-limits bulk access hard and answered a good share of a card-deck's worth
of requests with HTTP 429 — verified, not theoretical.

---

## AI features

Both prefer `OPENAI_API_KEY` and fall back to `ANTHROPIC_API_KEY`.

### Chat assistant

The system prompt is **assembled from the `landmarks` table at runtime**
(`backend/app/services/chat_service.py`), so it knows exactly what the app
knows: every place with its researched history, significance and accessibility
notes, plus an explicit list of the places with no Phase 2 depth yet, so it says
so instead of inventing one. Cached on row count, rebuilt when the data changes.

It is **barred from stating any price** — no figure, no range, no estimate. It
once volunteered "around 70–100 JOD" for a guide, which was invented, and the
rule now has exactly one exception: an entrance fee recorded against a place in
the database, repeated exactly as written.

### Camera guide

`POST /vision/identify` sends the photo with the landmarks table as a **closed
catalogue** and asks for JSON, so the screen shows a real confidence score and a
real Arabic name rather than parsing prose. Three modes: `identify`, `frame`,
`sign`.

The returned landmark id is **never trusted** — it is looked up before anything
claims a match, so a hallucinated id surfaces as "no match" rather than a
confident wrong name. Point it at something that is not in Ma'an and it says
so. A stop inside Petra is not separately bookable, so the response carries the
parent as `add_to_trip_id` and the button names it: *Add Petra to My Trip*.

The golden-hour chip is real sunset arithmetic for Petra
(`frontend/src/utils/sun.js`), and "2 min story" is measured from the
narration's word count. Flash and bookmark say they are not in this build
rather than looking live.

---

## Bilingual and RTL

Arabic and English are **equal**, not a translation layer. The toggle is in the
top bar and the whole layout mirrors.

- Every string goes through `frontend/src/i18n/en.json` and `ar.json` —
  **404 keys, full parity.** No hardcoded user-facing text
- Logical CSS properties only: `ps-` / `pe-`, `ms-` / `me-`, `start-` / `end-`.
  Never `pl-` / `pr-` / `left-` / `right-`
- Poppins carries no Arabic glyphs, so `[dir="rtl"]` binds the font stack to
  Noto Sans Arabic in `index.css` — otherwise Arabic silently falls back to a
  system face and loses the brand's character
- Arabic narration is **regenerated**, not client-side translated

**Two deliberate exceptions**, both documented in the code:

1. **Explore's swipe gesture** stays physically right-means-add. Mirroring it
   would mean the same physical flick adds a place in one language and skips it
   in the other.
2. **The Leaflet map** is forced `ltr`, or tiles and controls mirror.

---

## What is real and what is mocked

Read this before demoing. Being caught overclaiming is worse than the gap.

### Real

- **47 researched places**, 22 of them top-level destinations, with bilingual
  names and descriptions, verified coordinates, and researched history for 32
- **127 CC-licensed photos** with attribution, self-hosted, 38 places at three
- **The itinerary packer** — real distances, real travel legs, day rollover,
  lunch placement, an accessibility filter that defaults to *deny* when a
  place's accessibility is unknown
- **The full booking cycle**, both sides: request → guide accepts → tourist's
  booking flips to `confirmed`, on one database
- **Both AI features**, grounded in the real dataset
- **Passport stamps**, counted from actual bookings

### Mocked, and labelled in the UI

- **Guide accounts.** 12 seeded providers. No auth on either side; the guide app
  uses a labelled demo identity picker
- **All pricing.** One formula in `backend/app/services/pricing_service.py`.
  Every quote carries `is_mock: true` and a visible amber "demo pricing" note.
  When the team settles the real formula, that file is the only change

### Not built — roadmap, not demo

Accounts and login · admin verification workflow · real payments · messaging ·
cancellation beyond a status flip · favourites · video

The **bidding marketplace** in PROJECT.md was removed by team decision on
3 September in favour of transparent formula pricing. PROJECT.md still needs
updating to match — it is the one doc that contradicts the build.

---

## Scripts

All run from the repo root. Anything touching the database needs
`backend/.venv/bin/python`; the rest run on plain `python3`.

| Script | Does |
|---|---|
| `build_dataset.py` | research files → `backend/app/data/landmarks.py`. Run after any data change |
| `validate_data.py` | Phase 1 gate: coordinates inside Ma'an, licences, no NC/ND, `--check-images` |
| `test_validate_data.py` | 33 tests for the validator itself |
| `phase2_scaffold.py` | generates a researcher's Phase 2 file, carrying Phase 1 fields across |
| `validate_phase2.py` | checks Arabic fields contain Arabic, narration is not a copy of history, coordinates fall inside Ma'an, and counts `UNKNOWN` markers so honest gaps stay visible |
| `load_images.py` | validates `data/landmark_images.csv`, `--commit` to upsert |
| `selfhost_images.py` | downloads remote images into `data/images/` and rewrites the CSV |
| `validate_videos.py` | validates `data/landmark_videos.csv`. **No `--commit`** — the table does not exist yet, and it says so |

---

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -q     # 18 tests
python3 scripts/test_validate_data.py                  # 33 tests
```

The backend suite covers the itinerary packer: day rollover, the accessibility
filter, travel legs, lunch placement and the no-coordinates case.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `pip install` fails building psycopg | Not Python 3.12. Recreate the venv with `python3.12` |
| `could not translate host name` | You used the **direct** Supabase URL. Use the pooler (`:6543`) |
| Every image is the SPA's HTML | Vite is not proxying `/images`. `vite.config.js` proxies both `/api` **and** `/images` — check both are there |
| App loads, all data missing | Backend is not running, or is on a port other than 8000 |
| A different app entirely | Vite moved off 5173. Use the URL it printed |
| Camera/chat error, rest fine | No API key set. Expected and contained |
| Arabic renders in the wrong font | A component set `font-sans` on Arabic text. Use `font-arabic` or let `[dir="rtl"]` handle it |
| Layout breaks only in Arabic | A physical CSS property. Search the file for `pl-`, `pr-`, `left-`, `right-` |

---

## Known gaps

Honest list. Everything here is known, not discovered later.

- **9 places have fewer than three photos; 3 have none** (Abu Hutana, Khirbet
  el-Qirana, Rujm Tawil Ifjeij). Not an effort problem — the free-licensed
  photos do not exist, and the archives holding the right photographs (APAAME,
  ACOR) are NC/ND. See **[Dam3a3.md](Dam3a3.md)**, which briefs the remaining
  work and the two routes that do apply: ask the business, or shoot it.
  *Dam3a3.md counts 15 and 9 because it also covers the food and activity
  places in the bullet below, whose landmark records have not merged yet*
- **Video has no home yet** — no table, no loader, no API field, no player.
  Research can proceed into `data/landmark_videos.csv`; Dam3a3.md §7 lists the
  plumbing
- **~50 MB of images in git.** If this project continues, that needs git-lfs or
  object storage
- **Explore does not surface the 72 photos on Petra's 25 child stops**, only
  Petra's own three
- **PROJECT.md still describes the removed bidding mechanic**
- **The passport reward line names a specific camp discount** with no reward
  system behind it — a commercial claim that should come out or be honoured
- **The food and activity places** — five Ma'an restaurants, the Petra balloon,
  a cafe — have image and video slots seeded here, but their landmark records
  are still in flight on another branch. Until those merge, main is 47 places,
  not 53, and `validate_videos.py` reports their blank slots as warnings

---

## Who did what

| | |
|---|---|
| **Pulga** | Phase 1 data extraction and the validation gate · the Terhal frontend rebuild · the guide app · camera guide · chat assistant |
| **Abd** | Image sourcing — three photos per place, licences read off each file page |
| **Dam3a** (Abdelrahman) | Phase 2 depth for the Petra landmarks · field photography · the photo and video pass ahead |
| **Mahdi** | Phase 2 depth for the macro sites · Supabase |

Task files: [tasks/](tasks/) for Phase 2, [ABD_TASKS.md](ABD_TASKS.md) and
[Dam3a3.md](Dam3a3.md) for media.

---

<div align="center">

MIT licensed · the researched data carries its own per-place licences and attribution

</div>
