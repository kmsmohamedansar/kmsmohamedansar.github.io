"""The same tests for every adapter in systemone.adapters.ADAPTERS.

Uses a fixed sample of dev rows that covers every hard-case tag. Never
touches the held-out set.
"""

import unittest

from systemone import InvalidRequest, SystemOne, build_request, load
from systemone.adapters import ADAPTERS


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


# One test class per adapter, e.g. ContractUniform.
for _name, _cls in ADAPTERS.items():
    _test = type(f"Contract_{_name}", (Contract, unittest.TestCase), {"adapter_class": _cls})
    globals()[_test.__name__] = _test
del _name, _cls, _test

if __name__ == "__main__":
    unittest.main()
