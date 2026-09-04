# Abd — Site Images

**Three images for every site in the dataset.** 47 sites, so 141 images. 42 are
already done (see below), which leaves **99 to find**.

The app currently shows one photo per place. Three lets a card open into a
gallery, gives the camera guide more than one reference view per monument, and
means a site is not represented by a single bad angle.

Everything here follows the same licensing rules as Phase 1 — those are in
[PLAN.md](../PLAN.md) §4 and they have not changed. The short version is in §3
below.

---

## 1. Where the work goes

| | |
|---|---|
| **You edit** | `data/landmark_images.csv` — already created, one row per image, all 141 rows pre-seeded with the correct `landmark_id` and `position` |
| **Database table** | **`landmark_images`** — the destination; you do not write SQL by hand, the loader does it |
| **You run** | `python scripts/load_images.py` to check, then `--commit` to upsert |

The CSV is the reviewable artifact in git; the table is where the app reads
from. Keep both — do not hand-edit the database, or the next person to run the
loader will overwrite you.

### Running it

```bash
# from the repo root

# 1. check your work — safe, writes nothing
python scripts/load_images.py

# 2. also fetch every URL to prove it loads (slow, be patient)
python scripts/load_images.py --check-urls

# 3. write to the database (needs the backend venv for its DB driver)
backend/.venv/bin/python scripts/load_images.py --commit
```

Step 3 needs `backend/.venv` set up and `backend/.env` filled in — see the
[README](../../README.md). Steps 1 and 2 run on plain `python3` with no database.

Nothing is written unless validation passes. The upsert key is
`(landmark_id, position)`, so re-running replaces image 2 of a site rather than
adding a fourth — run it as often as you like.

### Columns

| Column | Required | Notes |
|---|---|---|
| `landmark_id` | ✅ | **Pre-filled. Never change it.** Case-sensitive, must match the tables below |
| `position` | ✅ | **Pre-filled.** 1, 2 or 3. Position 1 is the one the app shows first — make it the best, clearest, most recognisable shot |
| `url` | ✅ | Direct file URL. For Commons use `https://commons.wikimedia.org/wiki/Special:FilePath/<EXACT_FILENAME>.jpg` |
| `source` | ✅ | `Wikimedia Commons` for almost everything |
| `license` | ✅ | Exact name off the file page: `CC BY 4.0`, `CC BY-SA 3.0`, `CC0`, `public domain` |
| `attribution_text` | ✅ | `Photo by NAME, LICENCE, via Wikimedia Commons` |
| `caption_en` / `caption_ar` | optional | One short line: what the photo actually shows ("the Treasury facade from the Siq exit"). Useful, not required |
| `researcher` | optional | `Abd` |
| `notes` | optional | Anything the next person needs to know |

A row you have not started yet is left blank and the validator ignores it — it
reports progress instead. So you can commit partway through without noise.

---

## 2. What is already done — do not redo it

**42 of the 141 rows are pre-filled at position 1**, carried over from the hero
image each site already has. Those are licence-checked and in the database
already. For those sites you only need **positions 2 and 3**.

Five sites have **no image at all** and need all three: `ABH`, `PAM`, `QIR`,
`RTI`, `USH`. Those are the hardest and the most valuable — start there.

The `Have` column in the tables below is how many images that site already has.

---

## 3. The rules, short version

1. **Free licence or nothing.** Open the Commons **file page** — not the
   thumbnail, not the search result — and read the licence box. Copy the
   licence name and the photographer's name from that page.
2. **Never `NC` or `ND`.** Those forbid commercial or derivative use and this is
   a commercial product pitch. The validator rejects them.
3. **No Google Images.** No Flickr without an explicit CC licence. No "I found
   it on a travel blog". If you cannot name the licence and the photographer,
   the image does not go in.
4. **Check the URL loads.** A filename typo fails silently later — run
   `--check-urls`.
5. **Three genuinely different views.** Not the same facade three times at three
   crops. A wide establishing shot, a closer detail, and a different angle or a
   different part of the site is the ideal.
6. **The photo must be of the right place.** Commons filenames lie. Two real
   examples already caught on this project: a "Petra Umm Sayhoun" photo that
   turned out to show a different wadi, and a Commons result for the Ammarin
   camp that was actually Beidha. If the file description does not confirm the
   subject, do not use it.
