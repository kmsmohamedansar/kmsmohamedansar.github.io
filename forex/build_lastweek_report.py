#!/usr/bin/env python3
"""
Build an AUD/USD weekly review from REAL daily closes + a news timeline.

Coarse-grained companion to forex_backtest.py. No network needed, so it runs
anywhere even when the tick feed (Dukascopy) is blocked. Run forex_backtest.py
where the network is open for the true per-second version of the same picture.

Usage:
  python3 build_lastweek_report.py                                  # last week (default)
  python3 build_lastweek_report.py audusd_daily_thisweek.csv news_events_thisweek.csv
  python3 build_lastweek_report.py <daily_csv> <news_csv>

The output name is derived from the daily CSV stem, e.g.
  audusd_daily_thisweek.csv -> forex_data/audusd_thisweek_report.html (+ .png)
"""
import os
import sys
import datetime as dt

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "forex_data")
os.makedirs(OUT, exist_ok=True)

daily_csv = sys.argv[1] if len(sys.argv) > 1 else "audusd_daily_lastweek.csv"
news_csv = sys.argv[2] if len(sys.argv) > 2 else "news_events.csv"

# label/stem, e.g. "audusd_daily_thisweek" -> "thisweek"
stem = os.path.splitext(os.path.basename(daily_csv))[0].replace("audusd_daily_", "")
out_base = f"audusd_{stem}"

daily = pd.read_csv(os.path.join(HERE, daily_csv), parse_dates=["date"])
news = pd.read_csv(os.path.join(HERE, news_csv), parse_dates=["time"])

daily["chg_pips"] = (daily["close"].diff() / 0.0001).round(0)
week_move = (daily["close"].iloc[-1] - daily["close"].iloc[0]) / 0.0001
week_pct = (daily["close"].iloc[-1] / daily["close"].iloc[0] - 1) * 100
d0, d1 = daily["date"].iloc[0], daily["date"].iloc[-1]
in_progress = d1.date() >= dt.date.today()
title_range = f"{d0:%d %b} – {d1:%d %b %Y}"

# data-driven narrative pieces
moves = daily.dropna(subset=["chg_pips"])
big_up = moves.loc[moves["chg_pips"].idxmax()] if not moves.empty else None
big_dn = moves.loc[moves["chg_pips"].idxmin()] if not moves.empty else None
hi_news = news[news["impact"] == "High"]

fig, ax = plt.subplots(figsize=(11, 5))
ax.plot(daily["date"], daily["close"], "-o", color="#1f77b4", lw=2)
for _, r in daily.iterrows():
    ax.annotate(f"{r['close']:.5f}", (r["date"], r["close"]),
                textcoords="offset points", xytext=(0, 8), fontsize=9, ha="center")
for _, ev in news.iterrows():
    d = ev["time"].tz_localize(None).normalize() if ev["time"].tzinfo else ev["time"].normalize()
    if daily["date"].min() <= d <= daily["date"].max() and ev["impact"] == "High":
        ax.axvline(d, color="#d62728", ls="--", lw=1, alpha=0.6)
ax.set_title(f"AUD/USD daily close — {title_range}"
             + (" (in progress)" if in_progress else "") + " (source: search-verified)")
ax.set_ylabel("AUD/USD")
ax.grid(alpha=0.3)
fig.autofmt_xdate()
fig.tight_layout()
chart = os.path.join(OUT, f"{out_base}_chart.png")
fig.savefig(chart, dpi=120)
plt.close(fig)

