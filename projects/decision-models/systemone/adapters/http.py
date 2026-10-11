"""Any server that speaks the System One shape over HTTP.

Kev (`python -m kev.serve`), Strands Decider (`strands-decider serve`) and
Laya (`laya-serve`) all say in their READMEs that they serve
`POST /v1/systemone` in this shape. They run on the owner's Mac; this adapter
just sends the request and checks the answer like everyone else's. Extra
fields a server adds (e.g. `latency_ms`) are dropped so every contender
returns the same shape.
"""

import json
import urllib.error
import urllib.request

from ..base import SystemOne
from ..schema import score_levels


def _post(url, body, headers=None, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={
        "Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        # Show the server's own explanation, not just the status code.
        raise RuntimeError(f"{url} said {e.code}: {e.read().decode(errors='replace')[:2000]}") from None


def to_wire(request):
    """Translate our questions into the shape real System One servers accept.

    Found against Kev's server and README (2026-10-11), which follow
    TypeSafe's API: the question text stays in "instructions", and the
    allowed answers go in "criteria":
    - choice: {option: description or null}; we send null, since each
      option's description is already in the instructions;
    - score: a list of level descriptions, lowest first; we send the level
      numbers ("1" .. "5"), since the rubric is already in the instructions;
    - noul: criteria is optional; not sent.
    The wording every contender sees is identical.
    """
    questions = {}
    for qid, q in request["questions"].items():
        w = {"type": q["type"], "instructions": q["instructions"]}
        if q["type"] == "choice":
            w["criteria"] = {o: None for o in q["options"]}
        elif q["type"] == "score":
            w["criteria"] = [str(v) for v in score_levels(q)]
        questions[qid] = w
    return {**request, "questions": questions}


def from_wire(request, answers):
    """Score levels come back indexed from 0; map them to our min..max."""
    if not isinstance(answers, dict):
        return answers
    out = {}
    for qid, a in answers.items():
        q = request["questions"].get(qid)
        if q and q["type"] == "score" and isinstance(a, dict):
            levels = score_levels(q)
            probs = a.get("probabilities") or {}
            a = {
                "type": "score",
                "score": q["min"] + a["score"] if isinstance(a.get("score"), (int, float)) else a.get("score"),
                "probabilities": {str(levels[int(k)]): v for k, v in probs.items()
                                  if str(k).isdigit() and int(k) < len(levels)},
                "confidence": a.get("confidence"),
            }
        out[qid] = a
    return out


class SystemOneHTTP(SystemOne):
    def __init__(self, model, url="http://localhost:8000", name=None, post=_post, headers=None):
        self.model = model
        self.url = url.rstrip("/") + "/v1/systemone"
        self.name = name or f"http:{model}"
        self._post, self._headers = post, headers or {}

    def answer(self, request):
        reply = self._post(self.url, to_wire({**request, "model": self.model}), self._headers)
        if not isinstance(reply, dict):
            return reply  # decide() will reject it
        usage = reply.get("usage") or {}
        return {
            "model": reply.get("model", self.model),
            "answers": from_wire(request, reply.get("answers")),
            "usage": {"input_tokens": usage.get("input_tokens", 0),
                      "output_tokens": usage.get("output_tokens", 0)},
        }
