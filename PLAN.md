# Phase 1 — Data Extraction

**The only goal of this phase:** turn the verified places in
[data/master_list.json](data/master_list.json) into one complete, licence-clean,
bilingual data file that can be seeded into a database without a human touching it
again.

Nothing else is in scope here. No database work, no API work, no frontend, no mock
providers. Phase 1 ends when the extracted data passes validation and is seeded.

> **Schema note — read this first.** As of commit `41858b8` the backend has been
> flattened: `Site` is gone and **`Landmark` is the only place entity**. A whole area
> (Petra, Wadi Musa town) and a single monument (the Treasury) are both just rows in
> the `landmarks` table. Two consequences for this phase:
> **(a)** `avg_visit_minutes` and `accessibility_notes` are `NOT NULL` on every row, so
> they are now required for **every entry**, not just the 16 that used to be sites.
> **(b)** `type` and `parent_site` are no longer part of the target schema. Keep them
> in the CSV as working metadata — they are useful for splitting the work and for
> sanity-checking — but they are not seeded.

**Owners:** Abd (Abdelrahman, a.k.a. Dam3a) → Group A · Mahdi → Group B · Pulga → Group C
**Deadline:** all three group files complete **Thu 3 Sept, 18:00**. Merge and
validation same evening.

---

## 1. What is already done — do not redo it

The enumeration and boundary-verification step is **closed**. You are not looking for
new places, and you are not re-checking which governorate they are in.

| | Count |
|---|---|
| Verified places, boundary-checked | **41** |
| — removed as not-a-landmark | 1 (`AMM`, see §6) |
| — released from `HOLD` by Q1 | 1 (`PAM`, distinct from `OPM`) |
| — released from `HOLD` by Q5 | 1 (`MPL`, confirmed via museums.visitjordan.com and Arabic Wikipedia) |
| **Landmark rows to scrape** | **42** |
| — sites | 17 |
| — landmarks | 25 |
| On `HOLD`, unverified | 0 |
| Confirmed outside Ma'an, excluded | 4 |
| Already have coordinates | 34 / 41 |
| Already have a source URL | 37 / 41 |
| Already have `name_ar` | 13 / 41 |

Every coordinate already in the file was pulled from OpenStreetMap or a Wikipedia
infobox and checked against a bounding box — `PET-*` entries against the Petra park
box, everything else against the Ma'an governorate box. Matches that landed outside
their box were rejected rather than accepted, which is how a wrong *Qasr al-Bint*
about 40 km north of Petra got caught. **Treat existing coordinates as correct.**

The four exclusions are settled and stay in the master list as a record of what was
checked: **Wadi Rum** (Aqaba), **Dana Biosphere Reserve** (Tafilah), **Wadi al-Hasa**
(Karak/Tafilah border), **Wadi Hisma** (unresolved, excluded on caution). Do not
re-litigate these, and do not add them back.

---

## 2. The output contract

Work directly in your own file. The columns exist already and are identical in all
three:

- `data/scraped_group_a.csv` — Abd
- `data/scraped_group_b.csv` — Mahdi
- `data/scraped_group_c.csv` — Pulga

**Do not add, remove, reorder or rename a column.** The merge and the validator both
key off exact names. If you think a column is wrong, say so in the group chat before
you change anything.

### 2.1 Columns already filled — verify, don't overwrite

| Column | Rule |
|---|---|
| `id` | **Never change.** It is the primary key, it is referenced by `parent_site`, and it is already in three separate files. |
| `type` | `site` or `landmark`. **Working metadata only — not seeded.** Kept because it's a useful hint for how long a visit takes and how much description an entry needs. |
| `parent_site` | **Working metadata only — not seeded.** Still useful for spotting that 25 entries sit inside Petra and their descriptions shouldn't repeat each other. |
| `name_en` | Fix spelling and naming errors, keep the entity the same. |
| `in_maan_governorate` | Already `yes` for all of them. Do not touch. |
| `lat` / `lon` | Decimal degrees. Fill only where blank — 7 entries. |
| `source_url` | Append, pipe-separated, never replace what is there. |

### 2.2 Columns you are filling

