# Dam3a (Abdelrahman) — Phase 2, Group 3

**The remaining Petra landmarks** · 13 places assigned.

Full brief: `Data Phase 2 — Deep Data Extraction`. Template and sourcing standard are in its Sections 1 and 2 — this file is the working version for your group only.

**Your output file:** `data/phase2/group3_dam3a.json`

---

## 1. Start here — don't research what's already verified

Phase 1 finished. Every place below already has a verified name, coordinates, a short description, accessibility notes, a visit duration, and a free-licensed image with its licence read off the Commons file page. Generate your scaffold and all of that is carried across for you:

```bash
python scripts/phase2_scaffold.py "PET-THE PET-HPS PET-COL PET-QAB PET-TWL PET-CHU PET-RST PET-GTM PET-OBT PET-GRT PET-DJN PET-KHB PET-LTC" \
    --researcher "Dam3a" --out data/phase2/group3_dam3a.json
```

Then fill in the empty fields. Check your work at any point with:

```bash
python scripts/validate_phase2.py data/phase2/group3_dam3a.json
```

It checks the template structure, that Arabic fields actually contain Arabic, that your narration is not a copy of the history field, that coordinates fall inside Ma'an, and that no image carries an NC or ND licence. It counts `UNKNOWN` markers too, so honest gaps stay visible instead of quietly passing.

---

## 2. What each field needs

| Field | Phase 1 gave you | Phase 2 asks for |
|---|---|---|
| `name_en` / `name_ar` | ✅ carried over | verify only |
| `coordinates` | ✅ carried over | verify only |
| `short_description_en` / `_ar` | ✅ carried over | verify only |
| `visiting_info.accessibility_notes` | ✅ carried over | verify only |
| `visiting_info.estimated_time_there` | ✅ carried over | verify only |
| `image` (url, licence, attribution) | ✅ carried over, licence already read off the Commons file page | verify only |
| `history_en` / `history_ar` | — | **write** — 3-5 sentences |
| `significance_en` / `significance_ar` | — | **write** — 2-3 sentences |
| `narration_script_en` / `_ar` | — | **write** — 3-4 spoken sentences |
| `visiting_info.best_time_to_visit` | — | **write** |
| `visiting_info.difficulty` | — | **write** — easy / moderate / difficult |
| `visiting_info.requires_guide` | — | **write** — true / false |
| `visiting_info.entrance_fee_notes` | — | **write** |

The two that matter most:

- **`narration_script`** — write it the way a good guide would *say* it to someone standing there. Second person, plain words, one memorable fact. It is not a shortened history field; the validator rejects it if it is a copy.
- **`history`** — 3-5 sentences, and every claim traceable to something in `sources`. If you cannot source it, write `UNKNOWN - flag for team review`. A missing field is fixable; a confident invention is not.

---

## 3. Job A — your 13 places

| ID | Name | Phase 1 status | Watch out for |
|---|---|---|---|
| `PET-THE` | Roman Theatre | carried over complete | — |
| `PET-HPS` | High Place of Sacrifice | carried over complete | — |
| `PET-COL` | Colonnaded Street | **needs coords** | No coordinates in Phase 1. Petra Archaeological Park maps are the best source. |
| `PET-QAB` | Qasr al-Bint | carried over complete | Q2 settled: the 'Temple of Dushares' parenthetical was dropped, not corrected — no source ties a specific deity to this temple. |
| `PET-TWL` | Temple of the Winged Lions | carried over complete | — |
| `PET-CHU` | Petra Church | carried over complete | — |
| `PET-RST` | Roman Soldier's Tomb | carried over complete | Sits inside Wadi Farasa (my PET-WFA) — make sure the two descriptions agree. |
| `PET-GTM` | Garden Tomb | carried over complete | Distinct from the nearby Garden Temple — the names invite confusing them. |
| `PET-OBT` | Obelisk Tomb | carried over complete | The Obelisk Tomb and Bab as-Siq Triclinium are two halves of one two-storey monument. Keep as one entry and say so. |
| `PET-GRT` | Great Temple | carried over complete | — |
| `PET-DJN` | Djinn Blocks | carried over complete | — |
| `PET-KHB` | Al-Khubtha High Place & Trail | carried over complete | Cross-check with my PET-KHB narration; we both reference the Treasury viewpoint. |
| `PET-LTC` | Lion Triclinium | carried over complete | — |

---

## 4. Job B — find what Phase 1 missed

Petra has hundreds of minor facades and tombs beyond the named landmarks. Search for other named, documented monuments inside the site — tomb facades, minor temples, cisterns — and add any that are well enough sourced to include.

**Any new place must pass the same boundary check as Phase 1.** The method that worked for me, and found five sites:

1. Query Wikidata for everything administratively inside Ma'an: search `haswbstatement:P131=Q606340` on wikidata.org (Q606340 is Ma'an Governorate).
2. For each candidate, check its coordinates fall inside the Ma'an bounding box — lat 29.20-30.95, lon 35.30-38.00.
3. **Do not trust `P131` alone.** That check rejected *Aqaba Marine Reserve* and *Qatar Nature Reserve*, both of which claim Ma'an on Wikidata and are not in it.
4. Follow the sitelinks. German Wikipedia covers the Roman frontier sites far better than English does — that is where all five of my finds came from.

Add anything verified to your own file with the same template and `confidence: needs_review`.

---

## 5. Done means

- [ ] Every assigned place filled, or the gap marked `UNKNOWN - flag for team review`
- [ ] `python scripts/validate_phase2.py data/phase2/group3_dam3a.json` passes with 0 errors
- [ ] Every entry has at least one real URL in `sources`
- [ ] No image with an `NC` or `ND` licence
- [ ] Arabic written alongside English, entry by entry — not left to the end
- [ ] Job B candidates boundary-verified before being added
- [ ] Anything still `needs_review` raised with the group, not merged silently

---

## 6. Two of yours overlap with mine

- **`PET-RST`** (Roman Soldier's Tomb) sits inside **Wadi Farasa**, which is my `PET-WFA`. I describe the valley's water system and mention the tomb complex having its own supply — make sure your entry and mine agree rather than contradicting.
- **`PET-KHB`** (Al-Khubtha) is in your list, but I already filled it in Group 1 because it was assigned to me in Phase 1. Check `data/phase2/group1_pulga.json` first — if mine is good, take it as-is and spend the time on Job B instead of duplicating it.
