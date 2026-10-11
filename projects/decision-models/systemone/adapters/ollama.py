"""A normal small local model via Ollama, prompted to give probabilities.

Runs on the owner's Mac (`ollama pull qwen2.5:7b`, then `ollama serve`).
The model is asked for JSON in a fixed shape (Ollama's `format` option holds
it to that shape), temperature 0. Its stated probabilities are used as they
are, after small repairs that are counted in `self.repairs`:
- a missing option gets 0;
- probabilities that don't add up to 1 are scaled so they do;
- an answer with no usable probabilities gets even odds (and is counted).

Whether these stated probabilities are honest is exactly what step 4's
calibration chart tests.

Two prompt versions, both kept so the history is visible:
- v1: a probability for every allowed answer. On dev (2026-10-11) the model
  piled probability onto the first options listed: 174 of 200 team answers
  were one of the first three teams.
- v2: one answer (must be an allowed option) plus a confidence from 0 to 1.
  The confidence goes on that answer; the rest is shared by the other options
  (for a score scale: by the neighbouring levels, so the score isn't pulled
  toward the middle).
"""

import json
import os
import urllib.request

from ..base import SystemOne
from ..schema import score_levels

DEFAULT_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

SYSTEM_V2 = (
    "You judge customer support requests. For each question pick exactly one of "
    "the allowed answers and say how sure you are. Reply with JSON only, in "
    "exactly the requested shape."
)

SYSTEM = (
    "You judge customer support requests. For each question, give a probability "
    "for every allowed answer. Probabilities for one question add up to 1. Reply "
    "with JSON only, in exactly the requested shape."
)


def _post(url, body, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _keys(q):
    if q["type"] == "noul":
        return ["true", "false"]
    if q["type"] == "choice":
        return list(q["options"])
    return [str(v) for v in score_levels(q)]


def json_schema(questions):
    """Shape the model must reply in: {question id: {answer: probability}}."""
    return {
        "type": "object",
        "required": list(questions),
        "properties": {
            qid: {
                "type": "object",
                "required": _keys(q),
                "properties": {k: {"type": "number"} for k in _keys(q)},
            }
            for qid, q in questions.items()
        },
    }


def json_schema_v2(questions):
    """Shape for v2: {question id: {"answer": allowed answer, "confidence": number}}."""
    return {
        "type": "object",
        "required": list(questions),
        "properties": {
            qid: {
                "type": "object",
                "required": ["answer", "confidence"],
                "properties": {"answer": {"type": "string", "enum": _keys(q)},
                               "confidence": {"type": "number"}},
            }
            for qid, q in questions.items()
        },
    }


def spread(keys, answer, confidence, neighbours_only=False):
    """Confidence on the answer; the rest shared by the others."""
    c = min(max(float(confidence), 0.0), 1.0)
    i = keys.index(answer)
    others = [k for j, k in enumerate(keys) if j != i and (not neighbours_only or abs(j - i) == 1)]
    probs = {k: 0.0 for k in keys}
    probs[answer] = c
    for k in others:
        probs[k] = (1 - c) / len(others)
    return probs


def prompt(request, version="v1"):
    lines = ["Request to judge:", json.dumps(request["state"], ensure_ascii=False), "",
             "Questions:"]
    for qid, q in request["questions"].items():
        if q["type"] == "noul":
            kind = "Is this statement true or false? Answers: true, false."
        elif q["type"] == "choice":
            kind = "Pick one. Answers: " + ", ".join(q["options"]) + "."
        else:
            kind = f"Rate on the scale {q['min']} to {q['max']}. Answers: " + ", ".join(_keys(q)) + "."
        lines.append(f"- {qid}: {q['instructions']} {kind}")
    if version == "v2":
        lines += ["", "For each question give your single best answer and how sure you are, "
                  "from 0 (a guess) to 1 (certain).",
                  'Reply as {"<question id>": {"answer": "<answer>", "confidence": <0 to 1>}, ...}.']
    else:
        lines += ["", 'Reply as {"<question id>": {"<answer>": <probability>, ...}, ...}.']
    return "\n".join(lines)


class Ollama(SystemOne):
    def __init__(self, model=DEFAULT_MODEL, url=DEFAULT_URL, post=_post, prompt="v1"):
        if prompt not in ("v1", "v2"):
            raise ValueError("prompt must be v1 or v2")
        self.model = model
        self.url = url.rstrip("/")
        self.version = prompt
        self.name = f"ollama:{model}" if prompt == "v1" else f"ollama-{prompt}:{model}"
        self._post = post
        self.repairs = {"missing_option": 0, "rescaled": 0, "no_probabilities": 0}

    def answer(self, request):
        body = {
            "model": self.model,
            "stream": False,
            "format": (json_schema_v2 if self.version == "v2" else json_schema)(request["questions"]),
            "options": {"temperature": 0, "seed": 0},
            "messages": [{"role": "system", "content": SYSTEM},
                         {"role": "user", "content": prompt(request)}],
        }
        reply = self._post(f"{self.url}/api/chat", body)
        try:
            raw = json.loads(reply["message"]["content"])
        except (KeyError, TypeError, json.JSONDecodeError):
            raw = {}
        answers = {}
        for qid, q in request["questions"].items():
            given = raw.get(qid) if isinstance(raw, dict) else None
            if self.version == "v2":
                probs = self._from_answer(given, q)
            else:
                probs = self._clean(given, _keys(q))
            if q["type"] == "noul":
                answers[qid] = self.noul(probs["true"])
            elif q["type"] == "choice":
                answers[qid] = self.choice(probs)
            else:
                answers[qid] = self.score(q, probs)
        return self.response(
            reply.get("model", self.model), answers,
            input_tokens=int(reply.get("prompt_eval_count", 0)),
            output_tokens=int(reply.get("eval_count", 0)),
        )

    def _from_answer(self, given, q):
        keys = _keys(q)
        if not (isinstance(given, dict) and given.get("answer") in keys):
            self.repairs["no_probabilities"] += 1
            return {k: 1 / len(keys) for k in keys}
        conf = given.get("confidence")
        if not isinstance(conf, (int, float)) or isinstance(conf, bool) or not 0 <= conf <= 1:
            self.repairs["missing_option"] += 1  # unusable confidence: treat as a coin flip
            conf = 1 / len(keys)
        # The named answer must stay the most likely one: below even odds,
        # raise it to even odds and count it.
        n = len(keys) if q["type"] != "score" else 1 + sum(
            1 for j in range(len(keys)) if abs(j - keys.index(given["answer"])) == 1)
        if conf < 1 / n:
            self.repairs["rescaled"] += 1
            conf = 1 / n
        return spread(keys, given["answer"], conf, neighbours_only=q["type"] == "score")

    def _clean(self, given, keys):
        given = given if isinstance(given, dict) else {}
        probs = {}
        for k in keys:
            v = given.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0:
                probs[k] = float(v)
            else:
                probs[k] = 0.0
                self.repairs["missing_option"] += 1
        total = sum(probs.values())
        if total <= 0:
            self.repairs["no_probabilities"] += 1
            return {k: 1 / len(keys) for k in keys}
        if abs(total - 1) > 1e-6:
            self.repairs["rescaled"] += 1
        return {k: v / total for k, v in probs.items()}
