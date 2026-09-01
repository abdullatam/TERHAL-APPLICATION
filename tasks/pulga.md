# Pulga — Phase 2, Group 1

**Castles, wadis, and Petra's closest satellite sites** · 14 places assigned.

Full brief: `Data Phase 2 — Deep Data Extraction`. Template and sourcing standard are in its Sections 1 and 2 — this file is the working version for your group only.

**Your output file:** `data/phase2/group1_pulga.json`

---

## 1. Start here — don't research what's already verified

Phase 1 finished. Every place below already has a verified name, coordinates, a short description, accessibility notes, a visit duration, and a free-licensed image with its licence read off the Commons file page. Generate your scaffold and all of that is carried across for you:

```bash
python scripts/phase2_scaffold.py "SHB WUA UNZ PET-HAB PET-SIQ PET-WFA PET-WSA PET-WMD PET LPET BAS BAJ BEI JHR" \
    --researcher "Pulga" --out data/phase2/group1_pulga.json
```

Then fill in the empty fields. Check your work at any point with:

```bash
python scripts/validate_phase2.py data/phase2/group1_pulga.json
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

## 3. Job A — your 14 places

| ID | Name | Phase 1 status | Watch out for |
|---|---|---|---|
| `SHB` | Shobak Castle (Montreal) | carried over complete | — |
| `WUA` | Wu'ayra Castle (Vaux Moise) | carried over complete | — |
| `UNZ` | Qasr Uneizah (Unayzah) | carried over complete | — |
| `PET-HAB` | Al-Habis Castle | carried over complete | — |
| `PET-SIQ` | The Siq | carried over complete | — |
| `PET-WFA` | Wadi Farasa | carried over complete | — |
| `PET-WSA` | Wadi Sabra | carried over complete | — |
| `PET-WMD` | Wadi al-Mudhlim (Nabataean Dam & Tunnel) | carried over complete | — |
| `PET` | Petra | carried over complete | — |
| `LPET` | Little Petra (Siq al-Barid) | carried over complete | — |
| `BAS` | Basta (Neolithic site) | carried over complete | — |
| `BAJ` | Ba'ja (Neolithic site) | carried over complete | — |
| `BEI` | Beidha (Neolithic site) | carried over complete | — |
| `JHR` | Jebel Harun / Tomb of Aaron | carried over complete | — |

---

## 4. Job B — find what Phase 1 missed

More castles, forts and wadis/valleys in Ma'an — the western highlands and desert wadis are the likeliest place for missed candidates.

**Any new place must pass the same boundary check as Phase 1.** The method that worked for me, and found five sites:

1. Query Wikidata for everything administratively inside Ma'an: search `haswbstatement:P131=Q606340` on wikidata.org (Q606340 is Ma'an Governorate).
2. For each candidate, check its coordinates fall inside the Ma'an bounding box — lat 29.20-30.95, lon 35.30-38.00.
3. **Do not trust `P131` alone.** That check rejected *Aqaba Marine Reserve* and *Qatar Nature Reserve*, both of which claim Ma'an on Wikidata and are not in it.
4. Follow the sitelinks. German Wikipedia covers the Roman frontier sites far better than English does — that is where all five of my finds came from.

Add anything verified to your own file with the same template and `confidence: needs_review`.

---

## 5. Done means

- [ ] Every assigned place filled, or the gap marked `UNKNOWN - flag for team review`
- [ ] `python scripts/validate_phase2.py data/phase2/group1_pulga.json` passes with 0 errors
- [ ] Every entry has at least one real URL in `sources`
- [ ] No image with an `NC` or `ND` licence
- [ ] Arabic written alongside English, entry by entry — not left to the end
- [ ] Job B candidates boundary-verified before being added
- [ ] Anything still `needs_review` raised with the group, not merged silently

---

## Status: complete

All 14 places filled, plus 5 new sites found in Job B (DAJ, RTI, QIR, ABH, MUT). 19 entries, 0 validation errors. See the commit for details.
