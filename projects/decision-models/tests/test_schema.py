import copy
import unittest

from systemone import QUESTIONS, build_request, check_request, check_response

# The example from docs/jev-api-spec.md, filled out to a complete response.
SPEC_REQUEST = {
    "model": "jev-latest",
    "state": "I have been trying to connect Stripe for 3 days and the integration "
             "keeps failing. I am losing sales.",
    "questions": {
        "is_urgent": {"type": "noul", "instructions": "The customer needs help now."},
        "department": {"type": "choice", "options": ["billing", "technical-support", "sales"],
                       "instructions": "Route to a team."},
        "frustration_score": {"type": "score", "min": 1, "max": 5,
                              "instructions": "1 calm to 5 furious."},
    },
}
SPEC_RESPONSE = {
    "model": "jev-1.13.0",
    "answers": {
        "is_urgent": {"type": "noul", "noul": 0.97},
        "department": {"type": "choice", "choice": "technical-support", "confidence": 0.89,
                       "probabilities": {"billing": 0.08, "technical-support": 0.82, "sales": 0.10}},
        "frustration_score": {"type": "score", "score": 4.62, "confidence": 0.91,
                              "probabilities": {"1": 0.0, "2": 0.0, "3": 0.04, "4": 0.30, "5": 0.66}},
    },
    "usage": {"input_tokens": 312, "output_tokens": 64},
}


class RequestChecks(unittest.TestCase):
    def test_spec_example_and_our_questions_are_valid(self):
        self.assertEqual(check_request(SPEC_REQUEST), [])
        self.assertEqual(check_request(build_request("hello")), [])

    def test_bad_requests_are_caught(self):
        bad = [
            {},
            {"model": "m", "state": 5, "questions": QUESTIONS},
            {"model": "m", "state": "x", "questions": {}},
            {"model": "m", "state": "x", "questions": {"q": {"type": "maybe", "instructions": "x"}}},
            {"model": "m", "state": "x", "questions": {"q": {"type": "choice", "options": ["a"], "instructions": "x"}}},
            {"model": "m", "state": "x", "questions": {"q": {"type": "choice", "options": ["a", "a"], "instructions": "x"}}},
            {"model": "m", "state": "x", "questions": {"q": {"type": "score", "min": 1, "max": 11, "instructions": "x"}}},
            {"model": "m", "state": "x", "questions": {"q": {"type": "noul", "instructions": ""}}},
        ]
        for r in bad:
            with self.subTest(r=r):
                self.assertNotEqual(check_request(r), [])


class ResponseChecks(unittest.TestCase):
    def test_spec_example_is_valid(self):
        self.assertEqual(check_response(SPEC_REQUEST, SPEC_RESPONSE), [])

    def broken(self, change):
        r = copy.deepcopy(SPEC_RESPONSE)
        change(r)
        return check_response(SPEC_REQUEST, r)

    def test_bad_responses_are_caught(self):
        a = lambda r: r["answers"]
        cases = {
            "missing answer": lambda r: a(r).pop("is_urgent"),
            "extra answer": lambda r: a(r).update(extra={"type": "noul", "noul": 1}),
            "noul over 1": lambda r: a(r)["is_urgent"].update(noul=1.2),
            "noul is bool": lambda r: a(r)["is_urgent"].update(noul=True),
            "wrong type": lambda r: a(r)["is_urgent"].update(type="score"),
            "choice not an option": lambda r: a(r)["department"].update(choice="legal"),
            "choice not the top": lambda r: a(r)["department"].update(choice="sales"),
            "probs missing a key": lambda r: a(r)["department"]["probabilities"].pop("sales"),
            "probs not summing to 1": lambda r: a(r)["department"]["probabilities"].update(sales=0.5),
            "no confidence": lambda r: a(r)["department"].pop("confidence"),
            "score not weighted": lambda r: a(r)["frustration_score"].update(score=3.0),
            "no usage": lambda r: r.pop("usage"),
            "no model": lambda r: r.update(model=""),
        }
        for name, change in cases.items():
            with self.subTest(name):
                self.assertNotEqual(self.broken(change), [])


if __name__ == "__main__":
    unittest.main()
