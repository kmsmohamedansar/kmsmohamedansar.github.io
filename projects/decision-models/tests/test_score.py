import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from score import calibration, confidence_and_correct  # noqa: E402


class Calibration(unittest.TestCase):
    def test_honest_confidence_has_zero_error(self):
        pairs = [(0.8, True)] * 8 + [(0.8, False)] * 2
        table, ece = calibration(pairs)
        self.assertEqual(ece, 0.0)
        self.assertEqual(table[0]["n"], 10)

    def test_overconfidence_shows_as_the_gap(self):
        _, ece = calibration([(0.9, True), (0.9, False)])
        self.assertAlmostEqual(ece, 0.4)

    def test_confidence_one_goes_in_top_group(self):
        table, _ = calibration([(1.0, True)])
        self.assertEqual(table[0]["from"], 0.9)


class Correctness(unittest.TestCase):
    row = {"urgent": False, "team": "sales", "frustration": 2}

    def test_noul_confidence_is_distance_from_a_coin_flip(self):
        self.assertEqual(confidence_and_correct("is_urgent", {"noul": 0.1}, self.row), (0.9, True))

    def test_score_uses_most_likely_level(self):
        a = {"confidence": 0.6, "probabilities": {"1": 0.1, "2": 0.6, "3": 0.3, "4": 0, "5": 0}}
        self.assertEqual(confidence_and_correct("frustration", a, self.row), (0.6, True))


if __name__ == "__main__":
    unittest.main()
