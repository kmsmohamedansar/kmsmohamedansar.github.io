#!/usr/bin/env python3
"""
Forward-looking news + sentiment for a forex pair (default AUD/USD).

Two feeds, both free and keyless:
  1. Upcoming scheduled events  -> ForexFactory calendar (faireconomy mirror)
  2. Recent news headlines       -> Google News RSS

Each item gets a directional lean for the PAIR (uptrend / downtrend):
  * Scheduled events can't be scored on 'actual' before release, so they get a
    conditional lean (what a beat vs a miss would mean) plus an impact weight.
  * Headlines get a lexicon sentiment score, mapped to the pair via which
    currency the headline is about (AUD-positive => pair up; USD-positive =>
    pair down).

Finally it prints a single NET LEAN for the pair from the recent headlines.

Usage:
  python3 news_sentiment.py                       # AUDUSD, this week + recent news
  python3 news_sentiment.py AUDUSD --week next     # next week's calendar
  python3 news_sentiment.py EURUSD                 # any *USD major
  python3 news_sentiment.py --selftest             # run offline on bundled samples

Network note: nfs.faireconomy.media and news.google.com must be reachable.
Some sandboxes block outbound HTTPS; run locally if so. Outputs go to forex_data/.
"""
import sys
import os
import re
import json
import html
import datetime as dt
import xml.etree.ElementTree as ET

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "forex_data")
os.makedirs(OUT, exist_ok=True)

CAL_URL = "https://nfs.faireconomy.media/ff_calendar_{week}.json"  # thisweek / nextweek
NEWS_URL = "https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"

# ---------------------------------------------------------------------------
# Sentiment lexicon (finance-tuned). score sign = good/bad for the *currency*
# the headline is about; magnitude is a rough strength.
# ---------------------------------------------------------------------------
POS_WORDS = {
    "hawkish": 1.0, "hike": 0.8, "hikes": 0.8, "rate hike": 1.0, "tightening": 0.8,
    "beats": 0.8, "beat": 0.8, "strong": 0.7, "stronger": 0.7, "surges": 1.0,
    "surge": 1.0, "jumps": 0.9, "jump": 0.9, "rally": 0.9, "rallies": 0.9,
    "rises": 0.6, "gains": 0.7, "climbs": 0.7, "soars": 1.0, "robust": 0.7,
    "upbeat": 0.6, "outperform": 0.7, "resilient": 0.5, "boost": 0.6,
    "higher": 0.4, "rebounds": 0.7, "optimism": 0.6, "bullish": 0.9,
    "accelerates": 0.6, "expands": 0.5, "record high": 0.8,
}
NEG_WORDS = {
    "dovish": -1.0, "cut": -0.8, "cuts": -0.8, "rate cut": -1.0, "easing": -0.7,
    "misses": -0.8, "miss": -0.8, "weak": -0.7, "weaker": -0.7, "slumps": -1.0,
    "slump": -1.0, "plunges": -1.0, "plunge": -1.0, "falls": -0.7, "drops": -0.7,
    "tumbles": -0.9, "tumble": -0.9, "slides": -0.7, "sinks": -0.9, "recession": -1.0,
    "downbeat": -0.6, "bearish": -0.9, "selloff": -0.9, "sell-off": -0.9,
    "lower": -0.4, "declines": -0.6, "contracts": -0.6, "fears": -0.6,
    "slowdown": -0.7, "downturn": -0.8, "pressure": -0.4, "record low": -0.8,
    "worse": -0.6, "disappointing": -0.7, "gloom": -0.6,
}
# events whose 'higher actual' is BAD for the currency (invert the beat=strong rule)
INVERTED_EVENTS = ("unemployment rate", "jobless", "claims", "inflation expectations")

AUD_TERMS = ("aud", "aussie", "australia", "rba", "australian dollar", "reserve bank of australia")
USD_TERMS = ("usd", "dollar", "greenback", "fed", "fomc", "u.s.", "us ", "united states", "powell", "warsh", "treasury")
IMPACT_WEIGHT = {"High": 3, "Medium": 2, "Low": 1, "Holiday": 0, "": 1, None: 1}


