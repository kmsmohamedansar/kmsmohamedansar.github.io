"""The three questions every contender is asked, worded from
docs/labelling-rules.md. Fixed before the first scored run; change them only
with a dated note in NOTES.md."""

import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

TEAMS = [
    "billing", "account-access", "technical-support", "integrations-api",
    "security-privacy", "sales", "how-to", "feedback",
]

QUESTIONS = {
    "is_urgent": {
        "type": "noul",
        "instructions": (
            "This request needs a person to act on it today. True only if: the "
            "customer can't do core work in the product right now; money was "
            "taken wrongly or a failed charge is about to cut them off; a "
            "possible security problem; lost data they need back; or a real "
            "deadline within about a day with a stated cost. Angry tone or "
            "'ASAP' alone does not make it urgent."
        ),
    },
    "team": {
        "type": "choice",
        "options": TEAMS,
        "instructions": (
            "Which team should handle this request first? "
            "billing: charges, refunds, invoices from Quillstack, plan changes, cancelling. "
            "account-access: login, passwords, two-step codes, single sign-on, user access. "
            "technical-support: bugs, errors, crashes, slowness, wrong numbers in the app. "
            "integrations-api: the API, webhooks, API keys, connections to other tools. "
            "security-privacy: suspected break-ins, phishing, data exposure, data "
            "export or deletion, privacy paperwork. "
            "sales: buying for more people, quotes, discounts, demos. "
            "how-to: questions about features that work as designed. "
            "feedback: feature requests, suggestions, praise. "
            "If there are two problems, pick the one that most blocks the customer."
        ),
    },
    "frustration": {
        "type": "score",
        "min": 1,
        "max": 5,
        "instructions": (
            "How frustrated is the writer? 1 calm or positive; 2 mild "
            "inconvenience; 3 clearly annoyed but polite; 4 angry, repeated "
            "failures, threats to leave; 5 furious, insults or legal threats. "
            "Judge what they mean: sarcastic praise is frustration."
        ),
    },
}

# Which answer field holds the label for each question in the test set.
LABEL_FIELD = {"is_urgent": "urgent", "team": "team", "frustration": "frustration"}


def build_request(text, model="default"):
    return {"model": model, "state": text, "questions": QUESTIONS}


def load(split):
    """Load 'dev' or 'heldout' rows from data/."""
    if split not in ("dev", "heldout"):
        raise ValueError("split must be 'dev' or 'heldout'")
    path = DATA / f"{split}.jsonl"
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
