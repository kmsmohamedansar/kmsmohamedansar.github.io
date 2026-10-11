"""The baseline: keyword rules, no model.

Word lists were written from the labelling rules and the dev set only. Each
match adds weight to an answer; weights become probabilities with a softmax
(turns any set of scores into probabilities that add up to 1), so the rules
get a confidence like everyone else.

It only knows the project's three questions. For any other question it
answers with even odds, which is honest: it has no rule for it.
"""

import math
import re

from ..base import SystemOne
from ..schema import score_levels

TEAM_WORDS = {
    "billing": ["charge", "charged", "refund", "invoice from", "receipt", "subscription",
                "cancel", "plan", "price", "billing", "bill ", "paid", "pay two", "payment",
                "card", "vat", "purchase order", "yearly", "monthly", "discount again",
                "pay for", "paying"],
    "account-access": ["log in", "login", "logged out", "password", "reset", "locked",
                       "two-step", "2fa", "code", "single sign-on", "sso", "access",
                       "admin", "owner", "sign in", "sign-in", "permission", "invite"],
    "technical-support": ["error", "bug", "crash", "freez", "slow", "broken", "not load",
                          "won't load", "blank", "wrong", "missing", "doesn't", "does nothing",
                          "not appear", "white screen", "down", "500", "403", "greyed",
                          "deleted", "garbled", "cut off", "reset to zero", "vanish"],
    "integrations-api": ["api", "webhook", "sync", "integration", "connection", "connect",
                         "endpoint", "oauth", "accounting", "calendar", "export to",
                         "import", "payroll provider", "429", "401", "rate limit",
                         "sandbox", "pagination"],
    "security-privacy": ["hack", "phishing", "leak", "breach", "suspicious", "abroad",
                         "another country", "never been", "privacy", "gdpr", "delete all",
                         "delete my", "data protection", "processing agreement", "soc 2",
                         "encrypt", "audit log", "security", "someone changed",
                         "nobody here made", "visible to", "can see another",
                         "wrong person", "api key", "certificate"],
    "sales": ["quote", "demo", "pricing for", "how much", "enterprise", "users?", "staff across",
              "reseller", "resell", "partner program", "trial", "nonprofit", "charity",
              "charities", "education", "contract", "volume", "upgrade", "buy", "references",
              "competitor", "pilot", "budget"],
    "how-to": ["how do i", "how to", "how i can", "is there a way", "can i ", "where is",
               "where can", "is it possible", "can employees", "can staff", "can a manager",
               "guide", "set up", "figure out"],
    "feedback": ["would love", "feature request", "suggestion", "idea", "please add",
                 "would be great", "would help", "thank you", "thanks", "love it", "great",
                 "brilliant", "wish", "bring back", "consider", "nice job", "add a"],
}

URGENT_WORDS = ["can't log in", "cannot log", "locked", "nobody can", "can't get in",
                "down", "payroll", "tomorrow", "tonight", "today", "this afternoon",
                "charged twice", "double charge", "pay two", "two time", "twice",
                "hack", "phishing", "leak", "someone", "suspended", "losing money",
                "deleted", "lost", "white screen", "error 500", "salary", "within",
                "minutes", "can't pay", "wrong bank", "after cancelling"]

ANGRY_WORDS = ["ridiculous", "unacceptable", "again", "still", "third", "fourth",
               "three", "nobody", "no reply", "zero replies", "losing patience", "tired",
               "switch", "leave", "cancelling", "review", "dispute", "report",
               "done.", "last straw", "worse", "is anyone", "?!", "!!"]
FURIOUS_WORDS = ["lawyer", "legal", "consumer protection", "authority", "absolutely",
                 "call me", "i am done", "give me a reason"]
SARCASM_WORDS = ["love how", "love that", "oh good", "oh wonderful", "fantastic.",
                 "great job", "brilliant work", "truly", "really makes", "thrilled",
                 "sure,", "oh sure", "very trusting", "very minimalist", "what could go wrong",
                 "who needs", "favourite hobby", "bold choice", "excellent sales",
                 "very trustworthy", "great, the", "just love", "glad to see", "nice to know"]
CALM_WORDS = ["thank", "please", "love", "great", "would", "could you", "hi", "hello"]


def _hits(text, words):
    return sum(1 for w in words if w in text)


def _softmax(scores, sharpness=1.0):
    top = max(scores.values())
    exp = {k: math.exp(sharpness * (v - top)) for k, v in scores.items()}
    total = sum(exp.values())
    return {k: v / total for k, v in exp.items()}


def _text(state):
    if isinstance(state, str):
        return state
    if isinstance(state, dict):
        return " ".join(_text(v) for v in state.values())
    if isinstance(state, list):
        return " ".join(_text(v) for v in state)
    return str(state)


class Rules(SystemOne):
    name = "rules"

    def answer(self, request):
        raw = _text(request["state"])
        text = " " + raw.lower() + " "
        answers = {}
        for qid, q in request["questions"].items():
            if qid == "is_urgent" and q["type"] == "noul":
                answers[qid] = self.noul(self._urgent(text))
            elif qid == "team" and q["type"] == "choice":
                answers[qid] = self.choice(self._team(text, q["options"]))
            elif qid == "frustration" and q["type"] == "score":
                answers[qid] = self.score(q, self._frustration(raw, text, q))
            else:
                answers[qid] = self._even(q)
        return self.response("rules-1", answers)

    def _urgent(self, text):
        hits = _hits(text, URGENT_WORDS)
        # 0 hits -> 0.15, 1 -> about 0.5, 2+ -> 0.75 or more.
        return 1 / (1 + math.exp(-(1.8 * hits - 1.8)))

    def _team(self, text, options):
        scores = {o: float(_hits(text, TEAM_WORDS.get(o, []))) for o in options}
        if "security-privacy" in scores:  # the tie-break order in the rules
            scores["security-privacy"] += 0.5 * min(scores["security-privacy"], 1)
        return _softmax(scores, sharpness=1.2)

    def _frustration(self, raw, text, q):
        level = 1.0
        level += 0.8 * min(_hits(text, ANGRY_WORDS), 3)
        level += 1.5 * min(_hits(text, FURIOUS_WORDS), 1)
        level += 2.0 * min(_hits(text, SARCASM_WORDS), 1)
        letters = [c for c in raw if c.isalpha()]
        if len(letters) > 15 and sum(c.isupper() for c in letters) / len(letters) > 0.6:
            level += 2.5  # shouting
        if level == 1.0 and _hits(text, CALM_WORDS) == 0:
            level = 2.0  # no sign either way; rules say short and neutral is 2
        levels = score_levels(q)
        level = min(max(level, levels[0]), levels[-1])
        # Probability falls off with distance from the estimated level.
        return _softmax({v: -abs(v - level) for v in levels}, sharpness=1.5)

    def _even(self, q):
        if q["type"] == "noul":
            return self.noul(0.5)
        if q["type"] == "choice":
            return self.choice({o: 1 / len(q["options"]) for o in q["options"]})
        levels = score_levels(q)
        return self.score(q, {v: 1 / len(levels) for v in levels})
