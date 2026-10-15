#!/usr/bin/env python3
"""
Pull car_data from OpenF1 API (https://api.openf1.org/v1/car_data) and save to CSV.
Usage:
  .venv/bin/python3 f1_pull_car_data.py                    # 2026 Australia FP1, all drivers
  .venv/bin/python3 f1_pull_car_data.py 11227              # session_key 11227 only
  .venv/bin/python3 f1_pull_car_data.py 11227 --driver 1   # one driver (fewer rows, faster)
"""
import argparse
import json
import os
import sys

try:
    import requests
except ImportError:
    print("Install requests: .venv/bin/pip install requests")
    sys.exit(1)

API_BASE = "https://api.openf1.org/v1"
OUTPUT_DIR = "f1_data"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_sessions(year=2026, country_name="Australia"):
    r = requests.get(f"{API_BASE}/sessions", params={"year": year, "country_name": country_name}, timeout=30)
    r.raise_for_status()
    return r.json()


def get_car_data(session_key, driver_number=None, timeout=120):
    params = {"session_key": session_key}
    if driver_number is not None:
        params["driver_number"] = driver_number
    r = requests.get(f"{API_BASE}/car_data", params=params, timeout=timeout)
    # OpenF1 can occasionally return 502 for some sessions; surface it nicely.
    if r.status_code >= 400:
        raise RuntimeError(
            f"OpenF1 error {r.status_code} for car_data (session_key={session_key}, "
            f"driver={driver_number}). Response: {r.text[:200]}"
        )
    return r.json()


def main():
    parser = argparse.ArgumentParser(description="Pull OpenF1 car_data to CSV")
    parser.add_argument("session_key", nargs="?", type=int, default=None, help="e.g. 11227 for 2026 Australia FP1")
    parser.add_argument("--driver", type=int, default=None, help="Limit to one driver number (faster)")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--country", type=str, default="Australia")
    parser.add_argument("--session-name", type=str, default="Practice 1", help="e.g. 'Practice 1', 'Race'")
    args = parser.parse_args()

    session_key = args.session_key
    if session_key is None:
        sessions = get_sessions(year=args.year, country_name=args.country)
        for s in sessions:
            if s.get("session_name") == args.session_name:
                session_key = s["session_key"]
                print(f"Using session_key={session_key} ({s.get('session_name')})")
                break
        if session_key is None:
            print("Sessions found:", [s["session_name"] for s in sessions])
            print("Specify session_key or use --session-name")
            sys.exit(1)

    print(f"Fetching car_data for session_key={session_key}" + (f", driver={args.driver}" if args.driver else " (all drivers)") + "...")
    try:
        data = get_car_data(session_key, driver_number=args.driver)
    except Exception as e:
        print(str(e))
        print("\nTip: car_data is huge. Try limiting by driver and/or by time window (date filters).")
        print("Also note: some sessions intermittently return 502 from OpenF1; try again later.")
        sys.exit(1)
    if not data:
        print("No car_data returned (might be unavailable for this session).")
        sys.exit(0)

    # Save as JSON and CSV
    import pandas as pd
    df = pd.DataFrame(data)
    base = os.path.join(OUTPUT_DIR, f"car_data_session_{session_key}")
    if args.driver is not None:
        base += f"_driver_{args.driver}"
    json_path = base + ".json"
    csv_path = base + ".csv"
    with open(json_path, "w") as f:
        json.dump(data, f, indent=0)
    df.to_csv(csv_path, index=False)
    print(f"Rows: {len(df)}")
    print(f"Saved: {csv_path}")
    print(f"Saved: {json_path}")
    print("Columns:", list(df.columns))


if __name__ == "__main__":
    main()
