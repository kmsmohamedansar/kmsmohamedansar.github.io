"""Fast then slow: the fast contender answers everything; any request where
it is unsure goes to the slow one.

Worked out from runs already saved by run.py, so both contenders see exactly
the same requests and no extra model calls are made.

    # 1. On dev: try every threshold and fix one (writes results/cascade.json)
    python3 scripts/cascade.py pick --fast rules --slow ollama_qwen2.5_7b
    # 2. At the end, on held-out: use the fixed threshold, once
    python3 scripts/cascade.py heldout

Rule, fixed 2026-10-11 before any model run:
- A request's confidence is the LOWEST of its three answers' confidences
  (for urgent, max(p, 1 - p), as in scripts/score.py). Below the threshold,
  the whole request goes to the slow contender.
- Thresholds tried: 0.00, 0.05, ..., 1.00.
- Pick the LOWEST threshold where both urgent and team accuracy are within 0.02 of the slow contender alone. Lowest = fewest handed over.
  If none qualifies, the threshold is 1.00 (everything handed over), and
  that is reported as "the fast model didn't help".
- Time per request = fast time, plus slow time when handed over.
"""

import argparse
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from score import confidence_and_correct  # noqa: E402
from systemone import load  # noqa: E402

THRESHOLDS = [round(i * 0.05, 2) for i in range(21)]
MARGIN = 0.02
CHOICE_FILE = ROOT / "results" / "cascade.json"
QIDS = ("is_urgent", "team", "frustration")


def read_run(split, name):
    path = ROOT / "results" / "raw" / split / f"{name}.jsonl"
    if not path.exists():
        sys.exit(f"No run at {path.relative_to(ROOT)}. Run scripts/run.py first.")
    lines = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
    meta = lines[0]["meta"]
    return meta, {l["id"]: l for l in lines if "id" in l}


def request_confidence(answers, row):
    return min(confidence_and_correct(q, answers[q], row)[0] for q in QIDS)


def simulate(fast, slow, key, threshold):
    if set(fast) != set(slow):
        sys.exit("Fast and slow runs don't cover the same requests.")
    n = len(fast)
    handed, urgent, team, dist, secs = 0, 0, 0, 0.0, []
    for rid, f in fast.items():
        row = key[rid]
        use = f
        t = f["seconds"]
        if request_confidence(f["response"]["answers"], row) < threshold:
            handed += 1
            use = slow[rid]
            t += slow[rid]["seconds"]
        a = use["response"]["answers"]
        urgent += (a["is_urgent"]["noul"] >= 0.5) == row["urgent"]
        team += a["team"]["choice"] == row["team"]
        dist += abs(a["frustration"]["score"] - row["frustration"])
        secs.append(t)
    return {"threshold": threshold, "handed_over": handed, "handed_share": round(handed / n, 3),
            "urgent_accuracy": round(urgent / n, 3), "team_accuracy": round(team / n, 3),
            "frustration_mean_distance": round(dist / n, 3),
            "seconds_total": round(sum(secs), 3), "seconds_median": round(statistics.median(secs), 4)}


def pick(sweep, slow_alone):
    for s in sweep:  # thresholds ascending, so first hit = fewest handed over
        if (s["urgent_accuracy"] >= slow_alone["urgent_accuracy"] - MARGIN and
                s["team_accuracy"] >= slow_alone["team_accuracy"] - MARGIN):
            return s["threshold"], True
    return 1.0, False


def table(rows):
    out = ["| Threshold | Handed over | Urgent | Team | Frustration distance | Total seconds |",
           "|---|---|---|---|---|---|"]
    for s in rows:
        out.append(f"| {s['threshold']:.2f} | {s['handed_over']} ({s['handed_share']:.0%}) | "
                   f"{s['urgent_accuracy']:.2f} | {s['team_accuracy']:.2f} | "
                   f"{s['frustration_mean_distance']:.2f} | {s['seconds_total']:.1f} |")
    return "\n".join(out)


def cmd_pick(args):
    if CHOICE_FILE.exists() and not args.again:
        sys.exit(f"{CHOICE_FILE.relative_to(ROOT)} exists. The threshold is fixed; "
                 "use --again only before any held-out run, and note why in NOTES.md.")
    if (ROOT / "results" / "heldout").exists():
        sys.exit("Held-out results exist; the threshold can no longer change.")
    key = {r["id"]: r for r in load("dev")}
    fmeta, fast = read_run("dev", args.fast)
    smeta, slow = read_run("dev", args.slow)
    sweep = [simulate(fast, slow, key, t) for t in THRESHOLDS]
    fast_alone = sweep[0]  # threshold 0: nothing handed over
    slow_alone = simulate(fast, slow, key, 1.01)  # everything handed over
    threshold, helped = pick(sweep, slow_alone)
    choice = {
        "fast": args.fast, "slow": args.slow, "threshold": threshold, "fast_helped": helped,
        "rule": f"lowest threshold within {MARGIN} of slow alone on urgent and team accuracy",
        "fixed_on": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "machines": {"fast": fmeta["machine"], "slow": smeta["machine"]},
        "dev": {"chosen": next(s for s in sweep if s["threshold"] == threshold),
                "fast_alone": fast_alone, "slow_alone": slow_alone, "sweep": sweep},
    }
    CHOICE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CHOICE_FILE.write_text(json.dumps(choice, indent=2) + "\n")
    print(table(sweep))
    print(f"\nSlow alone: urgent {slow_alone['urgent_accuracy']:.2f}, team "
          f"{slow_alone['team_accuracy']:.2f}, {slow_alone['seconds_total']:.1f} s")
    print(f"Fixed threshold: {threshold:.2f}" + ("" if helped else " (fast model didn't help)"))


def cmd_heldout(args):
    if not CHOICE_FILE.exists():
        sys.exit("No fixed threshold. Run 'cascade.py pick' on dev first.")
    choice = json.loads(CHOICE_FILE.read_text())
    out = ROOT / "results" / "heldout" / "cascade.json"
    if out.exists():
        sys.exit("Held-out cascade already scored. It is scored once only.")
    key = {r["id"]: r for r in load("heldout")}
    _, fast = read_run("heldout", choice["fast"])
    _, slow = read_run("heldout", choice["slow"])
    result = {
        "fast": choice["fast"], "slow": choice["slow"], "threshold": choice["threshold"],
        "cascade": simulate(fast, slow, key, choice["threshold"]),
        "fast_alone": simulate(fast, slow, key, 0.0),
        "slow_alone": simulate(fast, slow, key, 1.01),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(table([result["fast_alone"], result["cascade"], result["slow_alone"]]))


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("pick")
    a.add_argument("--fast", required=True, help="raw run name, e.g. rules")
    a.add_argument("--slow", required=True, help="raw run name, e.g. ollama_qwen2.5_7b")
    a.add_argument("--again", action="store_true")
    sub.add_parser("heldout")
    args = p.parse_args()
    cmd_pick(args) if args.cmd == "pick" else cmd_heldout(args)


if __name__ == "__main__":
    main()
