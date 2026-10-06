# Forex tools

A few small Python scripts for pulling AUD/USD prices and news, then stitching everything into one static dashboard. There's no server. It all ends up as files you open in a browser.

I wanted to see which news releases actually move a currency pair, so each script answers one part of that question.

## The scripts

- **`forex_backtest.py`** runs a per second backtest on real Dukascopy tick data, with scheduled news events laid over the top so you can see which release moved the price. It needs network access.
- **`build_lastweek_report.py`** is a coarser weekly review, built from daily closes and a news timeline. It needs no network, so it works as a fallback when the tick feed is blocked.
- **`news_sentiment.py`** looks ahead. It reads upcoming scheduled events (from the ForexFactory calendar) and recent headlines (from Google News RSS), and scores each one for which way it leans on the pair.
- **`build_dashboard.py`** scans the `forex_data/` folder for whatever the other scripts have produced, and puts it together into a single `dashboard.html`.

## How to use them

```bash
python3 build_lastweek_report.py     # weekly review, no network needed
python3 forex_backtest.py            # per second backtest, needs network
python3 news_sentiment.py            # upcoming news and sentiment, needs network
python3 build_dashboard.py           # combine everything into dashboard.html
```

The generated CSVs, charts and reports are gitignored. Run the scripts again to regenerate them.
