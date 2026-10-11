import unittest

from systemone import InvalidResponse, QUESTIONS, SystemOne, build_request


class Broken(SystemOne):
    name = "broken"

    def answer(self, request):
        return self.response("broken-1", {"is_urgent": self.noul(0.9)})  # misses two


class Overconfident(SystemOne):
    name = "overconfident"

    def answer(self, request):
        return self.response("o-1", {
            "is_urgent": self.noul(1),
            "team": self.choice({t: (1.0 if t == "sales" else 0.0) for t in QUESTIONS["team"]["options"]}),
            "frustration": self.score(QUESTIONS["frustration"], {5: 1.0}),
        })


class BaseChecks(unittest.TestCase):
    def test_broken_adapter_fails_loudly(self):
        with self.assertRaises(InvalidResponse):
            Broken().decide(build_request("hi"))

    def test_helpers_build_valid_answers(self):
        out = Overconfident().decide(build_request("hi"))
        self.assertEqual(out["answers"]["team"]["choice"], "sales")
        self.assertEqual(out["answers"]["team"]["confidence"], 1.0)
        self.assertEqual(out["answers"]["frustration"]["score"], 5.0)
        self.assertEqual(out["answers"]["frustration"]["probabilities"]["1"], 0.0)


if __name__ == "__main__":
    unittest.main()
