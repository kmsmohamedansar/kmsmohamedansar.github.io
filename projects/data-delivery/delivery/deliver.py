"""One week's delivery, start to finish:

  1. load every customer's file (missing or wrong-shaped files are noted)
  2. clean and test with dbt
  3. deliver only if every customer loaded and every test passed;
     otherwise deliver nothing and write an alert saying which customer,
     which check, and what to look at first

  python -m delivery.deliver --week 2026-W38
  python -m delivery.deliver --all          every generated week, in order
"""

import argparse
import csv
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import duckdb

from .config import DB_PATH, DELIVERED, ROOT, load_customers
from .load import load_week

DBT_DIR = ROOT / "dbt_project"

# What to check first, for each way a delivery can fail. This is the short
# form of docs/RUNBOOK.md.
CHECK_FIRST = {
    "missing": "The file hasn't arrived. Check the customer's upload folder and ask whether it was sent. Rerun once it lands.",
    "rejected": "The file's columns don't match the settings file. Compare its header with customers/{customer}.yaml and ask the customer whether their export changed.",
    "one_row_per_order_line": "The same order line was sent twice with different values. Send the customer the line IDs below and ask which is right.",
    "dates_inside_the_week": "Some sales are dated outside the week. A wrong year usually means a typo or a date-format change at the source.",
    "row_count_in_normal_range": "The file is much smaller or bigger than usual. Small usually means a file cut short; ask for a resend.",
    "not_null": "Some rows have empty values. Empty dates usually mean the date format changed; compare with date_format in the settings file.",
}


def _dbt(week: str, db: Path) -> tuple:
    """Run dbt build for the week. Returns (ok, failed test names)."""
    env_db = {"WAREHOUSE_PATH": str(db)}
    cmd = [str(Path(sys.executable).with_name("dbt")), "build", "--profiles-dir", ".", "--vars", json.dumps({"week": week}), "--quiet"]
    import os

    proc = subprocess.run(cmd, cwd=DBT_DIR, env={**os.environ, **env_db}, capture_output=True, text=True)
    results = json.loads((DBT_DIR / "target" / "run_results.json").read_text())["results"]
    failed = [r["unique_id"].split(".")[2] for r in results if r["status"] in ("fail", "error")]
    return proc.returncode == 0 and not failed, failed


def _failures(db: Path, test: str) -> list:
    con = duckdb.connect(str(db), read_only=True)
    try:
        rows = con.execute(f"select * from test_failures.{test} limit 20").fetchall()
        cols = [d[0] for d in con.description]
    except duckdb.Error:
        rows, cols = [], []
    con.close()
    return [dict(zip(cols, r)) for r in rows]


def run_week(week: str, db: Path = DB_PATH, out: Path = DELIVERED) -> dict:
    t0 = time.perf_counter()
    customers = load_customers()
    names = {c.customer: c.display_name for c in customers}
    loads = load_week(week, db, customers)
    alerts = []
    for r in loads:
        if r.status != "loaded":
            alerts.append({"customer": names[r.customer], "check": r.status, "detail": r.detail,
                           "check_first": CHECK_FIRST[r.status].format(customer=r.customer)})
    ok, failed = _dbt(week, db)
    for test in failed:
        rows = _failures(db, test)
        who = sorted({names.get(r.get("customer"), r.get("customer")) for r in rows if r.get("customer")}) or ["all customers"]
        key = next((k for k in CHECK_FIRST if test.startswith(k)), "not_null")
        sample = ", ".join(str(r.get("line_id") or r.get("rows") or "") for r in rows[:5])
        for w in who:
            alerts.append({"customer": w, "check": test, "detail": f"{len(rows)} failing rows" + (f" (e.g. {sample})" if sample else ""), "check_first": CHECK_FIRST[key]})

    week_dir = out / week
    week_dir.mkdir(parents=True, exist_ok=True)
    delivered = not alerts
    counts = {}
    if delivered:
        con = duckdb.connect(str(db), read_only=True)
        rows = con.execute("select * from delivery.weekly_sales order by customer, line_id").fetchall()
        cols = [d[0] for d in con.description]
        counts = dict(con.execute("select customer, count(*) from delivery.weekly_sales group by 1 order by 1").fetchall())
        con.close()
        with (week_dir / "weekly_sales.csv").open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(cols)
            w.writerows(rows)
    else:
        (week_dir / "weekly_sales.csv").unlink(missing_ok=True)
    status = {"week": week, "status": "delivered" if delivered else "blocked", "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "seconds": round(time.perf_counter() - t0, 1), "loads": [r.__dict__ for r in loads], "rows_by_customer": counts, "alerts": alerts}
    (week_dir / "status.json").write_text(json.dumps(status, indent=2, default=str))
    return status


def main() -> None:
    from .board import write_board
    from .generate import WEEKS

    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--week")
    g.add_argument("--all", action="store_true")
    args = ap.parse_args()
    for week in WEEKS if args.all else [args.week]:
        s = run_week(week)
        print(f"{week}: {s['status'].upper()} in {s['seconds']}s" + "".join(f"\n   {a['customer']}: {a['check']}. {a['detail']}" for a in s["alerts"]))
    print(f"Board: {write_board()}")


if __name__ == "__main__":
    main()
