"""Checks for the System One request and response shapes.

The shapes follow docs/jev-api-spec.md. Requests and responses are plain
dicts, exactly as they would travel as JSON, so a real API adapter can pass
them straight through. Each check returns a list of problems; empty = valid.
"""

import math

QUESTION_TYPES = ("noul", "choice", "score")
MAX_OPTIONS = 255
SCORE_LEVELS = (2, 10)  # a score scale has 2 to 10 levels
TOL = 1e-6  # allowed rounding error when probabilities should add up to 1


def score_levels(question):
    return list(range(question["min"], question["max"] + 1))


def check_request(request):
    errors = []
    if not isinstance(request, dict):
        return ["request must be an object"]
    for field in ("model", "state", "questions"):
        if field not in request:
            errors.append(f"request missing '{field}'")
    if errors:
        return errors
    if not isinstance(request["model"], str):
        errors.append("model must be a string")
    if not isinstance(request["state"], (str, dict, list)):
        errors.append("state must be a string, object or array")
    questions = request["questions"]
    if not isinstance(questions, dict) or not questions:
        return errors + ["questions must be a non-empty map of id to question"]
    for qid, q in questions.items():
        errors += [f"question '{qid}': {e}" for e in _check_question(q)]
    return errors


def _check_question(q):
    if not isinstance(q, dict) or q.get("type") not in QUESTION_TYPES:
        return [f"type must be one of {QUESTION_TYPES}"]
    errors = []
    if not isinstance(q.get("instructions"), str) or not q["instructions"].strip():
        errors.append("needs non-empty instructions")
    if q["type"] == "choice":
        opts = q.get("options")
        if not isinstance(opts, list) or not 2 <= len(opts) <= MAX_OPTIONS:
            errors.append(f"options must be a list of 2 to {MAX_OPTIONS}")
        elif len(set(opts)) != len(opts) or not all(isinstance(o, str) for o in opts):
            errors.append("options must be distinct strings")
    if q["type"] == "score":
        lo, hi = q.get("min"), q.get("max")
        if not (isinstance(lo, int) and isinstance(hi, int)):
            errors.append("min and max must be whole numbers")
        elif not SCORE_LEVELS[0] <= hi - lo + 1 <= SCORE_LEVELS[1]:
            errors.append(f"scale must have {SCORE_LEVELS[0]} to {SCORE_LEVELS[1]} levels")
    return errors


def check_response(request, response):
    """Check a response against the request it answers."""
    if not isinstance(response, dict):
        return ["response must be an object"]
    errors = []
    if not isinstance(response.get("model"), str) or not response["model"]:
        errors.append("response needs a non-empty 'model'")
    usage = response.get("usage")
    if not isinstance(usage, dict) or not all(
        isinstance(usage.get(k), int) and usage[k] >= 0
        for k in ("input_tokens", "output_tokens")
    ):
        errors.append("usage needs whole-number input_tokens and output_tokens")
    answers = response.get("answers")
    if not isinstance(answers, dict):
        return errors + ["answers must be a map of id to answer"]
    asked, got = set(request["questions"]), set(answers)
    if asked - got:
        errors.append(f"missing answers: {sorted(asked - got)}")
    if got - asked:
        errors.append(f"answers to questions not asked: {sorted(got - asked)}")
    for qid in sorted(asked & got):
        errors += [f"answer '{qid}': {e}" for e in
                   _check_answer(request["questions"][qid], answers[qid])]
    return errors


def _is_prob(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) \
        and math.isfinite(x) and 0 <= x <= 1


def _check_answer(q, a):
    if not isinstance(a, dict) or a.get("type") != q["type"]:
        return [f"type must be '{q['type']}'"]
    if q["type"] == "noul":
        return [] if _is_prob(a.get("noul")) else ["noul must be a probability 0 to 1"]

    errors = []
    if not _is_prob(a.get("confidence")):
        errors.append("confidence must be 0 to 1")
    keys = q["options"] if q["type"] == "choice" else [str(v) for v in score_levels(q)]
    probs = a.get("probabilities")
    if not isinstance(probs, dict) or set(probs) != set(keys):
        return errors + [f"probabilities must have exactly these keys: {keys}"]
    if not all(_is_prob(p) for p in probs.values()):
        return errors + ["each probability must be 0 to 1"]
    if abs(sum(probs.values()) - 1) > TOL:
        errors.append(f"probabilities add up to {sum(probs.values()):.4f}, not 1")

    if q["type"] == "choice":
        if a.get("choice") not in q["options"]:
            errors.append("choice must be one of the options")
        elif probs[a["choice"]] < max(probs.values()) - TOL:
            errors.append("choice must be the most likely option")
    else:
        expected = sum(int(k) * p for k, p in probs.items())
        s = a.get("score")
        if not isinstance(s, (int, float)) or abs(s - expected) > 1e-3:
            errors.append(f"score must be the probability-weighted level ({expected:.3f})")
    return errors
