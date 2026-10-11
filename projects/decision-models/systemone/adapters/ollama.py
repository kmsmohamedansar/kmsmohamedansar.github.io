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
"""

import json
import os
import urllib.request

from ..base import SystemOne
from ..schema import score_levels

DEFAULT_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")

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


def prompt(request):
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
    lines += ["", 'Reply as {"<question id>": {"<answer>": <probability>, ...}, ...}.']
    return "\n".join(lines)


class Ollama(SystemOne):
    def __init__(self, model=DEFAULT_MODEL, url=DEFAULT_URL, post=_post):
        self.model = model
        self.url = url.rstrip("/")
        self.name = f"ollama:{model}"
        self._post = post
        self.repairs = {"missing_option": 0, "rescaled": 0, "no_probabilities": 0}

    def answer(self, request):
        body = {
            "model": self.model,
            "stream": False,
            "format": json_schema(request["questions"]),
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
            probs = self._clean(raw.get(qid) if isinstance(raw, dict) else None, _keys(q))
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
