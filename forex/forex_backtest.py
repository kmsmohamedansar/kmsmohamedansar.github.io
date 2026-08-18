#!/usr/bin/env python3
"""
Per-second AUD/USD backtest with news overlay.

Pulls real tick data from Dukascopy (the only free source of sub-second forex
data), resamples it to 1-second bars, overlays scheduled economic-calendar
news events, and measures how price moved around each event so you can see
which news drove the up/down legs.

Usage:
  python3 forex_backtest.py                                  # AUDUSD, last completed Mon-Fri
  python3 forex_backtest.py AUDUSD 2026-06-22 2026-06-26     # symbol + date range (inclusive)
  python3 forex_backtest.py AUDUSD 2026-06-22 2026-06-26 news_events.csv

Notes:
  * Dukascopy publishes one LZMA-compressed .bi5 file per hour of tick data.
    Months in the URL are 0-indexed (Jan=00 ... Dec=11).
  * Forex has no ticks on the weekend; Sat/Sun are skipped automatically.
  * If your network blocks datafeed.dukascopy.com (some sandboxes do), run this
    on a machine with open outbound HTTPS. It caches downloads under cache/.

Outputs (into forex_data/):
  <base>_1s.csv            per-second OHLC of the mid price
  <base>_news_impact.csv   move around each news event (dir, pips, max excursion)
  <base>_report.html       chart + tables you can open in a browser
"""
import sys
import os
import struct
import lzma
import datetime as dt

import requests
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

CACHE_DIR = "cache"
OUTPUT_DIR = "forex_data"
BASE_URL = "https://datafeed.dukascopy.com/datafeed"
# price = raw_points / 10**decimals; AUDUSD & most majors quote to 5 dp.
DECIMALS = {"AUDUSD": 5, "EURUSD": 5, "GBPUSD": 5, "USDJPY": 3, "USDCHF": 5}
PIP = 0.0001  # 1 pip for a *USD-quoted pair

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def _hour_url(symbol, day, hour):
    # month is 0-indexed in Dukascopy paths
    return f"{BASE_URL}/{symbol}/{day.year}/{day.month - 1:02d}/{day.day:02d}/{hour:02d}h_ticks.bi5"


def _fetch_hour(symbol, day, hour):
    """Return raw (decompressed) bytes for one hour, cached on disk."""
    cache_path = os.path.join(
        CACHE_DIR, f"{symbol}_{day:%Y%m%d}_{hour:02d}h.bi5"
    )
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            return f.read()
    url = _hour_url(symbol, day, hour)
    resp = requests.get(url, timeout=30, headers={"User-Agent": "forex-backtest/1.0"})
    if resp.status_code == 404:
        return b""  # no data this hour (market closed / gap)
    resp.raise_for_status()
    with open(cache_path, "wb") as f:
        f.write(resp.content)
    return resp.content


def _parse_hour(raw, symbol, day, hour):
    """Decode one hour of .bi5 ticks -> list of (utc_datetime, ask, bid)."""
    if not raw:
        return []
    try:
        data = lzma.decompress(raw)
    except lzma.LZMAError:
        return []
    scale = 10 ** DECIMALS.get(symbol, 5)
    hour_start = dt.datetime(day.year, day.month, day.day, hour, tzinfo=dt.timezone.utc)
    out = []
    # each record: 5 big-endian fields = ms-offset, ask, bid, askvol, bidvol
    for ms, ask, bid, _av, _bv in struct.iter_unpack(">IIIff", data):
        ts = hour_start + dt.timedelta(milliseconds=ms)
        out.append((ts, ask / scale, bid / scale))
    return out


def load_ticks(symbol, start, end):
    """Download all ticks between two dates (inclusive) as a DataFrame."""
    rows = []
    day = start
    while day <= end:
        if day.weekday() < 5:  # skip Sat/Sun
            for hour in range(24):
                rows.extend(_parse_hour(_fetch_hour(symbol, day, hour), symbol, day, hour))
        day += dt.timedelta(days=1)
    if not rows:
        raise RuntimeError(
            "No ticks returned. Either the date range has no data yet, or "
            "outbound access to datafeed.dukascopy.com is blocked here — "
            "run this on a machine with open network access."
        )
    df = pd.DataFrame(rows, columns=["time", "ask", "bid"]).set_index("time")
    df["mid"] = (df["ask"] + df["bid"]) / 2
    return df


def to_per_second(ticks):
    """Resample raw ticks to 1-second OHLC of the mid price."""
    ohlc = ticks["mid"].resample("1s").ohlc().dropna()
    ohlc["ticks"] = ticks["mid"].resample("1s").count().reindex(ohlc.index)
    return ohlc


def load_news(path):
    if not path or not os.path.exists(path):
        return pd.DataFrame(columns=["time", "currency", "event", "impact"])
    news = pd.read_csv(path, parse_dates=["time"])
    if news["time"].dt.tz is None:
        news["time"] = news["time"].dt.tz_localize("UTC")
    return news.sort_values("time").reset_index(drop=True)


