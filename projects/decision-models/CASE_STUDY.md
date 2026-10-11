# Fast decision models, measured

**2026-10-11.** Every number here comes from runs in this repo; the full write-up is `paper/report.md`.

## The short version

On 50 support requests it had never seen, scored once:

| Contender | Team right | Urgent right | Honest confidence? (calibration error, urgent / team / frustration; 0 is perfect) | Seconds per request | Cost |
|---|---|---|---|---|---|
| **Strands Decider 2B** (open decision model) | **80%** | 82% | **0.05 / 0.17 / 0.06** | 1.45 | 0, local |
| Keyword rules | 78% | 84% | 0.07 / 0.44 / 0.37 | 0.0001 | 0, local |
| `qwen2.5:7b` (general model) | 64% | 82% | 0.13 / 0.22 / 0.43 | 7.72 | 0, local |
| Kev-0.8B (open decision model) | 60% | 80% | 0.16 / 0.12 / 0.50 | 0.34 | 0, local |
| Laya-typed-decisions (open decision model) | 48% | 88% | 0.25 / 0.29 / 0.18 | 0.32 | 0, local |

Machine: MacBook Air M4, 16 GB (models); a cloud container (rules).

What I took from it:

- **A small decision model beat a bigger general one,** by 16 points on team, five times faster, and with the most honest confidence of any contender.
- **The general model was confidently wrong.** It claimed near-certainty on 89 team answers and was right on 68% of them.
- **How you ask a general model matters as much as which model.** Asking for a probability per option made it pile answers onto the first options listed (174 of 200 in the first three); asking for one answer plus a confidence fixed accuracy but inflated the confidence.
- **The keyword rules' near-tie is a warning, not a win.** I wrote both the requests and the keywords, so they share a vocabulary.
- **Fast then slow only helps when the slow side is better.** Here the big model wasn't, so the planned version never handed anything over.

The full write-up is the technical report in `paper/report.md`.

![How the test fits together](docs/diagrams/1-how-it-fits.svg)

## Chapter 1: why I built this

This is a personal project. In 2026 a new kind of model appeared: "decision models" (also called System One models) that don't write text, they only answer typed questions (yes or no, pick one of these, rate this 1 to 5) and say how sure they are. TypeSafe's Jev is the paid, hosted one; within weeks several open ones followed (Kev, Strands Decider, Laya, Clef). Most claims about them come from their makers.

I wanted to know two things I couldn't find answered independently, on a task I understand:

1. Can a small, cheap model make routine support decisions about as well as a bigger one?
2. When it says it's 90% sure, is it right 90% of the time? If the confidence is honest, you can let the model handle the sure cases and send the rest to something slower, or to a person.

It builds on two of my earlier projects: the answer-key scoring from the analytics assistant, and the fast-then-slow "team" idea from the catalogue checker.

## Chapter 2: the build

### The test set

250 made-up support requests to a fictional company (Quillstack, a scheduling and invoicing app for small businesses). I wrote the labelling rules first (`docs/labelling-rules.md`), then the requests, each with an answer for three questions:

- **Urgent?** Needs a person today. Angry tone alone doesn't count.
- **Which team?** One of eight. With two problems in one message, the one that most blocks the customer.
- **How frustrated?** 1 (calm) to 5 (furious). Sarcastic praise counts as frustration.

35% are hard on purpose: two problems in one message, sarcasm, very short messages, non-native English. 200 are for development; 50 were held out and scored once at the end.

### One interface for everyone

Every contender gets the same request in the same shape (the System One shape from Jev's public docs) and must answer in that shape. A checker rejects any answer that is malformed: missing answers, probabilities that don't add up, a pick that isn't the most likely option. So nobody gets scored on a broken answer. One shared set of tests runs against every contender.

### The contenders

| Contender | What it is | Licence | Where it ran |
|---|---|---|---|
| Even odds | The floor: knows nothing | n/a | cloud container |
| Rules | Keyword lists, written from the labelling rules | n/a | cloud container |
| `qwen2.5:7b` | General model via Ollama, prompt v2 (one answer plus confidence) | Apache-2.0 | owner's Mac |
| Kev-0.8B, Strands Decider 2B, Laya-typed-decisions | Open decision models, as shipped (see `docs/models.md`) | Apache-2.0 | owner's Mac |
| Jev | Paid API; only if a key is supplied | commercial | not run |

### Measuring

Accuracy for each question; accuracy on each team; for frustration, the average distance from the right level; seconds per request; cost per 1,000 requests (local runs: no charge per request, said plainly). And **calibration**: answers grouped by how sure the contender said it was, against how often each group was right.

![Fast then slow](docs/diagrams/2-fast-then-slow.svg)

### Fast then slow

The fast contender answers everything. If its least sure answer for a request falls under a threshold, the whole request goes to the slow one. The threshold rule was written down before any model ran: the lowest threshold where urgent and team accuracy are both within 0.02 of the slow model alone. It's fixed on the development set and then used once on the held-out set.

On held-out: the planned version handed nothing over (the decision model was already better than the big model). An exploratory version, Kev handing over to Strands on team confidence, handed over 84% and finished one request behind Strands alone.

### What I found

See the short version above, and sections 4 to 7 of `paper/report.md`.

### Limits

- One author wrote and labelled every request in one sitting; a real queue is messier and more varied.
- Only 9 requests are at frustration level 5, so results at that level are noisy.
- The rules were written while looking at the development set, so their development numbers are optimistic. The held-out set is the fair comparison.
- Each project defines "confidence" its own way; we measure what each says against what happens, on the same requests.
- We test the public System One pattern. Nothing here claims to know how Jev works inside.

## Claims ledger

Every claim on the portfolio page, and where its evidence is.

| Claim | Evidence |
|---|---|
| 250 requests, 200 dev / 50 held-out, 35% hard cases | `python3 scripts/build_testset.py` output; `data/dev.jsonl`, `data/heldout.jsonl` |
| Labelling rules written before labelling | `docs/labelling-rules.md`; commit history |
| Every answer checked against the System One shape | `systemone/schema.py`; `tests/test_schema.py`, `tests/test_contract.py` |
| Jev never called without the owner's key and switch | `systemone/adapters/jev.py`; `tests/test_adapters.py` |
| Threshold rule fixed before any model run | `scripts/cascade.py` docstring; NOTES.md, 2026-10-11 |
| Rules on dev: urgent 0.82, team 0.73 (optimistic) | `results/dev/rules.json` (cloud container) |
| Every model result | `results/dev/*.json`, `results/heldout/*.json`, with machine named |
| All models Apache-2.0 | `docs/models.md` (licence check, 2026-10-11) |
