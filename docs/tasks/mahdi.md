# Mahdi — Phase 2, Group 2

**Remaining macro sites plus the first half of Petra's individual landmarks** · 14 places assigned.

Full brief: `Data Phase 2 — Deep Data Extraction`. Template and sourcing standard are in its Sections 1 and 2 — this file is the working version for your group only.

**Your output file:** `data/phase2/group2_mahdi.json`

---

## 1. Start here — don't research what's already verified

Phase 1 finished. Every place below already has a verified name, coordinates, a short description, accessibility notes, a visit duration, and a free-licensed image with its licence read off the Commons file page. Generate your scaffold and all of that is carried across for you:

```bash
python scripts/phase2_scaffold.py "AMS UDH AJF USH AMM OPM WMU PET-TRE PET-MON PET-SOF PET-URN PET-SLK PET-COR PET-PAL" \
    --researcher "Mahdi" --out data/phase2/group2_mahdi.json
```

Then fill in the empty fields. Check your work at any point with:

```bash
python scripts/validate_phase2.py data/phase2/group2_mahdi.json
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
| `AMS` | Ain Musa (Moses Spring) | **needs coords**, **needs image** | No coordinates and no image in Phase 1. Also spelled Ayn Musa / Moses' Spring — try all three. |
| `UDH` | Udhruh (Roman legionary fort) | carried over complete | — |
| `AJF` | Al-Jafr (desert town & basin) | carried over complete | — |
| `USH` | Umm Sayhoun (Bedouin village) | **needs image** | No image found in Phase 1. A living Bedouin community (the Bdoul, relocated from Petra's caves in the 1980s), not a ruin — write it with that in mind. |
| `AMM` | — | **no Phase 1 row** | **Not in the Phase 1 dataset — I removed it.** See the note below before starting. |
| `OPM` | Old Petra Museum | carried over complete | Q1 settled it as distinct from PAM (1963 cave museum vs the 2019 visitor-centre museum). PAM is now a separate Group A entry. |
| `WMU` | Wadi Musa (town) | carried over complete | — |
| `PET-TRE` | Treasury (Al-Khazneh) | carried over complete | The camera guide's headline test case — pick a clean, front-on image. |
| `PET-MON` | Monastery (Ad-Deir) | carried over complete | Mention the ~800-900 step climb; the itinerary generator needs that. |
| `PET-SOF` | Street of Facades | carried over complete | — |
| `PET-URN` | Urn Tomb (Royal Tombs) | carried over complete | One of four Royal Tombs in your group — keep all four genuinely distinct. |
| `PET-SLK` | Silk Tomb (Royal Tombs) | carried over complete | Royal Tombs group. The hook is the banded, multi-coloured sandstone. |
| `PET-COR` | Corinthian Tomb (Royal Tombs) | carried over complete | Its facade echoes Al-Khazneh, so it is the likeliest camera-guide confusion in the whole dataset. Make the difference explicit in the description and the image. |
| `PET-PAL` | Palace Tomb (Royal Tombs) | carried over complete | Royal Tombs group. The widest facade of the four. |

---

## 4. Job B — find what Phase 1 missed

More towns, villages, museums and community/heritage sites — the same category as Umm Sayhoun. Also check whether Ma'an city itself has sites worth including, beyond the already-flagged and still-unverified Hijaz Railway building (MPL).

**Any new place must pass the same boundary check as Phase 1.** The method that worked for me, and found five sites:

1. Query Wikidata for everything administratively inside Ma'an: search `haswbstatement:P131=Q606340` on wikidata.org (Q606340 is Ma'an Governorate).
2. For each candidate, check its coordinates fall inside the Ma'an bounding box — lat 29.20-30.95, lon 35.30-38.00.
3. **Do not trust `P131` alone.** That check rejected *Aqaba Marine Reserve* and *Qatar Nature Reserve*, both of which claim Ma'an on Wikidata and are not in it.
4. Follow the sitelinks. German Wikipedia covers the Roman frontier sites far better than English does — that is where all five of my finds came from.

Add anything verified to your own file with the same template and `confidence: needs_review`.

---

## 5. Done means

- [ ] Every assigned place filled, or the gap marked `UNKNOWN - flag for team review`
- [ ] `python scripts/validate_phase2.py data/phase2/group2_mahdi.json` passes with 0 errors
- [ ] Every entry has at least one real URL in `sources`
- [ ] No image with an `NC` or `ND` licence
- [ ] Arabic written alongside English, entry by entry — not left to the end
- [ ] Job B candidates boundary-verified before being added
- [ ] Anything still `needs_review` raised with the group, not merged silently

---

## 6. Read this before you start on AMM

**`AMM` (Ammarin Bedouin Camp) is not in the Phase 1 dataset.** I removed it, with the reason recorded in `data/master_list.csv` under `REMOVED:`.

The short version: OSM tags it `tourism=camp_site` and Wikidata records it as a hotel. It is accommodation, not an attraction — it has no meaningful visit duration or accessibility profile, and it sits 0.7 km from Little Petra, which already covers that spot. No descriptive source exists in Wikipedia, Wikivoyage, Wikidata, Commons, or its OSM tags, so a description could only be invented. The one free image on Commons is a portrait of an identifiable person, not the camp.

The Phase 2 brief still lists it in your group, so this needs a decision rather than silent action. My recommendation: **treat it as a provider, not a place** — the master list flags it as a community cooperative and possible pilot partner, which is exactly a provider relationship. If the team wants it in the places dataset anyway, it needs a tourism-board source or a direct conversation with the camp, not another web search.
