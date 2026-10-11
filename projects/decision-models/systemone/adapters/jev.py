"""Jev (TypeSafe's paid API), written to the second-hand spec.

OFF by default. It never sends anything unless JEV_ENABLED=1 and JEV_API_KEY
are both set, which only the owner does, by choice. Same HTTP shape as the
local System One servers, plus a key. We test the public pattern only and
make no claim about how Jev works inside.
"""

import os

from .http import SystemOneHTTP, _post

URL = os.environ.get("JEV_URL", "https://api.typesafe.ai")


class JevDisabled(RuntimeError):
    pass


class Jev(SystemOneHTTP):
    def __init__(self, model="jev-latest", post=_post, key=None, enabled=None):
        enabled = os.environ.get("JEV_ENABLED") == "1" if enabled is None else enabled
        key = key or os.environ.get("JEV_API_KEY")
        if not (enabled and key):
            raise JevDisabled("Jev is off. Set JEV_ENABLED=1 and JEV_API_KEY to run it (paid).")
        super().__init__(model, url=URL, name=f"jev:{model}", post=post,
                         headers={"Authorization": f"Bearer {key}"})
