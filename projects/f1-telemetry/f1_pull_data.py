#!/usr/bin/env python3
"""
Pull FastF1 session data and save for viewing.
Usage:
  python3 f1_pull_data.py                    # 2026 Australia FP1 → CSV + HTML
  python3 f1_pull_data.py 2026 Australia R  # 2026 Australia Race
  python3 f1_pull_data.py 2026 1 FP1       # year, round number, session
"""
import sys
import os

import fastf1
import pandas as pd

# Use cache so repeat runs are fast
CACHE_DIR = "cache"
OUTPUT_DIR = "f1_data"
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

fastf1.Cache.enable_cache(CACHE_DIR)


def get_session(year, location_or_round, session_name):
    """Get session: location can be 'Australia' or round number 1, 2, ..."""
    try:
        round_num = int(location_or_round)
        session = fastf1.get_session(year, round_num, session_name)
    except ValueError:
        session = fastf1.get_session(year, location_or_round, session_name)
    return session


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    location = sys.argv[2] if len(sys.argv) > 2 else "Australia"
    session_name = sys.argv[3] if len(sys.argv) > 3 else "FP1"

    print(f"Loading {year} {location} {session_name}...")
    session = get_session(year, location, session_name)
    session.load(laps=True, telemetry=False, weather=True, messages=True)

    base = f"{year}_{location.replace(' ', '_')}_{session_name}"
    base = os.path.join(OUTPUT_DIR, base)

    # 1) Export laps to CSV (main data)
    laps_file = f"{base}_laps.csv"
    session.laps.to_csv(laps_file, index=False)
    print(f"  Laps:     {laps_file}  ({len(session.laps)} rows)")

    # 2) Export results (driver list, positions)
    results_file = f"{base}_results.csv"
    session.results.to_csv(results_file, index=False)
    print(f"  Results:  {results_file}")

    # 3) Export weather
    weather_file = f"{base}_weather.csv"
    session.weather_data.to_csv(weather_file, index=False)
    print(f"  Weather:  {weather_file}")

    # 4) Export race control messages
    rcm_file = f"{base}_race_control.csv"
    session.race_control_messages.to_csv(rcm_file, index=False)
    print(f"  Messages: {rcm_file}")

    # 5) Export track status
    track_file = f"{base}_track_status.csv"
    session.track_status.to_csv(track_file, index=False)
    print(f"  Track:    {track_file}")

    # 6) Simple HTML report for browser viewing
    html_file = f"{base}_report.html"
    with open(html_file, "w") as f:
        f.write("<!DOCTYPE html><html><head><meta charset='utf-8'>")
        f.write("<title>F1 Session Data – {} {} {}</title>".format(year, location, session_name))
        f.write("<style>body{font-family:sans-serif;margin:1rem;} table{border-collapse:collapse;} th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;} th{background:#eee;}</style>")
        f.write("</head><body>")
        f.write("<h1>{} – {} {}</h1>".format(session.event.get("EventName", ""), location, session_name))
        f.write("<p>Laps: {} | Drivers: {} | Files: {}_*.csv in folder <code>{}</code></p>".format(
            len(session.laps), len(session.drivers), base, OUTPUT_DIR))
        f.write("<h2>Results</h2>")
        f.write(session.results.head(25).to_html(index=False, classes="results"))
        f.write("<h2>Laps (first 50)</h2>")
        f.write(session.laps.head(50).to_html(index=False, classes="laps"))
        f.write("<h2>Weather (first 20)</h2>")
        f.write(session.weather_data.head(20).to_html(index=False))
        f.write("</body></html>")
    print(f"  Report:   {html_file}  (open in browser)")

    print(f"\nDone. Open the CSV files in Excel/Sheets, or open {html_file} in a browser.")


if __name__ == "__main__":
    main()
