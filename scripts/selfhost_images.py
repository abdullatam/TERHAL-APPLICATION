#!/usr/bin/env python3
"""Self-hosts any remotely-hosted landmark image into data/images/.

    python scripts/selfhost_images.py            # report what would move
    python scripts/selfhost_images.py --commit   # download and rewrite the CSV

Why this exists: Wikimedia rate-limits bulk access hard. Loading a deck of
cards fires a dozen image requests at once and Commons answers a good share of
them with HTTP 429 — verified, not theoretical. A demo that renders broken
images because someone else's CDN throttled us is not a risk worth carrying, so
every image gets served from this repo instead.

ATD04 did this for the 78 images sourced in the docs/tasks/ABD_TASKS.md pass
(e71cd8a).
This finishes the job for the Phase 1 hero images that were left pointing at
Commons, using exactly the same conventions:

  * path      data/images/<landmark_id>/<position>.<ext>
  * url       /images/<landmark_id>/<position>.<ext>
  * width     Commons originals fetched through the thumbnailer at width=1200,
              matching frontend/src/utils/images.js's sizedImage() convention,
              rather than pulling multi-megabyte full-resolution files
  * notes     "Self-hosted from <original url> (<n> KB)." so the licensing
              audit trail survives the move

Licence and attribution columns are never touched: self-hosting changes where
the bytes live, not who owns them.
"""
from __future__ import annotations

import argparse
import csv
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CSV_PATH = REPO / "data" / "landmark_images.csv"
IMAGES_DIR = REPO / "data" / "images"
THUMB_WIDTH = 1200
UA = "MaanProject/1.0 (hackathon; self-hosting our own licensed images)"

COMMONS_FILEPATH = "commons.wikimedia.org/wiki/Special:FilePath/"


def thumb_url(url: str) -> str:
    """Ask Commons' thumbnailer for a screen-sized copy, not the original."""
    if COMMONS_FILEPATH in url:
        joiner = "&" if "?" in url else "?"
        return f"{url}{joiner}width={THUMB_WIDTH}"
    return url


def extension_for(url: str, content_type: str) -> str:
    from_type = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(content_type.split(";")[0].strip())
    if from_type:
        return from_type
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


def fetch(url: str, attempts: int = 4) -> tuple[bytes, str]:
    """Fetch with backoff. A 429 here is the very thing we are fixing."""
    last = ""
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(thumb_url(url), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read(), resp.headers.get("Content-Type", "")
        except urllib.error.HTTPError as exc:
            last = f"HTTP {exc.code}"
            if exc.code in (429, 500, 502, 503, 504):
                time.sleep(8 * (attempt + 1))
                continue
            break
        except Exception as exc:  # network, DNS, timeout
            last = type(exc).__name__
            time.sleep(8 * (attempt + 1))
    raise RuntimeError(last or "unreachable")


def verify(data: bytes) -> str | None:
    """Confirm the bytes really are an image. Returns a reason if not."""
    if len(data) < 1024:
        return f"only {len(data)} bytes"
    try:
        from io import BytesIO

        from PIL import Image  # optional; skipped when unavailable

        with Image.open(BytesIO(data)) as img:
            img.verify()
        return None
    except ImportError:
        # No Pillow: fall back to magic numbers, which still catches an HTML
        # error page saved with a .jpg name.
        if data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n" or data[:4] == b"RIFF":
            return None
        return "not a JPEG/PNG/WebP by magic number"
    except Exception as exc:
        return f"{type(exc).__name__}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true",
                    help="download the files and rewrite the CSV")
    ap.add_argument("--pause", type=float, default=1.5,
                    help="seconds between downloads (default 1.5, to stay polite)")
    args = ap.parse_args()

    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames
        rows = list(reader)

    remote = [
        r for r in rows
        if r["url"].strip().startswith("http")
    ]
    print(f"{len(rows)} rows, {len(remote)} still hosted remotely")
    if not remote:
        print("Nothing to do — every image is already self-hosted.")
        return 0

    for row in remote:
        print(f"  {row['landmark_id']:9} pos{row['position']}  {row['url'][:64]}")

    if not args.commit:
        print("\nDry run. Re-run with --commit to download and rewrite the CSV.")
        return 0

    print()
    moved = failed = 0
    for row in remote:
        lid, pos, url = row["landmark_id"], row["position"], row["url"].strip()
        try:
            data, ctype = fetch(url)
        except RuntimeError as exc:
            print(f"  FAIL {lid:9} pos{pos}  download: {exc}")
            failed += 1
            continue

        problem = verify(data)
        if problem:
            print(f"  FAIL {lid:9} pos{pos}  {problem} — left pointing at the original")
            failed += 1
            continue

        ext = extension_for(url, ctype)
        dest_dir = IMAGES_DIR / lid
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{pos}{ext}"
        dest.write_bytes(data)

        kb = round(len(data) / 1024)
        row["url"] = f"/images/{lid}/{pos}{ext}"
        # Keep the provenance the licence audit depends on.
        row["notes"] = f"Self-hosted from {url} ({kb} KB)."
        print(f"  ok   {lid:9} pos{pos}  {kb:>5} KB -> {row['url']}")
        moved += 1
        time.sleep(args.pause)

    if moved:
        # Write via a temp file so an interrupted run cannot truncate the CSV.
        tmp = CSV_PATH.with_suffix(".csv.tmp")
        with tmp.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=header)
            writer.writeheader()
            writer.writerows(rows)
        shutil.move(str(tmp), str(CSV_PATH))
        print(f"\nSelf-hosted {moved} image(s); rewrote {CSV_PATH.name}.")
        print("Run scripts/load_images.py --commit to update the database.")
    if failed:
        print(f"{failed} left remote — rerun to retry those.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
