# Dam3a (Abdelrahman) — Photos for the gaps, video for everything

Two jobs in one file.

**Job A — close the photo gaps.** 15 of the 53 places in the app have fewer
than three photos; 9 have none. That is the visible problem: those cards render
a hatched placeholder reading *"No free-licensed photo yet."*

**Job B — a short video for every place.** New ground. Nothing in the app has
video today.

Everything here follows the same licensing rules as Phase 1 and the image pass
— [PLAN.md](../PLAN.md) §4 and [ABD_TASKS.md](ABD_TASKS.md) §3. They have not
changed and they are not negotiable. Short version in §3.

---

## 1. Read this before you start

Three things are true and you should know them before spending a day on this.

**Job A's remaining gaps are mostly not findable.** The image pass already
searched them exhaustively and wrote down why each one failed, per row, in
`data/landmark_images.csv`. Read the `notes` column before you re-search
anything. Two of those "impossible" ones turned out to be findable after all
(see §4) — but that was a naming problem, not an effort problem. Nine of the
fifteen genuinely have nothing free-licensed anywhere, and for those the answer
is a camera, not a better search query.

**Job B has nowhere to land yet.** There is no `landmark_videos` table, no
loader, no API field, and no player in the frontend. None of it. Your research
still goes in `data/landmark_videos.csv` and `scripts/validate_videos.py` will
check it, so nothing is wasted and it is reviewable in git — but it will not
appear in the app until someone builds §7. Do not wait for that; do not assume
it is done either.

**Video files cannot go in git as-is.** The repo already carries 50 MB of
images and that has been flagged as a problem. A dozen 1080p clips would put it
past what a hackathon repo should hold. So for video, **keep the remote URL** in
the CSV — do not self-host it the way the images were. If we later decide to
self-host, that is a git-lfs or object-storage decision for the team, and it is
in §7.

---

## 2. Where the work goes

| | Job A — photos | Job B — video |
|---|---|---|
| **You edit** | `data/landmark_images.csv` | `data/landmark_videos.csv` |
| **Rows** | 165, all pre-seeded | 110, all pre-seeded (55 places x 2) |
| **You run** | `scripts/load_images.py` | `scripts/validate_videos.py` |
| **Writes to DB** | yes, `--commit` | **no — table does not exist** |

Both CSVs are pre-seeded with the correct `landmark_id` and `position`. **Never
change those two columns.** A row you have not started is left blank; the
validators ignore it and report progress instead, so you can commit partway
through without noise.

```bash
# from the repo root

# --- Job A ---
python scripts/load_images.py                      # check, writes nothing
python scripts/load_images.py --check-urls         # also fetch every url (slow)
backend/.venv/bin/python scripts/load_images.py --commit   # write to the DB

# --- Job B ---
python scripts/validate_videos.py
python scripts/validate_videos.py --check-urls
```

`--commit` needs `backend/.venv` and `backend/.env` — see the
[README](../../README.md). Everything else runs on plain `python3` with no database.

The upsert key is `(landmark_id, position)`, so re-running replaces image 2 of a
place rather than adding a fourth. Run it as often as you like.

### Video columns

Same shape as the image CSV, plus four:

| Column | Required | Notes |
|---|---|---|
| `duration_seconds` | ✅ | 5–180. Under 5 is a GIF; over 180 nobody watches between two monuments |
| `width` / `height` | ✅ | Real pixel dimensions. 720p is the floor, 1080p is the target |
| `caption_en` / `caption_ar` | pair them | Either both or neither — the validator warns if you write one |

---

## 3. The licence rules

A photo or video nobody can prove the rights to is worse than none. The
placeholder is honest; a stolen file is not, and this is pitched as a
commercial product.

**Allowed:** `CC0`, `public domain`, `CC BY 1.0–4.0`, `CC BY-SA 1.0–4.0`.

