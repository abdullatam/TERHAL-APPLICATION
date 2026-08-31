# Tasks

Working checklist for Phase 1. Full specifications, sourcing rules and image-licence
procedure are in [PLAN.md](PLAN.md) — **read §2, §3 and §4 before you start**; this
file is only the tick-list.

**Gate: Thu 3 Sept, 18:00** — all three group files complete.

Per entry you are filling seven fields: `description_en`, `description_ar`,
`avg_visit_minutes`, `accessibility_notes`, `image_url`, `image_license`,
`image_attribution` — plus whatever is listed under "extra gaps" for that row.
`avg_visit_minutes` and `accessibility_notes` are required on **every** row now,
monuments included ([PLAN.md](PLAN.md) schema note).

---

## Pulga — Group C + validation + QA + Arabic

You have three jobs beyond scraping, and two of them gate other people.
File: `data/scraped_group_c.csv`

### 1. Scrape Group C — 13 entries ✅ done

| ✓ | ID | Name | Extra gaps | Note |
|---|---|---|---|---|
| ☐ | `PET-CHU` | Petra Church | — | The Byzantine church with the mosaic floors — that's the visual identifier. |
| ☐ | `PET-DJN` | Djinn Blocks | `name_ar` | Purpose still debated. Write "debated", don't pick a theory. |
| ☐ | `PET-GRT` | Great Temple | — | Brown University published the Great Temple excavations. |
| ☐ | `PET-GTM` | Garden Tomb | `name_ar` | Garden Tomb / Garden Triclinium. Often confused with the Garden Temple — be precise. |
| ☐ | `PET-KHB` | Al-Khubtha High Place & Trail | — | The Treasury-overlook trail. Long stair climb — say so in `accessibility_notes`. |
| ☐ | `PET-LTC` | Lion Triclinium | `name_ar` | On the Ad-Deir route. Named for the weathered lions flanking the doorway. |
| ☐ | `PET-OBT` | Obelisk Tomb | `name_ar` | Obelisk Tomb + Bab as-Siq Triclinium are one two-storey monument. Keep as one row, say so. |
| ☐ | `PET-QAB` | Qasr al-Bint (Temple of Dushares) | — | **Fix `name_en` first:** "Dushares" &rarr; **Dushara**, then write. |
| ☐ | `PET-RST` | Roman Soldier's Tomb | `name_ar` | In the Wadi Farasa complex — make sure this and `PET-WFA` agree. |
| ☐ | `PET-TWL` | Temple of the Winged Lions | — | American Center of Research has excavation reports. |
| ☐ | `PET-WFA` | Wadi Farasa | `name_ar` | Wadi Farasa East project has published material. Cross-check with `PET-RST`, which sits inside it. |
| ☐ | `PET-WMD` | Wadi al-Mudhlim (Nabataean Dam & Tunnel) | `name_ar` | Nabataean dam and tunnel — a real engineering story, tell it properly. |
| ☐ | `PET-WSA` | Wadi Sabra | `name_ar`, **coords**, **source** | **Hardest in your group** — no source, no coords. Off the main trail, has its own small Nabataean theatre. Flag `no_source` if nothing solid surfaces. |

### 2. Write the validation script — **by Wed 2 Sept** ✅ done

`scripts/validate_data.py` (+ `scripts/test_validate_data.py`, 33 self-tests).
Run `--bounce` on the merged file to get findings grouped by who must fix them.

Before the merge exists, so it can run the moment the file lands. It must check:

- [x] Every `id` unique; no `id` changed from the master list
- [x] Row count matches expectation; any removal has a reason in `notes`
- [x] No row has both a blank `description_en` and a blank `content_flags` — that combination means the row was skipped, not flagged
- [x] `avg_visit_minutes` is a positive integer on **all** rows
- [x] `accessibility_notes` non-empty on **all** rows
- [x] `name_ar` present and contains Arabic script (not Latin transliteration)
- [x] `lat` / `lon` present and inside Ma'an; `PET-*` rows near `30.32, 35.44`
- [x] `image_license` is on the allowed list and contains **neither `NC` nor `ND`**
- [x] Every non-blank `image_url` returns HTTP 200 — script it, don't click 41 links
- [x] Columns exactly match the agreed header, in order

