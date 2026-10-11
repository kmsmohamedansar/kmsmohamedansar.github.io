# Build notes

Dated log of what was done, what broke and what was measured.

## 2026-10-11

Project set up. Interface spec saved from the owner (second-hand, to verify against docs.typesafe.ai/api). Plan in HANDOFF.md. Nothing built or measured yet.

### Step 1: test set (done)

- Labelling rules written first: `docs/labelling-rules.md`. Placeholder company name **Quillstack** (scheduling, timesheets and invoicing app for small businesses); the final name is still open.
- 250 made-up requests in `data/source/`, one file per theme. Labels come from the rules, not the file they sit in: 15 requests are labelled for a different team than their file (mostly two-problem messages, plus cases like a stolen API key going to `security-privacy`).
- `python3 scripts/build_testset.py` checks every row, then writes `data/dev.jsonl` (200) and `data/heldout.jsonl` (50), split evenly by team with seed 20261011 and at least 3 of each hard case in held-out. Run in this cloud session (Linux container, Python 3); output:
  - All 250: 61 urgent; frustration 1/2/3/4/5 = 111/51/43/36/9; 88 hard cases (35%): 15 two-problems, 22 sarcasm, 29 very-short, 23 non-native.
  - Held-out 50: 10 urgent, 6 or 7 per team, 21 hard cases.
- Known weaknesses: all requests written by one author in one sitting, so phrasing is less varied than a real queue; frustration 5 is rare (9 cases), so per-level results there will be noisy; "urgent" is a judgement call on a few borderline rows (e.g. a former employee seeing schedules).
- Held-out set is now frozen. Don't read it while building contenders.

### Step 2: one interface (done)

- `systemone/` package, standard library only (Python 3.13 here). Requests and responses are plain dicts in the spec's JSON shape, so a real API adapter can pass them straight through.
  - `schema.py` checks requests and responses against the spec: every question answered, probabilities between 0 and 1 and adding up to 1, `choice` is the most likely option, `score` is the probability-weighted level.
  - `base.py`: `SystemOne.decide()` checks the request, calls the adapter's `answer()`, checks the response, and raises if anything is off, so a broken adapter can't be scored.
  - `questions.py`: the three fixed questions, worded from the labelling rules.
  - `adapters/uniform.py`: the floor (equal odds for everything). Every adapter is listed in `adapters/__init__.py`.
- Assumption: when an adapter has no confidence of its own, confidence = top probability. The spec's example (0.89 confidence vs 0.82 top probability) shows Jev does something else; unknown what.
- `python3 -m unittest` from this folder, this cloud session: 12 tests, all pass. Includes the spec's own example as a valid response, 13 kinds of broken response that must be caught, and the shared contract (sample of 10 dev rows covering every hard-case tag, other question types, single question, object state, bad request) that every registered adapter runs.

### Step 3: contenders (code done here; runs need the Mac)

- `adapters/rules.py`: keyword baseline, probabilities via softmax. Written from the labelling rules and the dev set, then frozen. Sanity look on dev only (this session, Linux container): urgent 0.82, team 0.73, frustration mean distance 0.86. Optimistic, since the words came from these same rows; not a result.
- `adapters/ollama.py`: asks for JSON probabilities with Ollama's `format` option, temperature 0. Counts every repair (missing option, rescaled, unusable reply) so we can report them.
- `adapters/http.py`: `SystemOneHTTP` for any local `/v1/systemone` server (Kev, Strands Decider, Laya). `adapters/jev.py` is the same with a key, off unless `JEV_ENABLED=1` and `JEV_API_KEY`.
- Model check written up in `docs/models.md`. Hugging Face and docs.typesafe.ai were unreachable from this sandbox, so model cards and the Jev spec are still unverified. Open item: Strands Decider README gives the code licence but not the weights licence.
- `python3 -m unittest`: 40 tests pass (Ollama, HTTP and Jev against fake servers).

### Step 4: measuring (code done; first runs are the two offline contenders)

- `scripts/run.py <adapter>` runs one contender over dev (or `--heldout`, refused a second time and refused with `--limit`), timing each request; raw answers in `results/raw/` (not committed). `--machine` names the machine in every result.
- `scripts/score.py` writes `results/<split>/<name>.json`, `summary.md` and `calibration.svg`. Calibration groups answers into 10 confidence bands; ECE (expected calibration error) is the size-weighted gap between stated confidence and actual accuracy.
- How "right" is judged for calibration: urgent = probability on the right side of 0.5 (confidence = distance from a coin flip); team = chosen team; frustration = most likely level exactly right.
- First runs, dev set, Claude cloud container (Linux x86_64), see `results/dev/summary.md`:
  - rules: urgent 0.82, team 0.73, frustration distance 0.90 (exact 0.34); ECE 0.04 / 0.34 / 0.34.
  - uniform: urgent 0.26, team 0.13, frustration distance 1.29. Its ties break to "urgent", "billing" and level 1, which is why billing is 26/26 for it.
  - The rules' frustration distance here (0.90) differs from the step 3 sanity look (0.86) because that one rounded the score first; this one uses the score as given.