7. **An honest gap beats a wrong image.** If a site genuinely has only one free
   photo, leave rows 2 and 3 blank and say so in `notes`. That is a correct
   answer.

---

## 4. Sites — top level (22)

These are the swipe-deck destinations. **Highest priority** — they are what a
judge sees first.

| ID | Name (EN) | Name (AR) | Coordinates | Have |
|---|---|---|---|---|
| `PET` | Petra | البتراء | 30.33333, 35.43333 | 1 |
| `ABH` | Abu Hutana | أبو حطانة | 30.57288, 35.82744 | **0** |
| `AJF` | Al-Jafr (desert town & basin) | الجفر | 30.31751, 36.18527 | 1 |
| `AMS` | Ain Musa (Moses Spring) | عين موسى | — | 1 |
| `BAJ` | Ba'ja (Neolithic site) | بعجة | 30.41341, 35.46129 | 1 |
| `BAS` | Basta (Neolithic site) | بسطة | 30.23300, 35.53300 | 1 |
| `BEI` | Beidha (Neolithic site) | البيضا | 30.37078, 35.44776 | 1 |
| `DAJ` | Dajaniya Roman Fort (Kastell Dajaniya) | قلعة الدجانية الرومانية | 30.55272, 35.76163 | 1 |
| `JHR` | Jebel Harun / Tomb of Aaron | جبل هارون | 30.31679, 35.40671 | 1 |
| `LPET` | Little Petra (Siq al-Barid) | البتراء الصغيرة (سيق البريد) | 30.37511, 35.45091 | 1 |
| `MPL` | Founding King's Palace (Ma'an Railway Station) | قصر الملك المؤسس | — | 1 |
| `MUT` | El-Mutrab | المطرب | 30.20424, 35.78966 | 1 |
| `PAM` | Petra Museum (visitor center) | متحف البترا | 30.32532, 35.46784 | **0** |
| `QIR` | Khirbet el-Qirana | خربة القرانة | 29.98606, 35.54052 | **0** |
| `RTI` | Rujm Tawil Ifjeij | رجم طويل افجيج | 30.57124, 35.71205 | **0** |
| `SHB` | Shobak Castle (Montreal) | قلعة الشوبك | 30.53130, 35.56000 | 1 |
| `UDH` | Udhruh (Roman legionary fort) | اذرح | 30.33049, 35.59540 | 1 |
| `UNZ` | Qasr Uneizah (Unayzah) | قصر عنيزة | 30.48820, 35.79540 | 1 |
| `USH` | Umm Sayhoun (Bedouin village) | أم صيحون | 30.34333, 35.45547 | **0** |
| `WMU` | Wadi Musa (town) | وادي موسى | 30.32166, 35.48009 | 1 |
| `WUA` | Wu'ayra Castle (Vaux Moise) | قلعة الوعيرة | 30.33274, 35.46564 | 1 |
| `OPM` | Old Petra Museum | متحف البتراء القديم | 30.32460, 35.46797 | 1 |

**`OPM` is last on purpose** — it is marked inactive in the database (closed to
the public since 2011) and the app does not show it. **Do it last, or skip it**
and say so in `notes`; the team has not settled whether it stays.

**`USH` (Umm Sayhoun) needs care.** It is a living Bedouin community — the Bdoul
families relocated out of Petra's caves in the 1980s — not a ruin or an
attraction. Photograph the place, not people's homes or faces, and avoid
anything that reads as poverty tourism. If nothing suitable and free exists,
leaving it blank is the right call.

---

## 5. Sites — inside Petra (25)

Individual monuments. These are what the **camera guide** matches a tourist's
photo against, so varied angles matter more here than anywhere else — a visitor
will not be standing where the one canonical postcard shot was taken.

