"""Creates six weeks of made-up sales files for the three pharmacies, in their
own formats, with realistic mess planted on purpose. The same seed always
gives the same files, so anyone can recreate them.

  python -m delivery.generate            write weeks 2026-W36 to W41
  python -m delivery.generate --arrive   the late file finally arrives

Planted problems (the runbook covers each):
  W38 Northside   an extra column appears mid-header, so every column shifts
  W39 Harbour     37 rows sent twice (exact duplicates: safe to clean)
  W39 Valley      the file is late: missing at Monday's run
  W40 Harbour     12 order lines sent twice with different amounts
  W40 Valley      a handful of rows dated 2062
  W41 Northside   a partial file: 90 rows instead of about 1,000
"""

import argparse
import csv
import json
import random
from datetime import timedelta

from .config import LANDING, load_customers, week_bounds

WEEKS = [f"2026-W{w}" for w in range(36, 42)]
LATE = ("valley", "2026-W39")
STORES = {"northside": [f"N{i:02d}" for i in range(1, 9)], "harbour": [f"H-{i}" for i in range(10, 16)], "valley": [f"VD{i}" for i in range(100, 105)]}
SIZE = {"northside": 1000, "harbour": 600, "valley": 420}
PRODUCTS = [f"P{n:05d}" for n in range(1, 401)]


def make_rows(cust: str, week: str, rng: random.Random) -> list:
    monday, _ = week_bounds(week)
    n = SIZE[cust] + rng.randint(-60, 60)
    if (cust, week) == ("northside", "2026-W41"):
        n = 90
    rows = []
    for i in range(n):
        units = rng.choice([1, 1, 1, 2, 2, 3, 4, 6])
        price = round(rng.uniform(1.5, 39.0), 2)
        d = monday + timedelta(days=rng.randint(0, 6))
        rows.append({"line_id": f"{cust[:2].upper()}{week[-2:]}{i:05d}", "store_id": rng.choice(STORES[cust]),
                     "product_id": rng.choice(PRODUCTS), "sale_date": d, "units": units, "revenue": round(units * price, 2)})
    if (cust, week) == ("harbour", "2026-W39"):
        rows += [dict(r) for r in rng.sample(rows, 37)]
    if (cust, week) == ("harbour", "2026-W40"):
        rows += [dict(r, revenue=round(r["revenue"] * 1.5, 2)) for r in rng.sample(rows, 12)]
    if (cust, week) == ("valley", "2026-W40"):
        for r in rng.sample(rows, 6):
            r["sale_date"] = r["sale_date"].replace(year=2062)
    rng.shuffle(rows)
    return rows


def write(cust, week: str, rows: list) -> None:
    path = cust.file_for(week)
    path.parent.mkdir(parents=True, exist_ok=True)
    theirs = {v: k for k, v in cust.columns.items()}
    out = [{theirs[k]: (r[k].strftime(cust.date_format) if k == "sale_date" else r[k]) for k in r} for r in rows]
    if cust.format == "jsonl":
        path.write_text("".join(json.dumps(o) + "\n" for o in out))
        return
    header = list(theirs.values())
    if (cust.customer, week) == ("northside", "2026-W38"):
        header.insert(2, "PromoFlag")  # the shifted-columns week
        for o in out:
            o["PromoFlag"] = "N"
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header, delimiter=cust.delimiter)
        w.writeheader()
        for o in out:
            if cust.decimal == ",":
                o = {k: (str(v).replace(".", ",") if isinstance(v, float) else v) for k, v in o.items()}
            w.writerow(o)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arrive", action="store_true", help="deliver the late file")
    args = ap.parse_args()
    for cust in load_customers():
        if cust.customer not in SIZE:
            continue  # customers added later bring their own files
        rng = random.Random(f"{cust.customer}-seed")
        for week in WEEKS:
            rows = make_rows(cust.customer, week, rng)
            late = (cust.customer, week) == LATE
            if late != args.arrive:
                if late:  # a fresh run starts with the late file not yet sent
                    cust.file_for(week).unlink(missing_ok=True)
                continue
            write(cust, week, rows)
            print(f"wrote {cust.file_for(week).relative_to(LANDING.parent)} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
