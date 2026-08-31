#!/usr/bin/env python3
"""The Phase 1 -> Phase 2 bridge: merges the three group CSVs, validates
them, and regenerates backend/app/data/landmarks.py from whatever rows are
actually ready to seed.

This is the "one open problem" flagged in PLAN.md section 11: seed.py reads
a hand-maintained Python dict, and nothing connected the scraped CSVs to it.
This script is that connection. From now on the CSVs are the only source of
truth — backend/app/data/landmarks.py is a generated build artifact and
should never be hand-edited; re-run this script instead.

Run:  python scripts/build_dataset.py

Groups that aren't finished yet (rows with no description and no
content_flags — i.e. simply not scraped) are skipped and reported, not
guessed. The pipeline is designed to be re-run as each group completes,
not gated on all three finishing at once — running it today, with only
Group B and C done, is expected to skip Group A's 13 rows and say so.

Stages:
  1. load     — read the three group CSVs (schema-checked against the header
                validate_data.py enforces)
  2. merge    — concatenate into data/merged.csv (the file PLAN.md assigns
                to Abd to produce by hand; this automates the mechanical
                part — the judgement calls, like settling flagged rows,
                are still his)
  3. validate — run the same checks scripts/validate_data.py runs, so a
                problem is visible here instead of only at Thursday's gate
  4. clean    — fold image_license into image_attribution (the landmarks
                table has no license column), coerce types, drop rows that
                aren't seed-ready
  5. generate — write backend/app/data/landmarks.py from what's left
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_data import HEADER, Report, check_file_level, check_row  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
GROUP_FILES = [
    REPO / "data" / "scraped_group_a.csv",
    REPO / "data" / "scraped_group_b.csv",
    REPO / "data" / "scraped_group_c.csv",
]
MERGED_PATH = REPO / "data" / "merged.csv"
LANDMARKS_PATH = REPO / "backend" / "app" / "data" / "landmarks.py"
MASTER_LIST = REPO / "data" / "master_list.csv"

SEED_FIELDS = [
    "id", "name_en", "name_ar", "description_en", "description_ar",
    "avg_visit_minutes", "accessibility_notes", "image_url",
    "image_attribution", "lat", "lon", "source_url",
]


def load_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in GROUP_FILES:
        if not path.exists():
            print(f"  (skipping {path.name} — not found)")
            continue
        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            if reader.fieldnames != HEADER:
                raise SystemExit(
                    f"{path.name}: header does not match the agreed schema "
                    "(see PLAN.md section 2) — fix it before merging"
                )
            rows.extend(reader)
    return rows


def write_merged(rows: list[dict[str, str]]) -> None:
    with MERGED_PATH.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(rows)


def fold_license_into_attribution(license_: str, attribution: str) -> str:
    """The landmarks table has no license column — the license has to travel
    inside the attribution string or it's lost at seed time."""
    if not license_ or license_.lower() in attribution.lower():
        return attribution
    return f"{attribution} ({license_})" if attribution else f"({license_})"


def to_float(value: str | None) -> float | None:
    value = (value or "").strip()
    return float(value) if value else None


def row_is_seed_ready(row: dict[str, str]) -> tuple[bool, str]:
    group = (row.get("group") or "").strip()
    if group not in ("A", "B", "C"):
        return False, "not assigned to a scraping group"

    flags = {f.strip() for f in (row.get("content_flags") or "").split(",")}
    if "no_source" in flags:
        return False, "flagged no_source"

    required = [
        "name_en", "name_ar", "description_en", "description_ar",
        "avg_visit_minutes", "accessibility_notes",
    ]
    missing = [c for c in required if not (row.get(c) or "").strip()]
    if missing:
        if not (row.get("description_en") or "").strip():
            return False, "not scraped yet"
        return False, f"missing required field(s): {', '.join(missing)}"

    return True, ""