| Column | Applies to | Specification |
|---|---|---|
| `name_ar` | all | The **name**, not a translation of the description. Arabic script. 28 still blank. |
| `description_en` | all | 2–4 sentences. **Paraphrased in your own words.** Concrete and specific — what it is, when it was built, who built it, what a visitor actually sees. |
| `description_ar` | all | Same content in natural Arabic. Not machine-translated English word order. |
| `avg_visit_minutes` | **every row** | Integer, realistic, `NOT NULL`. Petra as a whole is a day; the Treasury alone is 20 minutes; a Neolithic mound is 45. Feeds the itinerary generator, so a wrong number produces a nonsense itinerary. |
| `accessibility_notes` | **every row** | Plain, honest text about mobility, `NOT NULL`. Say what is *not* accessible. "Uneven ruins terrain, no paved paths" is useful; "may be difficult" is not. Every monument needs its own answer now — the Monastery's 800 steps and the Siq's flat floor are different rows. |
| `image_url` | all | Direct file URL. See §4. |
| `image_license` | all | Exact licence name: `CC BY 4.0`, `CC BY-SA 3.0`, `CC0`, `public domain`. |
| `image_attribution` | all | `Photo by NAME, LICENCE, via Wikimedia Commons`. |
| `content_flags` | all | `no_source`, `no_free_image`, or blank. See §6. |

### 2.3 What actually reaches the database

The `landmarks` table ([backend/app/db_models.py](backend/app/db_models.py)) has exactly
nine columns: `id`, `name_en`, `name_ar`, `description_en`, `description_ar`,
`avg_visit_minutes`, `accessibility_notes`, `image_url`, `image_attribution`.

So four of the columns you are filling are **provenance, not payload**:

| Column | Why we still collect it |
|---|---|
| `lat` / `lon` | Not a DB column. It is how the boundary check stays auditable, and it will be needed the moment anyone puts a map in the app. |
| `source_url` | Not a DB column. It is how a later reader checks a claim without redoing the research. |
| `image_license` | Not a DB column — the DB has only `image_attribution`. **Fold the licence name into the attribution string** so it ships with the image, and keep the separate column as the compliance record. |
| `type` / `parent_site` | Working metadata, as above. |

Do not drop these because they aren't seeded. A dataset you cannot re-check is a
dataset nobody can safely change later.

Both `avg_visit_minutes` and `accessibility_notes` are required on **every** row.
Under the old two-tier model they were site-level only; the flattening removed that
distinction, and the database will reject a null in either column.

---

## 3. Sourcing rules

### 3.1 Acceptable sources

1. Wikipedia / Wikidata — and follow through to the cited source where the claim is specific
2. UNESCO World Heritage documentation — Petra is WHS #326 and the inventory is detailed
3. Jordan Department of Antiquities
4. visitjordan.com, visitpetra.jo
5. Published excavation reports and archaeological project sites — the Udhruh Archaeological Project, Wadi Farasa East, the American Center of Research, Brown University's Petra Great Temple work
6. Petra Archaeological Park maps — the best source of landmark-level names

### 3.2 Not acceptable

- Travel blogs, TripAdvisor, Pinterest, listicles
- Anything with no author or institution behind it
- **Your own recollection.** If you cannot cite it, it does not go in the file.
- **A language model's unsourced output.** The seed data was AI-generated as a first pass and it already contained a false god name, a probably-duplicated museum, and a dropped landmark. That is exactly what this phase exists to correct — do not add more of it.

### 3.3 Paraphrasing

Copying sentences from Wikipedia into a product database is a licensing problem and a
plagiarism problem. Read the source, close it, write the sentence yourself. If the
phrasing survives with three or fewer words changed, it is not a paraphrase.

Facts are not copyrightable — dates, dimensions, dynasties, who excavated it. Take
those freely. It is the *expression* you must not lift.

---

## 4. Images — the strictest rule in this phase

Every image must be free-licensed, and the licence must be recorded. A single
unlicensed photo in a hackathon demo is a real problem, and "we found it on Google"
is not a licence.

**Preferred source: Wikimedia Commons.** Use the direct-file URL form, matching the
pattern already in [backend/app/data/landmarks.py](backend/app/data/landmarks.py):

```
https://commons.wikimedia.org/wiki/Special:FilePath/<EXACT_FILENAME>.jpg
```

For each image, do all four:

