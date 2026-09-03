#!/usr/bin/env python3
"""The data pipeline: Phase 1 CSVs + Phase 2 research -> the app's knowledge base.

`backend/app/data/landmarks.py` is a generated build artifact. The sources of
truth are `data/scraped_group_*.csv` (Phase 1: names, coordinates, short
descriptions, images, licences) and `data/phase2/*.json` (Phase 2: history,
significance, narration scripts, difficulty, visiting info). Never hand-edit
the generated file — re-run this script.

Run:  python scripts/build_dataset.py

Nothing is invented to fill a gap. Rows that were never scraped, or that the
researchers flagged `no_source`, are skipped and named in the output. Phase 2
`UNKNOWN - flag for team review` markers become nulls rather than being shown
to a tourist as if they were content.

Stages:
  1. load      — read the three Phase 1 group CSVs (schema-checked)
  2. merge     — concatenate into data/merged.csv
  3. validate  — run scripts/validate_data.py's checks
  4. clean     — fold image_license into image_attribution, coerce types, drop
                 rows that are not seed-ready
  5. enrich    — overlay Phase 2 depth, and add places Phase 2 found that
                 Phase 1 never had (the Job B finds)
  6. generate  — write backend/app/data/landmarks.py
"""
from __future__ import annotations

import csv
import glob
import json
import re
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
PHASE2_GLOB = str(REPO / "data" / "phase2" / "*.json")
MERGED_PATH = REPO / "data" / "merged.csv"
LANDMARKS_PATH = REPO / "backend" / "app" / "data" / "landmarks.py"
MASTER_LIST = REPO / "data" / "master_list.csv"

UNKNOWN_MARK = "UNKNOWN - flag for team review"
DEFAULT_VISIT_MINUTES = 30

# Places that exist and are researched but should not be offered to tourists.
# Kept in the dataset (and in the DB) so the decision stays visible and
# reversible, rather than deleting research the team paid for.
INACTIVE = {
    "OPM": "Closed to the public since 2011 (Phase 2 finding) — team decision pending",
}

SEED_FIELDS = [
    "id", "name_en", "name_ar", "description_en", "description_ar",
    "avg_visit_minutes", "accessibility_notes", "image_url",
    "image_attribution", "lat", "lon", "source_url",
    "parent_id", "category", "history_en", "history_ar",
    "significance_en", "significance_ar", "narration_en", "narration_ar",
    "difficulty", "best_time_to_visit", "requires_guide",
    "entrance_fee_notes", "active",
]


# --------------------------------------------------------------------------
# Phase 1
# --------------------------------------------------------------------------

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


def blank_phase2_fields() -> dict:
    return {
        "category": None, "history_en": None, "history_ar": None,
        "significance_en": None, "significance_ar": None,
        "narration_en": None, "narration_ar": None, "difficulty": None,
        "best_time_to_visit": None, "requires_guide": None,
        "entrance_fee_notes": None,
    }


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
            "parent_id": (row.get("parent_site") or "").strip() or None,
            "active": rid not in INACTIVE,
            **blank_phase2_fields(),
        })

    return entries, skipped


# --------------------------------------------------------------------------
# Phase 2
# --------------------------------------------------------------------------

def clean(value):
    """Phase 2's honest-gap marker is bookkeeping, not content — a tourist must
    never be shown 'UNKNOWN - flag for team review' as if it were a fact."""
    if not isinstance(value, str):
        return value
    value = value.strip()
    if not value or UNKNOWN_MARK in value:
        return None
    return value