Exit non-zero on failure and print the offending row IDs. It will be run by someone
who didn't write it.

### 3. Validate the merge — Thu 3 Sept evening, right after Abd pushes

*Groups B and C already pass with 0 errors. Cannot reach PASSED until Group A is scraped — all remaining errors are its 13 rows.*

- [x] Run the validator against `data/merged.csv`
- [x] Confirm all image URLs resolve
- [x] Reject any licence containing `NC` or `ND`
- [x] Spot-check 10 descriptions against their `source_url` — accuracy *and* copy-paste
- [x] **Bounce failures back to Abd with the row IDs. Do not fix them silently.**

### 4. Arabic pass across all three groups — Fri 4 Sept ✅ B and C done, A pending

- [x] All 41 `name_ar` present, correct, and actually the name
- [x] All 41 `description_ar` read as written Arabic, not translated English word order
- [x] AR and EN descriptions say the same thing
- [x] No stray Latin text except unavoidable proper nouns
- [x] Flag anything you had to rewrite heavily, so that person learns it

> Your Arabic pass is the last check before seeding. Everyone writing their own AR
> alongside their EN keeps this to a review instead of a rewrite — chase them on it
> during the week, not on Friday.

---

## Abd — Group A + the five questions + the merge

*Abd = Abdelrahman, listed as Dam3a in PROJECT.md.*

File: `data/scraped_group_a.csv`

### 1. Settle these first — Mon 31 Aug, before scraping ✅ done

They change what gets scraped. Full detail in [PLAN.md](PLAN.md) §7.

- [x] **Q1** `OPM` vs `PAM` — confirmed distinct (1963 cave museum vs. 2019 visitor-center museum, sourced independently). Both now in Group A.
- [x] **Q2** `PET-QAB` "Dushares" &rarr; **Dushara**. Fixed in master_list.csv; matches Pulga's fix in Group C.
- [x] **Q3** `PET-HAB` "Cave de Sueth" — confirmed unrelated (that name belongs to Ayn al-Habis in the Yarmouk gorge). Parenthetical dropped.
- [x] **Q4** Painted Biclinium — Mahdi folded it into the `LPET` description in Group B rather than a separate row.
- [x] **Q5** `MPL` — confirmed, not cut. Found the official listing (museums.visitjordan.com) and a dedicated Arabic Wikipedia article; released from HOLD into Group A.

### 2. Scrape Group A — 15 entries (13 + `PAM` and `MPL`, released from HOLD by Q1/Q5) ✅ done

Yours are the hardest to source — castles, Neolithic sites, desert towns — and five of
the seven missing-coordinate entries are yours.

| ✓ | ID | Name | Extra gaps | Note |
|---|---|---|---|---|
| ✅ | `AMS` | Ain Musa (Moses Spring) | `name_ar`, **coords**, **source** | Sourced and described; no confident coordinates found anywhere, left blank rather than guessed. |
| ✅ | `BAJ` | Ba'ja (Neolithic site) | `name_ar` | — |
| ✅ | `BAS` | Basta (Neolithic site) | `name_ar` | — |
| ✅ | `BEI` | Beidha (Neolithic site) | `name_ar`, **coords** | — |
| ✅ | `JHR` | Jebel Harun / Tomb of Aaron | `name_ar` | — |
| ✅ | `OPM` | Old Petra Museum | `name_ar`, **coords**, **source** | — |
| ✅ | `SHB` | Shobak Castle (Montreal) | **coords** | — |
| ✅ | `UDH` | Udhruh (Roman legionary fort) | `name_ar` | — |
| ✅ | `UNZ` | Qasr Uneizah (Unayzah) | **coords**, **source** | Turned out to have a dedicated Wikipedia article after all. |
| ✅ | `USH` | Umm Sayhoun (Bedouin village) | — | No free image found, flagged `no_free_image`. |
| ✅ | `WMU` | Wadi Musa (town) | — | — |
| ✅ | `WUA` | Wu'ayra Castle (Vaux Moise) | — | — |
| ✅ | `PET-HAB` | Al-Habis Castle | — | Renamed per Q3. |
| ✅ | `PAM` | Petra Museum (visitor center) | `name_ar`, **source** | Released from HOLD by Q1. No free image found, flagged `no_free_image`. |
| ✅ | `MPL` | Founding King's Palace (Ma'an Railway Station) | `name_ar`, **coords**, **source** | Released from HOLD by Q5. No confident coordinates found. |

