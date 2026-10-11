"""Build results/report.html from the scored results.

    python3 scripts/report.py

Reads results/dev/*.json, results/cascade.json and, once they exist,
results/heldout/*.json. Every number on the page comes from those files.
Sections with no data yet say so instead of showing placeholders.
"""

import html
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from systemone import TEAMS  # noqa: E402

RES = ROOT / "results"
FLOORS = {"uniform"}  # shown, but never called the winner


def load_dir(d):
    if not d.exists():
        return []
    return [json.loads(p.read_text()) for p in sorted(d.glob("*.json"))
            if p.name != "cascade.json"]


def e(x):
    return html.escape(str(x))


CSS = """
:root { --paper:#f6f3ec; --card:#fffdf8; --ink:#1d1b18; --muted:#6b645a; --rule:#d9d2c5;
  --stamp:#c2410c; --ok:#15803d; --tint:#fde7d9; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --paper:#16140f; --card:#1f1c16; --ink:#efe9de; --muted:#a59d90; --rule:#3a352c;
  --stamp:#fb923c; --ok:#4ade80; --tint:#3b2414; } }
* { box-sizing:border-box }
body { margin:0; background:var(--paper); color:var(--ink);
  font:15px/1.6 "IBM Plex Sans", system-ui, sans-serif; }
main { max-width:900px; margin:0 auto; padding:28px 16px 64px }
.ticket { background:var(--card); border:1px solid var(--rule); border-radius:4px;
  margin-top:18px; position:relative; }
.ticket > .stub { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;
  padding:8px 18px; border-bottom:1px dashed var(--rule);
  font:600 11px/1.4 "IBM Plex Mono", ui-monospace, monospace; letter-spacing:.08em;
  text-transform:uppercase; color:var(--muted) }
.ticket > .body { padding:16px 18px }
h1 { margin:6px 0 4px; font-size:clamp(1.7rem, 5vw, 2.5rem); line-height:1.1; letter-spacing:-.015em }
h2 { margin:0 0 8px; font-size:1.1rem }
.lede { font-size:1.15rem; margin:0 }
.stamp { display:inline-block; border:2px solid var(--stamp); color:var(--stamp);
  font:700 11px "IBM Plex Mono", monospace; letter-spacing:.1em; padding:2px 8px;
  text-transform:uppercase; transform:rotate(-2deg) }
.scroll { overflow-x:auto }
table { width:100%; border-collapse:collapse; font:13px "IBM Plex Mono", ui-monospace, monospace }
th, td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--rule); white-space:nowrap }
th { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted) }
tr.floor td { color:var(--muted) }
td.best { background:var(--tint); font-weight:700 }
.note { color:var(--muted); font-size:13px; margin:10px 0 0 }
.chart { background:#fff; border-radius:4px; padding:6px; overflow-x:auto }
.chart svg { width:100%; height:auto; min-width:640px; display:block }
img { max-width:100%; height:auto; background:#fff; border-radius:4px }
ul { margin:6px 0 0; padding-left:20px }
"""


def ticket(title, body):
    return (f'<section class="ticket"><div class="stub"><span>#{{n:02d}} {e(title)}</span>'
            f'</div><div class="body">{body}</div></section>')


def numbered(parts):
    out, n = [], 0
    for p in parts:
        if "{n:02d}" in p:
            n += 1
            p = p.replace("#{n:02d}", f"#{n:02d}")
        out.append(p)
    return "".join(out)


def best_cells(rows, key, low_is_good=False):
    real = [r for r in rows if r["adapter"] not in FLOORS]
    if not real:
        return None
    pick = min if low_is_good else max
    return pick(r[key] for r in real)


def results_table(rows):
    if not rows:
        return "<p>No runs yet.</p>"
    cols = [("urgent_accuracy", "Urgent", False), ("team_accuracy", "Team", False),
            ("frustration_mean_distance", "Frustration off by", True),
            ("seconds_median", "Median s", True)]
    best = {k: best_cells(rows, k, low) for k, _, low in cols}
    head = "".join(f"<th>{h}</th>" for _, h, _ in cols)
    out = [f"<div class=scroll><table><tr><th>Contender</th>{head}<th>Calibration error"
           f"<br>urgent / team / frust.</th><th>Machine</th><th>Cost per 1,000</th></tr>"]
    for r in rows:
        floor = r["adapter"] in FLOORS
        cells = []
        for k, _, _ in cols:
            v = r[k]
            fmt = f"{v:.4f}" if k == "seconds_median" else f"{v:.2f}"
            cls = ' class="best"' if not floor and v == best[k] and len(rows) > 2 else ""
            cells.append(f"<td{cls}>{fmt}</td>")
        c = r["calibration"]
        cost = "0, runs locally" if r["cost_per_1000"] == 0 else "from the bill"
        out.append(f'<tr class="{"floor" if floor else ""}"><td>{e(r["adapter"])}</td>'
                   + "".join(cells)
                   + f"<td>{c['is_urgent']['ece']:.2f} / {c['team']['ece']:.2f} / "
                     f"{c['frustration']['ece']:.2f}</td><td>{e(r['machine'])}</td>"
                     f"<td>{cost}</td></tr>")
    out.append("</table></div>")
    return "".join(out)


