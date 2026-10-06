# F1 telemetry pull

Two small Python scripts for the days I want to look at Formula 1 data. They pull a session, or a car's telemetry, and save it locally so it's ready to explore.

## The scripts

**`f1_pull_data.py`** pulls a whole session through FastF1: laps, results, weather, track status and race control messages. It writes CSV files and an HTML report to `f1_data/`.

```bash
python3 f1_pull_data.py                    # 2026 Australia FP1, as CSV and HTML
python3 f1_pull_data.py 2026 Australia R    # 2026 Australia Race
python3 f1_pull_data.py 2026 1 FP1          # year, round number, session
```

**`f1_pull_car_data.py`** pulls car telemetry (`car_data`) for a session from the OpenF1 API. You can ask for every driver or just one.

```bash
python3 f1_pull_car_data.py                    # 2026 Australia FP1, all drivers
python3 f1_pull_car_data.py 11227              # one session_key
python3 f1_pull_car_data.py 11227 --driver 1   # one driver
```

## Good to know

`f1_pull_data.py` caches its FastF1 downloads in `cache/`, so running it a second time is fast. The cache and the pulled `f1_data/` output are both gitignored. Run the scripts again to regenerate them.
