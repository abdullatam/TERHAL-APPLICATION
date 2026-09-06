#!/usr/bin/env python3
"""Finds candidate Commons photos for places that still have fewer than three.

    python scripts/find_images.py                 # every place under three
    python scripts/find_images.py PAM WUA DAJ     # just these
    python scripts/find_images.py --radius 4000   # widen the geosearch

Searches three ways, because filename search is what kept missing things:

  1. **Geosearch** — files geotagged within a radius of the place. This does not
     care what the file is called, which is how a photo filed under a name
     nobody guessed still turns up.
  2. **Category:Open Jordanian Heritage** — ~250 CC BY-SA photographs of
     Jordanian heritage sites, poorly indexed by keyword search, cross-matched
     against every place by coordinates.
  3. **Keyword search** on the English and Arabic names.

Candidates are filtered to free licences (NC and ND rejected outright) and to
files not already used, then printed with their distance from the place.

It writes nothing. Every candidate still has to be opened and checked the way
Dam3a3.md §4 describes — coordinates, eyeball, hash, read the file page — because
a geotag near a site is evidence, not proof. Photographers geotag from where
they stood, and two monuments 300 m apart in Petra are a different subject.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "data" / "landmark_images.csv"
API = "https://commons.wikimedia.org/w/api.php"
HERITAGE_CATEGORY = "Category:Open Jordanian Heritage"
USER_AGENT = "MaanProject-ImageFinder/1.0 (hackathon research; contact via repo)"

IMAGES_PER_PLACE = 3
# Dam3a3.md §4: over ~2.5 km is a different feature in the same landscape.
DEFAULT_RADIUS_M = 2500
FORBIDDEN = ("nc", "nd")
FREE_HINTS = ("cc0", "cc by", "cc-by", "public domain", "pd-")

# A file with no geotag cannot be distance-checked, and keyword search happily
# returns the wrong country: "Garden Tomb" surfaces Jerusalem's, not Petra's.
# So an ungeotagged candidate has to at least be filed under Jordan somewhere
# in its categories or title before it is worth a human opening it.
REGION_HINTS = (
    "jordan", "petra", "ma'an", "maan", "nabatean", "nabataean",
    "wadi musa", "shobak", "shawbak", "الأردن", "البتراء", "معان",
)


def call(params: dict) -> dict:
    """One API call, politely. Wikimedia throttles bulk access hard."""
    params = {**params, "format": "json", "formatversion": "2"}
    url = f"{API}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except Exception as exc:
            if attempt == 3:
                print(f"    (API call failed: {type(exc).__name__})")
                return {}
            time.sleep(5 * (attempt + 1))  # 429s need real backoff, not a token pause
    return {}


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def landmarks() -> dict:
    sys.path.insert(0, str(REPO / "backend"))
    from app.data.landmarks import LANDMARKS  # noqa: E402

    return LANDMARKS


def used_filenames() -> set[str]:
    """Files already in the CSV. The url column now holds a local path, so the
    original Commons name lives in notes as 'Self-hosted from <url>'."""
    used: set[str] = set()
    if not CSV_PATH.exists():
        return used
    for row in csv.DictReader(CSV_PATH.open(encoding="utf-8")):
        for field in (row.get("url") or "", row.get("notes") or ""):
            # \S+ not [^\s()]+ — plenty of Commons filenames contain brackets,
            # e.g. "Wu’era Castle (Interior).jpg", and stopping at the first
            # bracket truncates the name so the file looks unused.
            for match in re.findall(r"Special:FilePath/(\S+)", field):
                name = urllib.parse.unquote(match.rstrip(".,;")).replace("_", " ")
                used.add(name.strip())
    return used


def filled_counts() -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    if CSV_PATH.exists():
        for row in csv.DictReader(CSV_PATH.open(encoding="utf-8")):
            if (row.get("url") or "").strip():
                counts[row["landmark_id"]] += 1
    return counts


def licence_of(meta: dict) -> str:
    return (meta.get("LicenseShortName", {}).get("value") or "").strip()


def artist_of(meta: dict) -> str:
    raw = meta.get("Artist", {}).get("value") or ""
    return re.sub(r"<[^>]+>", "", raw).strip()


def is_free(licence: str) -> bool:
    normalised = licence.lower()
    if any(token in re.split(r"[\s\-]+", normalised) for token in FORBIDDEN):
        return False
    return any(hint in normalised for hint in FREE_HINTS)


CACHE_PATH = REPO / ".cache" / "commons_files.json"


def load_cache() -> dict[str, dict]:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_cache(cache: dict[str, dict]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache), encoding="utf-8")


_CACHE = load_cache()


def file_details(titles: list[str]) -> dict[str, dict]:
    """Licence, author, size and coordinates for a batch of files.

    Cached to disk: Wikimedia rate-limits hard enough that a long run loses
    batches to 429s, and without a cache every re-run starts from nothing.
    """
    out = {t: _CACHE[t] for t in titles if t in _CACHE}
    titles = [t for t in titles if t not in _CACHE]

    for i in range(0, len(titles), 40):
        batch = titles[i : i + 40]
        data = call({
            "action": "query",
            "titles": "|".join(batch),
            "prop": "imageinfo|coordinates|categories",
            "iiprop": "url|extmetadata|size",
            "cllimit": "max",
        })
        for page in data.get("query", {}).get("pages", []):
            if "missing" in page or not page.get("imageinfo"):
                continue
            info = page["imageinfo"][0]
            meta = info.get("extmetadata", {})
            coords = (page.get("coordinates") or [{}])[0]
            categories = " ".join(
                c.get("title", "") for c in (page.get("categories") or [])
            )
            out[page["title"]] = {
                "title": page["title"],
                "licence": licence_of(meta),
                "artist": artist_of(meta),
                "width": info.get("width"),
                "height": info.get("height"),
                "lat": coords.get("lat"),
                "lon": coords.get("lon"),
                "context": f"{page['title']} {categories}".lower(),
            }
            _CACHE[page["title"]] = out[page["title"]]
        save_cache(_CACHE)
        time.sleep(0.6)
    return out


def geosearch(lat: float, lon: float, radius: int) -> list[str]:
    data = call({
        "action": "query",
        "list": "geosearch",
        "gscoord": f"{lat}|{lon}",
        "gsradius": radius,
        "gsnamespace": 6,
        "gslimit": 60,
    })
    return [item["title"] for item in data.get("query", {}).get("geosearch", [])]


def keyword_search(term: str, limit: int = 20) -> list[str]:
    data = call({
        "action": "query",
        "list": "search",
        "srsearch": f'filetype:bitmap "{term}"',
        "srnamespace": 6,
        "srlimit": limit,
    })
    return [item["title"] for item in data.get("query", {}).get("search", [])]


def category_files(category: str) -> list[str]:
    titles, cont = [], None
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmtype": "file",
            "cmlimit": 500,
        }
        if cont:
            params["cmcontinue"] = cont
        data = call(params)
        titles += [m["title"] for m in data.get("query", {}).get("categorymembers", [])]
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            return titles
        time.sleep(0.4)


STOPWORDS = {
    "the", "of", "and", "in", "at", "a", "site", "town", "castle", "tomb",
    "museum", "roman", "fort", "neolithic", "visitor", "center", "centre",
}


def name_tokens(place) -> set[str]:
    """Distinctive words from a place's name, for judging whether a file is
    actually *of* it rather than merely photographed nearby."""
    raw = re.sub(r"\(.*?\)", " ", f"{place.name_en} {place.name_ar or ''}").lower()
    words = re.findall(r"[\w'’؀-ۿ]+", raw)
    return {w for w in words if len(w) > 3 and w not in STOPWORDS}


def report(place, candidates: list[dict], radius_km: float) -> None:
    print(f"\n{'=' * 78}\n{place.id}  {place.name_en}")
    if place.lat is None:
        print("  no coordinates on record — keyword search only, verify hard")
    if not candidates:
        print("  no free-licensed candidates found")
        return

    tokens = name_tokens(place)
    named, nearby = [], []
    for candidate in candidates:
        context = candidate.get("context", "")
        (named if any(token in context for token in tokens) else nearby).append(candidate)

    def by_distance(items):
        return sorted(items, key=lambda c: (c.get("km") is None, c.get("km") or 0))

    if named:
        print(f"\n  -- names the place ({len(named)}) — check these first")
        _print_group(by_distance(named))
    if nearby:
        # Everyone photographs everything at a visitor centre; proximity alone
        # says nothing about the subject, so these are capped and flagged.
        print(f"\n  -- nearby only, subject unverified ({len(nearby)}, showing 8)")
        _print_group(by_distance(nearby)[:8])


def _print_group(candidates: list[dict]) -> None:
    for candidate in candidates:
        distance = (f"{candidate['km']:.2f} km" if candidate.get("km") is not None
                    else "NO GEOTAG")
        size = (f"{candidate['width']}x{candidate['height']}"
                if candidate.get("width") else "?")
        name = candidate["title"].removeprefix("File:")
        print(f"  · {name}")
        print(f"      {candidate['licence']:16} {distance:>10}  {size:>11}  "
              f"via {candidate['how']}")
        if candidate.get("artist"):
            print(f"      by {candidate['artist'][:66]}")
        print("      https://commons.wikimedia.org/wiki/"
              f"{urllib.parse.quote(candidate['title'].replace(' ', '_'))}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*", help="landmark ids (default: all under three)")
    parser.add_argument("--radius", type=int, default=DEFAULT_RADIUS_M,
                        help=f"geosearch radius in metres (default {DEFAULT_RADIUS_M})")
    args = parser.parse_args()

    places = landmarks()
    counts = filled_counts()
    used = used_filenames()

    if args.ids:
        wanted = [places[i] for i in args.ids if i in places]
        missing = [i for i in args.ids if i not in places]
        for i in missing:
            print(f"(no landmark {i!r} in the dataset — skipping)")
    else:
        wanted = [p for p in places.values() if counts.get(p.id, 0) < IMAGES_PER_PLACE]

    if not wanted:
        print("Nothing under three images. Nothing to do.")
        return 0

    print(f"{len(wanted)} place(s) to search; {len(used)} files already in use.")

    # The heritage category, fetched once and matched against every place by
    # coordinates. Dam3a3.md calls it the highest-yield source for this region.
    print(f"\nEnumerating {HERITAGE_CATEGORY}...")
    heritage_titles = category_files(HERITAGE_CATEGORY)
    print(f"  {len(heritage_titles)} files")
    heritage = file_details(heritage_titles) if heritage_titles else {}
    geotagged = {t: d for t, d in heritage.items() if d.get("lat") is not None}
    print(f"  {len(geotagged)} of them geotagged")

    radius_km = args.radius / 1000
    for place in wanted:
        found: dict[str, dict] = {}

        def consider(details: dict, how: str) -> None:
            title = details["title"]
            bare = title.removeprefix("File:").replace("_", " ").strip()
            if bare in used or title in found:
                return
            if not is_free(details["licence"]):
                return
            km = None
            if place.lat is not None and details.get("lat") is not None:
                km = haversine_km((place.lat, place.lon), (details["lat"], details["lon"]))
                if km > radius_km:
                    return
            elif not any(hint in details.get("context", "") for hint in REGION_HINTS):
                # No geotag and nothing tying it to Jordan — almost certainly a
                # same-name place somewhere else.
                return
            found[title] = {**details, "km": km, "how": how}

        for details in geotagged.values():
            consider(details, "heritage category")

        if place.lat is not None:
            titles = [t for t in geosearch(place.lat, place.lon, args.radius)
                      if t not in found]
            for details in file_details(titles).values():
                consider(details, "geosearch")

        terms = [place.name_en.split("(")[0].strip()]
        if place.name_ar:
            terms.append(place.name_ar)
        for term in terms:
            titles = [t for t in keyword_search(term) if t not in found]
            for details in file_details(titles).values():
                consider(details, f"keyword {term!r}")

        report(place, list(found.values()), radius_km)
        time.sleep(0.5)

    print(f"\n{'=' * 78}")
    print("Candidates only — nothing was written. Verify each one against "
          "Dam3a3.md §4 (coordinates, eyeball, hash, read the file page) before "
          "putting it in data/landmark_images.csv.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
