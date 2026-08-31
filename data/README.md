# data/ — research handoff files

Human research output for the Data Phase. Code-side seed data lives in
`backend/app/data/`; this folder is the raw research that replaces it.

## Files

- `master_list.csv` — Abdelrahman's blocker deliverable. Every site + landmark in
  Ma'an governorate, boundary-verified, with an assigned scraping group.
- `scraped_group_a.csv` / `_b` / `_c` — one per person, same columns (see below).
- `merged.csv` — Abdelrahman merges the three groups here. This is what Mahdi's
  seed script ingests and Pulga's validator checks.

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
| `avg_visit_minutes` | sites only, integer |
| `accessibility_notes` | sites only — wheelchair/mobility reality, plain text |
| `image_url` | direct file URL, prefer `commons.wikimedia.org/wiki/Special:FilePath/...` |
| `image_license` | e.g. `CC BY 4.0`, `CC0`, `public domain` |
| `image_attribution` | e.g. `Photo by NAME, CC BY 4.0, via Wikimedia Commons` |
| `flags` | `no_source` / `no_free_image` / blank — never guess, flag instead |

These names match the Pydantic models in `backend/app/models.py`, so the seed
script maps them 1:1. Don't rename a column without telling Mahdi and Pulga.
