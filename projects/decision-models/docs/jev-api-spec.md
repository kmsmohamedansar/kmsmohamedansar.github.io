# The System One interface (as we have it)

**Source status: second-hand.** Relayed by the owner from a search summary of docs.typesafe.ai/api on 2026-10-11. It hasn't been checked against the official page yet; do that before publishing, and record any differences in NOTES.md.

Every contender in this project is wrapped to accept this request and return this response, so they can be compared like for like.

## Request

`POST https://api.typesafe.ai/v1/systemone`, with `Authorization: Bearer <key>` and `Content-Type: application/json`.

| Field | Type | Meaning |
|---|---|---|
| `model` | string | e.g. `jev-latest` |
| `state` | string, object or array | What is being judged: a message, a ticket, a chat log |
| `questions` | map of id to question | Your own ids, each with one typed question |

Three question types:

- **`noul`**: yes or no. `{ "type": "noul", "instructions": "A statement to judge true or false." }`
- **`choice`**: pick one option, up to 255. `{ "type": "choice", "options": [...], "instructions": "..." }`
- **`score`**: a point on a scale of 2 to 10 levels. `{ "type": "score", "min": 1, "max": 5, "instructions": "rubric" }`

## Response

| Field | Type | Meaning |
|---|---|---|
| `model` | string | Exact version, e.g. `jev-1.13.0` |
| `answers` | map of id to answer | One per question id |
| `usage` | object | `input_tokens`, `output_tokens` |

Answer shapes:

- **noul**: `{ "type": "noul", "noul": 0.97 }`: a probability from 0 to 1, no separate confidence.
- **choice**: `{ "type": "choice", "choice": "technical-support", "probabilities": { ... }, "confidence": 0.89 }`
- **score**: `{ "type": "score", "score": 4.62, "probabilities": { "1": 0.0, ... }, "confidence": 0.91 }`: the score is the probability-weighted position on the scale.

## Example

Request: state *"I have been trying to connect Stripe for 3 days and the integration keeps failing. I am losing sales."* with three questions: `is_urgent` (noul), `department` (choice of billing, technical-support, sales), `frustration_score` (score 1 to 5).

Response: `is_urgent` 0.97; `department` technical-support (0.82), confidence 0.89; `frustration_score` 4.62, confidence 0.91; usage 312 input and 64 output tokens.

## Open questions to check against the official docs
- How `confidence` differs from the top probability (the example has 0.89 confidence where the top probability is 0.82).
- Limits on `state` size, and pricing per token.
