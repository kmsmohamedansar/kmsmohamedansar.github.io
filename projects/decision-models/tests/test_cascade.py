import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from cascade import pick, simulate  # noqa: E402

TEAMS = ["billing", "sales"]


def answer(urgent_p, team, conf):
    other = [t for t in TEAMS if t != team][0]
    return {"response": {"answers": {
        "is_urgent": {"type": "noul", "noul": urgent_p},
        "team": {"type": "choice", "choice": team, "confidence": conf,
                 "probabilities": {team: conf, other: 1 - conf}},
        "frustration": {"type": "score", "score": 2.0, "confidence": 0.9,
                        "probabilities": {"1": 0.05, "2": 0.9, "3": 0.05, "4": 0, "5": 0}},
    }}}


KEY = {"a": {"urgent": False, "team": "billing", "frustration": 2},
       "b": {"urgent": True, "team": "sales", "frustration": 2}}
# Fast: sure and right on a; unsure and wrong on b.
FAST = {"a": {**answer(0.1, "billing", 0.95), "seconds": 0.01},
        "b": {**answer(0.4, "billing", 0.55), "seconds": 0.01}}
# Slow: right on both, but slow.
SLOW = {"a": {**answer(0.1, "billing", 0.9), "seconds": 2.0},
        "b": {**answer(0.9, "sales", 0.9), "seconds": 2.0}}


class Cascade(unittest.TestCase):
    def test_hands_over_only_unsure_requests(self):
        s = simulate(FAST, SLOW, KEY, 0.6)
        self.assertEqual(s["handed_over"], 1)
        self.assertEqual(s["team_accuracy"], 1.0)
        self.assertAlmostEqual(s["seconds_total"], 2.02)

    def test_threshold_zero_is_fast_alone(self):
        s = simulate(FAST, SLOW, KEY, 0.0)
        self.assertEqual((s["handed_over"], s["team_accuracy"]), (0, 0.5))

    def test_picks_lowest_threshold_that_matches_slow(self):
        sweep = [simulate(FAST, SLOW, KEY, t) for t in (0.0, 0.3, 0.6, 1.0)]
        slow = simulate(FAST, SLOW, KEY, 1.01)
        self.assertEqual(pick(sweep, slow), (0.6, True))

    def test_reports_when_fast_never_helps(self):
        sweep = [simulate(FAST, SLOW, KEY, 0.0)]
        self.assertEqual(pick(sweep, simulate(FAST, SLOW, KEY, 1.01)), (1.0, False))


if __name__ == "__main__":
    unittest.main()
