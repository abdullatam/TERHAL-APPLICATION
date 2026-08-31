# Data Phase

Task breakdown for gathering, sourcing, and structuring all data needed for the Maan Project MVP. See [PROJECT.md](PROJECT.md) for full project context; Section 5 there defines the MVP scope this data feeds into.

**Note:** a first-pass AI-assisted dataset already exists in `backend/app/data/sites.py` and `backend/app/data/landmarks.py` (6 sites, 10 landmarks). Treat this phase as verifying, correcting, and expanding that seed set with real human research — not starting from zero.

**Blocker:** only the master-list step (enumerating and boundary-verifying every site) blocks the rest of the team. Once that list exists, scraping is split three ways and runs in parallel with database work and mock-data work.

---

## Abdelrahman — Site Enumeration & Verification (blocker) + Scraping Group A

- [ ] Enumerate every legitimate tourist attraction in Ma'an governorate — macro sites and landmark-level detail — and produce the master list with a short ID per entry
- [ ] Verify governorate boundaries for every candidate (confirm each is actually in Ma'an, not a neighboring governorate — Wadi Rum, for example, is Aqaba governorate, not Ma'an, a common mix-up)
- [ ] Split the finished master list into three roughly equal groups and hand two of them off to Mahdi and Pulga
- [ ] Scrape/write EN+AR descriptions and source a free-license image (Wikimedia Commons preferred, with license + attribution) for your own group (Group A)
- [ ] Once all three groups are back, merge everything into one structured handoff file (CSV/JSON), using field names agreed with Mahdi ahead of time
- [ ] Flag any site with no reliable source data or no free-license image, rather than guessing or using an unlicensed image

**Deliverable:** the master list (immediately, unblocks the team) and later the merged structured data file — all sites + landmarks, EN/AR text, image URL + attribution.

---

## Mahdi — Database Creation + Scraping Group B

- [ ] Scrape/write EN+AR descriptions and source a free-license image for your assigned group (Group B) once Abdelrahman hands off the master list
- [ ] Design the DB schema (sites, landmarks, providers, trip requests, bids, reviews) matching the existing Pydantic models in `backend/app/models.py` — can start immediately, doesn't wait on the list
- [ ] Stand up the database — SQLite is enough for the hackathon demo, structured so a Postgres swap later is easy
- [ ] Add migrations (Alembic or equivalent)
- [ ] Build the import/seed script that ingests the merged handoff file into the sites/landmarks tables
- [ ] Rewire the backend services (`itinerary_service`, `vision_service`, the bidding routes) to read from the database instead of the in-memory store
- [ ] Carry the provider verification fields (`verified`, `welfare_compliant`, `accessibility_tags`) into the new schema unchanged

**Blocked on:** the master list, only for your Group B scraping and the final DB seed step — schema design and DB setup can start immediately.

---

## Pulga — Mock Data & Data QA + Scraping Group C

- [ ] Scrape/write EN+AR descriptions and source a free-license image for your assigned group (Group C) once Abdelrahman hands off the master list
- [ ] Build out realistic mock provider/vendor accounts at scale — several guides/drivers/vendors per site and role, believable AR+EN names, JOD pricing ranges, ratings
- [ ] Create mock trip-request scenarios (varied group sizes, languages, accessibility needs) so the bidding board has real-looking demand to demo against
- [ ] QA pass on the merged scraped content — fact-check descriptions, dedupe entries, confirm every image URL resolves and its license is genuinely free-to-use (including your own Group C work — a second set of eyes still checks it)
- [ ] Proofread the Arabic text for accuracy and natural phrasing
- [ ] Write a validation script that checks the merged handoff file conforms to the schema Mahdi expects, before it gets seeded

**Blocked on:** the master list, only for your Group C scraping — mock provider/request data can be built immediately.