| ID | Name (EN) | Name (AR) | Coordinates | Have |
|---|---|---|---|---|
| `PET-TRE` | Treasury (Al-Khazneh) | الخزنة | 30.32208, 35.45153 | 1 |
| `PET-MON` | Monastery (Ad-Deir) | الدير | 30.33821, 35.43098 | 1 |
| `PET-SIQ` | The Siq | السيق | 30.32424, 35.44824 | 1 |
| `PET-CHU` | Petra Church | الكنيسة البيزنطية | 30.33062, 35.44437 | 1 |
| `PET-COL` | Colonnaded Street | شارع الأعمدة | — | 1 |
| `PET-COR` | Corinthian Tomb (Royal Tombs) | القبر الكورنثي | 30.32853, 35.44955 | 1 |
| `PET-DJN` | Djinn Blocks | كتل الجن | 30.32215, 35.46424 | 1 |
| `PET-GRT` | Great Temple | المعبد الكبير | 30.32881, 35.44235 | 1 |
| `PET-GTM` | Garden Tomb | قبر الحدائق | 30.32043, 35.44546 | 1 |
| `PET-HAB` | Al-Habis Castle | قلعة الحبيس | 30.32905, 35.43882 | 1 |
| `PET-HPS` | High Place of Sacrifice | المذبح المرتفع | 30.32148, 35.44699 | 1 |
| `PET-KHB` | Al-Khubtha High Place & Trail | جبل الخبثة | 30.33333, 35.46667 | 1 |
| `PET-LTC` | Lion Triclinium | تريكلينيوم الأسد | 30.33504, 35.43864 | 1 |
| `PET-OBT` | Obelisk Tomb | مقبرة المسلات | 30.32122, 35.46328 | 1 |
| `PET-PAL` | Palace Tomb (Royal Tombs) | قبر القصر | 30.32911, 35.44991 | 1 |
| `PET-QAB` | Qasr al-Bint | قصر البنت | 30.32948, 35.44013 | 1 |
| `PET-RST` | Roman Soldier's Tomb | قبر الجندي الروماني | 30.32082, 35.44489 | 1 |
| `PET-SLK` | Silk Tomb (Royal Tombs) | قبر الحرير | 30.32804, 35.44926 | 1 |
| `PET-SOF` | Street of Facades | شارع الواجهات | 30.32314, 35.45013 | 1 |
| `PET-THE` | Roman Theatre | مسرح البتراء | 30.32482, 35.44696 | 1 |
| `PET-TWL` | Temple of the Winged Lions | معبد الأسود المجنحة | 30.33008, 35.44243 | 1 |
| `PET-URN` | Urn Tomb (Royal Tombs) | قبر الجرة | 30.32755, 35.44926 | 1 |
| `PET-WFA` | Wadi Farasa | وادي الفراسة | 30.32359, 35.44197 | 1 |
| `PET-WMD` | Wadi al-Mudhlim (Nabataean Dam & Tunnel) | وادي المذلم | 30.32354, 35.46095 | 1 |
| `PET-WSA` | Wadi Sabra | وادي سبرة | 30.27758, 35.41349 | 1 |

**The four Royal Tombs** (`PET-URN`, `PET-SLK`, `PET-COR`, `PET-PAL`) sit in a
row on the same cliff and photographs of them get mixed up constantly. Check
each file description names the specific tomb. `PET-COR` is the one that looks
like the Treasury — that resemblance is already the most likely camera-guide
confusion in the dataset, so its images especially must be the right tomb.

---

## 6. Where to look

- **Wikimedia Commons categories** are far better than Commons search. Start at
  the category for the site (e.g. `Category:Al-Khazneh`) and browse — that is
  where the alternate angles are.
- **Follow the Wikipedia article** for a site to its Commons category link.
- **Arabic Wikipedia** sometimes carries images the English article does not.
- **Wikimedia Commons is not the only free source** — the Library of Congress
  has public-domain photography of Jordan from the 1920s-40s, and one of those
  is already in this dataset for `AMS`. Old photographs are fine, and for the
  sites with nothing modern they may be the only option. Note the date in the
  caption so the app can say so.

---

## 7. Done means

- [ ] `python scripts/load_images.py --check-urls` passes with 0 errors
- [ ] Progress line reads `47/47 landmarks complete`, or every shortfall is
      explained in `notes`
- [ ] No licence containing `NC` or `ND`
- [ ] Every `attribution_text` names a real photographer or institution
- [ ] Three genuinely different views per site, not three crops of one
- [ ] `backend/.venv/bin/python scripts/load_images.py --commit` run, so the
      table matches the CSV
- [ ] `data/landmark_images.csv` committed and pushed

Warnings are for a human to judge; errors block. Do not silence a warning by
inventing something.
