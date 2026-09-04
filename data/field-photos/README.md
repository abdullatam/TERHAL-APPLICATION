# Field photos

Photographs the team took, kept here as source material.

The app never reads this folder. Photos in use live at
`data/images/<landmark_id>/<position>.<ext>`, managed by
`data/landmark_images.csv` and `scripts/load_images.py`. Anything here is either
spare or waiting for a slot.

| File | Why it is here |
|---|---|
| `HMM-4-unused.webp` | A fourth photo of Mohammad Al-Ma'ani Sweets. The gallery holds three per place and HMM's three are filled, so this one has no slot |

Three other copies used to sit loose in the repo root — they were byte-identical
to `data/images/HMM/1–3.webp` and were removed rather than moved, since the
pipeline location is canonical. Git history still has them.

**Licensing.** Team field photography is entered as
`license = project field footage` with the photographer named in the CSV's
`notes` column. HMM's rows carry an outstanding note that the grant *"should be
confirmed by the photographer before this ships"* — see
[docs/tasks/Dam3a3.md](../../docs/tasks/Dam3a3.md) §3.