1. Open the Commons **file page** and read the licence box. Do not infer it from the thumbnail.
2. Copy the licence name **exactly** into `image_license`.
3. Copy the photographer's name from the file page into `image_attribution`.
4. **Open the `Special:FilePath` URL and confirm it loads an image.** A filename with a typo fails silently later.

Not acceptable: Google Images results, Flickr without an explicit CC licence, an
image whose file page you have not opened, "All rights reserved", or any licence with
`NC` or `ND` in it — those restrict commercial and derivative use and this is a
commercial product pitch.

If no free image exists, put `no_free_image` in `content_flags` and leave `image_url`
blank. **An honest blank is a correct answer. A stolen photo is not.**

Prefer images that are unmistakable: a clear, well-lit, front-on view of the
monument. The camera guide is graded on identifying a landmark from a photo, so an
ambiguous or heavily-shadowed reference image directly hurts the flagship feature.

---

## 5. Arabic

28 entries need `name_ar` and every row needs `description_ar`. Rules:

- **Write Arabic alongside English, entry by entry.** Do not leave it all until the end — that is how a bilingual dataset ends up half-finished.
- Arabic names come from the Arabic Wikipedia article or the Arabic side of an official tourism page, not from transliterating the English back.
- Arabic descriptions are written, not translated. Machine translation with English word order reads badly to a judge who speaks Arabic, and two of the scoring criteria are about local relevance.
- Keep the AR description the same *content* as the EN one, so the two language paths in the app tell the same story.
- Do not put Latin text inside an Arabic description except for a proper name with no established Arabic form.
- **Pulga does the final Arabic proofread across all three groups** — but sending unfinished Arabic to that pass just moves the work, it doesn't remove it.

---

## 6. Flags — how to record a gap honestly

The single most valuable thing this phase produces is a file where **nothing is
invented**. A flagged gap is fixable by whoever comes next. A confident fabrication
is not, because nobody knows to look.

One entry has been removed on these grounds: **`AMM` (Ammarin Bedouin Camp)** is accommodation, not an attraction — OSM tags it `tourism=camp_site`, Wikidata records it as a hotel, and it sits 0.7 km from Little Petra, which already covers that spot. It belongs in the providers table. Record a removal by putting `REMOVED: <reason>` in the master list's notes; the validator then treats the missing row as a warning instead of an error.

| Situation | What to do |
|---|---|
| No reliable source for the place at all | `content_flags = no_source`, leave descriptions blank |
| Sources exist but no free-licensed image | `content_flags = no_free_image`, leave image columns blank |
| Sources conflict on a fact | Write the uncontested part; put the conflict in `notes` |
| You think the entry shouldn't exist | Do not delete it. Say so in `notes` and raise it in chat |
| You are ~80% sure | Not sure enough. Flag it. |

---

## 7. Five questions to settle before writing (Abd, day 1)

These change what gets scraped, so they come first. All five are recorded in
`meta.known_issues_for_scrapers` in the master list.

**Q1 — `OPM` and `PAM` are probably the same museum.**
The only museum feature in the Petra map extract is a single *Petra Museum* node at
`30.32532, 35.46784` — about 10 m from the coordinates originally recorded for
`OPM`. Either merge them into one entry and drop the other, or produce a source
showing the in-park archaeological museum is a distinct, currently-open venue.
*Blocks:* `OPM` in Group A, and `PAM` leaving `HOLD`.
**SETTLED (Abd):** they are distinct — `OPM` is the 1963 cave museum, `PAM` the
2019 visitor-centre museum. `PAM` is released from `HOLD` into Group A with its own
sourcing.

**Q2 — `PET-QAB` says "Temple of Dushares".**
The Nabataean deity is **Dushara**. Fix `name_en` before the Arabic pass, or the
error propagates into both languages.
*Blocks:* `PET-QAB` in Group C.
**SETTLED (Abd):** fixed in master_list.csv to `Qasr al-Bint`; matches Pulga's fix in
`scraped_group_c.csv`.

**Q3 — `PET-HAB`'s alternate name "Cave de Sueth" is unverified.**
That name normally refers to Habis Jaldak in the Yarmouk region, not al-Habis in
Petra. The site itself is real and Crusader — it is the alternate name that is
suspect. Either source it or drop the parenthetical.
*Blocks:* `PET-HAB` in Group A.
**SETTLED (Abd):** confirmed unrelated — `Cave de Sueth` / `Habis Jaldak` is a distinct
Wikipedia article (`Ayn al-Habis`) about a different castle in the Yarmouk gorge.
Parenthetical dropped from `name_en`.

