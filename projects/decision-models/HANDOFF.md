# Handoff: start here in a fresh session

Read `CLAUDE.md` (the rules) and `docs/jev-api-spec.md` (the interface) first. Then build in this order, checking in with the owner at each **[owner]** step.

## The question
Can a small, cheap "fast decision" model make routine decisions (route a request, flag urgency, rate frustration) as well as a bigger model, and is its confidence honest?

## Decided so far (2026-10-11)
- Vendor-neutral: test the System One **pattern**. Jev is one optional contender behind a setting, off by default (paid, waitlisted).
- Domain: support requests to a made-up software company (not retail, not the owner's work).
- All three question types are tested: `noul` (urgent?), `choice` (which team, about 8 options), `score` (frustration 1 to 5).
- Builds on the owner's earlier projects: answer-key scoring from `projects/analytics-assistant/eval`, and the fast-then-slow "team" from `projects/catalogue-checker`.

## Steps
1. **Test set.** About 250 made-up requests with known answers for all three questions: 200 for development, 50 held out and scored once at the end. Include hard cases: two problems in one message, sarcasm, very short messages, non-native English. Write the labelling rules down first.
2. **One interface.** A small Python package with a `SystemOne` base: request in the spec's shape, answer in the spec's shape. Same tests for every adapter.
3. **Contenders.**
   - Rules (keywords): the baseline.
   - A normal small local model via Ollama (e.g. qwen2.5:7b), prompted to pick from the list and give probabilities.
   - Open-weight decision models: check which really exist, their licences, and which run on an Apple silicon Mac. Candidates named in articles: Laya, Clef or Clef-flash, Strands Decider 2B, OpenJev, Kev-9B. Verify each before use; some articles disagree.
   - Jev: adapter written to the spec, never run unless the owner supplies a key.
   - **[owner]** model runs that need the Mac happen there, as with 1B and 1C.
4. **Measure, per contender and per question type.** Accuracy; for `choice`, accuracy on each team; for `score`, average distance from the right level; speed per decision; cost per 1,000 decisions (local = 0, and say so); **calibration**: group answers by stated confidence and check how often each group is right, shown as a chart.
5. **Fast then slow.** Fast model first, hand anything under a fixed confidence threshold to the bigger model. Report accuracy, how many were handed over, and time saved. Fix the threshold before scoring the held-out set.
6. **Results page and case study.** Its own look, like the other projects. Two chapters (Chapter 1: a personal project, said plainly), claims ledger, diagrams.
7. **[owner]** Approve before anything touches the portfolio site.

## Not decided
- Which open models make the final line-up (depends on step 3 checks).
- The fictional company's name.
