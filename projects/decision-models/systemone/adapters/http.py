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


def _post(url, body, headers=None, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={
        "Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        # Show the server's own explanation, not just the status code.
        raise RuntimeError(f"{url} said {e.code}: {e.read().decode(errors='replace')[:2000]}") from None


class SystemOneHTTP(SystemOne):
    def __init__(self, model, url="http://localhost:8000", name=None, post=_post, headers=None):
        self.model = model
        self.url = url.rstrip("/") + "/v1/systemone"
        self.name = name or f"http:{model}"
        self._post, self._headers = post, headers or {}

    def answer(self, request):
        reply = self._post(self.url, {**request, "model": self.model}, self._headers)
        if not isinstance(reply, dict):
            return reply  # decide() will reject it
        usage = reply.get("usage") or {}
        return {
            "model": reply.get("model", self.model),
            "answers": reply.get("answers"),
            "usage": {"input_tokens": usage.get("input_tokens", 0),
                      "output_tokens": usage.get("output_tokens", 0)},
        }
