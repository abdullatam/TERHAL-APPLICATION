#!/usr/bin/env python3
"""Validates a Phase 1 data file against the contract in data/README.md.

Run on a single group file while you work:

    python scripts/validate_data.py data/scraped_group_c.csv

Run on the merged file before it is seeded, checking every image URL too:

    python scripts/validate_data.py data/merged.csv --merged --check-images

Exits 0 only if there are no errors. Warnings never fail the run — they are
things a human should look at, not things that break the seed.

See PLAN.md sections 2, 4 and 12. This script is the gate described in
TASKS.md; it is meant to be run by someone who did not write it, so every
failure names the row and says what to do about it.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# The agreed header, in order. Renaming or reordering breaks the merge, the
# seed script and this validator at once, so the check is exact.
HEADER = [
    "id", "type", "parent_site", "name_en", "name_ar", "in_maan_governorate",
    "lat", "lon", "group", "source_url", "flags", "notes",
    "description_en", "description_ar", "avg_visit_minutes",
    "accessibility_notes", "image_url", "image_license", "image_attribution",
    "content_flags",
]

# Columns the landmarks table actually requires (see backend/app/db_models.py).
# A null in any of these fails the seed, so they are errors and not warnings.
SEED_REQUIRED = [
    "name_en", "name_ar", "description_en", "description_ar",
    "avg_visit_minutes", "accessibility_notes",
]

# Free licences we accept. Anything carrying NC or ND restricts commercial or
# derivative use, which this project cannot rely on.
ALLOWED_LICENCES = {
    "cc0", "public domain", "pd", "cc by 1.0", "cc by 2.0", "cc by 2.5",
    "cc by 3.0", "cc by 4.0", "cc by-sa 1.0", "cc by-sa 2.0", "cc by-sa 2.5",
    "cc by-sa 3.0", "cc by-sa 4.0",
}
FORBIDDEN_LICENCE_TOKENS = ("nc", "nd")

VALID_FLAGS = {"no_source", "no_free_image", ""}

# Bounding boxes used to re-check that a coordinate is where it claims to be.
PETRA_BOX = (30.28, 30.42, 35.38, 35.52)   # PET-* entries
MAAN_BOX = (29.20, 30.95, 35.30, 38.00)    # everything else

# The master list's id convention says PET- means "inside the Petra park
# boundary", but a few entries carry the prefix while sitting outside it. Wadi
# Sabra is a Nabataean satellite settlement ~6 km south of the city centre, so
# its real coordinates (the Sabra Theatre, 30.2776, 35.4135) fall below the park
# box. These are checked against the Ma'an box instead. Listing them explicitly
# keeps the park check tight — widening the box for everyone would have let
# through the wrong Qasr al-Bint homonym this check was written to catch.
OUTSIDE_PARK_DESPITE_PET_ID = {"PET-WSA"}

ARABIC = re.compile(r"[؀-ۿݐ-ݿ]")
LATIN = re.compile(r"[A-Za-z]{4,}")


class Report:
    """Collects findings so the whole file is checked before anything prints."""

    def __init__(self) -> None:
        self.errors: list[tuple[str, str]] = []
        self.warnings: list[tuple[str, str]] = []

    def error(self, row_id: str, msg: str) -> None:
        self.errors.append((row_id, msg))

    def warn(self, row_id: str, msg: str) -> None:
        self.warnings.append((row_id, msg))

    def print_group(self, label: str, items: list[tuple[str, str]]) -> None:
        if not items:
            return
        print(f"\n{label} ({len(items)})")
        by_row: dict[str, list[str]] = defaultdict(list)
        for row_id, msg in items:
            by_row[row_id].append(msg)
        for row_id in sorted(by_row):
            print(f"  {row_id or '(no id)'}")
            for msg in by_row[row_id]:
                print(f"      {msg}")


def in_box(box: tuple[float, float, float, float], lat: float, lon: float) -> bool:
    return box[0] <= lat <= box[1] and box[2] <= lon <= box[3]


def looks_translated(text: str) -> bool:
    """Latin words inside an Arabic description usually mean untranslated text."""
    stripped = re.sub(r"\((?:[^()]*)\)", "", text)  # allow parenthetical names
    return bool(LATIN.search(stripped))


def check_header(fieldnames: list[str] | None, rep: Report) -> bool:
    if fieldnames is None:
        rep.error("", "file has no header row")
        return False
    if fieldnames == HEADER:
        return True
    missing = [c for c in HEADER if c not in fieldnames]
    extra = [c for c in fieldnames if c not in HEADER]
    if missing:
        rep.error("", f"header is missing columns: {', '.join(missing)}")
    if extra:
        rep.error("", f"header has unexpected columns: {', '.join(extra)}")
    if not missing and not extra:
        rep.error("", "header has the right columns but in the wrong order — "
                      f"expected {', '.join(HEADER)}")
    return False


def check_row(row: dict[str, str], rep: Report, *, strict_seed: bool) -> None:
    rid = (row.get("id") or "").strip()
    group = (row.get("group") or "").strip()

    # EXCLUDED and HOLD rows are records, not payload. They are not scraped and
    # must never be seeded, so only sanity-check them and move on.
    if group in ("EXCLUDED", "HOLD"):
        if group == "EXCLUDED" and (row.get("in_maan_governorate") or "").strip() != "no":
            rep.error(rid, "EXCLUDED row must have in_maan_governorate=no")
        if group == "HOLD" and (row.get("description_en") or "").strip():
            rep.error(rid, "HOLD row has a description — it must not be scraped "
                           "or seeded until it is verified")
        return

    if not rid:
        rep.error("", "row has no id")
        return
    if group not in ("A", "B", "C"):
        rep.error(rid, f"group is {group!r}; expected A, B or C")

    flags = {f.strip() for f in (row.get("content_flags") or "").split(",")}
    flagged_no_source = "no_source" in flags
    flagged_no_image = "no_free_image" in flags
    bad_flags = flags - VALID_FLAGS
    if bad_flags:
        rep.error(rid, f"unknown content_flags: {', '.join(sorted(bad_flags))} "
                       f"(allowed: no_source, no_free_image)")

    # --- the skipped-row check: blank content with no flag explaining it ------
    desc_en = (row.get("description_en") or "").strip()
    desc_ar = (row.get("description_ar") or "").strip()
    if not desc_en and not flagged_no_source:
        rep.error(rid, "description_en is blank and content_flags does not say "
                       "no_source — the row was skipped, not flagged")

    # --- fields the database requires ----------------------------------------
    for col in SEED_REQUIRED:
        value = (row.get(col) or "").strip()
        if value:
            continue
        if flagged_no_source and col in ("description_en", "description_ar"):
            continue  # an honest no_source row is allowed to have no prose
        msg = f"{col} is empty — the landmarks table has it NOT NULL"
        rep.error(rid, msg) if strict_seed else rep.warn(rid, msg)

    # --- avg_visit_minutes ----------------------------------------------------
    raw_minutes = (row.get("avg_visit_minutes") or "").strip()
    if raw_minutes:
        try:
            minutes = int(raw_minutes)
            if minutes <= 0:
                rep.error(rid, f"avg_visit_minutes is {minutes}; must be positive")
            elif minutes > 600:
                rep.warn(rid, f"avg_visit_minutes is {minutes} (>10h) — intended?")
        except ValueError:
            rep.error(rid, f"avg_visit_minutes {raw_minutes!r} is not an integer")

    # --- Arabic ---------------------------------------------------------------
    name_ar = (row.get("name_ar") or "").strip()
    if name_ar and not ARABIC.search(name_ar):
        rep.error(rid, f"name_ar {name_ar!r} contains no Arabic script — "
                       "it looks like a transliteration")
    if desc_ar:
        if not ARABIC.search(desc_ar):
            rep.error(rid, "description_ar contains no Arabic script")
        elif looks_translated(desc_ar):
            rep.warn(rid, "description_ar contains Latin words — check it is not "
                          "partly untranslated")
    if desc_en and desc_ar:
        # A rough tell for one field pasted into the other.
        if desc_en == desc_ar:
            rep.error(rid, "description_en and description_ar are identical")

    # --- coordinates ----------------------------------------------------------
    lat_raw = (row.get("lat") or "").strip()
    lon_raw = (row.get("lon") or "").strip()
    if lat_raw and lon_raw:
        try:
            lat, lon = float(lat_raw), float(lon_raw)
            in_park = rid.startswith("PET-") and rid not in OUTSIDE_PARK_DESPITE_PET_ID
            box = PETRA_BOX if in_park else MAAN_BOX
            if not in_box(box, lat, lon):
                where = "the Petra park" if in_park else "Ma'an governorate"
                rep.error(rid, f"coordinates {lat}, {lon} fall outside {where} — "
                               "likely a same-name feature somewhere else")
        except ValueError:
            rep.error(rid, f"lat/lon {lat_raw!r}, {lon_raw!r} are not numbers")
    elif lat_raw or lon_raw:
        rep.error(rid, "only one of lat/lon is filled")
    else:
        rep.warn(rid, "no coordinates")

    # --- sources --------------------------------------------------------------
    source = (row.get("source_url") or "").strip()
    if not source and not flagged_no_source:
        rep.error(rid, "no source_url and not flagged no_source — every claim "
                       "must be checkable")
    for url in [u.strip() for u in source.split("|") if u.strip()]:
        if not url.startswith(("http://", "https://")):
            rep.error(rid, f"source_url entry {url!r} is not a URL")

    # --- images and licences --------------------------------------------------
    image_url = (row.get("image_url") or "").strip()
    licence = (row.get("image_license") or "").strip()
    attribution = (row.get("image_attribution") or "").strip()

    if not image_url:
        if not flagged_no_image:
            rep.error(rid, "no image_url and not flagged no_free_image")
        if licence or attribution:
            rep.warn(rid, "no image_url but licence/attribution are filled")
        return

    if flagged_no_image:
        rep.error(rid, "flagged no_free_image but image_url is filled — "
                       "pick one")
    if not image_url.startswith(("http://", "https://")):
        rep.error(rid, f"image_url {image_url!r} is not a URL")

    if not licence:
        rep.error(rid, "image_url is set but image_license is empty — open the "
                       "Commons file page and read the licence box")
    else:
        norm = licence.lower().strip()
        tokens = re.split(r"[\s\-]+", norm)
        if any(t in FORBIDDEN_LICENCE_TOKENS for t in tokens):
            rep.error(rid, f"licence {licence!r} restricts commercial or "
                           "derivative use (NC/ND) — not usable here")
        elif norm not in ALLOWED_LICENCES:
            rep.warn(rid, f"licence {licence!r} is not on the known-free list — "
                          "confirm it before seeding")

    if not attribution:
        rep.error(rid, "image_url is set but image_attribution is empty")
    else:
        if licence and licence.lower() not in attribution.lower():
            rep.warn(rid, "attribution does not name the licence — the database "
                          "has no licence column, so it must ship in this string")
        if not re.search(r"\b(?:by|photo|author)\b", attribution, re.I):
            rep.warn(rid, f"attribution {attribution!r} may not name a photographer")


def check_file_level(rows: list[dict[str, str]], rep: Report, *,
                     expect_ids: set[str] | None, merged: bool,
                     universe: set[str] | None) -> None:
    ids = [(r.get("id") or "").strip() for r in rows if (r.get("id") or "").strip()]
    for rid, count in Counter(ids).items():
        if count > 1:
            rep.error(rid, f"id appears {count} times — ids must be unique")

    scraped = [r for r in rows if (r.get("group") or "").strip() in ("A", "B", "C")]

    # parent_site must resolve, or the metadata is lying about the hierarchy.
    # In a single group file the parent usually lives in someone else's group,
    # so resolve against the master list when we have it.
    known = universe if universe else set(ids)
    for row in scraped:
        parent = (row.get("parent_site") or "").strip()
        if parent and parent not in known:
            where = "the master list" if universe else "this file"
            rep.error((row.get("id") or "").strip(),
                      f"parent_site {parent!r} is not an id in {where}")

    if expect_ids is not None:
        present = {(r.get("id") or "").strip() for r in rows}
        for missing in sorted(expect_ids - present):
            rep.error(missing, "in the master list but missing from this file — "
                               "if it was removed deliberately, say why in notes")
        for added in sorted(present - expect_ids - {""}):
            rep.warn(added, "not in the master list — a new entry?")

    if merged:
        counts = Counter((r.get("group") or "").strip() for r in scraped)
        print(f"  groups present: " + ", ".join(
            f"{g}={counts[g]}" for g in ("A", "B", "C")))
        for group in ("A", "B", "C"):
            if not counts[group]:
                rep.error("", f"merged file contains no group {group} rows — "
                              "did someone's file get left out?")


def check_images(rows: list[dict[str, str]], rep: Report) -> None:
    """Fetch every image_url. A filename typo fails silently otherwise.

    A 404 means the URL is wrong and is an error. A 429 or 5xx means the host
    would not answer us right now — that is inconclusive, not proof of a bad
    URL, so it is a warning. Treating a rate limit as a failure would fail the
    merge gate for a reason that has nothing to do with the data.
    """
    import urllib.error
    import urllib.request

    targets = [((r.get("id") or "").strip(), (r.get("image_url") or "").strip())
               for r in rows if (r.get("image_url") or "").strip()]
    if not targets:
        print("  no image URLs to check")
        return

    INCONCLUSIVE = {408, 425, 429, 500, 502, 503, 504}

    def fetch(item: tuple[str, str]) -> tuple[str, str, str | None, bool]:
        """Returns (id, url, problem, fatal). fatal=False means inconclusive."""
        rid, url = item
        req = urllib.request.Request(
            url, method="GET",
            headers={"User-Agent": "MaanProject-DataPhase/1.0 (validation)",
                     "Range": "bytes=0-2047"},
        )
        last: tuple[str | None, bool] = (None, True)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    ctype = resp.headers.get("Content-Type", "")
                    if resp.status not in (200, 206):
                        return rid, url, f"returned HTTP {resp.status}", True
                    if not ctype.startswith("image/"):
                        return rid, url, f"served Content-Type {ctype!r}, not an image", True
                    return rid, url, None, True
            except urllib.error.HTTPError as exc:
                if exc.code in INCONCLUSIVE:
                    last = (f"could not be verified — host returned HTTP {exc.code}", False)
                    time.sleep(4 * (attempt + 1))
                    continue
                return rid, url, f"returned HTTP {exc.code}", True
            except Exception as exc:
                last = (f"could not be reached ({type(exc).__name__})", False)
                time.sleep(4 * (attempt + 1))
        return rid, url, last[0], last[1]

    print(f"  checking {len(targets)} image URLs (2 at a time, to stay polite)...")
    checked = inconclusive = 0
    # Wikimedia rate-limits bulk access hard; two workers is enough and does not
    # get the whole run thrown a 429.
    with ThreadPoolExecutor(max_workers=2) as pool:
        for rid, url, problem, fatal in pool.map(fetch, targets):
            if problem is None:
                checked += 1
            elif fatal:
                rep.error(rid, f"image_url {problem}: {url}")
            else:
                inconclusive += 1
                rep.warn(rid, f"image_url {problem}: {url}")
    print(f"  {checked} confirmed, {inconclusive} unverified, "
          f"{len(targets) - checked - inconclusive} broken")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a Phase 1 data file against data/README.md.")
    parser.add_argument("path", help="CSV to validate")
    parser.add_argument("--merged", action="store_true",
                        help="treat as the merged file: require all three groups "
                             "and enforce the NOT NULL columns as errors")
    parser.add_argument("--check-images", action="store_true",
                        help="fetch every image_url (needs network)")
    parser.add_argument("--master", default="data/master_list.csv",
                        help="master list to compare ids against "
                             "(default: data/master_list.csv)")
    args = parser.parse_args()

    path = Path(args.path)
    if not path.exists():
        print(f"error: {path} does not exist", file=sys.stderr)
        return 2

    rep = Report()
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header_ok = check_header(reader.fieldnames, rep)
        rows = list(reader)

    print(f"validating {path}  ({len(rows)} rows)")

    if not header_ok:
        rep.print_group("ERRORS", rep.errors)
        print("\nheader is wrong — fix that first, the row checks were skipped")
        return 1

    expect_ids: set[str] | None = None
    universe: set[str] | None = None
    master = Path(args.master)
    if master.exists() and path.resolve() != master.resolve():
        with master.open(newline="", encoding="utf-8") as fh:
            master_rows = list(csv.DictReader(fh))
        universe = {(r["id"] or "").strip() for r in master_rows
                    if (r.get("id") or "").strip()}
        if args.merged:
            expect_ids = {(r["id"] or "").strip() for r in master_rows
                          if (r.get("group") or "").strip() in ("A", "B", "C")}
        else:
            groups = {(r.get("group") or "").strip() for r in rows}
            groups &= {"A", "B", "C"}
            expect_ids = {(r["id"] or "").strip() for r in master_rows
                          if (r.get("group") or "").strip() in groups}
    else:
        print("  (no master list to compare ids against)")

    for row in rows:
        check_row(row, rep, strict_seed=args.merged)
    check_file_level(rows, rep, expect_ids=expect_ids, merged=args.merged,
                     universe=universe)

    if args.check_images:
        check_images(rows, rep)

    rep.print_group("ERRORS", rep.errors)
    rep.print_group("WARNINGS", rep.warnings)

    print()
    if rep.errors:
        rows_affected = len({r for r, _ in rep.errors})
        print(f"FAILED — {len(rep.errors)} errors across {rows_affected} rows, "
              f"{len(rep.warnings)} warnings")
        print("Fix the errors above. Warnings are for a human to judge.")
        return 1

    print(f"PASSED — 0 errors, {len(rep.warnings)} warnings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
