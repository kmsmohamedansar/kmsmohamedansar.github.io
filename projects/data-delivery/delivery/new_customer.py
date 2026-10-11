"""Customer four: Lakeshore Pharmacy sends its first files, in a format the
pipeline hasn't seen (tab-separated, its own column names, dates like
14.09.2026). Onboarding them should need only a settings file.

  python -m delivery.new_customer        drop Lakeshore's files in landing/
Then copy customers/_template.yaml to customers/lakeshore.yaml, fill it in by
looking at the file, and run:  python -m delivery.deliver --week 2026-W41
"""

import csv
import random
from datetime import timedelta

from .config import LANDING, week_bounds
from .generate import PRODUCTS, WEEKS


def main() -> None:
    rng = random.Random("lakeshore-seed")
    for week in WEEKS:
        monday, _ = week_bounds(week)
        path = LANDING / "lakeshore" / f"LKS_{week.replace('-', '_')}.tsv"
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="") as f:
            w = csv.writer(f, delimiter="\t")
            w.writerow(["Receipt Line", "Shop", "Product Code", "Sold", "Pieces", "Total"])
            for i in range(300 + rng.randint(-30, 30)):
                units = rng.choice([1, 1, 2, 3])
                d = monday + timedelta(days=rng.randint(0, 6))
                w.writerow([f"LK{week[-2:]}-{i:04d}", f"LK{rng.randint(1, 4)}", rng.choice(PRODUCTS), d.strftime("%d.%m.%Y"), units, round(units * rng.uniform(2, 30), 2)])
    print(f"Lakeshore's files are in {LANDING / 'lakeshore'}. Have a look at one:")
    print(open(LANDING / "lakeshore" / "LKS_2026_W41.tsv").read().splitlines()[:3])


if __name__ == "__main__":
    main()