**Rejected, no exceptions:** anything with **NC** or **ND**. The validator
fails the file. This is what rules out the APAAME aerial archive (CC BY-NC-ND)
and ACOR's photo archive (academic / non-commercial), which between them hold
exactly the photographs we want for Udhruh, Wadi Sabra and Khirbet el-Qirana.
Do not re-litigate this — it has been checked twice.

**On YouTube:** a video's uploader can set it to *"Creative Commons —
Attribution"*, which is **CC BY 3.0** and is allowed. YouTube's default is
*"Standard YouTube Licence"*, which is **not** free and is not allowed. Check
the licence line under the video description, on the video's own page. Most of
what you find will be Standard. Filter search by
*Filters → Features → Creative Commons* to see only the reusable ones.

**Two extra licences exist for this pass**, both for material that does not
come from an archive:

| `license` value | When | What the `notes` column must say |
|---|---|---|
| `project field footage` | You or a teammate shot it | who shot it, when, and that they agree to CC BY-SA 4.0 |
| `owner released` | A business gave us their photo/video | who granted it, when, and **where the written permission is filed** |

The validator fails either of those if `notes` is empty. A verbal "sure, go
ahead" is not a release — get it in writing, in WhatsApp text is fine, and say
in the notes where that message lives.

There is a live precedent and a live loose end: **HMM** (Mohammad Al-Ma'ani
Sweets) is at 3/3 from team field photography, and its notes say the licence
grant *"should be confirmed by the photographer before this ships."* If that
photographer was you, close that out while you are in here.

---

## 4. Job A — the photo gaps

### Already fixed, do not redo

| Place | Was | Now | How |
|---|---|---|---|
| `UDH` Udhruh | 1/3 | **3/3** | Commons files three more photos under the same photographer's batch; position 1 only ever used `Udhruh (Arch).jpg` |
| `UNZ` Qasr Uneizah | 1/3 | **3/3** | Commons calls it **Qala'at Unayza**, not Qasr. Every spelling searched before (Unayzah / Uneizah / Uneiza / قصر عنيزة) misses it |

