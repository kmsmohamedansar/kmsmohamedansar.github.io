import json

import numpy as np
import pandas as pd
import pytest

from catalogue import checkers as ck
from catalogue.categories import NAMES
from catalogue.fetch import keep
from catalogue.keyset import build_answer_key, handcheck_sheet
from catalogue.run import fake_classify, fake_embed, score
from tests.fixtures import products


def test_answer_key_has_300_clean_and_50_planted_errors():
    key = build_answer_key(products())
    assert len(key) == 350 and key["planted"].sum() == 50
    planted = key[key["planted"]]
    assert (planted["category"] != planted["true_category"]).all()
    clean = key[~key["planted"]]
    assert (clean["category"] == clean["true_category"]).all()


def test_answer_key_is_the_same_every_time_and_spread_over_categories():
    a, b = build_answer_key(products()), build_answer_key(products())
    pd.testing.assert_frame_equal(a, b)
    counts = a["true_category"].value_counts()
    assert counts.max() - counts.min() <= 1


def test_answer_key_refuses_too_little_data():
    with pytest.raises(ValueError, match="Only"):
        build_answer_key(products(per_category=5))


def test_handcheck_sheet_only_uses_unchanged_products():
    key = build_answer_key(products())
    sheet = handcheck_sheet(key)
    assert len(sheet) == 50 and set(sheet["code"]) <= set(key[~key["planted"]]["code"])
    assert (sheet["looks_right"] == "").all()


def test_score_counts_precision_and_recall():
    s = score([True, True, False, False], [True, False, True, False])
    assert s == {"caught": 1, "false_alarms": 1, "missed": 1, "flagged": 2, "precision": 0.5, "recall": 0.5}


def test_keyword_checker_flags_names_without_the_category_word():
    r = ck.keyword(["Green Tea", "Steak pie", "Oat Biscuits"], ["Teas", "Teas", "Crisps"])
    assert r.flagged == [False, True, True]
    assert r.best[2] == "Biscuits"  # it can name the category the word belongs to


def test_ranks_and_suspicion_from_scores():
    scores = np.zeros((2, len(NAMES)))
    scores[0, NAMES.index("Teas")] = 0.9
    scores[1, NAMES.index("Jams")] = 0.8
    scores[1, NAMES.index("Teas")] = 0.3
    rank, best, susp = ck._ranks_from_scores(scores, ["Teas", "Teas"])
    assert rank == [1, 2] and best == ["Teas", "Jams"]
    assert susp[0] < 0 < susp[1]


def test_team_only_sends_doubtful_ones_to_the_slow_model():
    calls = []

    def counting_classify(names):
        calls.append(len(names))
        return fake_classify(names)

    key = build_answer_key(products())
    names, filed = key["name"].tolist(), key["category"].tolist()
    m = ck.meaning(names, filed, fake_embed)
    t = ck.team(names, filed, fake_embed, counting_classify, first=m)
    doubtful = sum(2 <= k <= 3 for k in m.rank)
    assert calls == ([doubtful] if doubtful else []) and t.model_calls == doubtful
    # Clear passes stay passed, clear misses stay flagged.
    for k, f in zip(m.rank, t.flagged):
        if k == 1:
            assert not f
        if k >= 4:
            assert f


def test_fetch_keeps_only_products_in_exactly_one_of_our_categories():
    p = {"code": "1", "product_name": "Green Tea", "brands": "Kestrel,Other", "categories_tags": ["en:beverages", "en:teas"]}
    assert keep(p, "Teas") == {"code": "1", "name": "Green Tea", "brand": "Kestrel", "category": "Teas"}
    both = dict(p, categories_tags=["en:teas", "en:honeys"])
    assert keep(both, "Teas") is None
    assert keep(dict(p, product_name="Thé vert"), "Teas") is None  # not English-looking


def test_end_to_end_with_stand_in_models(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data/raw").mkdir(parents=True)
    products().to_csv(tmp_path / "data/raw/products.csv", index=False)
    import sys
    from catalogue import run

    for cmd in (["key"], ["eval", "--fake"], ["scale", "--fake", "--n", "200"], ["report", "--fake"]):
        monkeypatch.setattr(sys, "argv", ["catalogue", *cmd])
        run.main()
    ev = json.loads((tmp_path / "results/fake/eval.json").read_text())
    assert ev["fake_models"] is True and len(ev["checkers"]) == 4
    assert not (tmp_path / "results/eval.json").exists()  # fake runs never land in the real results
    review = pd.read_csv(tmp_path / "results/fake/review_list.csv")
    assert list(review.columns) == ["code", "name", "category", "best", "suspicion", "reason"]
    assert all("top50_real_errors" in c for c in ev["checkers"])
    assert "brand" not in pd.read_csv(tmp_path / "data/answer_key.csv").columns
    assert (tmp_path / "results/fake/speed-vs-catch.png").exists()
