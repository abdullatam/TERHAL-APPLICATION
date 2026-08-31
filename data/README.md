# data/ — research handoff files

Human research output for the Data Phase. Code-side seed data lives in
`backend/app/data/`; this folder is the raw research that replaces it.

## Files

- `master_list.csv` — Abdelrahman's blocker deliverable. Every site + landmark in
  Ma'an governorate, boundary-verified, with an assigned scraping group.
- `scraped_group_a.csv` / `_b` / `_c` — one per person, same columns (see below).
- `merged.csv` — **generated**, not hand-maintained. `scripts/build_dataset.py`
  concatenates the three group files here every time it runs. Don't hand-edit it
  or hand-merge the groups — re-run the script instead (see Pipeline below).

## Pipeline

`scripts/build_dataset.py` is the automated path from these CSVs into the app —
it replaced the manual "Abdelrahman merges, Pulga validates" step described in
PLAN.md section 12. Run it (from the repo root) any time a group file changes:

```
python scripts/build_dataset.py
```

It merges the three group files into `merged.csv`, runs every check from
`scripts/validate_data.py`, folds `image_license` into `image_attribution` (the
database has no separate license column), and regenerates
`backend/app/data/landmarks.py` from whatever rows are actually seed-ready.

**Rows that aren't scraped yet, or that are flagged `no_source`, are skipped and
named in the output — never guessed.** So the script is safe to run at any point
during the data phase, not just once everyone is finished: it just seeds fewer
rows until more groups are complete. It has no hardcoded idea of who's done —
it reads whatever is currently in the three CSVs, so a teammate's newly-scraped
rows get picked up and cleaned identically the next time it runs.

After it writes `landmarks.py`, load it into Postgres with (from `backend/`):

```
python -m app.seed
```

Neither step runs automatically on `git pull` — someone has to actually run
them after merging in new scraped rows.

## Agreed field names

`master_list.csv`:

| column | values |
|---|---|
| `id` | short snake_case slug, unique, stable — becomes the DB primary key |
| `type` | `site` or `landmark` |
| `parent_site` | for landmarks: the `id` of its site. Blank for sites. |
| `name_en`, `name_ar` | display names |
| `in_maan_governorate` | `yes` / `no` / `unsure` — `no` rows stay in the file as a record of what was checked and excluded |
| `lat`, `lon` | decimal degrees, used to prove the boundary check |
| `group` | `A` (Abdelrahman) / `B` (Mahdi) / `C` (Pulga) |
| `source_url` | where the entry was found |
| `notes` | anything the next person needs to know |

The scraped files add these columns on top:

| column | notes |
|---|---|
| `description_en`, `description_ar` | 2–4 sentences, paraphrased not copied |
| `avg_visit_minutes` | **required on every row**, integer — since the flattening (PLAN.md), there's no site/landmark tier, so a single monument needs its own number too |
| `accessibility_notes` | **required on every row** — wheelchair/mobility reality, plain text |
| `image_url` | direct file URL, prefer `commons.wikimedia.org/wiki/Special:FilePath/...` |
| `image_license` | e.g. `CC BY 4.0`, `CC0`, `public domain` |
| `image_attribution` | e.g. `Photo by NAME, CC BY 4.0, via Wikimedia Commons` |
| `flags` | `no_source` / `no_free_image` / blank — never guess, flag instead |

These names match the Pydantic models in `backend/app/models.py`, so the seed
script maps them 1:1. Don't rename a column without telling Mahdi and Pulga.
