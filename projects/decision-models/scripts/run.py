"""Run one contender over a split and save every answer with its timing.

    python3 scripts/run.py rules                    # dev set
    python3 scripts/run.py ollama --model qwen2.5:7b
    python3 scripts/run.py systemone-http --model kev-4b --url http://localhost:8009
    python3 scripts/run.py rules --heldout          # once, at the very end

Raw answers go to results/raw/<split>/<name>.jsonl (not committed); then run
scripts/score.py. The held-out set runs once per contender: a second attempt
is refused.
"""

import argparse
import json
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from systemone import build_request, load  # noqa: E402
from systemone.adapters import ADAPTERS  # noqa: E402


def make(args):
    cls = ADAPTERS[args.adapter]
    kwargs = {}
    if args.model:
        kwargs["model"] = args.model
    if args.url:
        kwargs["url"] = args.url
    return cls(**kwargs)


def safe(name):
    return name.replace(":", "_").replace("/", "_")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("adapter", choices=sorted(ADAPTERS))
    p.add_argument("--model")
    p.add_argument("--url")
    p.add_argument("--machine", default=f"{platform.system()} {platform.machine()}",
                   help="named in results, e.g. 'MacBook Pro M3 Pro 36 GB'")
    p.add_argument("--heldout", action="store_true", help="the one final held-out run")
    p.add_argument("--limit", type=int, help="first N rows only, for a smoke test")
    args = p.parse_args()

    split = "heldout" if args.heldout else "dev"
    adapter = make(args)
    out = ROOT / "results" / "raw" / split / f"{safe(adapter.name)}.jsonl"
    if split == "heldout":
        done = ROOT / "results" / "heldout" / f"{safe(adapter.name)}.json"
        if out.exists() or done.exists():
            sys.exit(f"Held-out already run for {adapter.name}. It is scored once only.")
        if args.limit:
            sys.exit("No --limit on the held-out set.")
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = load(split)[: args.limit] if args.limit else load(split)
    meta = {"adapter": adapter.name, "split": split, "machine": args.machine,
            "started": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "rows": len(rows)}
    with out.open("w") as f:
        f.write(json.dumps({"meta": meta}) + "\n")
        for i, row in enumerate(rows, 1):
            start = time.perf_counter()
            response = adapter.decide(build_request(row["text"]))
            seconds = time.perf_counter() - start
            f.write(json.dumps({"id": row["id"], "seconds": seconds,
                                "response": response}) + "\n")
            if i % 25 == 0 or i == len(rows):
                print(f"{i}/{len(rows)}", file=sys.stderr)
        repairs = getattr(adapter, "repairs", None)
        if repairs is not None:
            f.write(json.dumps({"repairs": repairs}) + "\n")
    print(out.relative_to(ROOT))


if __name__ == "__main__":
    main()
