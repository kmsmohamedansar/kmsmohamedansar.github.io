"""Every contender, by name. The shared contract tests run against each one.

Add new adapters here. Paid ones (Jev) must stay off unless switched on.
"""

from .http import SystemOneHTTP
from .jev import Jev
from .ollama import Ollama
from .rules import Rules
from .uniform import Uniform

ADAPTERS = {
    "uniform": Uniform,
    "rules": Rules,
    "ollama": Ollama,  # needs a running Ollama server (owner's Mac)
    # Local open decision models (Kev, Strands Decider, Laya) on the owner's Mac,
    # each through its own /v1/systemone server. See docs/models.md.
    "systemone-http": SystemOneHTTP,
    "jev": Jev,  # paid, off unless JEV_ENABLED=1 and JEV_API_KEY are set
}

# Adapters that run with nothing outside this repo.
OFFLINE = ["uniform", "rules"]