def score_headline(text):
    """Return (score in ~[-1,1], list of matched terms) for the currency subject."""
    t = " " + text.lower() + " "
    score, hits = 0.0, []
    for phrase, w in {**POS_WORDS, **NEG_WORDS}.items():
        if phrase in t:
            score += w
            hits.append(phrase)
    # squash to [-1, 1]
    score = max(-1.0, min(1.0, score))
    return round(score, 3), hits


def subject_currency(text, base, quote):
    """Which leg of the pair is the headline mostly about? -> 'base'/'quote'/'pair'."""
    t = text.lower()
    # If the headline names the pair itself, the sentiment verb describes the
    # pair directly (e.g. "AUD/USD slumps ...") — don't attribute it to a leg.
    if f"{base.lower()}/{quote.lower()}" in t or f"{base.lower()}{quote.lower()}" in t:
        return "pair"
    a = sum(term in t for term in AUD_TERMS) if base == "AUD" else 0
    u = sum(term in t for term in USD_TERMS) if quote == "USD" else 0
    # generic: also allow base/quote codes directly
    a += t.count(base.lower())
    u += t.count(quote.lower())
    if a == 0 and u == 0:
        return "pair"
    return "base" if a >= u else "quote"


def headline_to_pair(text, base="AUD", quote="USD"):
    """Map a headline's currency sentiment to a pair direction."""
    score, hits = score_headline(text)
    subj = subject_currency(text, base, quote)
    if subj == "quote":       # good news for USD => pair (AUD/USD) down
        pair_score = -score
    else:                      # base or whole-pair => same sign
        pair_score = score
    direction = "UP" if pair_score > 0.15 else "DOWN" if pair_score < -0.15 else "NEUTRAL"
    return {"currency_score": score, "subject": subj, "pair_score": round(pair_score, 3),
            "direction": direction, "matched": ", ".join(hits)}


def event_lean(currency, title, base="AUD", quote="USD"):
    """Conditional directional lean of a scheduled event on the pair."""
    inverted = any(k in title.lower() for k in INVERTED_EVENTS)
    if currency == base:
        beat_dir, miss_dir = "UP", "DOWN"
    elif currency == quote:
        beat_dir, miss_dir = "DOWN", "UP"
    else:
        return {"relevant": False, "if_beat": "-", "if_miss": "-"}
    if inverted:
        beat_dir, miss_dir = miss_dir, beat_dir
    return {"relevant": True, "if_beat": beat_dir, "if_miss": miss_dir}


# ---------------------------------------------------------------------------
# Fetch layer (network). Kept thin so the logic above is testable offline.
# ---------------------------------------------------------------------------
def _get(url):
    import requests
    r = requests.get(url, timeout=30, headers={"User-Agent": "forex-news-sentiment/1.0"})
    r.raise_for_status()
    return r


def fetch_calendar(base, quote, week="thisweek"):
    data = _get(CAL_URL.format(week=week)).json()
    rows = []
    for e in data:
        if e.get("country") not in (base, quote):
            continue
        title = e.get("title", "")
        lean = event_lean(e.get("country"), title, base, quote)
        if not lean["relevant"]:
            continue
        rows.append({
            "time": e.get("date", ""),
            "currency": e.get("country", ""),
            "event": title,
            "impact": e.get("impact", ""),
            "forecast": e.get("forecast", ""),
            "previous": e.get("previous", ""),
            "weight": IMPACT_WEIGHT.get(e.get("impact"), 1),
            "if_beats": lean["if_beat"],
            "if_misses": lean["if_miss"],
        })
    return pd.DataFrame(rows)


def _parse_rss(xml_text, base, quote, limit=25):
    root = ET.fromstring(xml_text)
    rows = []
    for item in root.iter("item"):
        title = html.unescape((item.findtext("title") or "").strip())
        if not title:
            continue
        link = item.findtext("link") or ""
        pub = item.findtext("pubDate") or ""
        src_el = item.find("source")
        source = src_el.text if src_el is not None and src_el.text else ""
        m = headline_to_pair(title, base, quote)
        rows.append({"time": pub, "source": source, "headline": title,
                     "direction": m["direction"], "pair_score": m["pair_score"],
                     "subject": m["subject"], "matched": m["matched"], "link": link})
        if len(rows) >= limit:
            break
    return pd.DataFrame(rows)


