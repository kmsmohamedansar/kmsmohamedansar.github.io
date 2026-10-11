"""The three checkers, plus the fast-then-slow team.

Each checker looks at a product name and the category it's filed under,
and returns for every product:
  rank       where the filed category comes among all 15 (1 = best fit);
             the keyword checker only knows 1 (a match) or 15 (no match)
  best       the category the checker thinks fits best
  suspicion  how wrong the filing looks, higher = more suspicious
  flagged    True if the checker says "send this to a person"

The flag rules are fixed in advance (see README) and never tuned on the
answer key:
  keyword:   flag if no category word appears in the name
  meaning:   flag if the filed category isn't the closest match
  zero-shot: flag if the filed category isn't the model's top choice
  team:      meaning match first; rank 1 passes, rank 4 or worse is
             flagged, ranks 2 and 3 (doubtful) go to the zero-shot model
"""

import re
import time
from dataclasses import dataclass, field

import numpy as np

from .categories import CATEGORIES, NAMES

# How each category is described to the two AI checkers.
LABEL_TEXT = {
    "Breakfast cereals": "breakfast cereal", "Yogurts": "yogurt", "Cheeses": "cheese", "Chocolates": "chocolate",
    "Pasta": "pasta", "Coffees": "coffee", "Teas": "tea", "Fruit juices": "fruit juice", "Biscuits": "biscuits or cookies",
    "Crisps": "crisps or potato chips", "Sodas": "soda or soft drink", "Breads": "bread", "Jams": "jam",
    "Soups": "soup", "Honeys": "honey",
}
TEXT_TO_NAME = {v: k for k, v in LABEL_TEXT.items()}
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
ZERO_SHOT_MODEL = "facebook/bart-large-mnli"
DOUBTFUL = (2, 3)


@dataclass
class Result:
    name: str
    rank: list = field(default_factory=list)
    best: list = field(default_factory=list)
    suspicion: list = field(default_factory=list)
    flagged: list = field(default_factory=list)
    seconds: float = 0.0
    model_calls: int = 0

    def per_minute(self, n: int) -> float:
        return n / self.seconds * 60 if self.seconds > 0 else float("inf")


def _ranks_from_scores(scores: np.ndarray, filed: list) -> tuple:
    """scores: products x 15 (higher = better fit)."""
    idx = [NAMES.index(c) for c in filed]
    order = np.argsort(-scores, axis=1)
    rank = [int(np.where(order[i] == idx[i])[0][0]) + 1 for i in range(len(filed))]
    best = [NAMES[order[i][0]] for i in range(len(filed))]
    own = scores[np.arange(len(filed)), idx]
    masked = scores.copy()
    masked[np.arange(len(filed)), idx] = -np.inf
    suspicion = (masked.max(axis=1) - own).tolist()
    return rank, best, suspicion


def keyword(names: list, filed: list) -> Result:
    t0 = time.perf_counter()
    r = Result("Keyword match")
    for n, c in zip(names, filed):
        hit = any(re.search(rf"\b{w}s?\b", n.lower()) for w in CATEGORIES[c]["words"])
        others = [o for o in NAMES if o != c and any(re.search(rf"\b{w}s?\b", n.lower()) for w in CATEGORIES[o]["words"])]
        r.rank.append(1 if hit else 15)
        r.best.append(c if hit else (others[0] if others else "?"))
        r.suspicion.append(0.0 if hit else (1.0 if others else 0.5))
        r.flagged.append(not hit)
    r.seconds = time.perf_counter() - t0
    return r


class Embedder:
    """Turns text into numbers that capture meaning (an embedding)."""

    def __init__(self, model: str = EMBED_MODEL, device: str | None = None):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model, device=device)

    def __call__(self, texts: list) -> np.ndarray:
        return self.model.encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False)


def meaning(names: list, filed: list, embed) -> Result:
    t0 = time.perf_counter()
    labels = embed([f"a {LABEL_TEXT[c]} product" for c in NAMES])
    vecs = embed(names)
    scores = vecs @ labels.T
    r = Result("Meaning match")
    r.rank, r.best, r.suspicion = _ranks_from_scores(scores, filed)
    r.flagged = [k > 1 for k in r.rank]
    r.seconds = time.perf_counter() - t0
    r.model_calls = len(names)
    return r


class ZeroShot:
    """A model trained to judge whether a sentence follows from another
    (natural language inference), used here to score each category with no
    training on this data (zero-shot)."""

    def __init__(self, model: str = ZERO_SHOT_MODEL, device: str | None = None):
        from transformers import pipeline

        if device is None:
            import torch

            device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.pipe = pipeline("zero-shot-classification", model=model, device=device)

    def __call__(self, names: list) -> np.ndarray:
        labels = [LABEL_TEXT[c] for c in NAMES]
        out = self.pipe(names, candidate_labels=labels, hypothesis_template="This product is {}.", batch_size=8)
        out = out if isinstance(out, list) else [out]
        scores = np.zeros((len(names), len(NAMES)))
        for i, o in enumerate(out):
            for label, s in zip(o["labels"], o["scores"]):
                scores[i, NAMES.index(TEXT_TO_NAME[label])] = s
        return scores


def zero_shot(names: list, filed: list, classify) -> Result:
    t0 = time.perf_counter()
    scores = classify(names)
    r = Result("Zero-shot model")
    r.rank, r.best, r.suspicion = _ranks_from_scores(scores, filed)
    r.flagged = [k > 1 for k in r.rank]
    r.seconds = time.perf_counter() - t0
    r.model_calls = len(names)
    return r


def team(names: list, filed: list, embed, classify, first: Result | None = None) -> Result:
    """Fast meaning match on everything, slow zero-shot only on doubtful ones."""
    t0 = time.perf_counter()
    m = first or meaning(names, filed, embed)
    doubtful = [i for i, k in enumerate(m.rank) if DOUBTFUL[0] <= k <= DOUBTFUL[1]]
    r = Result("Team: meaning, then zero-shot", rank=list(m.rank), best=list(m.best), suspicion=list(m.suspicion), flagged=[k > DOUBTFUL[1] for k in m.rank])
    if doubtful:
        z = zero_shot([names[i] for i in doubtful], [filed[i] for i in doubtful], classify)
        for j, i in enumerate(doubtful):
            r.rank[i], r.best[i], r.flagged[i] = z.rank[j], z.best[j], z.flagged[j]
            r.suspicion[i] = z.suspicion[j]
    # Time = the meaning pass (reused or run now) plus the zero-shot pass.
    r.seconds = (m.seconds if first else 0.0) + (time.perf_counter() - t0)
    r.model_calls = len(doubtful)
    return r
