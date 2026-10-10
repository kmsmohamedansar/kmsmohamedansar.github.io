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
