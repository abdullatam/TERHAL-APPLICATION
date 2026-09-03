#!/usr/bin/env python3
"""Validates data/landmark_images.csv and upserts it into `landmark_images`.

    python scripts/load_images.py                 # validate only
    python scripts/load_images.py --check-urls    # also fetch every URL
    python scripts/load_images.py --commit        # validate, then write to the DB

Validation always runs first and nothing is written unless it passes. The rules
are the same ones Phase 1 worked to: a real free licence read off the file page,
a named photographer, and no NC or ND. See ABD_TASKS.md.

Upsert key is (landmark_id, position), so re-running replaces image 2 of a site
rather than appending a fourth.
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "data" / "landmark_images.csv"

HEADER = [
    "landmark_id", "position", "url", "source", "license",
    "attribution_text", "caption_en", "caption_ar", "researcher", "notes",
]
REQUIRED = ["landmark_id", "position", "url", "source", "license", "attribution_text"]
IMAGES_PER_LANDMARK = 3

ALLOWED_LICENCES = {
    "cc0", "public domain", "pd", "cc by 1.0", "cc by 2.0", "cc by 2.5",
    "cc by 3.0", "cc by 4.0", "cc by-sa 1.0", "cc by-sa 2.0", "cc by-sa 2.5",
    "cc by-sa 3.0", "cc by-sa 4.0",
}
FORBIDDEN_TOKENS = ("nc", "nd")
# Anything not answering right now is inconclusive, not proof of a bad URL —
# Wikimedia rate-limits bulk checks hard.
INCONCLUSIVE_STATUS = {408, 425, 429, 500, 502, 503, 504}


def landmark_ids() -> set[str]:
    """Read the ids from the generated dataset, so this runs without a DB."""
    sys.path.insert(0, str(REPO / "backend"))
    from app.data.landmarks import LANDMARKS  # noqa: E402

    return set(LANDMARKS)


def load_rows() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        raise SystemExit(
            f"{CSV_PATH.relative_to(REPO)} does not exist yet — see ABD_TASKS.md"
        )
    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames != HEADER:
            raise SystemExit(
                "CSV header does not match the agreed columns.\n"
                f"  expected: {','.join(HEADER)}\n"
                f"  found:    {','.join(reader.fieldnames or [])}"
            )
        return list(reader)


def is_blank(row: dict[str, str]) -> bool:
    """A pre-seeded worklist row nobody has filled in yet. Not an error — the
    file ships with every landmark listed so ids cannot be typo'd, and it is
    expected to be mostly empty on day one."""
    return not any(
        (row.get(column) or "").strip()
        for column in ("url", "source", "license", "attribution_text")
    )


def validate(rows: list[dict[str, str]], known: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    seen: set[tuple[str, str]] = set()
    per_landmark: Counter[str] = Counter()
    urls: dict[str, str] = {}

    for i, row in enumerate(rows, start=2):
        where = f"row {i} ({row.get('landmark_id') or '?'})"
        if is_blank(row):
            continue

        for column in REQUIRED:
            if not (row.get(column) or "").strip():
                errors.append(f"{where}: {column} is empty")

        lid = (row.get("landmark_id") or "").strip()
        if lid and lid not in known:
            errors.append(
                f"{where}: landmark_id {lid!r} is not a real landmark — check the "
                "table in ABD_TASKS.md, ids are case-sensitive"
            )

        raw_position = (row.get("position") or "").strip()
        if raw_position:
            if not raw_position.isdigit() or not 1 <= int(raw_position) <= IMAGES_PER_LANDMARK:
                errors.append(
                    f"{where}: position {raw_position!r} must be 1, 2 or 3"
                )
            elif (lid, raw_position) in seen:
                errors.append(f"{where}: {lid} already has an image at position {raw_position}")
            else:
                seen.add((lid, raw_position))
                per_landmark[lid] += 1

        url = (row.get("url") or "").strip()
        if url:
            if url.startswith("/images/"):
                if not (REPO / "data" / url.lstrip("/")).is_file():
                    errors.append(f"{where}: self-hosted path {url!r} has no file on disk")
            elif not url.startswith(("http://", "https://")):
                errors.append(f"{where}: url is not a URL")
            if url in urls and urls[url] != lid:
                warnings.append(f"{where}: same url already used for {urls[url]}")
            else:
                urls.setdefault(url, lid)

        licence = (row.get("license") or "").strip()
        if licence:
            normalised = licence.lower()
            if any(token in normalised.replace("-", " ").split() for token in FORBIDDEN_TOKENS):
                errors.append(
                    f"{where}: licence {licence!r} restricts commercial or derivative "
                    "use (NC/ND) — unusable here"
                )
            elif normalised not in ALLOWED_LICENCES:
                warnings.append(
                    f"{where}: licence {licence!r} is not on the known-free list — "
                    "confirm it before this is merged"
                )

        attribution = (row.get("attribution_text") or "").strip()
        if attribution and licence and licence.lower() not in attribution.lower():
            warnings.append(f"{where}: attribution does not name the licence")

    for lid, count in sorted(per_landmark.items()):
        if count != IMAGES_PER_LANDMARK:
            warnings.append(f"{lid}: has {count} image(s), the brief asks for {IMAGES_PER_LANDMARK}")

    done = sum(1 for lid in known if per_landmark.get(lid) == IMAGES_PER_LANDMARK)
    print(f"  progress: {done}/{len(known)} landmarks complete, "
          f"{sum(per_landmark.values())} images filled in")

    return errors, warnings


def check_urls(rows: list[dict[str, str]]) -> tuple[list[str], list[str]]:
    import urllib.error
    import urllib.request

    targets = [(r["landmark_id"], r["position"], r["url"].strip())
               for r in rows if not is_blank(r) and (r.get("url") or "").strip()
               and not r["url"].strip().startswith("/images/")]  # self-hosted, already checked on disk
    if not targets:
        return [], []

    def fetch(item):
        lid, position, url = item
        request = urllib.request.Request(
            url, method="GET",
            headers={"User-Agent": "MaanProject-Images/1.0", "Range": "bytes=0-2047"},
        )
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith("image/"):
                    return lid, position, f"served {content_type!r}, not an image", True
                return lid, position, None, True
        except urllib.error.HTTPError as exc:
            if exc.code in INCONCLUSIVE_STATUS:
                return lid, position, f"could not be verified (HTTP {exc.code})", False
            return lid, position, f"returned HTTP {exc.code}", True
        except Exception as exc:
            return lid, position, f"could not be reached ({type(exc).__name__})", False

    errors: list[str] = []
    warnings: list[str] = []
    print(f"  fetching {len(targets)} images (2 at a time, to stay polite)...")
    # Wikimedia throttles bulk access; two workers keeps the run answerable.
    with ThreadPoolExecutor(max_workers=2) as pool:
        for lid, position, problem, fatal in pool.map(fetch, targets):
            if problem is None:
                continue
            (errors if fatal else warnings).append(f"{lid} #{position}: image {problem}")
    return errors, warnings


def upsert(rows: list[dict[str, str]]) -> int:
    sys.path.insert(0, str(REPO / "backend"))
    from sqlalchemy.dialects.postgresql import insert  # noqa: E402

    from app.db import SessionLocal  # noqa: E402
    from app.db_models import LandmarkImageORM  # noqa: E402

    payload = [
        {
            "landmark_id": row["landmark_id"].strip(),
            "position": int(row["position"]),
            "url": row["url"].strip(),
            "source": row["source"].strip(),
            "license": row["license"].strip(),
            "attribution_text": row["attribution_text"].strip(),
            "caption_en": (row.get("caption_en") or "").strip() or None,
            "caption_ar": (row.get("caption_ar") or "").strip() or None,
            "researcher": (row.get("researcher") or "").strip() or None,
            "notes": (row.get("notes") or "").strip() or None,
        }
        for row in rows
        if not is_blank(row)  # worklist rows nobody has filled in yet
    ]
    if not payload:
        return 0

    statement = insert(LandmarkImageORM).values(payload)
    statement = statement.on_conflict_do_update(
        constraint="uq_landmark_image_position",
        set_={
            column: statement.excluded[column]
            for column in payload[0]
            if column not in ("landmark_id", "position")
        },
    )
    with SessionLocal() as session:
        session.execute(statement)
        session.commit()
    return len(payload)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", action="store_true", help="write to the database")
    parser.add_argument("--check-urls", action="store_true", help="fetch every image URL")
    args = parser.parse_args()

    rows = load_rows()
    known = landmark_ids()
    print(f"validating {CSV_PATH.relative_to(REPO)} — {len(rows)} rows, "
          f"{len(known)} landmarks in the dataset")

    errors, warnings = validate(rows, known)
    if args.check_urls:
        url_errors, url_warnings = check_urls(rows)
        errors += url_errors
        warnings += url_warnings

    for label, items in (("ERRORS", errors), ("WARNINGS", warnings)):
        if items:
            print(f"\n{label} ({len(items)})")
            for item in items:
                print(f"  {item}")

    if errors:
        print(f"\nFAILED — {len(errors)} error(s), nothing written.")
        return 1

    print(f"\nPASSED — 0 errors, {len(warnings)} warning(s)")
    if args.commit:
        written = upsert(rows)
        print(f"Upserted {written} rows into landmark_images.")
    else:
        print("Dry run. Re-run with --commit to write to the database.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
