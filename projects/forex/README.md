# Forex tools

Small Python scripts for pulling AUD/USD price data and news, and stitching
the results into a static HTML dashboard. No server — everything renders to
files you open in a browser.

## Scripts

- `forex_backtest.py` — per-second AUD/USD backtest against real Dukascopy
  tick data, with scheduled news events overlaid so you can see which
  release moved price. Needs network access.
- `build_lastweek_report.py` — coarser weekly review built from daily
  closes + a news timeline. No network needed, so it works as a fallback
  when the tick feed is blocked.
- `news_sentiment.py` — forward-looking scheduled events (ForexFactory
  calendar) and recent headlines (Google News RSS), each scored for a
  directional lean on the pair.
- `build_dashboard.py` — scans `forex_data/` for whatever the scripts above
  have produced and stitches it into a single `dashboard.html`.

## Usage

```bash
python3 build_lastweek_report.py     # daily backtest review, no network required
python3 forex_backtest.py            # per-second backtest, needs network
python3 news_sentiment.py            # forward news + sentiment, needs network
python3 build_dashboard.py           # combine everything into dashboard.html
```

Generated CSVs, charts, and reports are gitignored — rerun the scripts to
regenerate them.
