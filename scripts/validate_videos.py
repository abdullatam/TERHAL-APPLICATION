#!/usr/bin/env python3
"""Validates data/landmark_videos.csv.

    python scripts/validate_videos.py              # structure + licence rules
    python scripts/validate_videos.py --check-urls # also fetch every URL

There is deliberately no --commit. The `landmark_videos` table does not exist
yet, and neither does the player that would show these — see Dam3a3.md §7.
This script exists so the research can be checked and reviewed in git while
that plumbing is still outstanding, rather than piling up unverified.

The licence rules are the same ones the image pass worked to (PLAN.md §4): a
real free licence read off the file page, a named author, and no NC or ND. A
video nobody can prove the rights to is worse than no video.
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "data" / "landmark_videos.csv"

HEADER = [
    "landmark_id", "position", "url", "source", "license", "attribution_text",
    "duration_seconds", "width", "height", "caption_en", "caption_ar",
    "researcher", "notes",
]
REQUIRED = [
    "landmark_id", "position", "url", "source", "license", "attribution_text",
    "duration_seconds", "width", "height",
]
VIDEOS_PER_LANDMARK = 2

# Same allowlist as scripts/load_images.py. YouTube's "Creative Commons -
# Attribution" option is CC BY 3.0 and so is allowed; YouTube's default
# "Standard licence" is not free and is not.
ALLOWED_LICENCES = {
    "cc0", "public domain", "pd", "cc by 1.0", "cc by 2.0", "cc by 2.5",
    "cc by 3.0", "cc by 4.0", "cc by-sa 1.0", "cc by-sa 2.0", "cc by-sa 2.5",
    "cc by-sa 3.0", "cc by-sa 4.0",
    # The project's own field footage, and footage a business released to us.
    # Both need the paperwork named in the notes column.
    "owner released", "project field footage",
}
FORBIDDEN_TOKENS = ("nc", "nd")

# A clip that is too short is a GIF, and one that is too long is not going to
# be watched on a phone between two monuments.
MIN_SECONDS = 5
MAX_SECONDS = 180
MIN_HEIGHT = 720  # 720p floor; the brief asks for 1080p where it exists

INCONCLUSIVE_STATUS = {408, 425, 429, 500, 502, 503, 504}


def landmark_ids() -> list[str]:
    sys.path.insert(0, str(REPO / "backend"))
    from app.data.landmarks import LANDMARKS  # noqa: E402

    return list(LANDMARKS)


def load_rows() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        raise SystemExit(f"{CSV_PATH.relative_to(REPO)} does not exist")
    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames != HEADER:
            raise SystemExit(
                "header changed — expected:\n  "
                + ",".join(HEADER)
                + "\ngot:\n  "
                + ",".join(reader.fieldnames or [])
            )
        return list(reader)


def check(rows: list[dict[str, str]], ids: list[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    seen: Counter[tuple[str, str]] = Counter()
    urls: dict[str, str] = {}
    filled_per: Counter[str] = Counter()

    for i, row in enumerate(rows, start=2):  # line 1 is the header
        lid, pos = row["landmark_id"], row["position"]
        where = f"line {i} ({lid}/{pos})"

        seen[(lid, pos)] += 1
        if not pos.isdigit() or not 1 <= int(pos) <= VIDEOS_PER_LANDMARK:
            errors.append(f"{where}: position must be 1..{VIDEOS_PER_LANDMARK}")

        started = any(row[c].strip() for c in REQUIRED if c not in ("landmark_id", "position"))

        # An unknown id is only an error once somebody has put a video against
        # it. Blank rows are pre-seeded slots, and some of them run ahead of
        # the dataset on purpose — the food and activity places have image and
        # video slots here while their landmark records are still in flight.
        if lid not in ids:
            msg = f"{where}: '{lid}' is not a landmark id in the dataset"
            if started:
                errors.append(msg)
            else:
                warnings.append(msg + " (blank slot, waiting on the dataset)")

        if not started:
            continue  # a row nobody has begun is progress, not an error
        filled_per[lid] += 1

        for col in REQUIRED:
            if not row[col].strip():
                errors.append(f"{where}: '{col}' is required once a row is started")

        lic = row["license"].strip().lower()
        if lic and lic not in ALLOWED_LICENCES:
            errors.append(f"{where}: licence '{row['license']}' is not on the allowlist")
        for tok in FORBIDDEN_TOKENS:
            if f"-{tok}" in lic or f" {tok} " in f" {lic} ":
                errors.append(f"{where}: licence '{row['license']}' is NC or ND — not usable")

        if lic in ("owner released", "project field footage") and not row["notes"].strip():
            errors.append(
                f"{where}: licence '{row['license']}' needs the notes column to say who granted "
                "it, when, and where the written permission lives"
            )

        url = row["url"].strip()
        if url:
            if url in urls and urls[url] != f"{lid}/{pos}":
                errors.append(f"{where}: same url as {urls[url]} — a duplicate, not a second angle")
            urls[url] = f"{lid}/{pos}"

        for col, lo, hi in (("duration_seconds", MIN_SECONDS, MAX_SECONDS),):
            v = row[col].strip()
            if v:
                try:
                    n = float(v)
                except ValueError:
                    errors.append(f"{where}: '{col}' must be a number, got '{v}'")
                else:
                    if not lo <= n <= hi:
                        errors.append(f"{where}: {col} {n:g}s outside {lo}-{hi}s")

        h = row["height"].strip()
        if h:
            try:
                if int(h) < MIN_HEIGHT:
                    errors.append(f"{where}: height {h}px is below the {MIN_HEIGHT}p floor")
            except ValueError:
                errors.append(f"{where}: 'height' must be an integer, got '{h}'")

        if row["caption_en"].strip() and not row["caption_ar"].strip():
            warnings.append(f"{where}: has an English caption but no Arabic one")
        if row["caption_ar"].strip() and not row["caption_en"].strip():
            warnings.append(f"{where}: has an Arabic caption but no English one")

    for key, n in seen.items():
        if n > 1:
            errors.append(f"{key[0]}/{key[1]}: appears {n} times — one row per position")

    for lid in ids:
        n = filled_per[lid]
        if 0 < n < VIDEOS_PER_LANDMARK:
            warnings.append(f"{lid}: has {n} video(s), the brief asks for {VIDEOS_PER_LANDMARK}")

    return errors, warnings


def fetch_status(url: str) -> tuple[str, int | None, str]:
    import urllib.error
    import urllib.request

    req = urllib.request.Request(
        url, method="HEAD",
        headers={"User-Agent": "MaanProject/1.0 (checking our own licensed videos)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return url, r.status, r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return url, e.code, ""
    except Exception as e:  # noqa: BLE001 — a timeout is inconclusive, not a failure
        return url, None, str(e)[:60]


def check_urls(rows: list[dict[str, str]]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    remote = sorted({
        r["url"].strip() for r in rows
        if r["url"].strip().startswith("http")
    })
    local = sorted({
        r["url"].strip() for r in rows
        if r["url"].strip().startswith("/")
    })

    for url in local:
        path = REPO / "data" / url.lstrip("/")
        if not path.exists():
            errors.append(f"{url}: no file at {path.relative_to(REPO)}")

    if remote:
        print(f"  fetching {len(remote)} remote url(s)…")
        # Two at a time: bulk access to Commons gets rate-limited hard.
        with ThreadPoolExecutor(max_workers=2) as pool:
            for url, status, note in pool.map(fetch_status, remote):
                if status is None or status in INCONCLUSIVE_STATUS:
                    warnings.append(f"{url}: inconclusive ({status or note})")
                elif status >= 400:
                    errors.append(f"{url}: HTTP {status}")
    return errors, warnings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check-urls", action="store_true", help="fetch every url too")
    args = ap.parse_args()

    ids = landmark_ids()
    rows = load_rows()
    print(f"validating {CSV_PATH.relative_to(REPO)} — {len(rows)} rows, {len(ids)} landmarks")

    errors, warnings = check(rows, ids)
    if args.check_urls:
        e2, w2 = check_urls(rows)
        errors += e2
        warnings += w2

    filled = sum(
        1 for r in rows
        if any(r[c].strip() for c in REQUIRED if c not in ("landmark_id", "position"))
    )
    done = sum(
        1 for lid in ids
        if sum(
            1 for r in rows
            if r["landmark_id"] == lid
            and any(r[c].strip() for c in REQUIRED if c not in ("landmark_id", "position"))
        ) >= VIDEOS_PER_LANDMARK
    )
    print(f"  progress: {done}/{len(ids)} landmarks complete, {filled} videos filled in")

    for label, items in (("ERRORS", errors), ("WARNINGS", warnings)):
        if items:
            print(f"\n{label} ({len(items)})")
            for it in items:
                print(f"  {it}")

    print()
    if errors:
        print(f"FAILED — {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"PASSED — 0 errors, {len(warnings)} warning(s)")
    print("No --commit: the landmark_videos table does not exist yet (Dam3a3.md §7).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
