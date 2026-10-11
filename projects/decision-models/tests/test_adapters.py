import json
import os
import unittest
from unittest import mock

from systemone import build_request
from systemone.adapters import Jev, Ollama
from systemone.adapters.jev import JevDisabled


class JevIsOffByDefault(unittest.TestCase):
    def test_refuses_without_switch_and_key(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(JevDisabled):
                Jev()
        with mock.patch.dict(os.environ, {"JEV_API_KEY": "k"}, clear=True):
            with self.assertRaises(JevDisabled):
                Jev()  # key alone isn't enough
        with mock.patch.dict(os.environ, {"JEV_ENABLED": "1"}, clear=True):
            with self.assertRaises(JevDisabled):
                Jev()  # switch alone isn't enough


def reply(content):
    return lambda url, body: {"message": {"content": content}}


class OllamaRepairs(unittest.TestCase):
    def run_with(self, content):
        o = Ollama(post=reply(content))
        return o, o.decide(build_request("hi"))["answers"]

    def test_good_reply_used_as_is(self):
        content = json.dumps({
            "is_urgent": {"true": 0.2, "false": 0.8},
            "team": {t: (0.65 if t == "how-to" else 0.05) for t in
                     ["billing", "account-access", "technical-support", "integrations-api",
                      "security-privacy", "sales", "how-to", "feedback"]},
            "frustration": {"1": 0.7, "2": 0.3, "3": 0, "4": 0, "5": 0},
        })
        o, a = self.run_with(content)
        self.assertAlmostEqual(a["is_urgent"]["noul"], 0.2)
        self.assertEqual(a["team"]["choice"], "how-to")
        self.assertAlmostEqual(a["frustration"]["score"], 1.3)
        self.assertEqual(o.repairs, {"missing_option": 0, "rescaled": 0, "no_probabilities": 0})

    def test_bad_reply_gets_even_odds_and_is_counted(self):
        o, a = self.run_with("not json at all")
        self.assertEqual(a["is_urgent"]["noul"], 0.5)
        self.assertEqual(o.repairs["no_probabilities"], 3)

    def test_partial_reply_is_repaired_and_counted(self):
        o, a = self.run_with(json.dumps({"is_urgent": {"true": 3, "false": 1},
                                         "team": {"sales": 1}, "frustration": {}}))
        self.assertAlmostEqual(a["is_urgent"]["noul"], 0.75)
        self.assertEqual(a["team"]["choice"], "sales")
        self.assertEqual(o.repairs["missing_option"], 7 + 5)
        self.assertGreaterEqual(o.repairs["rescaled"], 1)


if __name__ == "__main__":
    unittest.main()
