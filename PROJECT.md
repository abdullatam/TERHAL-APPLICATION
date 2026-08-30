# Maan Project

> **Working name:** Maan Project (a.k.a. Ma'an Trip Planner)
> **Hackathon:** Maan Hackathon for Entrepreneurship (Irada Program)
> **Application deadline:** 8 September 2026
> **Team:** Pulga, Dam3a, Mahdi
> **Fields:** Tourism innovation and experience design · Social innovation and community empowerment
> **Status:** Pre-build / MVP scoping

This document is the single source of truth for the Maan Project. Any engineer or AI coding agent picking this up should be able to understand the problem, the solution, the users, and the scope entirely from this file.

---

## 1. Problem Statement

Ma'an governorate is home to **five major tourism assets** — Petra, Little Petra, Shobak Castle, the historic town of Wadi Musa, and the wadi trail network around Petra (Wadi Farasa, Wadi Sabra, Wadi al-Mudhlim) — yet nearly all tourism revenue and attention concentrates on Petra alone, while the governorate's other legitimate sites remain economically invisible.

Meanwhile, Ma'an has:
- **The highest unemployment rate in Jordan: 29.4%** (Q3 2025), nearly double the national average and the worst of all 12 governorates
- **A Human Development Index of 0.693 — ranked 11th of 12 governorates** in Jordan
- **Over 85% of the local population depending directly or indirectly on tourism** for income

This is not a shortage of tourism assets or demand — over **1 million visitors pass through Ma'an annually**, mostly to see Petra. The failure is structural: there is no fair, verified, efficient system connecting that visitor demand — across the *entire* governorate, not just one site — with local supply.

### The current system, as it actually exists today

- **Extreme tourism concentration on Petra.** Visitors overwhelmingly see Petra and leave. Little Petra, Shobak Castle, and Wadi Musa's own attractions are treated as afterthoughts or skipped entirely — meaning locals near those sites see almost none of the tourism economy Petra generates.
- **Harassment and scams at the main site.** Unlicensed guides and vendors aggressively pressure tourists. One documented traveler account describes needing to say "no" **up to 2,000 times in a single day** at Petra.
- **No unified way to discover or book across sites.** A tourist wanting to combine Petra with Shobak Castle or the wadi trails has no single trusted channel to plan an itinerary, book guides, or arrange transport between them.
- **Opaque, inconsistent pricing** at every site, with no fair-market reference point — prices are negotiated ad hoc, and whoever is loudest or best-positioned wins the sale, not necessarily the best or fairest provider.
- **Revenue leakage to outside tour operators**, who bundle multi-site trips without routing money back to local Ma'an residents at each stop.
- **Barrier to entry for new/unemployed local youth.** Established touts dominate high-traffic spots near Petra's gates, locking out newer or less-connected locals — directly reinforcing the unemployment problem.
- **Boom-bust income instability.** Guides describe it as: *"If there are tourists, we work and eat. If not, we sleep."* There is no structured way to actively compete for business during slow periods.
- **Extreme demand volatility from regional instability.** Tourism-dependent income in Ma'an has seen cancellation rates hit **95–100%** during recent periods of regional conflict (e.g., the Gaza war since Oct 2023, Iran-Israel tensions) — with almost no cushion because the local economy is undiversified.
- **Animal welfare concerns at Petra.** International animal welfare investigations have documented **1,300+ working horses, donkeys, and camels** suffering from beatings, lack of water/shade, and forced climbs up 900 steps to the Monastery. Some fixes exist (electric carts introduced in 2021) but coverage is partial.
- **No accessibility planning.** Visitors with reduced mobility have no centralized way to know which routes/sites are accessible; electric carts help but are not comprehensively integrated into trip planning anywhere.

---

## 2. The Solution

The **Maan Project** is a bidding-based marketplace platform — not a simple "browse and book" directory — that connects tourists with **verified local guides, drivers, and vendors across all of Ma'an governorate's tourism sites**, wrapped in an AI-powered trip-planning layer.

### 2.1 Why a bidding model, specifically

Instead of a tourist browsing a fixed list and picking one provider (like a normal marketplace), the tourist **posts what they need** (site, date, group size, language, special requirements — e.g., wheelchair-accessible transport, geology-focused guide, etc.) and **verified local providers submit competing offers** on the job with price, availability, and relevant credentials. The tourist picks the best offer.

This mechanic specifically solves problems a plain booking app would not:

| Problem | How the Maan Project's bidding model solves it |
|---|---|
| No price transparency | Multiple competing offers on the same job make fair market price visible automatically |
| Loudest/most aggressive vendor wins | Providers compete on price + rating + specialty, not who shouts hardest |
| New/unemployed locals can't break in | Bidding is merit-based — a brand-new verified guide can win on price/rating alone, no existing reputation or prime real estate required |
| No matching for specific needs | Tourist posts exact requirements (language, accessibility, specialty); only relevant providers respond |
| No accountability before booking | Every offer carries the provider's verified rating/history |
| Boom-bust income instability | Providers can actively offer lower prices or bundle deals during slow periods instead of waiting idle |
| Hard to coordinate group trips | One request can receive coordinated team offers (e.g., 1 guide + 2 drivers together) |
| No response to demand spikes | The market self-adjusts — more competing offers during high demand, sharper pricing during lulls |

### 2.2 Governorate-wide coverage (not just Petra)

The Maan Project explicitly lists verified providers at **every major Ma'an site**, not only Petra:
- Petra (Treasury, Monastery, Siq, Royal Tombs, Street of Facades)
- Little Petra (Siq al-Barid)
- Shobak Castle (Montreal)
- Wadi Musa town (Petra Kitchen, local markets, Petra Museum)
- The wadi trail network (Wadi Farasa, Wadi Sabra, Wadi al-Mudhlim)

The AI itinerary generator can plan **multi-site trips** (e.g., Petra + Little Petra + Wadi Musa in one visit, or a standalone Shobak Castle day trip) — something no current tool does. This increases total visitor spend and time-in-governorate instead of the typical same-day in-and-out visit to Petra alone, and extends income opportunity to communities around the secondary sites who currently see almost none of the tourism economy.

### 2.3 Core feature set

**A. Trip Planning Layer**
- Tourist selects interests (history, hiking, photography, food, culture), trip length, budget, and any accessibility needs
- AI itinerary generator builds a day-by-day plan across real Ma'an sites — order of stops, best visiting times, estimated travel time between them
- Multi-site routing (not limited to Petra)

**B. Bidding Marketplace**
- Tourist posts a request (site(s), date, group size, language, specialty, accessibility needs) tied to the generated itinerary
- Verified guides, drivers, and vendors near the relevant site(s) submit offers (price, availability, credentials)
- Tourist reviews offers (price + rating + specialty match) and selects
- In-app booking and payment — no cash-only pressure tactics, no hidden markups
- Post-trip rating/review system builds the verified reputation layer over time

**C. Local Vendor Layer**
- Artisan/handicraft sellers and local food spots tagged along generated routes at any site
- Tourist can add stops and buy directly — cutting out middlemen

**D. Verification & Trust System**
- Guides/drivers/vendors register once, upload ID + license, get verified by admin review
- **Welfare-compliance badge** for animal-ride operators who meet water/rest/shade standards — tourists can choose ethical operators or default to walking/electric-cart alternatives
- **Accessibility tagging** — routes and providers flagged for wheelchair/reduced-mobility compatibility
- In-app scam/harassment reporting builds a real trust signal over time

**E. AI Layer**
- **AI itinerary optimizer** — reorders/suggests stops based on time of day, crowd patterns, and weather
- **Bilingual AI chat assistant (Arabic/English)** — answers visitor questions about sites, safety, and pricing in real time; can proactively suggest rest/water stops based on route progress and heat
- **Camera-based AI tour guide** — tourist opens their phone camera and points it at a monument, facade, ruin, or landmark; the AI identifies what they're looking at and narrates its history, significance, and context out loud (or as text), in Arabic or English. This works at any site in the governorate — the Treasury, the Monastery, Shobak Castle, Little Petra's facades, etc. — turning a phone into a live, on-demand expert guide without needing to book a human guide for basic orientation. This is the platform's core "see it, understand it instantly" experience layer.
- **Smart guide-matching** — AI matches tourists to guides based on language, interests, and past ratings
- **Personalized recommendations** — learns from what past tourists with similar interests enjoyed

---

## 3. Target Audience

### 3.1 Primary users — Tourists
- International and domestic visitors to Ma'an governorate (Petra is the primary draw, but the platform targets visitors interested in a fuller governorate experience)
- Solo travelers, families, and small groups
- Visitors with accessibility needs currently underserved by existing options
- Budget-conscious travelers who want transparent, fair pricing instead of ad hoc negotiation

### 3.2 Primary users — Local Service Providers
- Licensed and newly-certifying local tour guides
- Local drivers (car, van, group transport)
- Vendors: handicraft sellers, food/tea stall operators, artisans (Bedouin/Bdoul community especially)
- Animal-ride operators willing to meet welfare-compliance standards
- Specifically: **unemployed or underemployed youth in Ma'an governorate** seeking a structured, merit-based entry point into the tourism economy — this is the population most affected by the 29.4% unemployment rate this platform is designed to address

### 3.3 Secondary stakeholders
- Irada Program / hackathon judges evaluating relevance to local economic development
- Ma'an Development Area (MDA) and local tourism authorities, as potential future institutional partners
- Ministry of Tourism / Petra Regional Authority, as potential long-term partners for verification/licensing integration

---

## 4. Problems Solved — Summary with Evidence

| # | Problem | Evidence / Numbers | How the Maan Project Solves It |
|---|---|---|---|
| 1 | Chronic local unemployment | 29.4% unemployment in Ma'an — highest in Jordan (Q3 2025) | Merit-based bidding creates a structured income channel open to any verified local, regardless of existing reputation or location |
| 2 | Tourism concentrated only at Petra | 5 major sites in Ma'an; only Petra captures meaningful tourism revenue | Governorate-wide provider listings + multi-site AI itinerary generator |
| 3 | Tourist harassment and scams | Documented account of needing to decline offers ~2,000 times in one day at Petra | Pre-booked, verified providers reduce exposure to unsolicited approaches |
| 4 | Opaque, unfair pricing | No official reference pricing exists; ad hoc negotiation is the norm | Bidding model makes fair market price visible by design |
| 5 | Revenue leakage to outside operators | Local Bedouin communities report seeing the least benefit from tourism revenue | Direct tourist-to-verified-local booking, no external middlemen |
| 6 | Barrier to entry for new/unemployed locals | Established touts dominate high-traffic spots at Petra's gates | Merit-based bidding lets a brand-new provider compete on day one |
| 7 | Boom-bust income instability | Guides describe it as "if there are tourists we work, if not we sleep" | Active bidding and bundling during slow periods instead of passive waiting |
| 8 | Demand volatility from regional instability | Cancellation rates hit 95–100% during past regional conflict spikes | Multi-site diversification is more resilient than single-site dependency |
| 9 | Animal welfare concerns | Investigations documented 1,300+ working animals suffering harsh conditions at Petra | Welfare-compliance badges; nudges toward walking/electric-cart alternatives |
| 10 | No accessibility planning | Petra's terrain includes 900 steps to the Monastery; electric carts are only a partial fix | Accessibility-tagged routes and providers integrated into the itinerary planner |

---

## 5. MVP Scope (What Gets Built and Demoed by Sept 8, 2026)

To keep this realistic for the hackathon timeline, the demo-able core loop is:

1. Tourist selects interests + trip length + accessibility needs → receives an AI-generated multi-site itinerary across real Ma'an sites (not just Petra)
2. Itinerary generates a booking request automatically
3. Verified local guides/drivers submit offers on the request (simulate multiple mock provider accounts for the demo)
4. Tourist reviews offers and books directly in-app
5. **One** AI feature is fully working and demo-ready — the **camera-based AI tour guide** is the recommended flagship choice, since it's the most visually compelling to demo live in front of judges (point phone at a photo/monument, get instant narrated explanation). The itinerary generator and chat assistant are strong fallback/secondary options if the camera feature proves too technically heavy to make reliable in time — but only build one to full reliability rather than three half-working ones.

### Explicitly OUT of MVP scope (documented as "Phase 2 / Roadmap" in the pitch, not built for the demo)
- Full vendor marketplace (artisan/food stalls) beyond a placeholder
- Full animal-welfare verification workflow (badge system can be mocked/described, not fully built)
- Multi-language support beyond Arabic/English
- Real payment processing (use a mocked/sandbox payment flow)
- Admin dashboard beyond a minimal verification approval screen

Judges score **MVP Status** (5 pts) and **Business Model** (15 pts) — a small set of features that actually run beats a long feature list that's half-working. The full vision above belongs in the pitch deck and business model section; the MVP demo should be tight and reliable.

---

## 6. Technical Stack

- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + Tailwind CSS
- **Language requirement:** Bilingual Arabic/English UI is a non-negotiable design standard

---

## 7. Evaluation Alignment (Maan Hackathon Criteria)

| Criteria (Max Score) | How the Maan Project Addresses It |
|---|---|
| Innovation (15) | Bidding-based marketplace model for tourism services — not a standard booking app |
| Business Model (15) | Commission-based revenue on completed bookings; scalable across sites and governorates |
| Market Potential (15) | 1M+ annual Petra visitors alone; expandable to all of Ma'an's sites and beyond |
| Team Eligibility (10) | Team has direct hackathon and applied-AI project experience |
| Economic Impact (10) | Directly targets Ma'an's 29.4% unemployment rate with a structured local income channel |
| Growth Potential (10) | Clear Phase 2 roadmap: vendor marketplace, full welfare verification, multi-language support |
| Customer Validation (10) | Problem is backed by documented tourist complaints, animal welfare reports, and labor statistics — not assumed |
| Relevance to Themes (5) | Directly matches "Tourism innovation and experience design" and "Social innovation and community empowerment" |
| Intellectual Property (5) | Novel combination of bidding-marketplace mechanics + AI itinerary planning for a specific regional tourism context |
| MVP Status (5) | Tight, working core loop demoed live — not just slides |

---

## 8. Notes for Contributors / Coding Agents

- **Camera-based AI tour guide implementation note:** use a multimodal vision-capable model (image input + text output) to identify what the camera is pointed at, then ground the response against a small curated knowledge base of Ma'an sites (Petra's key facades, Shobak Castle, Little Petra, etc.) rather than relying purely on the model's general knowledge — this avoids inaccurate or generic answers and keeps responses specific to the actual governorate. Build the knowledge base as structured data (site name, key facts, history, significance) that gets injected alongside the image so the AI's narration is accurate and consistent, not hallucinated.
- Prioritize the MVP core loop (Section 5) above all else. Do not build out Phase 2 features unless the core loop is fully working and demo-stable.
- Bilingual Arabic/English support should be treated as a first-class requirement from the start of UI development, not retrofitted later.
- All "verified provider" and "welfare-compliance" claims in the UI must be backed by actual mock data structures reflecting the verification workflow described above — even in demo/mock form, the data model should reflect the real intended system (a `verified: bool`, `welfare_compliant: bool`, `accessibility_tags: []` field on provider records, etc.) so it's credible to judges reviewing the codebase.
- Deadline: **8 September 2026** (Irada Program application). Build with that constraint as the hard ceiling for MVP completion.
