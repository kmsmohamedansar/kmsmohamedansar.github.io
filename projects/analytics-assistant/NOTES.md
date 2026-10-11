# Build notes

Dated log of what was done, what broke and what was measured. Numbers here come from runs in this repo.

## 2026-10-10

**Plan.** Merge the old category copilot idea (rules, no model) and the analytics MCP idea into one measured project: same tools, two brains, 30 test questions with known answers.

**Data.** Seeded generator for one year of weekly cereal sales: 6 made-up brands, 16 products, 4 regions, 2,998 rows, $1,764,523 in total. Five planted surprises (promotion, price rise, launch, own-brand growth, a product that stopped selling in one region). Same seed, same numbers: checked by a test.

**Metric definitions.** First version measured share against the same subcategory, so "Kids share" came out as 100%. Changed: share and price gap are always measured against the whole category in the same weeks and region. A test checks Kids share lands between 20% and 50%.

**Tools.** Five tools at first, read-only, row limit 50, every call logged. Arguments checked with Zod, and errors are written so a model can correct itself.

**Brain A v1.** First honest run on the 30 questions: 19 correct, 5 partly correct, 6 wrong. Median 2 ms per question. Saved as `eval/results/rules-v1.json`.

Failure types, by count:
1. Events and relative time: "after week 30", "during its promotion", "after its price rise", "gaining share". 5 questions.
2. Answer shapes the rules didn't have: "when did it launch", "why did sales drop", "top 3". 3 questions.
3. Word choice: "cheapest" and "grew the most" not recognised. 2 questions.
4. A bug: the 50 row limit cut a 52 week trend to 50 weeks. 1 question.

**Fixes (types 1 and 2, plus the bug).** Added a sixth tool, `list_events`, that finds promotions, lasting price changes, launches and products that stopped selling, from the data itself (nothing typed in by hand). Brain A v2 uses it to turn "after its price rise" into week ranges, answers "when" and "why" from it, handles "top N", and says yes or no to yes/no questions. Row limit raised to 60. Type 3 left alone on purpose, to report it.

**Brain A v2.** 28 correct, 0 partly correct, 2 wrong (the two word-choice questions). Median 1 ms. Saved as `eval/results/rules-v2.json`.

**Held-out check.** Because v2 was fixed while looking at the 30 questions, wrote 10 new ones afterwards in different wording (`eval/holdout.ts`). Brain A v2: 8 correct, 1 partly correct, 1 wrong. It misread "after its promotion ended" (split at the start of the promotion, not the end) and didn't understand "the three biggest" (it only knows "top 3"). So the fixes partly generalise, and rules stay brittle to new wording.

**Brain B.** Built and wired to Ollama's chat API with tool calling. Ollama can't be downloaded in the build sandbox (blocked network), so brain B is unit tested against a stand-in that plays back scripted replies. No brain B score exists yet. It will come from a real run on the owner's Mac, and only that run's numbers will be reported.

**Tests.** 31 passing: data, metrics, tools (including read-only database and row limit), brain A, brain B wiring, the MCP server started as a real process over stdio, and the web server.

**Screenshots.** `docs/screenshots/01` to `09`, desktop and phone.

## 2026-10-11

**Brain B, first real attempt.** On the owner's Mac (Apple silicon), the Homebrew build of Ollama (0.40.2) failed on every question with `llama-server binary not found`. The eval still saved a 0/30 file. That file was deleted (it measured a broken install, not the model), and the eval now asks the model one warm-up question first and saves nothing if it fails. Installing the official Ollama app fixed it.

**Also found:** the `.gitignore` rule `data/` (meant for the generated database) also hid `src/data/`, so a fresh clone couldn't run. Fixed to `/data/`, checked with a clean copy.

**Brain B v1 (qwen2.5:7b, real run).** 19 correct, 7 partly correct, 4 wrong. Median 5.2 seconds per question. It answered the questions brain A couldn't parse ("cheapest", "grew the most", "why", "when") with no special rules.

Failure types, by count:
1. Wrong weeks: guessed the promotion as weeks 30 to 39 (it was 20 to 23) instead of calling `list_events`, put week 30 on the wrong side of "after week 30", got "last 4 weeks" wrong, split by region when not asked. 7 questions.
2. Wrong measure: dollars when the question said packs, a total when it asked for a trend, prices per product instead of the brand. 4 questions.

**Fix (brain B v2).** Six general lines added to the model's instructions: how to read before/after and last-N-weeks, look up events instead of guessing, which measure each word means, report first and last week for a trend, and don't split unless asked. No answers written in.

**Brain B v2 (real run).** 20 correct, 5 partly correct, 5 wrong. Median 6.0 seconds. Fixed five questions (5, 21, 26, 29, 30) but four that v1 got right went wrong (3, 9, 14, 17). Net: one more correct, one more wrong. A small model is sensitive to its instructions: more rules changed behaviour on questions they weren't about. Each version was run once, so run-to-run variation isn't measured.

**Held-out, brain B v2.** 8 correct, 1 partly correct, 1 wrong. The same as brain A v2.

**Scorer bug found while checking by hand.** A name check matched "West" inside "lowest", so a wrong brain B v2 answer (#14, said South) was marked correct. The scorer now matches whole words. All saved results were re-scored from their stored text with `eval/rescore.ts`; only that one answer changed (brain B v2 went from 21/5/4 to 20/5/5).

**Hand check of brain B's "correct" answers.** Two are generous: #16 (v2) names the right product next to a wrong one, and #26 (v2) gives the right price with the wrong promotion weeks. Kept as scored; reported here.
