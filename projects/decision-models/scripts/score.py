"""Score raw runs against the answer key.

    python3 scripts/score.py              # every dev run in results/raw/dev
    python3 scripts/score.py --heldout

Writes results/<split>/<name>.json (one per contender), results/<split>/
summary.md (a table across contenders) and results/<split>/calibration.svg.

Measures, per question type:
- is_urgent: accuracy at 0.5 (urgent if probability >= 0.5)
- team: accuracy, and accuracy on each team
- frustration: average distance of the score from the right level, and how
  often the most likely level is exactly right
- speed: median and 90th-percentile seconds per request (all 3 questions)
- cost per 1,000 requests: 0 for local runs, said plainly
- calibration: answers grouped by stated confidence; each group's accuracy.
  ECE (expected calibration error) = the average gap between stated
  confidence and actual accuracy, weighted by group size. 0 is perfect.
"""

import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from systemone import TEAMS, load  # noqa: E402

BINS = 10
PAID = {"jev"}  # name prefixes that cost money; priced only from a real bill


def confidence_and_correct(qid, answer, row):
    """What the contender said it was sure of, and whether that was right."""
    if qid == "is_urgent":
        p = answer["noul"]
        return max(p, 1 - p), (p >= 0.5) == row["urgent"]
    if qid == "team":
        return answer["confidence"], answer["choice"] == row["team"]
    probs = answer["probabilities"]
    top = max(probs, key=probs.get)
    return answer["confidence"], int(top) == row["frustration"]


def calibration(pairs):
    bins = defaultdict(list)
    for conf, ok in pairs:
        bins[min(int(conf * BINS), BINS - 1)].append((conf, ok))
    table, ece = [], 0.0
    for b in sorted(bins):
        group = bins[b]
        conf = sum(c for c, _ in group) / len(group)
        acc = sum(ok for _, ok in group) / len(group)
        ece += len(group) / len(pairs) * abs(conf - acc)
        table.append({"from": b / BINS, "to": (b + 1) / BINS, "n": len(group),
                      "mean_confidence": round(conf, 3), "accuracy": round(acc, 3)})
    return table, round(ece, 3)


def pct(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]


def score_run(path, key):
    lines = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
    meta = lines[0]["meta"]
    repairs = next((l["repairs"] for l in lines if "repairs" in l), None)
    runs = [l for l in lines if "id" in l]
    if len(runs) != meta["rows"]:
        print(f"skipped {path.name}: incomplete run ({len(runs)} answers for {meta['rows']} rows)",
              file=sys.stderr)
        return None

    per_q = defaultdict(list)
    urgent_ok, team_ok, team_by = 0, 0, defaultdict(lambda: [0, 0])
    dist, exact, seconds, tokens = 0.0, 0, [], [0, 0]
    for r in runs:
        row, a = key[r["id"]], r["response"]["answers"]
        seconds.append(r["seconds"])
        tokens[0] += r["response"]["usage"]["input_tokens"]
        tokens[1] += r["response"]["usage"]["output_tokens"]
        urgent_ok += (a["is_urgent"]["noul"] >= 0.5) == row["urgent"]
        hit = a["team"]["choice"] == row["team"]
        team_ok += hit
        team_by[row["team"]][0] += hit
        team_by[row["team"]][1] += 1
        dist += abs(a["frustration"]["score"] - row["frustration"])
        for qid in ("is_urgent", "team", "frustration"):
            per_q[qid].append(confidence_and_correct(qid, a[qid], row))
        probs = a["frustration"]["probabilities"]
        exact += int(max(probs, key=probs.get)) == row["frustration"]

    n = len(runs)
    cal = {}
    for qid, pairs in per_q.items():
        table, ece = calibration(pairs)
        cal[qid] = {"ece": ece, "bins": table}
    paid = meta["adapter"].split(":")[0] in PAID
    return {
        "adapter": meta["adapter"], "split": meta["split"], "machine": meta["machine"],
        "started": meta["started"], "n": n,
        "urgent_accuracy": round(urgent_ok / n, 3),
        "team_accuracy": round(team_ok / n, 3),
        "team_accuracy_by_team": {t: {"right": team_by[t][0], "of": team_by[t][1]}
                                  for t in TEAMS if team_by[t][1]},
        "frustration_mean_distance": round(dist / n, 3),
        "frustration_exact": round(exact / n, 3),
        "seconds_median": round(statistics.median(seconds), 4),
        "seconds_p90": round(pct(seconds, 0.9), 4),
        "tokens": {"input": tokens[0], "output": tokens[1]},
        "cost_per_1000": None if paid else 0.0,
        "cost_note": "paid API: price from the real bill only" if paid
                     else "runs locally: no per-request charge (electricity and hardware not counted)",
        "repairs": repairs,
        "calibration": cal,
    }


