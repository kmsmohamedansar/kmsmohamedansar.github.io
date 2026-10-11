"""Downloads grocery products from Open Food Facts, a free, open database
of food products (https://world.openfoodfacts.org, ODbL licence).

Run on a computer with internet access:  python -m catalogue.fetch
Writes data/raw/products.csv. Takes about 10 minutes, because Open Food
Facts asks for no more than 10 searches a minute.
"""

import csv
import re
import sys
import time
from pathlib import Path

import requests

from .categories import CATEGORIES, TAG_TO_NAME

API = "https://world.openfoodfacts.org/api/v2/search"
COUNTRIES = ["en:united-kingdom", "en:united-states", "en:canada"]
PAGES = 2
PAGE_SIZE = 100
PAUSE_S = 6.5  # stays under 10 searches a minute
HEADERS = {"User-Agent": "catalogue-checker/0.1 (portfolio project; contact via GitHub kmsmohamedansar)"}
OUT = Path("data/raw/products.csv")


def clean_name(p: dict) -> str:
    name = (p.get("product_name_en") or p.get("product_name") or "").strip()
    name = re.sub(r"\s+", " ", name)
    return name


def looks_usable(name: str) -> bool:
    # English-looking text of a sensible length. Accents are fine.
    return 3 <= len(name) <= 120 and re.search(r"[a-zA-Z]{3}", name) is not None and name.isascii()


def keep(p: dict, searched: str):
    """Keep a product only if it sits in exactly one of our 15 categories,
    so the label we compare against is unambiguous."""
    ours = {TAG_TO_NAME[t] for t in p.get("categories_tags", []) if t in TAG_TO_NAME}
    name = clean_name(p)
    if ours != {searched} or not looks_usable(name):
        return None
    return {"code": p.get("code", ""), "name": name, "brand": (p.get("brands") or "").split(",")[0].strip(), "category": searched}


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows, seen, calls = [], set(), 0
    for cat, info in CATEGORIES.items():
        for country in COUNTRIES:
            for page in range(1, PAGES + 1):
                params = {
                    "categories_tags": info["tag"], "countries_tags": country, "page": page, "page_size": PAGE_SIZE,
                    "fields": "code,product_name,product_name_en,brands,categories_tags", "sort_by": "unique_scans_n",
                }
                for attempt in range(3):
                    try:
                        r = requests.get(API, params=params, headers=HEADERS, timeout=60)
                        r.raise_for_status()
                        products = r.json().get("products", [])
                        break
                    except requests.RequestException as e:
                        print(f"  retry {attempt + 1} after error: {e}", file=sys.stderr)
                        time.sleep(15)
                else:
                    products = []
                calls += 1
                kept = 0
                for p in products:
                    row = keep(p, cat)
                    key = (row or {}).get("code") or (row or {}).get("name")
                    if row and key not in seen:
                        seen.add(key)
                        rows.append(row)
                        kept += 1
                print(f"{cat:18} {country:18} page {page}: {len(products):3} found, {kept:3} kept  (total {len(rows)})")
                time.sleep(PAUSE_S)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["code", "name", "brand", "category"])
        w.writeheader()
        w.writerows(rows)
    print(f"\nSaved {len(rows)} products to {OUT} after {calls} searches.")


if __name__ == "__main__":
    main()
