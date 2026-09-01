#!/usr/bin/env python3
"""Validates a Phase 2 extraction file against the Section 1 template.

Run: python scripts/validate_phase2.py data/phase2/group1_pulga.json

Checks structure (every field present, correct types, no invented enum values)
and content (Arabic actually in Arabic, narration distinct from history, sources
present, licences free). The UNKNOWN marker is an accepted value everywhere —
the brief says an honest gap beats a guess — but it is counted and listed so a
file full of them cannot pass unnoticed.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter

UNKNOWN = "UNKNOWN - flag for team review"
# The marker is often embedded in a longer sentence ("...; UNKNOWN - flag for
# team review for the current fee"), so match on the marker text rather than
# on the field being exactly equal to it — otherwise real gaps go uncounted.
UNKNOWN_MARK = "UNKNOWN - flag for team review"


def has_unknown(value) -> bool:
    return isinstance(value, str) and UNKNOWN_MARK in value
CATEGORIES = {"landmark", "macro_site", "castle", "wadi"}
DIFFICULTIES = {"easy", "moderate", "difficult"}
CONFIDENCE = {"verified", "needs_review"}
ARABIC = re.compile(r"[؀-ۿݐ-ݿ]")
LATIN_RUN = re.compile(r"[A-Za-z]{4,}")
FREE_LICENCE = re.compile(
    r"^(cc0|cc[ -]by([ -]sa)?[ -][0-9.]+|public domain|pd\b.*)$", re.I)

TEXT_PAIRS = [
    ("short_description_en", "short_description_ar"),
    ("history_en", "history_ar"),
    ("significance_en", "significance_ar"),
    ("narration_script_en", "narration_script_ar"),
]
VISIT_FIELDS = ["best_time_to_visit", "difficulty", "estimated_time_there",
                "accessibility_notes", "requires_guide", "entrance_fee_notes"]


def sentences(text: str) -> int:
    return len([s for s in re.split(r"[.!?؟]\s+", text.strip()) if s.strip()])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--strict-unknown", action="store_true",
                    help="treat UNKNOWN placeholders as errors, not warnings")
    args = ap.parse_args()

    entries = json.load(open(args.path, encoding="utf-8"))
    errors: list[tuple[str, str]] = []
    warnings: list[tuple[str, str]] = []
    unknowns: list[tuple[str, str]] = []

    def err(i, m): errors.append((i, m))
    def warn(i, m): warnings.append((i, m))

    ids = Counter(e.get("id", "") for e in entries)
    for i, n in ids.items():
        if n > 1:
            err(i, f"id appears {n} times")

    for e in entries:
        eid = e.get("id") or "(no id)"

        for field in ("id", "name_en", "name_ar", "category", "coordinates",
                      "visiting_info", "image", "sources", "confidence", "researcher"):
            if field not in e:
                err(eid, f"missing required key: {field}")

        if e.get("category") not in CATEGORIES and e.get("category") != UNKNOWN:
            err(eid, f"category {e.get('category')!r} not one of {sorted(CATEGORIES)}")
        if e.get("confidence") not in CONFIDENCE:
            err(eid, f"confidence {e.get('confidence')!r} not one of {sorted(CONFIDENCE)}")
        if not e.get("researcher"):
            err(eid, "researcher is empty")

        co = e.get("coordinates") or {}
        if co.get("lat") is None or co.get("lng") is None:
            warn(eid, "coordinates incomplete")
        else:
            if not (29.2 <= co["lat"] <= 31.0 and 35.2 <= co["lng"] <= 38.0):
                err(eid, f"coordinates {co['lat']},{co['lng']} fall outside Ma'an governorate")

        # --- text pairs, both languages -------------------------------------
        for en_key, ar_key in TEXT_PAIRS:
            en, ar = (e.get(en_key) or "").strip(), (e.get(ar_key) or "").strip()
            for key, val in ((en_key, en), (ar_key, ar)):
                if not val:
                    err(eid, f"{key} is empty")
                elif has_unknown(val):
                    unknowns.append((eid, key))
            if ar and not has_unknown(ar) and not ARABIC.search(ar):
                err(eid, f"{ar_key} contains no Arabic script")
            if ar and en and ar == en:
                err(eid, f"{ar_key} is identical to {en_key}")
            if ar and not has_unknown(ar):
                stripped = re.sub(r"\([^)]*\)", "", ar)
                if LATIN_RUN.search(stripped):
                    warn(eid, f"{ar_key} contains Latin words — check it is fully translated")

        if (e.get("history_en") or "").strip() and not has_unknown(e.get("history_en")):
            n = sentences(e["history_en"])
            if n < 3:
                warn(eid, f"history_en is {n} sentence(s); the template asks for 3-5")
        if (e.get("significance_en") or "").strip() and not has_unknown(e.get("significance_en")):
            n = sentences(e["significance_en"])
            if n < 2:
                warn(eid, f"significance_en is {n} sentence(s); the template asks for 2-3")

        # the narration must be a spoken rewrite, not a copy of the history
        nar, hist = (e.get("narration_script_en") or ""), (e.get("history_en") or "")
        if nar and hist and nar.strip() == hist.strip():
            err(eid, "narration_script_en is a copy of history_en, not a spoken version")

        # --- visiting_info ---------------------------------------------------
        vi = e.get("visiting_info") or {}
        for f in VISIT_FIELDS:
            if f not in vi:
                err(eid, f"visiting_info missing {f}")
            elif vi[f] in (None, ""):
                err(eid, f"visiting_info.{f} is empty")
            elif has_unknown(vi[f]):
                unknowns.append((eid, f"visiting_info.{f}"))
        if vi.get("difficulty") not in DIFFICULTIES | {UNKNOWN, None, ""}:
            err(eid, f"visiting_info.difficulty {vi.get('difficulty')!r} invalid")
        if not isinstance(vi.get("requires_guide"), bool):
            err(eid, "visiting_info.requires_guide must be true or false")

        # --- image and licence ----------------------------------------------
        img = e.get("image") or {}
        if img.get("url"):
            lic = (img.get("license") or "").strip()
            if not lic:
                err(eid, "image has a url but no license")
            elif re.search(r"\bN[CD]\b", lic, re.I):
                err(eid, f"image licence {lic!r} restricts commercial or derivative use")
            elif not FREE_LICENCE.match(lic):
                warn(eid, f"image licence {lic!r} is not on the known-free list")
            if not (img.get("attribution_text") or "").strip():
                err(eid, "image has a url but no attribution_text")
            if not (img.get("source") or "").strip():
                err(eid, "image has a url but no source")
        else:
            warn(eid, "no image")

        srcs = e.get("sources") or []
        if not srcs:
            err(eid, "no sources — the brief says no source, no entry")
        for s in srcs:
            if not str(s).startswith(("http://", "https://")):
                err(eid, f"source {s!r} is not a URL")

    print(f"validating {args.path} — {len(entries)} entries")
    for label, items in (("ERRORS", errors), ("WARNINGS", warnings)):
        if not items:
            continue
        print(f"\n{label} ({len(items)})")
        for i, m in items:
            print(f"  {i:10} {m}")
    if unknowns:
        print(f"\nUNKNOWN placeholders ({len(unknowns)}) — honest gaps, but they are gaps")
        for i, f in unknowns:
            print(f"  {i:10} {f}")

    if args.strict_unknown:
        errors += [(i, f"{f} is still UNKNOWN") for i, f in unknowns]
    print()
    if errors:
        print(f"FAILED — {len(errors)} errors, {len(warnings)} warnings")
        return 1
    print(f"PASSED — 0 errors, {len(warnings)} warnings, {len(unknowns)} UNKNOWN fields")
    return 0


if __name__ == "__main__":
    sys.exit(main())