html = os.path.join(OUT, f"{out_base}_report.html")
with open(html, "w") as f:
    f.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>AUD/USD review</title>")
    f.write("<style>body{font-family:sans-serif;margin:1.2rem;max-width:900px;line-height:1.5}"
            "table{border-collapse:collapse;margin:1rem 0}"
            "th,td{border:1px solid #ccc;padding:6px 10px;text-align:right}"
            "th{background:#eee}td:first-child,th:first-child{text-align:left}"
            "img{max-width:100%}.dn{color:#c0392b}.up{color:#1e8449}"
            ".note{background:#fff8e1;border-left:4px solid #f1c40f;padding:.6rem .9rem;margin:1rem 0}"
            "</style></head><body>")
    f.write(f"<h1>AUD/USD — review ({title_range}"
            + (", in progress" if in_progress else "") + ")</h1>")
    cls = "dn" if week_move < 0 else "up"
    span = "week so far" if in_progress else "week"
    f.write(f"<p>{span.capitalize()}: <b>{daily['close'].iloc[0]:.5f} → {daily['close'].iloc[-1]:.5f}</b> "
            f"(<span class='{cls}'>{week_move:+.0f} pips, {week_pct:+.2f}%</span>)</p>")
    f.write(f"<img src='{os.path.basename(chart)}'>")

    f.write("<h2>Daily path</h2><table><tr><th>Date</th><th>Close</th><th>Δ pips</th><th>What moved it</th></tr>")
    for _, r in daily.iterrows():
        chg = "" if pd.isna(r["chg_pips"]) else f"{r['chg_pips']:+.0f}"
        c = "dn" if (not pd.isna(r["chg_pips"]) and r["chg_pips"] < 0) else "up" if not pd.isna(r["chg_pips"]) else ""
        f.write(f"<tr><td>{r['date']:%a %d %b}</td><td>{r['close']:.5f}</td>"
                f"<td class='{c}'>{chg}</td><td style='text-align:left'>{r['note']}</td></tr>")
    f.write("</table>")

    f.write("<h2>News timeline (high-impact)</h2><table>"
            "<tr><th>When (UTC)</th><th>Ccy</th><th>Event</th><th>Actual</th><th>Forecast</th></tr>")
    for _, ev in hi_news.iterrows():
        act = ev["actual"] if pd.notna(ev.get("actual", "")) else ""
        fc = ev["forecast"] if pd.notna(ev.get("forecast", "")) else ""
        f.write(f"<tr><td>{ev['time']:%a %d %b %H:%M}</td><td>{ev['currency']}</td>"
                f"<td style='text-align:left'>{ev['event']}</td><td>{act}</td><td>{fc}</td></tr>")
    f.write("</table>")

    # data-driven read
    bits = [f"Over {title_range} AUD/USD moved <b>{week_move:+.0f} pips ({week_pct:+.2f}%)</b>."]
    if big_dn is not None and big_dn["chg_pips"] < 0:
        bits.append(f"Biggest down day: {big_dn['date']:%a %d %b} ({big_dn['chg_pips']:+.0f} pips) — {big_dn['note']}.")
    if big_up is not None and big_up["chg_pips"] > 0:
        bits.append(f"Biggest up day: {big_up['date']:%a %d %b} ({big_up['chg_pips']:+.0f} pips) — {big_up['note']}.")
    if not hi_news.empty:
        upcoming = hi_news[hi_news["time"].dt.tz_localize(None) >= pd.Timestamp(dt.date.today())] \
            if hi_news["time"].dt.tz is not None else hi_news
        names = ", ".join(hi_news["event"].head(4))
        bits.append(f"High-impact events in view: {names}.")
    f.write("<div class='note'><b>Read.</b> " + " ".join(bits) + "</div>")
    if in_progress:
        f.write("<div class='note' style='border-color:#e67e22;background:#fdf1e5'>"
                "<b>In progress.</b> This week is not finished — early-week intraday levels came "
                "from noisy live sources and are approximate. Values will firm up after the week closes."
                "</div>")
    f.write("<p style='color:#888;font-size:12px'>Daily closes are search-verified. "
            "For a true per-second breakdown, run <code>forex_backtest.py</code> on a machine with "
            "open network access to the Dukascopy tick feed.</p>")
    f.write("</body></html>")

print("wrote", html)
print(f"{stem}: {week_move:+.0f} pips ({week_pct:+.2f}%){' [in progress]' if in_progress else ''}")
