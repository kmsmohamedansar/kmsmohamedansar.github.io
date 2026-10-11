"""Command line for the whole project.

  python -m catalogue.run key              build the answer key and the hand-check sheet
  python -m catalogue.run eval             score all four checkers on the answer key
  python -m catalogue.run scale --n 5000   run the team on 5,000 products, time it, write the review list
  python -m catalogue.run report           charts and a summary from the saved results

Add --fake to use stand-ins instead of the AI models (for testing the
pipeline without downloading them). Fake results go to results/fake/ and
are never reported.
"""

import argparse
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from . import checkers as ck
from .categories import NAMES
from .keyset import build_answer_key, handcheck_sheet

RAW = Path("data/raw/products.csv")
KEY = Path("data/answer_key.csv")
HAND = Path("data/handcheck.csv")


def score(flagged: list, planted: list) -> dict:
    """Precision: of the flagged products, how many were really wrong.
    Recall: of the wrong products, how many were flagged."""
    f, p = np.array(flagged, bool), np.array(planted, bool)
    tp, fp, fn = int((f & p).sum()), int((f & ~p).sum()), int((~f & p).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return {"caught": tp, "false_alarms": fp, "missed": fn, "flagged": int(f.sum()),
            "precision": round(precision, 3), "recall": round(recall, 3)}


# Stand-ins for the models, used only by tests and --fake runs.
def fake_embed(texts: list) -> np.ndarray:
    rng = np.random.default_rng(0)
    base = {c: rng.normal(size=16) for c in NAMES}
    out = []
    for t in texts:
        v = rng.normal(scale=0.3, size=16)
        for c in NAMES:
            if any(w in t.lower() for w in ck.LABEL_TEXT[c].split(" or ")):
                v += base[c]
        out.append(v / np.linalg.norm(v))
    return np.array(out)


def fake_classify(names: list) -> np.ndarray:
    e, labels = fake_embed(names), fake_embed([f"a {ck.LABEL_TEXT[c]} product" for c in NAMES])
    s = np.exp(5 * (e @ labels.T))
    return s / s.sum(axis=1, keepdims=True)


def models(fake: bool):
    if fake:
        return fake_embed, fake_classify
    return ck.Embedder(), ck.ZeroShot()


def meta(fake: bool) -> dict:
    return {"ran_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "fake_models": fake,
            "machine": f"{platform.system()} {platform.machine()}", "python": platform.python_version(),
            "embed_model": ck.EMBED_MODEL, "zero_shot_model": ck.ZERO_SHOT_MODEL}


def out_dir(fake: bool) -> Path:
    d = Path("results/fake" if fake else "results")
    d.mkdir(parents=True, exist_ok=True)
    return d


def cmd_key(_args) -> None:
    products = pd.read_csv(RAW, dtype=str).fillna("")
    key = build_answer_key(products)
    KEY.parent.mkdir(parents=True, exist_ok=True)
    key.to_csv(KEY, index=False)
    handcheck_sheet(key).to_csv(HAND, index=False)
    print(f"{len(products)} products in {products['category'].nunique()} categories.")
    print(f"Answer key: {len(key)} rows, {int(key['planted'].sum())} planted errors -> {KEY}")
    print(f"Hand-check sheet: 50 rows -> {HAND} (fill looks_right with Y or N)")


def cmd_eval(args) -> None:
    key = pd.read_csv(KEY, dtype={"code": str}).fillna("")
    names, filed, planted = key["name"].tolist(), key["category"].tolist(), key["planted"].astype(bool).tolist()
    embed, classify = models(args.fake)
    runs = [ck.keyword(names, filed)]
    runs.append(ck.meaning(names, filed, embed))
    runs.append(ck.zero_shot(names, filed, classify))
    runs.append(ck.team(names, filed, embed, classify, first=runs[1]))
    summary = []
    rows = key.copy()
    for r in runs:
        s = {"checker": r.name, **score(r.flagged, planted), "seconds": round(r.seconds, 2),
             "per_minute": round(r.per_minute(len(names))), "slow_model_calls": r.model_calls if r.name.startswith(("Zero", "Team")) else 0}
        summary.append(s)
        slug = r.name.split(":")[0].split()[0].lower()
        rows[f"{slug}_flagged"], rows[f"{slug}_best"], rows[f"{slug}_rank"] = r.flagged, r.best, r.rank
        print(f"{r.name:32} caught {s['caught']:2}/{sum(planted)}  false alarms {s['false_alarms']:3}  "
              f"precision {s['precision']:.2f}  recall {s['recall']:.2f}  {s['per_minute']:>8} products/min")
    d = out_dir(args.fake)
    (d / "eval.json").write_text(json.dumps({**meta(args.fake), "products": len(names), "planted": int(sum(planted)), "checkers": summary}, indent=2))
    rows.to_csv(d / "eval_rows.csv", index=False)
    print(f"Saved {d / 'eval.json'}")


def reason(name: str, filed: str, best: str) -> str:
    return f'Filed under {filed}, but "{name}" reads more like {best}.'


def cmd_scale(args) -> None:
    products = pd.read_csv(RAW, dtype=str).fillna("")
    if len(products) < args.n:
        print(f"Only {len(products)} products downloaded; using all of them.")
    sample = products.sample(n=min(args.n, len(products)), random_state=1)
    names, filed = sample["name"].tolist(), sample["category"].tolist()
    embed, classify = models(args.fake)
    t0 = time.perf_counter()
    m = ck.meaning(names, filed, embed)
    t = ck.team(names, filed, embed, classify, first=m)
    total = time.perf_counter() - t0
    sample = sample.assign(flagged=t.flagged, best=t.best, rank=t.rank, suspicion=t.suspicion)
    review = sample[sample["flagged"]].sort_values("suspicion", ascending=False)
    review = review.assign(reason=[reason(n, f, b) for n, f, b in zip(review["name"], review["category"], review["best"])])
    d = out_dir(args.fake)
    review[["code", "name", "brand", "category", "best", "suspicion", "reason"]].to_csv(d / "review_list.csv", index=False)
    info = {**meta(args.fake), "products": len(names), "seconds_total": round(total, 1), "meaning_seconds": round(m.seconds, 1),
            "zero_shot_calls": t.model_calls, "flagged": int(sum(t.flagged)), "minutes": round(total / 60, 2)}
    (d / "scale.json").write_text(json.dumps(info, indent=2))
    print(f"{len(names)} products checked in {total / 60:.1f} minutes "
          f"({t.model_calls} sent to the slow model). {int(sum(t.flagged))} flagged for review -> {d / 'review_list.csv'}")


def cmd_report(args) -> None:
    from .report import build

    build(out_dir(args.fake))


def main() -> None:
    ap = argparse.ArgumentParser(prog="catalogue")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("key", "eval", "scale", "report"):
        p = sub.add_parser(name)
        p.add_argument("--fake", action="store_true", help="use stand-ins instead of the AI models")
        if name == "scale":
            p.add_argument("--n", type=int, default=5000)
    args = ap.parse_args()
    {"key": cmd_key, "eval": cmd_eval, "scale": cmd_scale, "report": cmd_report}[args.cmd](args)


if __name__ == "__main__":
    main()
