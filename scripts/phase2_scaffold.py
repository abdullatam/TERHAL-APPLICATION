#!/usr/bin/env python3
"""Builds the Phase 2 template for one researcher's group, carrying over every
field Phase 1 already verified so nothing gets re-researched or re-licensed.

Phase 1 produced: names, coordinates, a short description, accessibility notes,
a visit duration, a free-licensed image with its licence read off the Commons
file page, and source URLs. All of that maps straight into the Phase 2 template.
What Phase 2 adds is depth — history, significance, visiting_info, and the
narration script — so those come out as empty strings for the researcher to fill.

Run: python scripts/phase2_scaffold.py <GROUP_JSON> [--out data/phase2/<name>.json]
"""
from __future__ import annotations

import argparse
import csv
import glob
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
UNKNOWN = "UNKNOWN - flag for team review"

CATEGORY = {  # Phase 2 introduces a 4-way category the Phase 1 files did not carry
    "SHB": "castle", "WUA": "castle", "UNZ": "castle", "PET-HAB": "castle",
    "PET-SIQ": "wadi", "PET-WFA": "wadi", "PET-WSA": "wadi", "PET-WMD": "wadi",
    "PET": "macro_site", "LPET": "macro_site", "BAS": "macro_site",
    "BAJ": "macro_site", "BEI": "macro_site", "JHR": "macro_site",
}


def phase1_rows() -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for path in sorted(glob.glob(str(REPO / "data" / "scraped_group_*.csv"))):
        with open(path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                out[row["id"]] = row
    return out


def split_sources(raw: str) -> list[str]:
    return [u.strip() for u in (raw or "").split("|") if u.strip()]


def image_source(url: str) -> str:
    if "commons.wikimedia.org" in url:
        return "Wikimedia Commons"
    return "other" if url else ""


def build(entry_id: str, row: dict[str, str], researcher: str) -> dict:
    """Carry Phase 1 forward; leave Phase 2's new fields empty to be filled."""
    minutes = row.get("avg_visit_minutes") or ""
    return {
        "id": entry_id,
        "name_en": row.get("name_en", ""),
        "name_ar": row.get("name_ar", ""),
        "category": CATEGORY.get(entry_id, UNKNOWN),
        "parent_site_id": row.get("parent_site") or None,
        "coordinates": {
            "lat": float(row["lat"]) if row.get("lat") else None,
            "lng": float(row["lon"]) if row.get("lon") else None,
        },
        # Phase 1's description becomes the short description; it is already
        # paraphrased from cited sources and licence-clean.
        "short_description_en": row.get("description_en", ""),
        "short_description_ar": row.get("description_ar", ""),
        "history_en": "",
        "history_ar": "",
        "significance_en": "",
        "significance_ar": "",
        "visiting_info": {
            "best_time_to_visit": "",
            "difficulty": "",
            "estimated_time_there": f"{minutes} minutes" if minutes else "",
            "accessibility_notes": row.get("accessibility_notes", ""),
            "requires_guide": None,
            "entrance_fee_notes": "",
        },
        "narration_script_en": "",
        "narration_script_ar": "",
        "image": {
            "url": row.get("image_url", ""),
            "source": image_source(row.get("image_url", "")),
            "license": row.get("image_license", ""),
            "attribution_text": row.get("image_attribution", ""),
        },
        "sources": split_sources(row.get("source_url", "")),
        "confidence": "needs_review",
        "researcher": researcher,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", help="comma- or space-separated entry ids")
    ap.add_argument("--researcher", default="Pulga")
    ap.add_argument("--out", default="data/phase2/group1_pulga.json")
    args = ap.parse_args()

    wanted = [i for i in args.ids.replace(",", " ").split() if i]
    rows = phase1_rows()
    missing = [i for i in wanted if i not in rows]
    if missing:
        print(f"  no Phase 1 row for: {', '.join(missing)} — these start from scratch")

    entries = [build(i, rows.get(i, {}), args.researcher) for i in wanted]
    out = REPO / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

    carried = sum(1 for e in entries if e["short_description_en"])
    imaged = sum(1 for e in entries if e["image"]["url"])
    print(f"  wrote {len(entries)} entries to {args.out}")
    print(f"  carried over: {carried} descriptions, {imaged} verified images")
    print(f"  to fill: history, significance, visiting_info, narration (x2 languages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
