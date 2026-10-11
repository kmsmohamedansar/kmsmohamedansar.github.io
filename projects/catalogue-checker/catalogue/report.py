"""Charts and a plain-English summary from the saved results."""

import json
from pathlib import Path

import pandas as pd

INK, MUTED, GRID, HUE = "#0b1220", "#5b6474", "#e3e7ee", "#2a6fdb"


def _style(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(GRID)
    ax.tick_params(colors=MUTED, labelsize=9)
    ax.grid(color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)


def speed_vs_catch(ev: dict, path: Path) -> None:
    """One dot per checker: how fast (across) against how many of its 50 most
    suspicious products are real errors (up). Every checker catches nearly all
    planted errors somewhere in its flags, so the top 50 is what separates them."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7.5, 4.2), dpi=160)
    _style(ax)
    pts = sorted(ev["checkers"], key=lambda c: c["per_minute"])
    for i, c in enumerate(pts):
        y = c.get("top50_real_errors", c["caught"])
        ax.scatter(c["per_minute"], y, s=70, color=HUE, edgecolor="white", linewidth=2, zorder=3)
        below = i % 2 == 1
        ax.annotate(f"{c['checker']}\n{y} of 50 real, {c['per_minute']:,}/min", (c["per_minute"], y),
                    textcoords="offset points", xytext=(0, -12 if below else 10), ha="center",
                    va="top" if below else "bottom", fontsize=8, color=INK)
    ax.set_xscale("log")
    ax.set_xlim(min(c["per_minute"] for c in pts) / 4, max(c["per_minute"] for c in pts) * 4)
    ax.set_ylim(0, 50)
    ax.set_xlabel("Products checked per minute (log scale)", color=MUTED, fontsize=9)
    ax.set_ylabel("Real errors among its 50 most suspicious", color=MUTED, fontsize=9)
    ax.set_title(f"Speed against usefulness, {ev['products']} products, {ev['planted']} planted errors", loc="left", color=INK, fontsize=11)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def handcheck_noise(path: Path = Path("data/handcheck.csv")):
    if not path.exists():
        return None
    h = pd.read_csv(path).fillna("")
    marked = h[h["looks_right"].str.upper().isin(["Y", "N"])]
    if marked.empty:
        return None
    wrong = int((marked["looks_right"].str.upper() == "N").sum())
    return {"checked": len(marked), "wrong": wrong}


def build(d: Path) -> None:
    ev = json.loads((d / "eval.json").read_text())
    charts = Path("docs/charts") if d.name == "results" else d
    charts.mkdir(parents=True, exist_ok=True)
    speed_vs_catch(ev, charts / "speed-vs-catch.png")
    lines = [f"# Results ({'FAKE stand-in models, not real' if ev['fake_models'] else ev['machine']}, {ev['ran_at']})", "",
             f"{ev['products']} products, {ev['planted']} with a planted wrong category.", "",
             "| Checker | Real errors in its top 50 | Caught | False alarms | Precision | Recall | Products per minute |", "|---|---|---|---|---|---|---|"]
    for c in ev["checkers"]:
        lines.append(f"| {c['checker']} | {c.get('top50_real_errors', 'n/a')} of 50 | {c['caught']} of {ev['planted']} | {c['false_alarms']} | {c['precision']:.2f} | {c['recall']:.2f} | {c['per_minute']:,} |")
    sc = d / "scale.json"
    if sc.exists():
        s = json.loads(sc.read_text())
        lines += ["", f"**At scale:** {s['products']:,} products checked by the team in {s['minutes']} minutes; "
                  f"{s['zero_shot_calls']:,} went to the slow model; {s['flagged']:,} flagged for review."]
    n = handcheck_noise()
    if n:
        lines += ["", f"**Hand check:** of {n['checked']} products whose category was not changed, a person could not confirm the category from the name alone for {n['wrong']} (marked N)."]
    (d / "summary.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nChart: {charts / 'speed-vs-catch.png'}")
    print(f"Report page: {html_report(d)}")


def html_report(d: Path, top: int = 20) -> Path:
    """A one-page results report, styled like a printed lab report."""
    import html as h

    ev = json.loads((d / "eval.json").read_text())
    sc = json.loads((d / "scale.json").read_text()) if (d / "scale.json").exists() else None
    review = pd.read_csv(d / "review_list.csv").head(top) if (d / "review_list.csv").exists() else pd.DataFrame()
    n = handcheck_noise()
    best = max(ev["checkers"], key=lambda c: c.get("top50_real_errors", 0))
    rows = "".join(
        f"<tr{' class=best' if c is best else ''}><td>{h.escape(c['checker'])}</td><td>{c.get('top50_real_errors', '')}</td>"
        f"<td>{c['caught']}/{ev['planted']}</td><td>{c['false_alarms']}</td><td>{c['precision']:.2f}</td><td>{c['per_minute']:,}</td></tr>"
        for c in ev["checkers"])
    rev = "".join(
        f"<tr><td>{i + 1}</td><td>{h.escape(str(r['name']))}</td><td>{h.escape(r['category'])}</td><td>{h.escape(r['best'])}</td></tr>"
        for i, r in review.iterrows())
    chart = "../docs/charts/speed-vs-catch.png" if d.name == "results" else "speed-vs-catch.png"
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catalogue checker report</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root {{ --paper:#fdfdfb; --grid:#e8eee6; --ink:#141613; --muted:#5d645b; --mark:#d7f75b; --line:#141613; }}
* {{ box-sizing:border-box }}
body {{ margin:0; color:var(--ink); font:15px/1.55 "Space Grotesk",system-ui,sans-serif;
  background:var(--paper) repeating-linear-gradient(0deg,transparent 0 23px,var(--grid) 23px 24px),
             repeating-linear-gradient(90deg,transparent 0 23px,var(--grid) 23px 24px); }}
main {{ max-width:880px; margin:0 auto; padding:32px 16px 64px }}
header {{ border:2px solid var(--line); background:var(--paper); padding:18px 20px; display:grid; gap:4px }}
.id {{ font:700 12px "Space Mono",monospace; letter-spacing:.12em; text-transform:uppercase; color:var(--muted) }}
h1 {{ margin:0; font-size:clamp(1.8rem,5vw,2.8rem); line-height:1.05; letter-spacing:-.02em }}
section {{ margin-top:22px; border:2px solid var(--line); background:var(--paper); padding:18px 20px }}
h2 {{ margin:0 0 10px; font:700 13px "Space Mono",monospace; text-transform:uppercase; letter-spacing:.1em }}
h2 b {{ background:var(--ink); color:var(--paper); padding:1px 6px; margin-right:8px }}
.finding {{ font-size:1.25rem; font-weight:600; line-height:1.35; margin:0 }}
mark {{ background:var(--mark); padding:0 3px }}
table {{ width:100%; border-collapse:collapse; font:13px "Space Mono",monospace }}
th,td {{ text-align:left; padding:7px 8px; border-bottom:1px solid #c9d1c6; vertical-align:top }}
th {{ border-bottom:2px solid var(--line); font-weight:700; font-size:11px; text-transform:uppercase }}
tr.best td {{ background:var(--mark) }}
img {{ width:100%; height:auto; border:1px solid #c9d1c6 }}
.note {{ color:var(--muted); font-size:13px; margin:10px 0 0 }}
.scroll {{ overflow-x:auto }}
</style></head><body><main>
<header><span class="id">Catalogue checker · results report · {h.escape(ev['ran_at'][:10])} · {h.escape(ev['machine'])}</span>
<h1>Which products are filed in the wrong category?</h1>
<span class="id">{ev['products']} products · {ev['planted']} planted errors · data: Open Food Facts (ODbL)</span></header>
<section><h2><b>01</b>Finding</h2><p class="finding"><mark>{h.escape(best['checker'])}</mark> ranked best: {best.get('top50_real_errors')} real errors among its 50 most suspicious products, at {best['per_minute']:,} products a minute.</p>
{f"<p class=note>At scale: {sc['products']:,} products in {sc['minutes']} minutes; {sc['zero_shot_calls']:,} sent to the slow model; {sc['flagged']:,} flagged.</p>" if sc else ""}</section>
<section><h2><b>02</b>Checkers compared</h2><div class="scroll"><table><tr><th>Checker</th><th>Real in top 50</th><th>Caught</th><th>False alarms</th><th>Precision</th><th>Per minute</th></tr>{rows}</table></div>
<p class="note">Caught: planted errors flagged anywhere. Precision: share of flags that were planted errors. Flag rules were fixed before the run.</p></section>
<section><h2><b>03</b>Speed against usefulness</h2><img src="{chart}" alt="Chart of products per minute against real errors in the top 50, one dot per checker"></section>
{f"<section><h2><b>04</b>Hand check</h2><p>Of {n['checked']} unchanged products, a person could not confirm the category from the name alone for {n['wrong']}.</p></section>" if n else ""}
<section><h2><b>05</b>Top of the review list (5,000 products)</h2><div class="scroll"><table><tr><th>#</th><th>Product</th><th>Filed under</th><th>Reads like</th></tr>{rev}</table></div></section>
</main></body></html>"""
    out = d / "report.html"
    out.write_text(page)
    return out