**Q4 — the Painted Biclinium at Little Petra is missing.**
It was in the original seed [backend/app/data/landmarks.py](backend/app/data/landmarks.py)
but is not among the 41. Add it as a landmark with `parent_site = LPET`, or record
why it was dropped. It is a strong camera-guide subject — painted ceiling frescoes
are visually distinctive.
**SETTLED:** Mahdi folded it into the `LPET` description in `scraped_group_b.csv` rather
than adding it as a separate row.

**Q5 — `MPL` (Hijaz Railway Station, Ma'an city) is unverified.**
Currently `HOLD`. If it is not confirmed by the Thursday gate, cut it. Do not seed an
unverified entry.
**SETTLED (Abd):** confirmed, not cut — it is the Founding King's Palace, a real,
well-documented building (part of the 1904 Ma'an Hejaz Railway station, repurposed as
Prince Abdullah's HQ in 1920, restored and reopened as a national museum in March
2024), sourced via museums.visitjordan.com and a dedicated Arabic Wikipedia article
(`قصر معان`). Released from `HOLD` into Group A. No reliable coordinates found
anywhere, so `lat`/`lon` are left blank.

---

## 8. Per-person worksheets

Since the flattening, **every entry needs the same 7 content fields** — the old
"sites need more work than landmarks" asymmetry is gone. The split is therefore
balanced on entry count plus each entry's existing gaps: **15 / 14 / 13 entries**
(Group A grew by two when `PAM` and `MPL` were released from `HOLD` by Q1/Q5; Group C
was 14 until `AMM` was removed — see below).

### Group A — Abdelrahman (Abd) ✅ done

**15 entries** File: `data/scraped_group_a.csv`

| ID | Name | Scope | Still missing | Where to look / watch out |
|---|---|---|---|---|
| `AMS` | Ain Musa (Moses Spring) | area | ~~`name_ar`, **coords**, **source**~~ done, coords still blank | Sourced via dannythedigger.com and the Wikipedia *Wadi Musa* article. No confident coordinates found anywhere — an OSM name search returned an ambiguous nearby feature ('Ain al-Sadr'), so `lat`/`lon` left blank. |
| `BAJ` | Ba'ja (Neolithic site) | area | ~~`name_ar`~~ done | Wikipedia *Ba'ja*; PPNB excavation reports. |
| `BAS` | Basta (Neolithic site) | area | ~~`name_ar`~~ done | Wikipedia *Basta*. |
| `BEI` | Beidha (Neolithic site) | area | ~~`name_ar`, **coords**~~ done | Wikipedia *Beidha*; coords cross-checked against a Commons photo's embedded location. |
| `JHR` | Jebel Harun / Tomb of Aaron | area | ~~`name_ar`~~ done | Wikipedia *Mount Hor*; visitpetra.jo trail page for the ~4h one-way duration. |
| `OPM` | Old Petra Museum | area | ~~`name_ar`, **coords**, **source**~~ done | Resolved via Q1 — distinct from `PAM`. Wikipedia *Old Petra Museum* had coords/name_ar/source all along. |
| `SHB` | Shobak Castle (Montreal) | area | ~~**coords**~~ done | Coords taken from the Wikipedia infobox, not OSM (which hit 'Shobak Wind Farm'). |
| `UDH` | Udhruh (Roman legionary fort) | area | ~~`name_ar`~~ done | Wikipedia *Udhruh*. |
| `UNZ` | Qasr Uneizah (Unayzah) | area | ~~**coords**, **source**~~ done | Turned out to have a dedicated Wikipedia article (*Unayzah, Jordan*) after all — not the dead end it looked like. |
| `USH` | Umm Sayhoun (Bedouin village) | area | done | No free image found on Commons; flagged `no_free_image`. |
| `WMU` | Wadi Musa (town) | area | done | Wikipedia *Wadi Musa*. |
| `WUA` | Wu'ayra Castle (Vaux Moise) | area | done | Wikipedia *Wu'ayra Castle*. |
| `PET-HAB` | Al-Habis Castle | monument | done | Renamed per Q3. Confirmed via vici.org, distinct from the Yarmouk castle. |
| `PAM` | Petra Museum (visitor center) | area | done | Released from `HOLD` by Q1. No confidently-dated exterior photo found on Commons; flagged `no_free_image`. |
| `MPL` | Founding King's Palace (Ma'an Railway Station) | area | done | Released from `HOLD` by Q5. No reliable coordinates found. |

