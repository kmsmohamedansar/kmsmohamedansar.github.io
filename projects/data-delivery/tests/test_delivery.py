import json
import subprocess
import sys
from pathlib import Path

import duckdb
import pytest

from delivery import config
from delivery.config import ConfigError, load_customer, load_customers, week_bounds
from delivery.deliver import run_week
from delivery.load import _date, _num, load_week

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session", autouse=True)
def files():
    subprocess.run([sys.executable, "-m", "delivery.generate"], cwd=ROOT, check=True, capture_output=True)
    late = config.LANDING / "valley/2026-W39/sales.jsonl"
    late.unlink(missing_ok=True)  # the late file starts out missing
    yield


def test_settings_files_are_valid():
    names = [c.customer for c in load_customers()]
    assert {"northside", "harbour", "valley"} <= set(names)


def test_bad_settings_file_says_what_is_wrong(tmp_path):
    p = tmp_path / "x.yaml"
    p.write_text("customer: x\ndisplay_name: X\nfile_pattern: x.csv\nformat: csv\ndate_format: '%Y'\nexpected_rows: [1, 2]\ncolumns: {a: line_id}\n")
    with pytest.raises(ConfigError, match="must contain"):
        load_customer(p)
    p.write_text(p.read_text().replace("x.csv", "x-{week}.csv"))
    with pytest.raises(ConfigError, match="must map to exactly"):
        load_customer(p)


def test_number_and_date_formats():
    assert _num("12,50", ",") == 12.5 and _num("1.234,5", ",") == 1234.5 and _num("7.25", ".") == 7.25
    assert _date("31/12/2026", "%d/%m/%Y") == "2026-12-31" and _date("02-30-2026", "%m-%d-%Y") is None


def test_week_bounds():
    assert [d.isoformat() for d in week_bounds("2026-W38")] == ["2026-09-14", "2026-09-20"]


def test_reloading_a_week_never_doubles_rows(tmp_path):
    db = tmp_path / "w.duckdb"
    load_week("2026-W36", db)
    load_week("2026-W36", db)
    n = duckdb.connect(str(db)).execute("select count(*) from raw.sales where week = '2026-W36'").fetchone()[0]
    first = sum(r.rows for r in load_week("2026-W36", db))
    assert n == first


@pytest.mark.parametrize("week, expected", [
    ("2026-W36", []),
    ("2026-W38", [("Northside Pharmacy", "rejected")]),
    ("2026-W39", [("Valley Drug Co", "missing")]),
    ("2026-W40", [("Harbour Chemists", "one_row_per_order_line"), ("Valley Drug Co", "dates_inside_the_week")]),
    ("2026-W41", [("Northside Pharmacy", "row_count_in_normal_range")]),
])
def test_each_planted_problem_blocks_the_delivery_with_the_right_reason(tmp_path, week, expected):
    s = run_week(week, tmp_path / "w.duckdb", tmp_path / "out")
    assert sorted((a["customer"], a["check"]) for a in s["alerts"]) == expected
    assert s["status"] == ("delivered" if not expected else "blocked")
    assert (tmp_path / "out" / week / "weekly_sales.csv").exists() == (not expected)
    assert all(a["check_first"] for a in s["alerts"])


def test_exact_resent_rows_are_cleaned_not_blocked(tmp_path):
    subprocess.run([sys.executable, "-m", "delivery.generate", "--arrive"], cwd=ROOT, check=True, capture_output=True)
    try:
        s = run_week("2026-W39", tmp_path / "w.duckdb", tmp_path / "out")
        loaded = {l["customer"]: l["rows"] for l in s["loads"]}
        assert s["status"] == "delivered"
        assert loaded["harbour"] - s["rows_by_customer"]["harbour"] == 37
    finally:
        (config.LANDING / "valley/2026-W39/sales.jsonl").unlink(missing_ok=True)


@pytest.mark.parametrize("file, expected", [
    ("HARBOUR-2026-W37.txt", {"delimiter": ";", "decimal": ",", "date_format": "%d/%m/%Y", "file_pattern": "HARBOUR-{week}.txt"}),
    ("valley/2026-W37/sales.jsonl", {"format": "jsonl", "date_format": "%m-%d-%Y", "file_pattern": "valley/{week}/sales.jsonl"}),
    ("northside_sales_2026-W37.csv", {"delimiter": ",", "date_format": "%Y-%m-%d"}),
])
def test_onboarding_helper_drafts_the_same_settings_as_written_by_hand(tmp_path, file, expected):
    import yaml
    from delivery.onboard import draft

    text, notes = draft(config.LANDING / file, "x")
    got = yaml.safe_load(text)
    for k, v in expected.items():
        assert got[k] == v
    name = file.split("_")[0].split("-")[0].split("/")[0].lower()
    by_hand = load_customer(config.CUSTOMERS_DIR / f"{name if name != 'northside' else 'northside'}.yaml")
    assert got["columns"] == by_hand.columns


def test_onboarding_helper_warns_about_an_unusually_small_file():
    from delivery.onboard import draft

    _, notes = draft(config.LANDING / "northside_sales_2026-W37.csv", "x")
    assert any("look unusual" in n and "90" in n for n in notes)