Both came from **[Category:Open Jordanian Heritage](https://commons.wikimedia.org/wiki/Category:Open_Jordanian_Heritage)**
— roughly 250 CC BY-SA 4.0 photographs of Jordanian heritage sites by Bashar
Tabbah, VRTS permission confirmed. **Browse that category by hand before
searching for anything.** It is the single highest-yield source for this
region and it is not well indexed by keyword search. It also holds Humayma and
Qal'at Fassu'a, which are in Ma'an governorate but not yet in our dataset —
worth raising separately.

### Still open — 6 places at 1 or 2 of 3

Read each row's `notes` first. These were searched hard.

| Place | Have | The recorded reason | Worth another look? |
|---|---|---|---|
| `AMS` Ain Musa | 1/3 | Only one free photo of this specific spring exists; other "Ain Musa" hits are different places | Low — but try the Arabic **عين موسى وادي موسى** against Open Jordanian Heritage |
| `DAJ` Dajaniya | 2/3 | Only two real photos of the site exist anywhere | Low |
| `PAM` Petra Museum | 2/3 | Two Flickr photos of the actual 2019 building found; no third | **Medium** — it is a public building opened 2019, someone has posted a CC photo since |
| `PET-GTM` Garden Tomb | 2/3 | No third image whose own caption unambiguously says *Garden Tomb* rather than the confusable *Garden Temple* / *Garden Triclinium* — same wadi, different monuments | Low, and be careful: this is a real trap |
| `PET-WSA` Wadi Sabra | 1/3 | ACOR covers it but is non-commercial only | Low |
| `WUA` Wu'ayra Castle | 2/3 | Both Commons photos already used | Low |

### Still open — 9 places at 0 of 3

| Place | Why it is empty | The only route |
|---|---|---|
| `ABH` Abu Hutana | Minor unexcavated Roman watchtower, German-Wikipedia-only sourcing. Nothing on Commons, Wikidata, or Open Jordanian Heritage | Field photo. It is a hill east of Highway 15 |
| `QIR` Khirbet el-Qirana | Exact-subject photos exist in APAAME — **CC BY-NC-ND**, unusable | Field photo |
| `RTI` Rujm Tawil Ifjeij | Iron Age tower on a 1,242 m volcanic cone. Nothing free anywhere | Field photo, and it is a climb |
| `ACT-BLN1` Petra Balloon | **Never researched — no rows existed until now.** A commercial operator | §5 — ask them |
| `FOOD-ZRB1` Zarb Al-Shweikh | **Never researched.** Zero free-licensed photos exist, searched EN + AR | §5 |
| `FOOD-MZR1` Muluk Al-Zarb | **Never researched.** Same | §5 |
| `FOOD-QYM1` Qasr Al-Yemen | **Never researched.** Same | §5 |
| `FOOD-SHM1` Sham Sweets | **Never researched.** Same | §5 |
| `FOOD-TRK1` Al-Turki | **Never researched.** Same | §5 |

`FOOD-RYH1` Rayhana Cafe has rows too, but **do not photograph it yet**: it is
held out of the deck because two sources disagree on who is actually allowed
in. Settle that first or skip it.

### Verify before you use anything

This is the part that has gone wrong repeatedly. Filename agreement is not
proof of subject.

1. **Coordinates.** Commons file pages carry EXIF or a camera location. Compare
   it to the place's `lat`/`lon`. `Jabal Tahkim` was rejected on this test — it
   is 1.8 km from Udhruh, a different feature in the same landscape. Anything
   over ~2.5 km is a different place.
2. **Look at the picture.** Open it. Does the building match the photo already
   in position 1? That is what proved Qala'at Unayza and Qasr Uneizah are one
   site — same arched gate, same masonry, different photographer.
3. **Hash it.** A past pass shipped a "new" photo byte-identical to one already
   in use. `shasum` your candidate against `data/images/`.
4. **Read the file page's own description**, not the search snippet. Commons
   search has returned photos of Beidha for Ammarin, and a Qasr al-Bint 40 km
   from Petra, both of which nearly shipped.

---

## 5. The restaurants and the balloon

Six businesses, zero free-licensed photos, and no amount of searching will
change that. Every one of them has its own social page with photos on it —
those are all rights-reserved, and copying them is not an option.

Two routes that work, in order of preference:

**Ask them.** They have a commercial reason to say yes: this app puts them in
front of tourists for free. Their own pages are already in the dataset, so you
have the channel:

| Place | Contact |
|---|---|
| `FOOD-ZRB1` Zarb Al-Shweikh | **0772117147** (on their page), [facebook](https://www.facebook.com/Resturantzrbalshwikh/) |
| `FOOD-MZR1` Muluk Al-Zarb | [instagram](https://www.instagram.com/mtmmlwklzrb/) · they already post video |
| `FOOD-QYM1` Qasr Al-Yemen | [instagram](https://www.instagram.com/qasr_alyaman_rest/) · facebook |
| `FOOD-SHM1` Sham Sweets | [facebook](https://www.facebook.com/ShamSweets.Maan/) |
| `FOOD-TRK1` Al-Turki | [facebook](https://www.facebook.com/AlTurkiRestuarant/) |
| `ACT-BLN1` Petra Balloon | [petraballoon.com](https://petraballoon.com/) |

Ask for: *"three photos and one short video we can publish under CC BY-SA 4.0,
crediting you."* Save their written yes. Then `license` = `owner released` and
put the grant details in `notes`.

**Or shoot them yourself.** Five of the six are in Ma'an city, walking distance
apart. This is how HMM got to 3/3 and it needs nobody's permission for the
exterior and the food. `license` = `project field footage`.

**What not to do:** a CC0 photo of chicken mandi is not a photo of Qasr
Al-Yemen. Do not put a generic dish photo on a named restaurant's card — the
card would be claiming it is that place. The placeholder is better than that.

---

## 6. Job B — video

Two slots per place, 55 places, 110 rows pre-seeded. Nobody expects 110 videos
before the demo. Work the priority order and stop wherever you stop; the
validator reports progress, not failure.

### Priority

**Tier 1 — the demo path (do these first, ~8 places).** These are what a judge
actually sees: `PET` Petra, `PET-TRE` Treasury, `PET-MON` Monastery, `PET-SIQ`
The Siq, `SHB` Shobak Castle, `LPET` Little Petra, `WMU` Wadi Musa, `HMM`
Ma'ani harissa.

**Tier 2 — the rest of the swipe deck (23 places).** Everything top-level: the
castles, the Neolithic sites, the wadis, the food places. The deck only shows
top-level places, so these are the cards people swipe.

**Tier 3 — Petra's remaining 22 inner stops.** Lowest value: they are reached from
Petra's own page, and most already have three photos.

### Quality bar

| | |
|---|---|
| **Resolution** | 1080p target, **720p floor**. The validator rejects below 720 |
| **Duration** | 15–60 s is the sweet spot. Hard limits 5–180 s |
| **Orientation** | Landscape for sites, portrait acceptable for food and street scenes. Record `width`/`height` honestly either way |
| **Sound** | Ambient is fine and good. Music is not — it drags a second licence in |
| **No text overlays**, no logos, no watermarks, no drone footage unless the licence is unambiguous |
| **Stable** | If it is unwatchably shaky, it is not usable |

### Where to look

1. **Wikimedia Commons** hosts video (`.webm`, `.ogv`). Filter
   `filetype:video`. Thin for this region but free and clean.
2. **YouTube, Creative Commons filter only** — *Filters → Features → Creative
   Commons*. Then open each video and confirm the licence line says
   *"Creative Commons Attribution"*. This is the largest realistic source for
   Petra. Record the channel name as the author.
3. **Vimeo**, filter by CC licence in search.
4. **Your own phone.** Best option for anything in Ma'an city, and the only
   option for the restaurants.

Do not use: stock sites with "free" tiers that forbid commercial use, TikTok or
Instagram reels (no free licence), or anything where you cannot find a licence
statement written by the uploader.

---

## 7. Not your job — but it blocks yours shipping

Video research goes into the CSV fine. Getting it on screen needs work that
does not exist yet. Somebody has to:

1. **`landmark_videos` table** + an Alembic migration, mirroring
   `landmark_images` (unique on `(landmark_id, position)`, licence and
   attribution `NOT NULL`).
2. **`--commit` in `scripts/validate_videos.py`**, once the table exists. The
   validator was deliberately written without it rather than pretending.
3. **`videos` on the landmark API response**, next to `images`.
4. **A player in the frontend.** A `<video>` element with `preload="none"`, a
   poster frame, and the attribution visible — the same disclosure the photos
   carry. It must not autoplay with sound.
5. **A hosting decision.** Remote URLs work but depend on someone else's CDN
   staying up, which is exactly why the images got self-hosted after Commons
   returned 429s. Self-hosting video means git-lfs or object storage. This is a
   team call, not a Dam3a call.

Raise this with Pulga rather than building it yourself unless you want to.

---

## 8. Definition of done

Job A:

- [ ] `python scripts/load_images.py` passes with 0 errors
- [ ] Every photo you added is coordinate-checked, eyeballed, and hashed (§4)
- [ ] Every `owner released` / `project field footage` row names the grant in `notes`
- [ ] HMM's outstanding licence confirmation is closed out
- [ ] `backend/.venv/bin/python scripts/load_images.py --commit` run
- [ ] Any place you could not fill has its `notes` saying **what you searched
      and what you found**, so the next person does not repeat it

Job B:

- [ ] `python scripts/validate_videos.py` passes with 0 errors
- [ ] `--check-urls` passes, or its failures are understood
- [ ] Tier 1 complete
- [ ] Every row's licence was read off the video's own page, not inferred

An honest blank with a good note is a finished row. A filled row nobody can
prove the rights to is a liability.