### Group B — Mahdi

**14 entries** · **~111 cells to fill**
File: `data/scraped_group_b.csv`

| ID | Name | Scope | Cells | Still missing | Where to look / watch out |
|---|---|---|---|---|---|
| `AJF` | Al-Jafr (desert town & basin) | area | 8 | `name_ar` | Wikipedia *Al-Jafr*; note it's a desert town and basin, far east of Petra — `avg_visit_minutes` and access will differ sharply from the Petra cluster. |
| `LPET` | Little Petra (Siq al-Barid) | area | 8 | `name_ar` | Wikipedia *Little Petra* / *Siq al-Barid*. `name_ar` — البتراء الصغيرة (سيق البريد). |
| `PET` | Petra | area | 7 | — | Wikipedia *Petra*; UNESCO WHS listing #326; visitpetra.jo. The macro entry — keep the description at site level and leave monument detail to the landmark rows. |
| `PET-COL` | Colonnaded Street | monument | 9 | `name_ar`, **coords** | **Coords missing.** The Roman-era cardo. Petra Archaeological Park maps; Commons category *Colonnaded Street, Petra*. |
| `PET-COR` | Corinthian Tomb (Royal Tombs) | monument | 8 | `name_ar` | Royal Tombs group. Facade echoes Al-Khazneh — note that, since it's the most likely camera-guide confusion in the whole dataset. |
| `PET-HPS` | High Place of Sacrifice | monument | 8 | `name_ar` | Also *al-Madhbah*. Reached by a long rock-cut stair — put that in the description, it's the accessibility signal. |
| `PET-MON` | Monastery (Ad-Deir) | monument | 8 | `name_ar` | Wikipedia *Ad Deir*. Mention the ~800–900 step climb; that detail matters for the itinerary generator. |
| `PET-PAL` | Palace Tomb (Royal Tombs) | monument | 8 | `name_ar` | Wikipedia *Palace Tomb*. Royal Tombs group; the widest facade of the four. |
| `PET-SIQ` | The Siq | monument | 7 | — | Wikipedia *Siq*; visitpetra.jo. Both `name_ar` and coords already in — descriptions only. |
| `PET-SLK` | Silk Tomb (Royal Tombs) | monument | 8 | `name_ar` | Royal Tombs group. Distinguishing feature is the banded, multi-coloured sandstone facade — that's the visual hook for identification. |
| `PET-SOF` | Street of Facades | monument | 8 | `name_ar` | visitpetra.jo; Petra Archaeological Park maps. No Wikipedia article — Commons category *Street of Facades* is the fallback for images. |
| `PET-THE` | Roman Theatre | monument | 8 | `name_ar` | Petra's Nabataean-cut theatre, later Roman-modified. OSM feature is tagged 'The Theater'. |
| `PET-TRE` | Treasury (Al-Khazneh) | monument | 8 | `name_ar` | Wikipedia *Al-Khazneh*. The single most photographed monument in Jordan; Wikimedia Commons has many CC options, so pick a clean, well-lit, unmistakable one — this is the camera guide's headline test case. |
| `PET-URN` | Urn Tomb (Royal Tombs) | monument | 8 | `name_ar` | Wikipedia *Urn Tomb*. One of four Royal Tombs in this set — keep the four descriptions genuinely distinct, don't paraphrase one four times. |

### Group C — Pulga

**13 entries** · **~102 cells to fill**
File: `data/scraped_group_c.csv`