def parse_minutes(text: str | None) -> int | None:
    """Phase 2 records visit length as prose ('45-60 minutes', '3 hours
    including the approach'). The scheduler needs one integer, so take the
    midpoint of a range and round to five minutes."""
    if not text:
        return None
    lowered = text.lower()

    combined = re.search(r"(\d+)\s*h(?:ou)?rs?\s*(?:and\s*)?(\d+)\s*min", lowered)
    if combined:
        return int(combined.group(1)) * 60 + int(combined.group(2))

    numbers = [int(n) for n in re.findall(r"\d+", lowered)]
    if not numbers:
        return None
    span = numbers[:2]
    value = sum(span) / len(span)
    if "hour" in lowered or "hr" in lowered:
        value *= 60
    return max(5, int(round(value / 5) * 5))


def load_phase2() -> dict[str, dict]:
    records: dict[str, dict] = {}
    for path in sorted(glob.glob(PHASE2_GLOB)):
        for entry in json.load(open(path, encoding="utf-8")):
            records[entry["id"]] = entry
    return records


def phase2_fields(entry: dict) -> dict:
    visiting = entry.get("visiting_info") or {}
    requires_guide = visiting.get("requires_guide")
    return {
        "category": clean(entry.get("category")),
        "history_en": clean(entry.get("history_en")),
        "history_ar": clean(entry.get("history_ar")),
        "significance_en": clean(entry.get("significance_en")),
        "significance_ar": clean(entry.get("significance_ar")),
        "narration_en": clean(entry.get("narration_script_en")),
        "narration_ar": clean(entry.get("narration_script_ar")),
        "difficulty": clean(visiting.get("difficulty")),
        "best_time_to_visit": clean(visiting.get("best_time_to_visit")),
        "requires_guide": requires_guide if isinstance(requires_guide, bool) else None,
        "entrance_fee_notes": clean(visiting.get("entrance_fee_notes")),
    }


def entry_from_phase2(entry: dict) -> dict | None:
    """Phase 2's Job B found places Phase 1 never had. They carry everything a
    landmark needs, so they join the dataset directly."""
    visiting = entry.get("visiting_info") or {}
    coords = entry.get("coordinates") or {}
    description_en = clean(entry.get("short_description_en"))
    description_ar = clean(entry.get("short_description_ar"))
    if not description_en or not description_ar:
        return None

    image = entry.get("image") or {}
    image_url = clean(image.get("url"))
    attribution = clean(image.get("attribution_text"))
    if image_url and attribution:
        attribution = fold_license_into_attribution(
            clean(image.get("license")) or "", attribution
        )
    elif not image_url:
        attribution = None

    rid = entry["id"]
    return {
        "id": rid,
        "name_en": entry.get("name_en", "").strip(),
        "name_ar": entry.get("name_ar", "").strip(),
        "description_en": description_en,
        "description_ar": description_ar,
        "avg_visit_minutes": parse_minutes(visiting.get("estimated_time_there"))
                             or DEFAULT_VISIT_MINUTES,
        "accessibility_notes": clean(visiting.get("accessibility_notes")) or "",
        "image_url": image_url,
        "image_attribution": attribution,
        "lat": coords.get("lat"),
        "lon": coords.get("lng"),
        "source_url": " | ".join(entry.get("sources") or []) or None,
        "parent_id": entry.get("parent_site_id") or None,
        "active": rid not in INACTIVE,
        **phase2_fields(entry),
    }


def enrich(entries: list[dict], phase2: dict[str, dict]) -> tuple[list[dict], list[str], list[str]]:
    by_id = {e["id"]: e for e in entries}
    enriched: list[str] = []

    for entry_id, record in phase2.items():
        target = by_id.get(entry_id)
        if target is None:
            continue
        fields = phase2_fields(record)
        target.update({k: v for k, v in fields.items() if v is not None})
        # parent_site_id is Phase 2's judgement and supersedes the CSV column.
        if record.get("parent_site_id"):
            target["parent_id"] = record["parent_site_id"]

        # Phase 2 sometimes closed a gap Phase 1 left open — AMS got both its
        # first image and Job B coordinates there. Fill blanks only: a Phase 1
        # value has already been licence-checked and stays authoritative.
        coords = record.get("coordinates") or {}
        if target.get("lat") is None and coords.get("lat") is not None:
            target["lat"], target["lon"] = coords.get("lat"), coords.get("lng")

        image = record.get("image") or {}
        image_url = clean(image.get("url"))
        if not target.get("image_url") and image_url:
            attribution = clean(image.get("attribution_text"))
            target["image_url"] = image_url
            target["image_attribution"] = fold_license_into_attribution(
                clean(image.get("license")) or "", attribution or ""
            ) or None

        enriched.append(entry_id)

    added: list[str] = []
    for entry_id, record in phase2.items():
        if entry_id in by_id:
            continue
        new_entry = entry_from_phase2(record)
        if new_entry is None:
            continue
        entries.append(new_entry)
        by_id[entry_id] = new_entry
        added.append(entry_id)

    return entries, enriched, added


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------

