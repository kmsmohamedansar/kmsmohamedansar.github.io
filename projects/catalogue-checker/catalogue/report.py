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
    """One dot per checker: how fast (across) against how many planted errors it caught (up)."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7.5, 4.2), dpi=160)
    _style(ax)
    for c in ev["checkers"]:
        ax.scatter(c["per_minute"], c["recall"] * 100, s=70, color=HUE, edgecolor="white", linewidth=2, zorder=3)
        ax.annotate(f"{c['checker']}\n{c['recall'] * 100:.0f}% caught, {c['precision'] * 100:.0f}% of flags right",
                    (c["per_minute"], c["recall"] * 100), textcoords="offset points", xytext=(9, -4), fontsize=8.5, color=INK, va="top")
    ax.set_xscale("log")
    ax.set_xlabel("Products checked per minute (log scale)", color=MUTED, fontsize=9)
    ax.set_ylabel("Planted errors caught (%)", color=MUTED, fontsize=9)
    ax.set_ylim(0, 105)
    ax.set_title(f"Speed against catch rate, {ev['products']} products, {ev['planted']} planted errors", loc="left", color=INK, fontsize=11)
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
        lines += ["", f"**Hand check:** of {n['checked']} products whose category was not changed, a person judged {n['wrong']} to be filed wrongly in the source data."]
    (d / "summary.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nChart: {charts / 'speed-vs-catch.png'}")
