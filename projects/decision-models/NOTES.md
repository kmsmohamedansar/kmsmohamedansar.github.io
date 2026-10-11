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