def news_impact(sec, news, pre_min=15, post_min=30):
    """For each event measure the pre->post move and intra-window excursion."""
    if sec.empty or news.empty:
        return pd.DataFrame()
    rows = []
    for _, ev in news.iterrows():
        t = ev["time"]
        window = sec.loc[t - pd.Timedelta(minutes=pre_min): t + pd.Timedelta(minutes=post_min)]
        if window.empty:
            continue
        before = sec.loc[:t]
        after = sec.loc[t:t + pd.Timedelta(minutes=post_min)]
        if before.empty or after.empty:
            continue
        p_at = before["close"].iloc[-1]
        p_end = after["close"].iloc[-1]
        move_pips = (p_end - p_at) / PIP
        hi = window["high"].max()
        lo = window["low"].min()
        rows.append({
            "time": t,
            "currency": ev.get("currency", ""),
            "event": ev.get("event", ""),
            "impact": ev.get("impact", ""),
            "price_at_event": round(p_at, 5),
            f"price_+{post_min}m": round(p_end, 5),
            "move_pips": round(move_pips, 1),
            "direction": "UP" if move_pips > 0 else "DOWN" if move_pips < 0 else "FLAT",
            "max_up_pips": round((hi - p_at) / PIP, 1),
            "max_down_pips": round((lo - p_at) / PIP, 1),
        })
    return pd.DataFrame(rows)


def build_report(symbol, sec, news, impact, base):
    # chart: per-second close with news markers
    fig, ax = plt.subplots(figsize=(13, 5.5))
    ax.plot(sec.index, sec["close"], lw=0.6, color="#1f77b4")
    for _, ev in news.iterrows():
        if sec.index.min() <= ev["time"] <= sec.index.max():
            ax.axvline(ev["time"], color="#d62728", ls="--", lw=0.8, alpha=0.7)
            ax.text(ev["time"], sec["close"].max(), f" {ev['event']}",
                    rotation=90, va="top", fontsize=7, color="#d62728")
    ax.set_title(f"{symbol} — per-second mid, {sec.index.min():%Y-%m-%d} to {sec.index.max():%Y-%m-%d} (UTC)")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d %H:%M"))
    ax.grid(alpha=0.25)
    fig.autofmt_xdate()
    chart = f"{base}_chart.png"
    fig.tight_layout()
    fig.savefig(chart, dpi=110)
    plt.close(fig)

    html = f"{base}_report.html"
    with open(html, "w") as f:
        f.write("<!DOCTYPE html><html><head><meta charset='utf-8'>")
        f.write(f"<title>{symbol} per-second backtest</title>")
        f.write("<style>body{font-family:sans-serif;margin:1.2rem;max-width:1100px}"
                "table{border-collapse:collapse;margin:1rem 0}"
                "th,td{border:1px solid #ccc;padding:5px 9px;text-align:right;font-size:13px}"
                "th{background:#eee}td:first-child,th:first-child{text-align:left}"
                "img{max-width:100%}</style></head><body>")
        f.write(f"<h1>{symbol} — per-second backtest with news overlay</h1>")
        f.write(f"<p>{sec.index.min():%Y-%m-%d %H:%M} → {sec.index.max():%Y-%m-%d %H:%M} UTC · "
                f"{len(sec):,} one-second bars from {int(sec['ticks'].sum()):,} ticks</p>")
        f.write(f"<img src='{os.path.basename(chart)}'>")
        f.write("<h2>News impact (move over the 30 min after each event)</h2>")
        f.write(impact.to_html(index=False) if not impact.empty
                else "<p>No news events matched the price window.</p>")
        f.write("</body></html>")
    return html, chart


def default_range():
    """Most recent completed Mon-Fri trading week."""
    today = dt.date.today()
    last_fri = today - dt.timedelta(days=(today.weekday() - 4) % 7 or 7)
    return last_fri - dt.timedelta(days=4), last_fri


def main():
    symbol = sys.argv[1] if len(sys.argv) > 1 else "AUDUSD"
    if len(sys.argv) > 3:
        start = dt.datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
        end = dt.datetime.strptime(sys.argv[3], "%Y-%m-%d").date()
    else:
        start, end = default_range()
    news_path = sys.argv[4] if len(sys.argv) > 4 else os.path.join(
        os.path.dirname(__file__), "news_events.csv")

    print(f"Backtesting {symbol}  {start} .. {end}")
    ticks = load_ticks(symbol, start, end)
    print(f"  {len(ticks):,} ticks")
    sec = to_per_second(ticks)
    news = load_news(news_path)
    impact = news_impact(sec, news)

    base = os.path.join(OUTPUT_DIR, f"{symbol}_{start}_{end}")
    sec.to_csv(f"{base}_1s.csv")
    if not impact.empty:
        impact.to_csv(f"{base}_news_impact.csv", index=False)
    html, chart = build_report(symbol, sec, news, impact, base)
    print(f"  per-second: {base}_1s.csv  ({len(sec):,} rows)")
    print(f"  news impact: {base}_news_impact.csv")
    print(f"  report:      {html}")


if __name__ == "__main__":
    main()