| ID | Name | Scope | Cells | Still missing | Where to look / watch out |
|---|---|---|---|---|---|
| `PET-CHU` | Petra Church | monument | 7 | — | The Byzantine church with the mosaic floors — that's the visual identifier. OSM tags it 'Byzantine Church'. |
| `PET-DJN` | Djinn Blocks | monument | 8 | `name_ar` | Djinn Blocks — the large freestanding cubes near Bab as-Siq. Purpose still debated; say 'debated', don't pick a theory. |
| `PET-GRT` | Great Temple | monument | 7 | — | Great Temple / Southern Temple. Wikipedia; Brown University excavation publications. |
| `PET-GTM` | Garden Tomb | monument | 8 | `name_ar` | Garden Tomb / Garden Triclinium. Frequently confused with the Garden Temple — be precise about which you're describing. |
| `PET-KHB` | Al-Khubtha High Place & Trail | monument | 7 | — | Al-Khubtha High Place and Trail — the Treasury-overlook route. Strong `accessibility_notes` candidate if it ends up promoted to a site. |
| `PET-LTC` | Lion Triclinium | monument | 8 | `name_ar` | Lion Triclinium, on the Ad-Deir route. Named for the weathered lions flanking the doorway. |
| `PET-OBT` | Obelisk Tomb | monument | 8 | `name_ar` | The Obelisk Tomb and the Bab as-Siq Triclinium are the **upper and lower halves of one two-storey monument**. Keep them as this single entry; say so in the description. |
| `PET-QAB` | Qasr al-Bint (Temple of Dushares) | monument | 7 | — | **Fix the 'Dushares' → 'Dushara' error (Q2) before writing.** Wikipedia *Qasr al-Bint*. |
| `PET-RST` | Roman Soldier's Tomb | monument | 8 | `name_ar` | Tomb of the Roman Soldier, in the Wadi Farasa complex — cross-reference PET-WFA so the two descriptions agree. |
| `PET-TWL` | Temple of the Winged Lions | monument | 7 | — | Wikipedia *Temple of the Winged Lions*; American Center of Research excavation reports. |
| `PET-WFA` | Wadi Farasa | monument | 8 | `name_ar` | Wadi Farasa / Wadi al-Farasa; the Farasa East excavation project has published material. OSM spells it 'Wadi Farasah'. |
| `PET-WMD` | Wadi al-Mudhlim (Nabataean Dam & Tunnel) | monument | 8 | `name_ar` | Wadi al-Mudhlim with the Nabataean dam and tunnel — a genuine engineering story, worth telling properly. |
| `PET-WSA` | Wadi Sabra | monument | 10 | `name_ar`, **coords**, **source** | **No source, no coords.** Wadi Sabra is well outside the main trail with a small Nabataean theatre of its own. Hardest of Group C — flag rather than guess if nothing solid surfaces. |

---

## 9. Outstanding gaps, by column

**7 entries need coordinates.** Take them from a Wikipedia infobox or by locating the
feature on OpenStreetMap. Decimal degrees, 5 decimal places is plenty. Sanity-check
that `PET-*` entries land near `30.32, 35.44` and everything else inside Ma'an.

| Entry | Group | Note |
|---|---|---|
| `SHB` | A | The OSM name search hit *Shobak Wind Farm*, which was rejected. Use the Wikipedia infobox. |
| `UNZ` | A | No page, no OSM feature. Hardest of the seven. |
| `BEI` | A | Try the Beidha/Baidha/Beida spellings. |
| `AMS` | A | No page, no OSM feature. |
| `OPM` | A | Settle Q1 first — the entry may not survive. |
| `PET-COL` | B | Petra Archaeological Park maps. |
| `PET-WSA` | C | Well off the main trail. |

**4 entries have no source URL at all:** `UNZ` (A), `PET-WSA` (C), `AMS` (A), `OPM` (A). These are the most likely `no_source` outcomes in the whole set. Give them a real attempt, then flag rather than invent.

**28 entries need `name_ar`** — 7 in Group A, 12 in Group B, 9 in Group C. Write it
with the entry, not in a batch at the end.

---

## 10. Acceptance criteria

An entry is done when **all** of these hold:

- [ ] `name_ar` is present and is the name, not a description
- [ ] `description_en` is 2–4 sentences, specific, and written from a citable source
- [ ] `description_ar` says the same thing in natural Arabic
- [ ] `source_url` points at something a stranger could open and check
- [ ] `lat` / `lon` present, in the right region
- [ ] For sites: `avg_visit_minutes` is a realistic integer and `accessibility_notes` says what is genuinely hard
- [ ] `image_url` loads, `image_license` is a real free licence read off the file page, `image_attribution` names the photographer
- [ ] Or: the relevant gap is flagged in `content_flags` and blank rather than guessed

