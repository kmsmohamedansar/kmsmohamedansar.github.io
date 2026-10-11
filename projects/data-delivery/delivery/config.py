"""Reads the customer settings files. Each customer is one YAML file in
customers/, saying how their file is named, shaped and dated. Adding a
customer means adding a file here, not changing code."""

from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import yaml

STANDARD = ["line_id", "store_id", "product_id", "sale_date", "units", "revenue"]
ROOT = Path(__file__).resolve().parent.parent
CUSTOMERS_DIR = ROOT / "customers"
LANDING = ROOT / "landing"
DELIVERED = ROOT / "delivered"
DB_PATH = ROOT / "warehouse.duckdb"


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Customer:
    customer: str
    display_name: str
    file_pattern: str
    format: str
    columns: dict
    date_format: str
    expected_rows: tuple
    delimiter: str = ","
    decimal: str = "."

    def file_for(self, week: str) -> Path:
        y, w = week.split("-W")
        return LANDING / self.file_pattern.format(week=week, year=y, wk=w)


def load_customer(path: Path) -> Customer:
    raw = yaml.safe_load(path.read_text()) or {}
    need = ["customer", "display_name", "file_pattern", "format", "columns", "date_format", "expected_rows"]
    missing = [k for k in need if k not in raw]
    if missing:
        raise ConfigError(f"{path.name}: missing {', '.join(missing)}")
    if raw["format"] not in ("csv", "jsonl"):
        raise ConfigError(f"{path.name}: format must be csv or jsonl, not {raw['format']!r}")
    if "{week}" not in raw["file_pattern"] and "{wk}" not in raw["file_pattern"]:
        raise ConfigError(f"{path.name}: file_pattern must contain {{week}} (like 2026-W41) or {{year}} and {{wk}} (2026 and 41)")
    mapped = sorted(raw["columns"].values())
    if mapped != sorted(STANDARD):
        raise ConfigError(f"{path.name}: columns must map to exactly {', '.join(STANDARD)}; got {', '.join(mapped)}")
    lo, hi = raw["expected_rows"]
    if not 0 < lo < hi:
        raise ConfigError(f"{path.name}: expected_rows must be [low, high] with 0 < low < high")
    return Customer(
        customer=str(raw["customer"]), display_name=raw["display_name"], file_pattern=raw["file_pattern"],
        format=raw["format"], columns=dict(raw["columns"]), date_format=raw["date_format"],
        expected_rows=(int(lo), int(hi)), delimiter=raw.get("delimiter", ","), decimal=raw.get("decimal", "."),
    )


def load_customers(folder: Path = CUSTOMERS_DIR) -> list:
    return [load_customer(p) for p in sorted(folder.glob("*.yaml")) if not p.name.startswith("_")]


def week_bounds(week: str) -> tuple:
    """'2026-W38' -> (Monday, Sunday) of that ISO week."""
    y, w = week.split("-W")
    monday = date.fromisocalendar(int(y), int(w), 1)
    return monday, monday + timedelta(days=6)