def build_landmark_entries(rows: list[dict[str, str]]) -> tuple[list[dict], list[str]]:
    entries: list[dict] = []
    skipped: list[str] = []
    seen_ids: set[str] = set()

    for row in rows:
        rid = (row.get("id") or "").strip()
        if not rid:
            continue
        if rid in seen_ids:
            skipped.append(f"{rid}: duplicate id, kept first occurrence")
            continue

        ready, reason = row_is_seed_ready(row)
        if not ready:
            skipped.append(f"{rid}: {reason}")
            continue
        seen_ids.add(rid)

        image_url = (row.get("image_url") or "").strip() or None
        image_attribution = (row.get("image_attribution") or "").strip() or None
        if image_url and image_attribution:
            image_attribution = fold_license_into_attribution(
                (row.get("image_license") or "").strip(), image_attribution
            )
        elif not image_url:
            image_attribution = None

        entries.append({
            "id": rid,
            "name_en": row["name_en"].strip(),
            "name_ar": row["name_ar"].strip(),
            "description_en": row["description_en"].strip(),
            "description_ar": row["description_ar"].strip(),
            "avg_visit_minutes": int(row["avg_visit_minutes"].strip()),
            "accessibility_notes": row["accessibility_notes"].strip(),
            "image_url": image_url,
            "image_attribution": image_attribution,
            "lat": to_float(row.get("lat")),
            "lon": to_float(row.get("lon")),
            "source_url": (row.get("source_url") or "").strip() or None,
        })

    return entries, skipped


def render_landmarks_py(entries: list[dict]) -> str:
    lines = [
        '"""Knowledge base for every tourist attraction in Ma\'an governorate — the',
        "single source of truth for both the AI itinerary planner and the camera",
        "guide's grounding data.",
        "",
        "GENERATED FILE — do not hand-edit. The source of truth is",
        "data/scraped_group_*.csv; regenerate this with",
        "`python scripts/build_dataset.py` after any of those change. See PLAN.md",
        "and data/README.md for the sourcing/licensing rules behind this data.",
        '"""',
        "from app.models import Landmark",
        "",
        "LANDMARKS: dict[str, Landmark] = {",
    ]
    for entry in sorted(entries, key=lambda e: e["id"]):
        lines.append(f"    {entry['id']!r}: Landmark(")
        for field in SEED_FIELDS:
            lines.append(f"        {field}={entry[field]!r},")
        lines.append("    ),")
    lines.append("}")
    return "\n".join(lines) + "\n"


def main() -> int:
    print("1. Loading group files...")
    rows = load_rows()
    print(f"   {len(rows)} rows loaded across {len(GROUP_FILES)} group files")

    print("\n2. Writing data/merged.csv...")
    write_merged(rows)
    print(f"   wrote {MERGED_PATH.relative_to(REPO)}")

    print("\n3. Validating merged data (scripts/validate_data.py rules)...")
    rep = Report()
    universe = None
    if MASTER_LIST.exists():
        with MASTER_LIST.open(newline="", encoding="utf-8") as fh:
            universe = {
                (r["id"] or "").strip() for r in csv.DictReader(fh)
                if (r.get("id") or "").strip()
            }
    for row in rows:
        check_row(row, rep, strict_seed=False)
    check_file_level(rows, rep, expect_ids=None, merged=False, universe=universe)
    rep.print_group("ERRORS", rep.errors)
    rep.print_group("WARNINGS", rep.warnings)
    if rep.errors:
        print(
            f"\n   {len(rep.errors)} validation error(s) — the affected rows "
            "are excluded below, not force-seeded."
        )

    print("\n4-5. Building seed-ready landmark entries...")
    entries, skipped = build_landmark_entries(rows)
    print(f"   {len(entries)} rows ready to seed")
    if skipped:
        print(f"   {len(skipped)} rows skipped:")
        for s in skipped:
            print(f"     - {s}")

    LANDMARKS_PATH.write_text(render_landmarks_py(entries), encoding="utf-8")
    print(f"\nWrote {len(entries)} landmarks to {LANDMARKS_PATH.relative_to(REPO)}")
    print("Run `python -m app.seed` (from backend/) to load them into Postgres.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