def by_team_table(rows):
    if not rows:
        return ""
    head = "".join(f"<th>{e(t)}</th>" for t in TEAMS)
    out = [f"<div class=scroll><table><tr><th>Contender</th>{head}</tr>"]
    for r in rows:
        by = r["team_accuracy_by_team"]
        cells = "".join(f"<td>{by[t]['right']}/{by[t]['of']}</td>" if t in by else "<td>-</td>"
                        for t in TEAMS)
        out.append(f'<tr class="{"floor" if r["adapter"] in FLOORS else ""}">'
                   f"<td>{e(r['adapter'])}</td>{cells}</tr>")
    out.append("</table></div>")
    return "".join(out)


def cascade_section():
    choice = RES / "cascade.json"
    held = RES / "heldout" / "cascade.json"
    if not choice.exists():
        return ("<p><span class=stamp>pending</span></p><p>The threshold is fixed from real model "
                "runs on the development set, which happen on the owner's Mac. The rule is "
                "already written down: the lowest threshold where urgent and team accuracy are "
                "both within 0.02 of the slow model alone.</p>")
    c = json.loads(choice.read_text())
    d = c["dev"]
    rows = [("Fast alone", d["fast_alone"]), ("Fast then slow", d["chosen"]),
            ("Slow alone", d["slow_alone"])]
    if held.exists():
        h = json.loads(held.read_text())
        rows += [("Held-out: fast then slow", h["cascade"]), ("Held-out: slow alone", h["slow_alone"])]
    trs = "".join(
        f"<tr><td>{n}</td><td>{s['handed_over']} ({s['handed_share']:.0%})</td>"
        f"<td>{s['urgent_accuracy']:.2f}</td><td>{s['team_accuracy']:.2f}</td>"
        f"<td>{s['seconds_total']:.1f}</td></tr>" for n, s in rows)
    verdict = "" if c["fast_helped"] else "<p><b>The fast model didn't help</b>: no threshold kept accuracy within 0.02 of the slow model.</p>"
    return (f"<p>Fast: <b>{e(c['fast'])}</b>, slow: <b>{e(c['slow'])}</b>, threshold fixed at "
            f"<b>{c['threshold']:.2f}</b> on {e(c['fixed_on'][:10])}.</p>{verdict}"
            f"<div class=scroll><table><tr><th></th><th>Handed over</th><th>Urgent</th>"
            f"<th>Team</th><th>Total seconds</th></tr>{trs}</table></div>")


def main():
    dev, held = load_dir(RES / "dev"), load_dir(RES / "heldout")
    real = [r for r in dev if r["adapter"] not in FLOORS and r["adapter"] != "rules"]
    machines = sorted({r["machine"] for r in dev + held})
    if held:
        lede = "Final numbers below are from the held-out set, scored once."
    elif real:
        lede = "Development-set numbers so far. The held-out set hasn't been scored yet."
    else:
        lede = ("Only the two offline contenders have run so far: keyword rules and an "
                "even-odds floor. The model runs happen on the owner's Mac.")
    svg = (RES / "dev" / "calibration.svg")
    chart = (f'<div class="chart">{svg.read_text()}</div>' if svg.exists() else "<p>No chart yet.</p>")

    parts = [
        f'<header class="ticket"><div class="stub"><span>Fast decision models, measured</span>'
        f'<span>{date.today().isoformat()} · {e(", ".join(machines) or "no runs")}</span></div>'
        f'<div class="body"><h1>Can a small, cheap model make routine support decisions, '
        f'and is its confidence honest?</h1><p class="lede">{e(lede)}</p></div></header>',
        ticket("The test", "<p>250 made-up support requests to a fictional software company "
               "(placeholder name Quillstack), labelled by written rules before any model saw them. "
               "Three questions each: <b>urgent?</b> (yes or no), <b>which team</b> (8 options), "
               "<b>how frustrated</b> (1 to 5). Hard cases on purpose: two problems in one message, "
               "sarcasm, very short messages, non-native English. 200 for development, 50 held out "
               "and scored once at the end.</p>"
               '<img src="../docs/diagrams/1-how-it-fits.svg" alt="How the test fits together">'),
        ticket("Results, development set", results_table(dev)
               + "<p class=note>Highlighted: best real contender in each column (the even-odds floor "
               "is shown for scale only). Frustration off by: average distance from the right level. "
               "Calibration error: the average gap between how sure a contender said it was and "
               "how often it was right; 0 is perfect. The rules were written while looking at this "
               "set, so their numbers here are optimistic.</p>"),
    ]
    if held:
        parts.append(ticket("Results, held-out set (scored once)", results_table(held)))
    parts += [
        ticket("Is the confidence honest?", chart
               + "<p class=note>Each dot is a group of answers with similar stated confidence. "
               "On the dashed line, a contender that says 80% is right 80% of the time. Above the "
               "line: more modest than it needs to be. Below: overconfident.</p>"),
        ticket("Which team, team by team", by_team_table(dev)),
        ticket("Fast then slow", '<img src="../docs/diagrams/2-fast-then-slow.svg" '
               'alt="Fast model first, unsure requests handed to the slow model">'
               + cascade_section()),
        ticket("Limits", "<ul><li>One author wrote and labelled every request in one sitting; "
               "a real queue is messier.</li><li>Only 9 requests are at frustration level 5.</li>"
               "<li>Speeds depend on the machine named next to each number.</li>"
               "<li>Jev is tested only if a key is supplied; nothing here claims to know how it "
               "works inside.</li><li>Every number comes from runs in this repo.</li></ul>"),
    ]
    page = (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>Decision models, measured</title>"
            f'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700'
            f'&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">'
            f"<style>{CSS}</style></head><body><main>{numbered(parts)}</main></body></html>\n")
    (RES / "report.html").write_text(page)
    print("results/report.html")


if __name__ == "__main__":
    main()
