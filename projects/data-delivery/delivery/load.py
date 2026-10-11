"""Loads one week of customer files into the warehouse's raw table.

For each customer it finds the file, checks the header matches the settings
file, maps their column names to ours, reads their date and number formats,
and writes the rows to raw.sales. Reloading a week replaces it (so a rerun
never doubles anything). A file that's missing or the wrong shape is not
loaded, and the reason is recorded.
"""

import csv
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone

import duckdb

from .config import DB_PATH, LANDING, Customer, load_customers


@dataclass
class LoadResult:
    customer: str
    week: str
    status: str  # loaded | missing | rejected
    rows: int = 0
    detail: str = ""
    file: str = ""
    problems: list = field(default_factory=list)


def _read(cust: Customer, path) -> tuple:
    """Return (header, records) in the customer's own column names."""
    if cust.format == "jsonl":
        recs = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        header = list(recs[0].keys()) if recs else []
        return header, recs
    with path.open(newline="") as f:
        r = csv.DictReader(f, delimiter=cust.delimiter)
        return list(r.fieldnames or []), list(r)


def _num(v, decimal: str):
    if v is None or v == "":
        return None
    s = str(v)
    if decimal == ",":
        s = s.replace(".", "").replace(",", ".")
    return float(s)


def _date(v, fmt: str):
    try:
        return datetime.strptime(str(v), fmt).date().isoformat()
    except ValueError:
        return None


def ensure_schema(con) -> None:
    con.execute("CREATE SCHEMA IF NOT EXISTS raw")
    con.execute("""CREATE TABLE IF NOT EXISTS raw.sales (
        customer VARCHAR, week VARCHAR, line_id VARCHAR, store_id VARCHAR, product_id VARCHAR,
        sale_date VARCHAR, units DOUBLE, revenue DOUBLE, source_file VARCHAR, loaded_at TIMESTAMP)""")
    con.execute("""CREATE TABLE IF NOT EXISTS raw.expectations (
        customer VARCHAR PRIMARY KEY, display_name VARCHAR, min_rows INTEGER, max_rows INTEGER)""")
    con.execute("""CREATE TABLE IF NOT EXISTS raw.load_log (
        customer VARCHAR, week VARCHAR, status VARCHAR, rows INTEGER, detail VARCHAR, logged_at TIMESTAMP)""")


def load_week(week: str, db=DB_PATH, customers=None) -> list:
    customers = customers if customers is not None else load_customers()
    con = duckdb.connect(str(db))
    ensure_schema(con)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    results = []
    for c in customers:
        con.execute("INSERT OR REPLACE INTO raw.expectations VALUES (?, ?, ?, ?)", [c.customer, c.display_name, *c.expected_rows])
        con.execute("DELETE FROM raw.sales WHERE customer = ? AND week = ?", [c.customer, week])
        path = c.file_for(week)
        res = LoadResult(c.customer, week, "missing", file=str(path.name))
        if not path.exists():
            res.detail = f"No file yet: landing/{path.relative_to(LANDING).as_posix()}"
        else:
            header, recs = _read(c, path)
            expected = list(c.columns.keys())
            extra, absent = [h for h in header if h not in expected], [h for h in expected if h not in header]
            if extra or absent:
                res.status = "rejected"
                res.detail = "Header doesn't match the settings file." + (f" Unexpected: {', '.join(extra)}." if extra else "") + (f" Missing: {', '.join(absent)}." if absent else "")
            else:
                ours = {k: v for k, v in c.columns.items()}
                rows = []
                for r in recs:
                    m = {ours[k]: r.get(k) for k in ours}
                    rows.append((c.customer, week, str(m["line_id"]), str(m["store_id"]), str(m["product_id"]),
                                 _date(m["sale_date"], c.date_format), _num(m["units"], c.decimal), _num(m["revenue"], c.decimal), path.name, now))
                con.executemany("INSERT INTO raw.sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
                res.status, res.rows = "loaded", len(rows)
                bad_dates = sum(1 for r in rows if r[5] is None)
                res.detail = f"{len(rows)} rows" + (f", {bad_dates} unreadable dates" if bad_dates else "")
        con.execute("INSERT INTO raw.load_log VALUES (?, ?, ?, ?, ?, ?)", [c.customer, week, res.status, res.rows, res.detail, now])
        results.append(res)
    con.close()
    return results

