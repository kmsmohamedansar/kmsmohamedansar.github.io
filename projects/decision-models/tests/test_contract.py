"""The same tests for every adapter in systemone.adapters.ADAPTERS.

Uses a fixed sample of dev rows that covers every hard-case tag. Never
touches the held-out set.
"""

import unittest

from systemone import InvalidRequest, SystemOne, build_request, load
import json
import os

from systemone.adapters import ADAPTERS, Jev, Ollama, SystemOneHTTP, Uniform


def sample_rows():
    rows = load("dev")
    picked, tags_seen = [], set()
    for r in rows:
        new = set(r["tags"]) - tags_seen
        if new:
            picked.append(r)
            tags_seen |= new
    return picked + [r for r in rows if r not in picked][: 10 - len(picked)]


ROWS = sample_rows()

# Questions unlike ours, to check adapters don't hard-code the three we use.
OTHER_QUESTIONS = {
    "polite": {"type": "noul", "instructions": "The writer is polite."},
    "language": {"type": "choice", "options": ["english", "other"],
                 "instructions": "Main language of the message."},
    "length": {"type": "score", "min": 0, "max": 9, "instructions": "0 very short to 9 very long."},
}


class Contract:
    adapter_class = None

    def setUp(self):
        self.adapter = self.adapter_class()

    def test_is_a_system_one_with_a_name(self):
        self.assertIsInstance(self.adapter, SystemOne)
        self.assertTrue(self.adapter.name)

    def test_answers_every_sample_row_in_spec_shape(self):
        for row in ROWS:
            with self.subTest(id=row["id"], tags=row["tags"]):
                self.adapter.decide(build_request(row["text"]))  # raises if invalid

    def test_answers_other_questions(self):
        self.adapter.decide({"model": "x", "state": "Hello there, quick one.",
                             "questions": OTHER_QUESTIONS})

    def test_answers_a_single_question(self):
        q = {"only": OTHER_QUESTIONS["polite"]}
        out = self.adapter.decide({"model": "x", "state": "thanks!", "questions": q})
        self.assertEqual(set(out["answers"]), {"only"})

    def test_accepts_object_state(self):
        state = {"subject": "Invoice", "body": "Where is my invoice?"}
        self.adapter.decide(build_request(state))

    def test_rejects_bad_request(self):
        with self.assertRaises(InvalidRequest):
            self.adapter.decide({"model": "x", "state": "hi", "questions": {}})


def fake_ollama(url, body):
    """Stands in for an Ollama server: sloppy but parseable probabilities."""
    schema = body["format"]["properties"]
    if "answer" in next(iter(schema.values()))["properties"]:  # v2 shape
        content = {qid: {"answer": spec["properties"]["answer"]["enum"][-1], "confidence": 0.7}
                   for qid, spec in schema.items()}
    else:  # v1: sloppy numbers that don't add up to 1, on purpose
        content = {qid: {k: float(i + 1) for i, k in enumerate(spec["required"])}
                   for qid, spec in schema.items()}
    return {"model": body["model"], "message": {"content": json.dumps(content)},
            "prompt_eval_count": 300, "eval_count": 60}


def fake_systemone(url, body, headers):
    """Stands in for a /v1/systemone server: spec shape plus an extra field."""
    assert url.endswith("/v1/systemone")
    for q in body["questions"].values():  # sent the way real servers want it
        assert "criteria" in q and "instructions" not in q, q
        q["instructions"] = q.pop("criteria")
    return {**Uniform().answer(body), "model": body["model"] + "-fake", "latency_ms": 12}


# How to build each adapter for the contract. Ollama talks to a real server
# only when OLLAMA_LIVE=1 (on the owner's Mac); Jev is never called for real.
FACTORIES = {
    "uniform": Uniform,
    "rules": ADAPTERS["rules"],
    "ollama": (Ollama if os.environ.get("OLLAMA_LIVE") == "1"
               else lambda: Ollama(post=fake_ollama)),
    "systemone-http": lambda: SystemOneHTTP("kev-4b", post=fake_systemone),
    "ollama-v2": lambda: Ollama(post=fake_ollama, prompt="v2"),
    "jev": lambda: Jev(post=fake_systemone, key="test", enabled=True),
}
assert set(ADAPTERS) <= set(FACTORIES), "every adapter needs a contract factory"

# One test class per adapter, e.g. Contract_rules.
for _name, _make in FACTORIES.items():
    _test = type(f"Contract_{_name}", (Contract, unittest.TestCase),
                 {"adapter_class": staticmethod(_make)})
    globals()[_test.__name__] = _test
del _name, _make, _test

if __name__ == "__main__":
    unittest.main()
