# Phase 2 task files

One file per person, generated from the live data in `data/` so the per-entry
status tables cannot drift from what is actually in the repo.

| File | Who | Group | Places | Status |
|---|---|---|---|---|
| [pulga.md](pulga.md) | Pulga | 1 — castles, wadis, Petra satellites | 14 | complete, +5 found in Job B |
| [mahdi.md](mahdi.md) | Mahdi | 2 — macro sites + first half of Petra landmarks | 14 | not started |
| [dam3a.md](dam3a.md) | Dam3a (Abdelrahman) | 3 — remaining Petra landmarks | 13 | not started |

Shared tooling, same for everyone:

```bash
# generate your scaffold — carries every Phase 1 verified field across
python scripts/phase2_scaffold.py "<your ids>" --researcher "<you>" --out <your file>

# check your work at any point
python scripts/validate_phase2.py <your file>
```

`../TASKS.md` is the Phase 1 checklist and is kept as a record; these files
supersede it.

## Media sourcing

Separate track, separate files — these are not Phase 2 data extraction.

| File | Who | Job | Status |
|---|---|---|---|
| [../ABD_TASKS.md](ABD_TASKS.md) | Abd | three photos per place | 38/53 places at 3/3 |
| [../Dam3a3.md](Dam3a3.md) | Dam3a (Abdelrahman) | the 15 remaining photo gaps, plus a short video for every place | not started |

```bash
python scripts/load_images.py       # photos: check, then --commit
python scripts/validate_videos.py   # video: check only, see Dam3a3.md §7
```