- Calibration chart already says something: the rules under-state confidence on team (right more often than they claim) and over-state it on frustration. Screenshot: `docs/screenshots/2026-10-11-step4-calibration-dev.png`.
- 45 tests pass.

### Step 5: fast then slow (code done; threshold not fixed yet)

- `scripts/cascade.py` works from saved runs, so both contenders see the same requests and no extra model calls are needed. A request's confidence is the lowest of its three answers' confidences; below the threshold, the whole request goes to the slow contender.
- Threshold rule, written down now before any model run: try 0.00 to 1.00 in steps of 0.05; fix the lowest threshold where urgent and team accuracy are both within 0.02 of the slow contender alone. If none, report that the fast model didn't help. `pick` writes `results/cascade.json` and refuses to change it once held-out results exist; `heldout` uses it once.
- Dry run (rules fast, uniform "slow", not saved, not a result) checked the mechanics only. 49 tests pass.

### Step 6: groundwork (draft only, nothing published)

- Diagrams: `docs/diagrams/1-how-it-fits` and `2-fast-then-slow` (.mmd source, .svg rendered with mermaid-cli 11.4.2 in this container).
- `scripts/report.py` builds `results/report.html` (own look: support-ticket cards, IBM Plex) from result files only; sections without data say "pending". Checked at phone width (390 px, no sideways scroll) and desktop. Screenshot: `docs/screenshots/2026-10-11-step6-report-draft.png`.
- `CASE_STUDY.md` drafted: two chapters (Chapter 1 says plainly it's a personal project), limits, claims ledger. Results sections marked pending.

### Owner's Mac

MacBook Air M4, 16 GB. Line-up updated in `docs/models.md`: Kev-4B/9B and Clef skipped (need 32 GB+); Kev-0.8B, Strands Decider 2B and Laya as fast models; `qwen2.5:7b` as the slow side.

### Owner decisions and checks

- Laya: run `laya-typed-decisions` as is. Company name: Quillstack. Line-up confirmed.
- Licences: Apache-2.0 for Strands Decider 2B, Kev-0.8B and Laya, relayed from a Gemini summary of the HF cards. Two checkpoint-name gaps listed in docs/models.md to close on the Mac.
- Jev spec: owner checked docs.typesafe.ai/api, no differences.
- Licence follow-up: the exact checkpoints we run (Strands qwen3.5-v1-2610, laya-typed-decisions, kev-0.8b, Ollama qwen2.5:7b) all Apache-2.0, links in docs/models.md.

### Ollama qwen2.5:7b, dev, prompt v1 (MacBook Air M4 16GB, owner's run)

- 200/200 answered, median 12.2 s per request (first five: 13.1, 8.8, 8.5, 8.8, 9.0 s), cost 0 (local). Repairs on the 5-row smoke test: 2 rescaled, nothing missing.
- Urgent 0.84 (ECE 0.06); team 0.43 (ECE 0.35); frustration distance 0.94, exact 0.41 (ECE 0.19).
- **Failure, recorded:** team answers piled onto the first options listed. Picks: technical-support 96, billing 54, account-access 24, feedback 9, security-privacy 9, sales 3, integrations-api 3, how-to 2. Per team: billing 26/26, account-access 20/23, technical-support 25/30, but integrations-api 1/23, how-to 1/24. Asking a small model for a probability on every option, in a fixed order, measured the prompt as much as the model.
- Fix on dev (allowed; held-out untouched): prompt v2 asks for one allowed answer plus a confidence. v1 stays in the results as the honest first attempt.

### Ollama qwen2.5:7b, dev, prompt v2 (MacBook Air M4 16GB, owner's run)

- 200/200, no repairs at all. Median 7.8 s per request (v1: 12.2 s; v2 writes a much shorter answer).
- Urgent 0.80 (ECE 0.15); team 0.61 (ECE 0.26); frustration distance 0.79, exact 0.40 (ECE 0.43).
- Per team: billing 26/26, account-access 20/23, technical-support 22/30, integrations-api 10/23, security-privacy 14/26, sales 11/23, how-to 2/24, feedback 17/25.
- Picks: billing 61, technical-support 56, account-access 25, feedback 17, security-privacy 15, integrations-api 13, sales 11, how-to 2. First three options: 142 of 200 (v1: 174). The pile-up shrank but didn't vanish, and how-to is almost never chosen.
- **Trade-off, recorded:** v2 fixed accuracy (team +18 points) but made stated confidence less honest. Frustration ECE went from 0.19 to 0.43 and urgent from 0.06 to 0.15: confidence the model *writes down* is overconfident, while v1's probability table was better calibrated where the position bias didn't hit (urgent has only two options).
- Rules still lead on team on dev (0.73), but their dev numbers are optimistic by construction.
- Kev server rejected `instructions` (422) and required `criteria`: our second-hand spec had the field name wrong. HTTP adapter now renames it on the wire; recorded in docs/jev-api-spec.md.
- Full wire shape now from Kev's README: criteria holds the allowed answers (choice {option: desc|null}, score [level descriptions]); score answers indexed from 0. Adapter translates both ways; documented in docs/jev-api-spec.md. Kev's README example shows choice confidence 0.21 vs top probability 0.47: confidence is defined separately from the probabilities. We score calibration on the confidence it reports.