def render_landmarks_py(entries: list[dict]) -> str:
    lines = [
        '"""Knowledge base for every tourist attraction in Ma\'an governorate — the',
        "single source of truth for the swipe deck, the itinerary planner and the",
        "camera guide's grounding data.",
        "",
        "GENERATED FILE — do not hand-edit. The sources of truth are",
        "data/scraped_group_*.csv (Phase 1) and data/phase2/*.json (Phase 2);",
        "regenerate with `python scripts/build_dataset.py` after either changes.",
        "See PLAN.md and data/README.md for the sourcing and licensing rules.",
        '"""',
        "from app.models import Landmark",
        "",
        "LANDMARKS: dict[str, Landmark] = {",
    ]
    for entry in sorted(entries, key=lambda e: e["id"]):
        lines.append(f"    {entry['id']!r}: Landmark(")
        for field in SEED_FIELDS:
            lines.append(f"        {field}={entry.get(field)!r},")
        lines.append("    ),")
    lines.append("}")
    return "\n".join(lines) + "\n"


def main() -> int:
    print("1. Loading Phase 1 group files...")
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
    if rep.errors:
        print(f"   {len(rep.errors)} validation error(s) across "
              f"{len({r for r, _ in rep.errors})} rows — those rows are excluded "
              "below, not force-seeded. Run validate_data.py for the detail.")
    else:
        print("   no validation errors")

    print("\n4. Building seed-ready entries from Phase 1...")
    entries, skipped = build_landmark_entries(rows)
    print(f"   {len(entries)} ready, {len(skipped)} skipped")
    for reason in skipped:
        print(f"     - {reason}")

    print("\n5. Overlaying Phase 2 research...")
    phase2 = load_phase2()
    if not phase2:
        print("   no data/phase2/*.json files found — Phase 1 depth only")
    entries, enriched, added = enrich(entries, phase2)
    print(f"   {len(phase2)} Phase 2 records: {len(enriched)} enriched an existing "
          f"place, {len(added)} added a new one")
    if added:
        print(f"     new from Phase 2 Job B: {', '.join(sorted(added))}")
    missing_depth = sorted(e["id"] for e in entries if not e.get("history_en"))
    if missing_depth:
        print(f"   {len(missing_depth)} places still have no Phase 2 depth "
              f"(Group 3 was never delivered): {', '.join(missing_depth)}")

    inactive = sorted(e["id"] for e in entries if not e.get("active"))
    if inactive:
        print(f"\n   marked inactive (kept in the data, hidden from tourists):")
        for entry_id in inactive:
            print(f"     - {entry_id}: {INACTIVE[entry_id]}")

    deck = [e for e in entries if not e.get("parent_id")]
    LANDMARKS_PATH.write_text(render_landmarks_py(entries), encoding="utf-8")
    print(f"\n6. Wrote {len(entries)} landmarks to {LANDMARKS_PATH.relative_to(REPO)}")
    print(f"   {len(deck)} are top-level destinations (the swipe deck), "
          f"{len(entries) - len(deck)} are stops inside them")
    print("   Run `python -m app.seed` from backend/ to load them into Postgres.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