def summary_md(results, split):
    lines = [f"# Results: {split} set", "",
             "Generated by scripts/score.py. Only numbers from runs in this repo.", "",
             "| Contender | Machine | n | Urgent acc. | Team acc. | Frustration distance | "
             "Frustration exact | ECE urgent / team / frustration | Median s | Cost per 1,000 |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for r in results:
        c = r["calibration"]
        cost = "0 (local)" if r["cost_per_1000"] == 0 else "see bill"
        lines.append(
            f"| {r['adapter']} | {r['machine']} | {r['n']} | {r['urgent_accuracy']:.2f} | "
            f"{r['team_accuracy']:.2f} | {r['frustration_mean_distance']:.2f} | "
            f"{r['frustration_exact']:.2f} | {c['is_urgent']['ece']:.2f} / {c['team']['ece']:.2f} / "
            f"{c['frustration']['ece']:.2f} | {r['seconds_median']:.4f} | {cost} |")
    lines += ["", "## Team accuracy by team", "",
              "| Contender | " + " | ".join(TEAMS) + " |",
              "|---|" + "---|" * len(TEAMS)]
    for r in results:
        by = r["team_accuracy_by_team"]
        cells = [f"{by[t]['right']}/{by[t]['of']}" if t in by else "-" for t in TEAMS]
        lines.append(f"| {r['adapter']} | " + " | ".join(cells) + " |")
    lines += ["", "ECE: expected calibration error, the average gap between how sure a "
              "contender said it was and how often it was right (0 is perfect).", ""]
    return "\n".join(lines)


COLOURS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#4b5563"]


def calibration_svg(results):
    """One panel per question: stated confidence (x) vs how often right (y)."""
    w, h, pad, gap = 260, 260, 40, 30
    titles = {"is_urgent": "Urgent?", "team": "Which team", "frustration": "Frustration level"}
    width = 3 * (w + gap) + pad
    height = h + 2 * pad + 20 * len(results) + 20
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
           f'font-family="system-ui, sans-serif" font-size="12">',
           f'<rect width="{width}" height="{height}" fill="white"/>']
    for i, qid in enumerate(titles):
        x0, y0 = pad + i * (w + gap), pad
        sx = lambda v: x0 + v * w  # noqa: E731
        sy = lambda v: y0 + h - v * h  # noqa: E731
        out += [f'<text x="{x0}" y="{y0 - 12}" font-weight="600">{titles[qid]}</text>',
                f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="none" stroke="#9ca3af"/>',
                f'<line x1="{sx(0)}" y1="{sy(0)}" x2="{sx(1)}" y2="{sy(1)}" '
                f'stroke="#9ca3af" stroke-dasharray="4 4"/>']
        for t in (0, 0.5, 1):
            out += [f'<text x="{sx(t)}" y="{y0 + h + 14}" text-anchor="middle">{t:g}</text>',
                    f'<text x="{x0 - 6}" y="{sy(t) + 4}" text-anchor="end">{t:g}</text>']
        out.append(f'<text x="{x0 + w / 2}" y="{y0 + h + 30}" text-anchor="middle" '
                   f'fill="#4b5563">stated confidence</text>')
        if i == 0:
            out.append(f'<text x="{x0 - 28}" y="{y0 + h / 2}" text-anchor="middle" fill="#4b5563" '
                       f'transform="rotate(-90 {x0 - 28} {y0 + h / 2})">how often right</text>')
        for k, r in enumerate(results):
            col = COLOURS[k % len(COLOURS)]
            bins = r["calibration"][qid]["bins"]
            pts = " ".join(f"{sx(b['mean_confidence']):.1f},{sy(b['accuracy']):.1f}" for b in bins)
            if len(bins) > 1:
                out.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2"/>')
            for b in bins:
                rad = 2.5 + min(b["n"], 100) ** 0.5 / 2
                out.append(f'<circle cx="{sx(b["mean_confidence"]):.1f}" cy="{sy(b["accuracy"]):.1f}" '
                           f'r="{rad:.1f}" fill="{col}" fill-opacity="0.7"><title>{r["adapter"]}: '
                           f'{b["n"]} answers, said {b["mean_confidence"]:.2f}, right '
                           f'{b["accuracy"]:.2f}</title></circle>')
    ly = pad + h + 50
    for k, r in enumerate(results):
        col = COLOURS[k % len(COLOURS)]
        out += [f'<rect x="{pad}" y="{ly + 20 * k - 9}" width="12" height="12" fill="{col}"/>',
                f'<text x="{pad + 18}" y="{ly + 20 * k + 1}">{r["adapter"]} ({r["machine"]}, '
                f'n={r["n"]})</text>']
    out.append(f'<text x="{width - pad}" y="{ly}" text-anchor="end" fill="#4b5563">'
               f'Dashed line: perfectly honest confidence. Dot size: number of answers.</text>')
    out.append("</svg>")
    return "\n".join(out)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--heldout", action="store_true")
    args = p.parse_args()
    split = "heldout" if args.heldout else "dev"
    key = {r["id"]: r for r in load(split)}
    raw = sorted((ROOT / "results" / "raw" / split).glob("*.jsonl"))
    if not raw:
        sys.exit(f"No runs in results/raw/{split}. Run scripts/run.py first.")
    out_dir = ROOT / "results" / split
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for path in raw:
        r = score_run(path, key)
        if r is None:
            continue
        (out_dir / f"{path.stem}.json").write_text(json.dumps(r, indent=2) + "\n")
        results.append(r)
    (out_dir / "summary.md").write_text(summary_md(results, split))
    (out_dir / "calibration.svg").write_text(calibration_svg(results))
    print(summary_md(results, split))


if __name__ == "__main__":
    main()
