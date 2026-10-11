"""Every contender, by name. The shared contract tests run against each one.

Add new adapters here. Paid ones (Jev) must stay off unless switched on.
"""

from .uniform import Uniform

ADAPTERS = {
    "uniform": Uniform,
}
