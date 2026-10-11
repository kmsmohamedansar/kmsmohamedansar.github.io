"""Jev (TypeSafe's paid API), written to the second-hand spec.

OFF by default. It never sends anything unless JEV_ENABLED=1 and JEV_API_KEY
are both set, which only the owner does, by choice. The request already is
the spec's shape, so it is passed through with the Jev model name; the
response is checked like every other contender's. We test the public
pattern only and make no claim about how Jev works inside.
"""

import json
import os
import urllib.request

from ..base import SystemOne

URL = os.environ.get("JEV_URL", "https://api.typesafe.ai/v1/systemone")


class JevDisabled(RuntimeError):
    pass


def _post(url, body, key, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


class Jev(SystemOne):
    def __init__(self, model="jev-latest", post=_post, key=None, enabled=None):
        enabled = os.environ.get("JEV_ENABLED") == "1" if enabled is None else enabled
        key = key or os.environ.get("JEV_API_KEY")
        if not (enabled and key):
            raise JevDisabled("Jev is off. Set JEV_ENABLED=1 and JEV_API_KEY to run it (paid).")
        self.model, self.name = model, f"jev:{model}"
        self._post, self._key = post, key

    def answer(self, request):
        return self._post(URL, {**request, "model": self.model}, self._key)