def fetch_news(base, quote):
    q = f"{base}%2F{quote}%20OR%20{base}{quote}%20OR%20RBA%20OR%20Fed%20forex"
    return _parse_rss(_get(NEWS_URL.format(q=q)).text, base, quote)


# ---------------------------------------------------------------------------
def net_lean(news):
    if news.empty:
        return "NEUTRAL", 0.0
    s = news["pair_score"].sum()
    label = "UPTREND" if s > 0.3 else "DOWNTREND" if s < -0.3 else "NEUTRAL"
    return label, round(s, 2)


def build_report(pair, cal, news, lean_label, lean_sum, base_out):
    def color(d):
        return {"UP": "#1e8449", "DOWN": "#c0392b", "UPTREND": "#1e8449",
                "DOWNTREND": "#c0392b"}.get(d, "#7f8c8d")
    html_path = base_out + "_report.html"
    with open(html_path, "w") as f:
        f.write("<!DOCTYPE html><html><head><meta charset='utf-8'>")
        f.write(f"<title>{pair} news &amp; sentiment</title>")
        f.write("<style>body{font-family:sans-serif;margin:1.2rem;max-width:1000px;line-height:1.5}"
                "table{border-collapse:collapse;margin:.8rem 0;width:100%}"
                "th,td{border:1px solid #ccc;padding:5px 9px;font-size:13px;text-align:left}"
                "th{background:#eee}.up{color:#1e8449;font-weight:bold}.dn{color:#c0392b;font-weight:bold}"
                ".nz{color:#7f8c8d}.gauge{font-size:1.4rem;padding:.6rem 1rem;border-radius:8px;"
                "display:inline-block;color:#fff}</style></head><body>")
        f.write(f"<h1>{pair} — news &amp; forward sentiment</h1>")
        f.write(f"<p>Generated {dt.datetime.now():%Y-%m-%d %H:%M}</p>")
        f.write(f"<p>Net lean from recent headlines: "
                f"<span class='gauge' style='background:{color(lean_label)}'>"
                f"{lean_label} ({lean_sum:+.2f})</span></p>")

        f.write("<h2>Upcoming scheduled events</h2>")
        if cal.empty:
            f.write("<p>No relevant events in the window.</p>")
        else:
            f.write("<table><tr><th>When</th><th>Ccy</th><th>Event</th><th>Impact</th>"
                    "<th>Forecast</th><th>Previous</th><th>If beats</th><th>If misses</th></tr>")
            for _, r in cal.iterrows():
                f.write(f"<tr><td>{r['time']}</td><td>{r['currency']}</td><td>{html.escape(str(r['event']))}</td>"
                        f"<td>{r['impact']}</td><td>{r['forecast']}</td><td>{r['previous']}</td>"
                        f"<td class='{'up' if r['if_beats']=='UP' else 'dn'}'>{r['if_beats']}</td>"
                        f"<td class='{'up' if r['if_misses']=='UP' else 'dn'}'>{r['if_misses']}</td></tr>")
            f.write("</table>")

        f.write("<h2>Recent headlines</h2>")
        if news.empty:
            f.write("<p>No headlines.</p>")
        else:
            f.write("<table><tr><th>Headline</th><th>Source</th><th>Subject</th>"
                    "<th>Lean</th><th>Score</th></tr>")
            for _, r in news.iterrows():
                cls = "up" if r["direction"] == "UP" else "dn" if r["direction"] == "DOWN" else "nz"
                link = html.escape(str(r.get("link", "")))
                head = html.escape(str(r["headline"]))
                cell = f"<a href='{link}'>{head}</a>" if link else head
                f.write(f"<tr><td>{cell}</td><td>{html.escape(str(r['source']))}</td>"
                        f"<td>{r['subject']}</td><td class='{cls}'>{r['direction']}</td>"
                        f"<td>{r['pair_score']:+.2f}</td></tr>")
            f.write("</table>")
        f.write("<p class='nz' style='font-size:12px'>Event leans are conditional (a beat vs a "
                "miss vs forecast); they are not predictions. Headline sentiment is lexicon-based "
                "and directional, not financial advice.</p></body></html>")
    return html_path


