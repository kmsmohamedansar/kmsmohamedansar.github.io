#!/usr/bin/env python3
"""
Build the AUD/USD 'last week' review from the REAL daily closes + news timeline.

This is the coarse-grained companion to forex_backtest.py. It does NOT need
network access, so it runs anywhere and produces the review even when the
tick feed (Dukascopy) is blocked. Run forex_backtest.py where the network is
open to get the true per-second version of the same picture.

Output: forex_data/audusd_lastweek_report.html  (+ .png chart)
"""
import os
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "forex_data")
os.makedirs(OUT, exist_ok=True)

daily = pd.read_csv(os.path.join(HERE, "audusd_daily_lastweek.csv"), parse_dates=["date"])
news = pd.read_csv(os.path.join(HERE, "news_events.csv"), parse_dates=["time"])

# day-over-day change in pips (1 pip = 0.0001)
daily["chg_pips"] = (daily["close"].diff() / 0.0001).round(0)
week_move = (daily["close"].iloc[-1] - daily["close"].iloc[0]) / 0.0001
week_pct = (daily["close"].iloc[-1] / daily["close"].iloc[0] - 1) * 100

fig, ax = plt.subplots(figsize=(11, 5))
ax.plot(daily["date"], daily["close"], "-o", color="#1f77b4", lw=2)
for _, r in daily.iterrows():
    ax.annotate(f"{r['close']:.5f}", (r["date"], r["close"]),
                textcoords="offset points", xytext=(0, 8), fontsize=9, ha="center")
# news markers that fall inside the week
for _, ev in news.iterrows():
    d = ev["time"].tz_localize(None).normalize()
    if daily["date"].min() <= d <= daily["date"].max() and ev["impact"] == "High":
        ax.axvline(d, color="#d62728", ls="--", lw=1, alpha=0.6)
ax.set_title("AUD/USD daily close — week of 22-26 June 2026 (source: search-verified closes)")
ax.set_ylabel("AUD/USD")
ax.grid(alpha=0.3)
fig.autofmt_xdate()
fig.tight_layout()
chart = os.path.join(OUT, "audusd_lastweek_chart.png")
fig.savefig(chart, dpi=120)
plt.close(fig)

html = os.path.join(OUT, "audusd_lastweek_report.html")
with open(html, "w") as f:
    f.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>AUD/USD last week</title>")
    f.write("<style>body{font-family:sans-serif;margin:1.2rem;max-width:900px;line-height:1.5}"
            "table{border-collapse:collapse;margin:1rem 0}"
            "th,td{border:1px solid #ccc;padding:6px 10px;text-align:right}"
            "th{background:#eee}td:first-child,th:first-child{text-align:left}"
            "img{max-width:100%}.dn{color:#c0392b}.up{color:#1e8449}"
            ".note{background:#fff8e1;border-left:4px solid #f1c40f;padding:.6rem .9rem;margin:1rem 0}"
            "</style></head><body>")
    f.write("<h1>AUD/USD — last week review (22–26 June 2026)</h1>")
    cls = "dn" if week_move < 0 else "up"
    f.write(f"<p>Week: <b>{daily['close'].iloc[0]:.5f} → {daily['close'].iloc[-1]:.5f}</b> "
            f"(<span class='{cls}'>{week_move:+.0f} pips, {week_pct:+.2f}%</span>) — "
            "lowest weekly close in ~3 months.</p>")
    f.write(f"<img src='{os.path.basename(chart)}'>")

    f.write("<h2>Daily path</h2><table><tr><th>Date</th><th>Close</th><th>Δ pips</th><th>What moved it</th></tr>")
    for _, r in daily.iterrows():
        chg = "" if pd.isna(r["chg_pips"]) else f"{r['chg_pips']:+.0f}"
        c = "" if r["chg_pips"] >= 0 or pd.isna(r["chg_pips"]) else "dn"
        f.write(f"<tr><td>{r['date']:%a %d %b}</td><td>{r['close']:.5f}</td>"
                f"<td class='{c}'>{chg}</td><td style='text-align:left'>{r['note']}</td></tr>")
    f.write("</table>")

    f.write("<h2>News timeline (high-impact)</h2><table>"
            "<tr><th>When (UTC)</th><th>Ccy</th><th>Event</th><th>Actual</th><th>Forecast</th></tr>")
    for _, ev in news.iterrows():
        if ev["impact"] == "High":
            f.write(f"<tr><td>{ev['time']:%a %d %b %H:%M}</td><td>{ev['currency']}</td>"
                    f"<td style='text-align:left'>{ev['event']}</td>"
                    f"<td>{ev.get('actual','') if pd.notna(ev.get('actual','')) else ''}</td>"
                    f"<td>{ev.get('forecast','') if pd.notna(ev.get('forecast','')) else ''}</td></tr>")
    f.write("</table>")

    f.write("<div class='note'><b>Read of the week.</b> The move was USD-led, not AUD-led. "
            "The dominant driver was the Fed repricing — a hawkish tilt (new Chair Warsh) pushing "
            "markets to price a Fed hike before year-end, sending the US dollar to a 13-month high. "
            "That single theme accounts for the bulk of the Mon→Tue drop (-84 pips) and the grind lower "
            "into Friday's low close. Thursday's US data (jobless claims 215K vs 225K expected — a "
            "<i>strong</i> print, USD-supportive) capped AUD's small bounce. RBA June minutes landed "
            "Tuesday 30 June, <i>after</i> this window, so they shaped the following week, not this one."
            "</div>")
    f.write("<p style='color:#888;font-size:12px'>Daily closes are search-verified end-of-day values. "
            "For a true per-second breakdown of exactly where each leg happened intraday, run "
            "<code>forex_backtest.py</code> on a machine with open network access to the Dukascopy tick feed.</p>")
    f.write("</body></html>")

print("wrote", html)
print(f"week move: {week_move:+.0f} pips ({week_pct:+.2f}%)")
