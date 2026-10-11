"""Build the test set from data/source/*.jsonl.

Checks every row against docs/labelling-rules.md, gives it an id, splits it
into dev and heldout (spread evenly across teams, fixed seed) and writes
data/dev.jsonl and data/heldout.jsonl. Prints a summary.

Run: python3 scripts/build_testset.py
"""

import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "source"
SEED = 20261011
HELDOUT_SIZE = 50
MIN_HARD = 3

TEAMS = [
    "billing", "account-access", "technical-support", "integrations-api",
    "security-privacy", "sales", "how-to", "feedback",
]
TAGS = {"plain", "two-problems", "sarcasm", "very-short", "non-native"}
HARD_TAGS = TAGS - {"plain"}


def load():
    rows, errors, seen = [], [], set()
    for path in sorted(SOURCE.glob("*.jsonl")):
        for n, line in enumerate(path.read_text().splitlines(), 1):
            if not line.strip():
                continue
            where = f"{path.name}:{n}"
            r = json.loads(line)
            if set(r) != {"text", "urgent", "team", "frustration", "tags"}:
                errors.append(f"{where}: wrong fields {sorted(r)}")
            if not isinstance(r["urgent"], bool):
                errors.append(f"{where}: urgent must be true or false")
            if r["team"] not in TEAMS:
                errors.append(f"{where}: unknown team {r['team']!r}")
            if r["frustration"] not in (1, 2, 3, 4, 5):
                errors.append(f"{where}: frustration must be 1 to 5")
            tags = set(r["tags"])
            if not tags or tags - TAGS or ("plain" in tags and len(tags) > 1):
                errors.append(f"{where}: bad tags {r['tags']}")
            if "\u2014" in r["text"]:
                errors.append(f"{where}: em dash in text")
            key = r["text"].strip().lower()
            if key in seen:
                errors.append(f"{where}: duplicate text")
            seen.add(key)
            rows.append(r)
    return rows, errors


def split(rows):
    """Take heldout rows from each team in proportion to its size."""
    rng = random.Random(SEED)
    by_team = defaultdict(list)
    for r in rows:
        by_team[r["team"]].append(r)
    # Largest-remainder share of the held-out places per team.
    exact = {t: HELDOUT_SIZE * len(v) / len(rows) for t, v in by_team.items()}
    share = {t: int(x) for t, x in exact.items()}
    for t in sorted(exact, key=lambda t: exact[t] - share[t], reverse=True):
        if sum(share.values()) == HELDOUT_SIZE:
            break
        share[t] += 1
    dev, held = [], []
    for t in TEAMS:
        group = by_team[t][:]
        rng.shuffle(group)
        held += group[: share[t]]
        dev += group[share[t]:]
    # Make sure every hard tag appears at least MIN_HARD times in heldout,
    # by swapping with a plain row of the same team (keeps team counts).
    for tag in sorted(HARD_TAGS):
        while sum(tag in r["tags"] for r in held) < MIN_HARD:
            swap = next(
                ((d, h) for d in dev if tag in d["tags"]
                 for h in held if h["tags"] == ["plain"] and h["team"] == d["team"]),
                None,
            )
            if swap is None:
                break
            d, h = swap
            dev[dev.index(d)], held[held.index(h)] = h, d
    rng.shuffle(dev)
    rng.shuffle(held)
    return dev, held


def write(name, rows, prefix):
    out = ROOT / "data" / f"{name}.jsonl"
    with out.open("w") as f:
        for i, r in enumerate(rows, 1):
            f.write(json.dumps({"id": f"{prefix}{i:03d}", **r}, ensure_ascii=False) + "\n")


def summary(name, rows):
    print(f"\n{name}: {len(rows)} requests")
    print("  urgent:", sum(r["urgent"] for r in rows))
    print("  teams: ", dict(sorted(Counter(r["team"] for r in rows).items())))
    print("  frustration:", dict(sorted(Counter(r["frustration"] for r in rows).items())))
    tags = Counter(t for r in rows for t in r["tags"])
    hard = sum(1 for r in rows if set(r["tags"]) & HARD_TAGS)
    print("  tags:  ", dict(sorted(tags.items())))
    print(f"  hard cases: {hard} ({hard / len(rows):.0%})")


def main():
    rows, errors = load()
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    dev, held = split(rows)
    for t in HARD_TAGS:
        if sum(t in r["tags"] for r in held) < MIN_HARD:
            print(f"warning: fewer than {MIN_HARD} '{t}' cases in heldout")
    write("dev", dev, "d")
    write("heldout", held, "h")
    summary("all", rows)
    summary("dev", dev)
    summary("heldout", held)


if __name__ == "__main__":
    main()
