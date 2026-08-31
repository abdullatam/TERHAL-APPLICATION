#!/usr/bin/env python3
"""Self-test for validate_data.py.

Run: python scripts/test_validate_data.py

Every check the validator makes is asserted here, both that it fires on bad
data and that it stays quiet on good data. The second half matters more — a
validator that flags everything gets ignored.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_data import (HEADER, Report, check_row, check_file_level,  # noqa: E402
                           load_removals)

GOOD = {
    "id": "PET-TRE", "type": "landmark", "parent_site": "PET",
    "name_en": "Treasury (Al-Khazneh)", "name_ar": "الخزنة",
    "in_maan_governorate": "yes", "lat": "30.32208", "lon": "35.45153",
    "group": "C", "source_url": "https://en.wikipedia.org/wiki/Al-Khazneh",
    "flags": "", "notes": "",
    "description_en": "A rock-cut tomb facade at the end of the Siq, carved in "
                      "the early first century AD.",
    "description_ar": "واجهة مقبرة منحوتة في الصخر عند نهاية السيق، نُحتت في "
                      "مطلع القرن الأول الميلادي.",
    "avg_visit_minutes": "20",
    "accessibility_notes": "Reached by the flat Siq floor; the viewing area is "
                           "level and wheelchair-passable.",
    "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Al-Khazneh.jpg",
    "image_license": "CC BY 4.0",
    "image_attribution": "Photo by Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons",
    "content_flags": "",
}

UNIVERSE = {"PET", "PET-TRE", "LPET", "SHB"}
passed = failed = 0


def check(label: str, row: dict, *, expect_error: str | None,
          expect_clean: bool = False, strict: bool = True) -> None:
    """expect_error: substring that must appear. expect_clean: no errors at all."""
    global passed, failed
    rep = Report()
    check_row({**GOOD, **row} if row is not GOOD else GOOD, rep, strict_seed=strict)
    msgs = " || ".join(m for _, m in rep.errors)
    if expect_clean:
        ok = not rep.errors
        detail = f"expected no errors, got: {msgs}"
    else:
        ok = expect_error is not None and expect_error in msgs
        detail = f"expected {expect_error!r} in errors, got: {msgs or '(none)'}"
    if ok:
        passed += 1
        print(f"  ok    {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}\n          {detail}")


print("validate_data.py self-test\n")
print("a correct row:")
check("fully populated row passes", GOOD, expect_error=None, expect_clean=True)

print("\nlicences:")
check("CC BY-NC rejected", {"image_license": "CC BY-NC 4.0"},
      expect_error="restricts commercial")
check("CC BY-ND rejected", {"image_license": "CC BY-ND 4.0"},
      expect_error="restricts commercial")
check("CC BY-NC-SA rejected", {"image_license": "CC BY-NC-SA 3.0"},
      expect_error="restricts commercial")
check("CC0 accepted", {"image_license": "CC0",
                       "image_attribution": "Public domain, CC0, via Wikimedia Commons"},
      expect_error=None, expect_clean=True)
check("image without licence rejected", {"image_license": ""},
      expect_error="image_license is empty")
check("image without attribution rejected", {"image_attribution": ""},
      expect_error="image_attribution is empty")

print("\nArabic:")
check("transliterated name_ar rejected", {"name_ar": "Al-Khazneh"},
      expect_error="contains no Arabic script")
check("Latin description_ar rejected",
      {"description_ar": "A rock-cut tomb facade at the end of the Siq."},
      expect_error="contains no Arabic script")
check("EN pasted into AR rejected",
      {"description_ar": GOOD["description_en"]},
      expect_error="contains no Arabic script")

print("\ncoordinates:")
check("PET-* outside the Petra box rejected",
      {"lat": "30.68215", "lon": "35.86670"},
      expect_error="outside the Petra park")
check("non-PET outside Ma'an rejected",
      {"id": "SHB", "type": "site", "parent_site": "", "lat": "31.9", "lon": "35.9"},
      expect_error="outside Ma'an governorate")
check("half-filled coordinates rejected", {"lon": ""},
      expect_error="only one of lat/lon")
check("non-numeric coordinates rejected", {"lat": "north"},
      expect_error="are not numbers")

print("\nrequired fields and honest flagging:")
check("blank description with no flag rejected", {"description_en": ""},
      expect_error="the row was skipped, not flagged")
check("blank description WITH no_source accepted",
      {"description_en": "", "description_ar": "", "content_flags": "no_source",
       "source_url": ""},
      expect_error=None, expect_clean=True)
check("blank avg_visit_minutes fails on merged file",
      {"avg_visit_minutes": ""}, expect_error="NOT NULL")
check("zero avg_visit_minutes rejected", {"avg_visit_minutes": "0"},
      expect_error="must be positive")
check("non-integer avg_visit_minutes rejected", {"avg_visit_minutes": "20-30"},
      expect_error="not an integer")
check("blank accessibility_notes fails on merged file",
      {"accessibility_notes": ""}, expect_error="NOT NULL")
check("missing image with no flag rejected",
      {"image_url": "", "image_license": "", "image_attribution": ""},
      expect_error="not flagged no_free_image")
check("missing image WITH no_free_image accepted",
      {"image_url": "", "image_license": "", "image_attribution": "",
       "content_flags": "no_free_image"},
      expect_error=None, expect_clean=True)
check("no_free_image but image present rejected",
      {"content_flags": "no_free_image"}, expect_error="pick one")
check("unknown flag rejected", {"content_flags": "probably_fine"},
      expect_error="unknown content_flags")
check("missing source with no flag rejected", {"source_url": ""},
      expect_error="must be checkable")
check("non-URL source rejected", {"source_url": "wikipedia"},
      expect_error="is not a URL")

print("\nHOLD and EXCLUDED rows:")
check("HOLD row with a description rejected",
      {"id": "PAM", "group": "HOLD"},
      expect_error="must not be scraped")
check("EXCLUDED row not marked no rejected",
      {"id": "", "group": "EXCLUDED", "in_maan_governorate": "yes"},
      expect_error="must have in_maan_governorate=no")

print("\nfile-level checks:")


def file_check(label: str, rows: list[dict], *, expect_error: str | None,
               universe=UNIVERSE, expect_ids=None, merged=False,
               removals=None, expect_warning: str | None = None) -> None:
    global passed, failed
    rep = Report()
    check_file_level([{**GOOD, **r} for r in rows], rep,
                     expect_ids=expect_ids, merged=merged, universe=universe,
                     removals=removals)
    if expect_warning is not None:
        msgs = " || ".join(m for _, m in rep.warnings)
        errs = " || ".join(m for _, m in rep.errors)
        if expect_warning in msgs and "missing from this file" not in errs:
            passed += 1; print(f"  ok    {label}")
        else:
            failed += 1
            print(f"  FAIL  {label}\n          expected warning {expect_warning!r}; "
                  f"warnings: {msgs or '(none)'} errors: {errs or '(none)'}")
        return
    msgs = " || ".join(m for _, m in rep.errors)
    if expect_error in msgs:
        passed += 1
        print(f"  ok    {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}\n          expected {expect_error!r}, got: {msgs or '(none)'}")


file_check("duplicate ids rejected",
           [{"id": "PET-TRE"}, {"id": "PET-TRE"}],
           expect_error="appears 2 times")
file_check("dangling parent_site rejected",
           [{"id": "PET-XXX", "parent_site": "NOPE"}],
           expect_error="is not an id in the master list")
file_check("entry missing from the file rejected",
           [{"id": "PET-TRE"}],
           expect_ids={"PET-TRE", "PET-MON"},
           expect_error="missing from this file")
file_check("documented removal passes as a warning, not an error",
           [{"id": "PET-TRE"}],
           expect_ids={"PET-TRE", "PET-MON"},
           removals={"PET-MON": "duplicate of PET-DEIR, agreed in chat 2 Sept"},
           expect_error=None, expect_warning="deliberately removed")
file_check("merged file with a group left out rejected",
           [{"id": "PET-TRE", "group": "C"}],
           merged=True, expect_error="contains no group A rows")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
