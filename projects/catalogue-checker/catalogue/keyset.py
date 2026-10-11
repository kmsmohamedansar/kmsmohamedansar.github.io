"""Builds the answer key: 300 products with their own category, plus 50
products deliberately given a wrong category (planted errors), so we know
which ones a checker should flag. Also writes a sheet of 50 for a person
to check by hand, which tells us how often the database's own category is
itself wrong.
"""

import random

import pandas as pd

from .categories import NAMES

SEED = 2025
N_CLEAN = 300
N_PLANTED = 50
N_HANDCHECK = 50


def build_answer_key(products: pd.DataFrame, seed: int = SEED, n_clean: int = N_CLEAN, n_planted: int = N_PLANTED) -> pd.DataFrame:
    """Return n_clean + n_planted rows with columns:
    code, name, brand, category (what the catalogue says), true_category,
    planted (True if we gave it the wrong category on purpose)."""
    rng = random.Random(seed)
    # Spread evenly over categories, so no category dominates the score.
    per_cat = {c: g.sample(frac=1, random_state=seed) for c, g in products.groupby("category")}
    picked, i = [], 0
    while len(picked) < n_clean + n_planted:
        progressed = False
        for c in sorted(per_cat):
            g = per_cat[c]
            if i < len(g) and len(picked) < n_clean + n_planted:
                picked.append(g.iloc[i])
                progressed = True
        if not progressed:
            raise ValueError(f"Only {len(picked)} products available, need {n_clean + n_planted}.")
        i += 1
    rows = pd.DataFrame(picked).reset_index(drop=True)
    order = list(range(len(rows)))
    rng.shuffle(order)
    planted_idx = set(order[:n_planted])
    out = []
    for j, r in rows.iterrows():
        true = r["category"]
        planted = j in planted_idx
        shown = rng.choice([c for c in NAMES if c != true]) if planted else true
        out.append({"code": r["code"], "name": r["name"], "brand": r.get("brand", ""), "category": shown, "true_category": true, "planted": planted})
    return pd.DataFrame(out).sample(frac=1, random_state=seed).reset_index(drop=True)


def handcheck_sheet(key: pd.DataFrame, n: int = N_HANDCHECK, seed: int = SEED) -> pd.DataFrame:
    """n products whose category was NOT changed, for a person to mark
    Y (the category is right) or N (it's wrong) in the looks_right column."""
    clean = key[~key["planted"]].sample(n=n, random_state=seed)
    return clean[["code", "name", "category"]].assign(looks_right="")
