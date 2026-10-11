"""The floor: knows nothing, spreads probability evenly.

Any real contender should beat this. It also checks the interface itself:
its confidence is as low as it can be, so it should look perfectly humble on
the calibration chart.
"""

from ..base import SystemOne
from ..schema import score_levels


class Uniform(SystemOne):
    name = "uniform"

    def answer(self, request):
        answers = {}
        for qid, q in request["questions"].items():
            if q["type"] == "noul":
                answers[qid] = self.noul(0.5)
            elif q["type"] == "choice":
                p = 1 / len(q["options"])
                answers[qid] = self.choice({o: p for o in q["options"]})
            else:
                levels = score_levels(q)
                answers[qid] = self.score(q, {v: 1 / len(levels) for v in levels})
        return self.response("uniform-1", answers)