A group file is done when every row meets the above and the row count is unchanged
from what you were handed, minus any entry deliberately removed with the removal
recorded in `notes`.

---

## 11. How the data actually gets in — one open problem

[backend/app/seed.py](backend/app/seed.py) reads `LANDMARKS` from
[backend/app/data/landmarks.py](backend/app/data/landmarks.py) — a Python dict — and
upserts it into Postgres. It does **not** read a CSV.

So `data/merged.csv` is not yet connected to anything. Someone has to write the
converter that turns the merged CSV into `landmarks.py` entries (or into a direct
seed path). **This is a Phase 2 task and it belongs to Mahdi**, but it is flagged here
because Phase 1's output is only useful once it exists, and because it changes what
"done" means: the merged CSV is the deliverable, the Python file is the destination.

Until that converter exists, do not hand-edit `landmarks.py` in parallel with the
CSVs. Two sources of truth for the same rows will diverge within a day.

---

## 12. Merge and validation

**Thu 3 Sept, evening. Abd merges, Pulga validates.**

Abd:
1. Concatenate the three group files into `data/merged.csv`, header once.
2. Check duplicate `id` values — there must be none.
3. Check every landmark's `parent_site` matches a real `id` in the file.
4. Check no row has both a blank `description_en` and a blank `content_flags` — that combination means someone simply didn't do the row.
5. Push, and post in chat that the merge is up.

Pulga, immediately after:
1. Run the validation script against `merged.csv`.
2. Confirm every non-blank `image_url` actually resolves — script it, don't click 41 links.
   `validate_data.py --check-images` verifies Wikimedia files through the Commons API
   rather than fetching each one, which is both authoritative and avoids the HTTP 429
   the file host returns for bulk access.
3. Confirm every `image_license` is a genuinely free licence, and reject anything containing `NC` or `ND`.
4. Spot-check 10 descriptions against their `source_url` for accuracy and for copy-paste.
5. Full Arabic read-through.
6. If it fails: bounce it back to Abd with the specific failing rows. **Do not fix a
   bad merge silently** — the person who wrote the row should learn it was wrong.

Write the validation script **on Wednesday**, before the merge exists, so it can run
the moment the file lands.

---

## 13. Schedule

| When | Abd | Mahdi | Pulga |
|---|---|---|---|
| **Mon 31 Aug** | Settle Q1–Q5, then start Group A | Start Group B | Start Group C |
| **Tue 1 Sept** | Group A, ~⅓ | Group B, ~⅓ | Group C, ~⅓ |
| **Wed 2 Sept** | Group A, ~⅔ | Group B, ~⅔ | Group C, ~⅔ + **write the validator** |
| **Thu 3 Sept, 18:00** | **Gate: file complete** → merge | **Gate: file complete** | **Gate: file complete** → validate |
| **Fri 4 Sept** | Fix what validation bounced | — | QA pass, image checks, Arabic read-through |

Roughly 30 cells a day each. The first day is the slowest — you are learning the
sources — so do not read day one as the pace.

---

## 14. Things that will go wrong if you let them

- **Arabic left to the end.** Forty-one descriptions in one sitting on Friday will be bad, and Arabic quality is visible to the judges.
- **Images done last, quickly.** This is where unlicensed photos get in. Do the image with the entry.
- **Copy-pasted Wikipedia sentences.** Fast, and a licensing problem in a product you are pitching commercially.
- **Filling a gap with a plausible guess.** The whole value of this file is that its gaps are marked. One invented fact costs more than ten blanks.
- **Renaming a column.** It breaks the merge, the validator and the seed script at once.
- **Editing someone else's group file.** Raise it in chat instead.
- **Changing an `id`.** It is referenced from `parent_site` and from two other files.

---

## 15. What Phase 1 hands over

One file — `data/merged.csv` — containing 42 rows (or fewer, with every removal
recorded), each with bilingual names and descriptions, a citable source, coordinates,
a free-licensed and attributed image, site-level visit duration and accessibility
notes, and an explicit flag wherever something genuinely could not be found.

That file is the input to Phase 2. Nothing in Phase 2 can start on real data until it
exists, and every hour of guessing in Phase 1 becomes an hour of debugging later.
