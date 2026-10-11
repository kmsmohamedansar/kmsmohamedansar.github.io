"""Accuracy on the hard cases, per contender.

    python3 scripts/hard_cases.py            # dev
    python3 scripts/hard_cases.py --heldout

Writes results/<split>/hard_cases.md. Same answer key and the same rules
for "right" as scripts/score.py.
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from systemone import load  # noqa: E402

TAGS = ["plain", "two-problems", "sarcasm", "very-short", "non-native"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--heldout", action="store_true")
    split = "heldout" if p.parse_args().heldout else "dev"
    key = {r["id"]: r for r in load(split)}
    count = {t: sum(t in r["tags"] for r in key.values()) for t in TAGS}
    lines = [f"# Hard cases: {split} set", "",
             "Share right per kind of request. n = requests of that kind. "
             "Frustration: average distance from the right level (lower is better).", ""]
    for q, label in (("team", "Team"), ("urgent", "Urgent"), ("frustration", "Frustration off by")):
        lines += [f"## {label}", "",
                  "| Contender | " + " | ".join(f"{t} (n={count[t]})" for t in TAGS) + " |",
                  "|---|" + "---|" * len(TAGS)]
        for path in sorted((ROOT / "results" / "raw" / split).glob("*.jsonl")):
            rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
            meta = rows[0]["meta"]
            runs = [r for r in rows if "id" in r]
            if len(runs) != meta["rows"]:
                continue
            got = defaultdict(list)
            for r in runs:
                row, a = key[r["id"]], r["response"]["answers"]
                if q == "team":
                    v = a["team"]["choice"] == row["team"]
                elif q == "urgent":
                    v = (a["is_urgent"]["noul"] >= 0.5) == row["urgent"]
                else:
                    v = abs(a["frustration"]["score"] - row["frustration"])
                for t in row["tags"]:
                    got[t].append(v)
            cells = [f"{sum(got[t]) / len(got[t]):.2f}" if got[t] else "-" for t in TAGS]
            lines.append(f"| {meta['adapter']} | " + " | ".join(cells) + " |")
        lines.append("")
    out = ROOT / "results" / split / "hard_cases.md"
    out.write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
