"""The one interface every contender sits behind."""

from abc import ABC, abstractmethod

from .schema import check_request, check_response, score_levels


class InvalidRequest(ValueError):
    pass


class InvalidResponse(ValueError):
    pass


class SystemOne(ABC):
    """A contender: takes a System One request, returns a System One response.

    Subclasses implement `answer()`. `decide()` checks the request before and
    the response after, so a broken adapter fails loudly instead of being
    scored. Helpers below build answers in the spec's shape.
    """

    #: Short name used in results, e.g. "rules" or "ollama:qwen2.5:7b".
    name: str = ""

    def decide(self, request):
        errors = check_request(request)
        if errors:
            raise InvalidRequest("; ".join(errors))
        response = self.answer(request)
        errors = check_response(request, response)
        if errors:
            raise InvalidResponse(f"{self.name}: " + "; ".join(errors))
        return response

    @abstractmethod
    def answer(self, request):
        """Return {"model", "answers", "usage"} for a checked request."""

    # Helpers for building answers.

    @staticmethod
    def noul(p):
        return {"type": "noul", "noul": float(p)}

    @staticmethod
    def choice(probabilities, confidence=None):
        """Pick the most likely option. Confidence defaults to its probability.

        The spec's confidence is not always the top probability (its example
        has 0.89 vs 0.82); how Jev derives it is unknown, so adapters that
        have no better signal use the top probability.
        """
        best = max(probabilities, key=probabilities.get)
        return {
            "type": "choice",
            "choice": best,
            "probabilities": dict(probabilities),
            "confidence": probabilities[best] if confidence is None else confidence,
        }

    @staticmethod
    def score(question, probabilities, confidence=None):
        """Score = probability-weighted level. Keys may be ints or strings."""
        probs = {str(v): float(probabilities.get(v, probabilities.get(str(v), 0.0)))
                 for v in score_levels(question)}
        return {
            "type": "score",
            "score": sum(int(k) * p for k, p in probs.items()),
            "probabilities": probs,
            "confidence": max(probs.values()) if confidence is None else confidence,
        }

    @staticmethod
    def response(model, answers, input_tokens=0, output_tokens=0):
        return {
            "model": model,
            "answers": answers,
            "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
        }
