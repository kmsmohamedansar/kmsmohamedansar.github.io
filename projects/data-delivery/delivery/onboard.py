"""Drafts a settings file for a new customer by reading one of their files.

  python -m delivery.onboard landing/lakeshore/LKS_2026_W37.tsv --name lakeshore

It works out the delimiter, decimal mark, date format, which of their columns
means what, the file naming pattern and a normal row count, and writes
customers/<name>.yaml with a note on every guess. A person checks it, then
runs the delivery. (The blank template was too hard to fill in cold; this was
added after the first onboarding attempt.)
"""

import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path

from .config import CUSTOMERS_DIR, LANDING, STANDARD

HINTS = {
    "line_id": ["line", "receipt", "transaction", "ref", "order", "id"],
    "store_id": ["store", "shop", "branch", "location", "site"],
    "product_id": ["product", "sku", "item", "article"],
    "sale_date": ["date", "sold", "day"],
    "units": ["qty", "quantity", "units", "pieces", "count", "pcs"],
    "revenue": ["total", "amount", "value", "revenue", "net", "sales"],
}
DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y", "%m-%d-%Y", "%d-%m-%Y", "%Y/%m/%d"]


def _rows(path: Path):
    text = path.read_text()
    if path.suffix == ".jsonl":
        recs = [json.loads(l) for l in text.splitlines() if l.strip()]
        return "jsonl", None, list(recs[0]), [[str(r[k]) for k in recs[0]] for r in recs]
    dialect = csv.Sniffer().sniff(text[:5000], delimiters=",;\t|")
    rows = list(csv.reader(text.splitlines(), delimiter=dialect.delimiter))
    return "csv", dialect.delimiter, rows[0], rows[1:]


def _date_format(values):
    for fmt in DATE_FORMATS:
        try:
            for v in values[:200]:
                datetime.strptime(v, fmt)
            return fmt
        except ValueError:
            continue
    return None


def draft(path: Path, name: str) -> tuple:
    fmt, delim, header, rows = _rows(path)
    cols = list(zip(*rows)) if rows else [[] for _ in header]
    notes, mapping = [], {}
    date_cols = {h: _date_format(list(c)) for h, c in zip(header, cols)}
    numeric = {h: all(re.fullmatch(r"-?\d+([.,]\d+)?", v) for v in c[:200]) for h, c in zip(header, cols)}
    for field in STANDARD:
        cands = [h for h in header if h not in mapping and any(k in h.lower() for k in HINTS[field])]
        if field == "sale_date":
            cands = [h for h in header if date_cols[h] and h not in mapping] or cands
        if field in ("units", "revenue"):
            cands = [h for h in cands if numeric[h]] or [h for h in header if numeric[h] and h not in mapping]
        if field == "units":
            cands = [h for h in cands if all("." not in v and "," not in v for v in dict(zip(header, cols))[h][:200])] or cands
        if cands:
            mapping[cands[0]] = field
        else:
            notes.append(f"Couldn't tell which column is {field}; fill it in.")
    date_col = next((h for h, f in mapping.items() if f == "sale_date"), None)
    date_fmt = date_cols.get(date_col) or "%Y-%m-%d"
    amounts = [v for h, c in zip(header, cols) if mapping.get(h) == "revenue" for v in c[:200]]
    decimal = "," if any("," in v for v in amounts) else "."
    m = re.search(r"(\d{4})([-_]?)W(\d{2})", path.as_posix())
    rel = path.resolve().relative_to(LANDING.resolve()).as_posix()
    if m:
        pattern = rel.replace(m.group(0), "{year}" + m.group(2) + "W{wk}") if m.group(2) != "-" else rel.replace(m.group(0), "{week}")
    else:
        pattern = rel
        notes.append("Couldn't find the week in the file name; put {week} (or {year} and {wk}) where it goes.")
    sizes = [sum(1 for _ in p.open()) - (0 if fmt == "jsonl" else 1) for p in path.parent.glob("*" + path.suffix)] or [len(rows)]
    typical = sorted(sizes)[len(sizes) // 2]  # the middle file, so one odd week can't stretch the range
    lo, hi = int(typical * 0.7), int(typical * 1.3) + 1
    odd = [n for n in sizes if not lo <= n <= hi]
    if odd:
        notes.append(f"Some files look unusual ({', '.join(map(str, odd))} rows against a typical {typical}). Check them before trusting the range.")
    lines = [
        f"# Drafted by delivery.onboard from {rel}. Check every line, then run the delivery.",
        f"customer: {name}",
        f"display_name: {name.replace('_', ' ').title()}   # how it shows on the board; change if you like",
        f'file_pattern: "{pattern}"',
        f"format: {fmt}",
    ]
    if fmt == "csv":
        lines.append(f'delimiter: "{chr(92) + "t" if delim == chr(9) else delim}"')
    lines += [f'decimal: "{decimal}"', f'date_format: "{date_fmt}"   # read from the {date_col!r} column, e.g. {cols[header.index(date_col)][0] if date_col else "?"}', "columns:"]
    for h in header:
        if h in mapping:
            lines.append(f"  {h}: {mapping[h]}")
    lines.append(f"expected_rows: [{lo}, {hi}]   # a typical file has {typical} rows; allows 30% either way")
    unused = [h for h in header if h not in mapping]
    if unused:
        notes.append(f"Not used: {', '.join(unused)}.")
    return "\n".join(lines) + "\n", notes


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=Path)
    ap.add_argument("--name", required=True, help="short lowercase name, e.g. lakeshore")
    args = ap.parse_args()
    text, notes = draft(args.file, args.name)
    out = CUSTOMERS_DIR / f"{args.name}.yaml"
    out.write_text(text)
    print(text)
    for n in notes:
        print("NOTE:", n)
    print(f"Saved {out}. Check it, then: python -m delivery.deliver --week 2026-W37")


if __name__ == "__main__":
    main()
