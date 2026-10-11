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