### 3. Merge — done

- [x] Concatenate all three group files into `data/merged.csv`, header once (automated by `scripts/build_dataset.py`)
- [x] No duplicate `id`
- [x] Every `parent_site` matches a real `id`
- [x] No row blank on both `description_en` and `content_flags`
- [x] Push, and tell Pulga it's up
- [x] Fix whatever validation bounces — nothing outstanding; `validate_data.py --merged --check-images` passes with 0 errors across all 42 rows

---

## Mahdi — Group B + the seed path

File: `data/scraped_group_b.csv`

### 1. Scrape Group B — 14 entries

The famous Petra set — abundant Wikimedia coverage, so this should be the fastest
group. Twelve of your fourteen need `name_ar`.

| ✓ | ID | Name | Extra gaps | Note |
|---|---|---|---|---|
| ☐ | `AJF` | Al-Jafr (desert town & basin) | `name_ar` | — |
| ☐ | `LPET` | Little Petra (Siq al-Barid) | `name_ar` | — |
| ☐ | `PET` | Petra | — | — |
| ☐ | `PET-COL` | Colonnaded Street | `name_ar`, **coords** | — |
| ☐ | `PET-COR` | Corinthian Tomb (Royal Tombs) | `name_ar` | — |
| ☐ | `PET-HPS` | High Place of Sacrifice | `name_ar` | — |
| ☐ | `PET-MON` | Monastery (Ad-Deir) | `name_ar` | — |
| ☐ | `PET-PAL` | Palace Tomb (Royal Tombs) | `name_ar` | — |
| ☐ | `PET-SIQ` | The Siq | — | — |
| ☐ | `PET-SLK` | Silk Tomb (Royal Tombs) | `name_ar` | — |
| ☐ | `PET-SOF` | Street of Facades | `name_ar` | — |
| ☐ | `PET-THE` | Roman Theatre | `name_ar` | — |
| ☐ | `PET-TRE` | Treasury (Al-Khazneh) | `name_ar` | — |
| ☐ | `PET-URN` | Urn Tomb (Royal Tombs) | `name_ar` | — |

Two warnings specific to your group:

- **Four Royal Tombs** (`PET-URN`, `PET-SLK`, `PET-COR`, `PET-PAL`) — write four genuinely distinct descriptions, don't paraphrase one four times. Silk Tomb's hook is the banded sandstone; Corinthian's is that its facade echoes Al-Khazneh; Palace Tomb's is that it's the widest.
- **`PET-COR` is the most likely camera-guide confusion in the dataset** because it resembles the Treasury. Its description and image should make the difference obvious.
- **`PET-TRE`** is the camera guide's headline test case. Pick a clean, well-lit, front-on image.

### 2. The seed path — the open problem

[backend/app/seed.py](backend/app/seed.py) reads `LANDMARKS` from
[backend/app/data/landmarks.py](backend/app/data/landmarks.py), a Python dict. **It does
not read a CSV**, so `data/merged.csv` currently connects to nothing.

- [ ] Write the `merged.csv` &rarr; `landmarks.py` converter (or a direct CSV seed path)
- [ ] Fold `image_license` into `image_attribution` — the DB has no licence column
- [ ] Decide what happens to `lat` / `lon` and `source_url`, which have no columns either. Dropping them loses the audit trail; adding two columns and a migration is cheap.
- [ ] Confirm `python -m app.seed` runs clean against all 42 rows
- [ ] **Don't hand-edit `landmarks.py` while the CSVs are being filled** — two sources of truth for the same rows will diverge within a day

---

## Shared rules — the short version

- **Never invent.** A flagged gap is fixable; a confident fabrication is not. `no_source` / `no_free_image` are correct answers.
- **Never use an unlicensed image.** Open the Commons file page, read the licence box, copy the photographer's name. No Google Images. Nothing with `NC` or `ND`.
- **Paraphrase.** Read it, close the tab, write it yourself. Facts are free; sentences aren't.
- **Write Arabic with the entry**, not in a batch on Friday.
- **Never change an `id`**, never rename a column, never edit someone else's group file.
