# Ma'an Trip Planner

Swipe the places you want, get a day-by-day plan, book a verified local advisor
at a price you can see up front. Built for the Ma'an Hackathon for
Entrepreneurship (Irada Program) — see [PROJECT.md](PROJECT.md) for the problem
and the pitch, and [APP_PLAN.md](APP_PLAN.md) for the build plan this implements.

## Running it

Two processes. **Both are needed** — the app is useless without the API.

### 1. Backend (port 8000)

```bash
cd backend
python3.12 -m venv .venv                 # 3.13+ has no prebuilt pydantic-core wheel yet
.venv/bin/pip install -r requirements.txt
cp .env.example .env                     # then fill in DATABASE_URL and ANTHROPIC_API_KEY
.venv/bin/alembic upgrade head           # create/update the tables
.venv/bin/python -m app.seed             # load the researched places and mock advisors
.venv/bin/uvicorn app.main:app --port 8000 --reload
```

`DATABASE_URL` is the Supabase **connection pooler** string (`...pooler.supabase.com:6543`),
not the direct one — the direct host is IPv6-only and will not resolve on most
networks. Ask Mahdi for the value; it is deliberately not in git.

`ANTHROPIC_API_KEY` is only needed for the camera guide and the chat assistant.
Everything else — the deck, the itinerary, the advisor map, booking — runs
without it.

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The app opens on the Terhal splash, which sends a
first-time visitor through three onboarding screens and a returning one straight
to Explore — `terhal.onboarded` in localStorage is what separates them, so clear
site data to see onboarding again.

It is designed as a phone screen and sits in a
phone-shaped frame on a laptop. `npm run dev` also prints a Network URL — open
that on a real phone on the same wifi to demo it properly, or "Add to Home
Screen" to run it fullscreen as an installed app.

### Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -q
```

Covers the itinerary packer: day rollover, the accessibility filter, travel
legs, lunch placement, and the no-coordinates case.

## The demo loop

1. **Splash → onboarding** — the brand lockup, then three screens explaining
   discover / plan / experience. Skippable, and only shown once per device.
2. **Explore** — swipe right on places you like, left to skip. Tap a card for
   the researched history, its photo gallery, and honest accessibility notes.
3. **My Trip** — a day-by-day timeline with real travel times between stops.
   Set trip length and accessible-routes-only here; it rebuilds live. Anything
   that will not fit comes back with a reason instead of vanishing.
4. **Advisors** — verified local guides and drivers on a map, nearest first,
   each showing what *this* trip would cost before you commit.
5. **Book** — pick one, confirm, get a booking code and a full price breakdown.
6. **Camera / Chat** — point the camera at a monument for a narrated
   explanation, or ask the bilingual assistant a question.
7. **Profile / Passport** — trips, stamps and reviews, all counted from real
   bookings; the passport stamps a place once you have actually been taken there.

Every screen works in Arabic and English; the toggle is in the top right and
the whole layout mirrors.

## How the data got here

`backend/app/data/landmarks.py` is **generated** — never edit it by hand.

```
data/scraped_group_*.csv   Phase 1: names, coordinates, descriptions, licensed images
data/phase2/*.json         Phase 2: history, significance, narration, visiting info
        |
        |  python scripts/build_dataset.py
        v
backend/app/data/landmarks.py  ->  python -m app.seed  ->  Postgres
```

Re-run those two commands after anyone changes a research file. See
[data/README.md](data/README.md) for the field contract and
[PLAN.md](PLAN.md) for the sourcing and image-licensing rules the researchers
worked to. Nothing in the dataset is invented: places that could not be sourced
are flagged and skipped rather than filled in, which is why the pipeline reports
what it left out every time it runs.

## What is real and what is mocked

**Real:** 47 researched places (22 of them top-level destinations) with
bilingual descriptions, coordinates, and CC-licensed images with attribution;
the itinerary scheduling; distances; the AI camera guide and chat assistant.

**Mocked, and labelled as such in the UI:** advisor accounts, and all pricing.
Prices come from one formula in `backend/app/services/pricing_service.py` and
every quote carries `is_mock: true` plus a visible "demo pricing" note. When the
team settles the real formula, that file is the only thing that changes.

**Not built** (roadmap, not demo): accounts and login, admin verification
workflow, real payments, messaging, cancellations beyond a status flip. The
bidding marketplace described in PROJECT.md was removed by team decision on
3 Sept in favour of transparent formula pricing — PROJECT.md still needs
updating to match.