def run(pair, week):
    base, quote = pair[:3], pair[3:]
    cal = fetch_calendar(base, quote, week)
    news = fetch_news(base, quote)
    lean_label, lean_sum = net_lean(news)
    base_out = os.path.join(OUT, f"{pair}_news_{dt.date.today()}")
    if not cal.empty:
        cal.to_csv(base_out + "_calendar.csv", index=False)
    if not news.empty:
        news.to_csv(base_out + "_headlines.csv", index=False)
    report = build_report(pair, cal, news, lean_label, lean_sum, base_out)
    print(f"{pair}: {len(cal)} events, {len(news)} headlines")
    print(f"net lean: {lean_label} ({lean_sum:+.2f})")
    print(f"report:   {report}")


def selftest():
    """Verify the scoring/mapping logic offline with bundled fixtures."""
    base, quote = "AUD", "USD"
    cases = [
        ("Fed's Warsh signals hawkish hike, dollar surges to 13-month high", "DOWN"),
        ("RBA turns hawkish, Aussie dollar rallies on rate hike bets", "UP"),
        ("AUD/USD slumps as US jobless claims beat expectations", "DOWN"),
        ("Australian jobs data disappoints, AUD tumbles", "DOWN"),
        ("Weak US GDP misses forecast, greenback slides", "UP"),
    ]
    print("== headline mapping ==")
    ok = 0
    for text, expect in cases:
        m = headline_to_pair(text, base, quote)
        flag = "OK " if m["direction"] == expect else "XX "
        ok += m["direction"] == expect
        print(f"  {flag}[{m['direction']:<7} {m['pair_score']:+.2f} subj={m['subject']:<5}] {text}")
    print(f"  {ok}/{len(cases)} matched expectation")

    print("== event leans (AUDUSD) ==")
    for ccy, title in [("USD", "Core PCE Price Index"), ("USD", "Initial Jobless Claims"),
                       ("AUD", "Employment Change"), ("AUD", "Unemployment Rate")]:
        l = event_lean(ccy, title, base, quote)
        print(f"  {ccy:<3} {title:<26} beat->{l['if_beat']:<4} miss->{l['if_miss']}")

    # exercise the RSS parser + report builder on a tiny sample (no network)
    sample_rss = """<?xml version='1.0'?><rss><channel>
      <item><title>Dollar surges as Fed turns hawkish</title>
        <source>Reuters</source><pubDate>Wed, 01 Jul 2026 10:00:00 GMT</pubDate>
        <link>http://example.com/a</link></item>
      <item><title>Aussie dollar rallies after strong Australian jobs</title>
        <source>Bloomberg</source><pubDate>Wed, 01 Jul 2026 09:00:00 GMT</pubDate>
        <link>http://example.com/b</link></item>
    </channel></rss>"""
    news = _parse_rss(sample_rss, base, quote)
    cal = pd.DataFrame([{"time": "Thu 02 Jul 12:30", "currency": "USD",
                         "event": "Core PCE Price Index", "impact": "High",
                         "forecast": "0.2%", "previous": "0.1%", "weight": 3,
                         "if_beats": "DOWN", "if_misses": "UP"}])
    label, s = net_lean(news)
    report = build_report("AUDUSD", cal, news, label, s, os.path.join(OUT, "AUDUSD_news_selftest"))
    print(f"== report ==\n  net lean {label} ({s:+.2f}); wrote {report}")


def main():
    args = [a for a in sys.argv[1:]]
    if "--selftest" in args:
        selftest()
        return
    week = "thisweek"
    if "--week" in args:
        i = args.index("--week")
        week = "nextweek" if args[i + 1] == "next" else "thisweek"
        del args[i:i + 2]
    pair = args[0].upper() if args else "AUDUSD"
    run(pair, week)


if __name__ == "__main__":
    main()
