# F1 telemetry pull

Python scripts for pulling Formula 1 session data and saving it locally for
viewing.

## Scripts

- `f1_pull_data.py` — pulls a FastF1 session (laps, results, weather, track
  status, race control) and writes CSV + an HTML report to `f1_data/`.
  ```bash
  python3 f1_pull_data.py                    # 2026 Australia FP1 -> CSV + HTML
  python3 f1_pull_data.py 2026 Australia R    # 2026 Australia Race
  python3 f1_pull_data.py 2026 1 FP1          # year, round number, session
  ```
- `f1_pull_car_data.py` — pulls car telemetry (`car_data`) from the OpenF1
  API for a session, optionally filtered to one driver.
  ```bash
  python3 f1_pull_car_data.py                    # 2026 Australia FP1, all drivers
  python3 f1_pull_car_data.py 11227              # one session_key
  python3 f1_pull_car_data.py 11227 --driver 1   # one driver
  ```

`f1_pull_data.py` caches FastF1 downloads in `cache/` so repeat runs are
fast. Both `cache/` and the pulled `f1_data/` output are gitignored —
rerun the scripts to regenerate them.
