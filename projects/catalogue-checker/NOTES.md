# Build notes

Dated log of what was done, what broke and what was measured. Numbers here come from runs in this repo.

## 2026-10-11

**Plan.** Scale the old categorization notebook (5 products in about 12 minutes) into a measured comparison of three checkers plus a fast-then-slow team, on thousands of real products.

**Data choice.** The old notebook used a public product file from a large retailer. The site doesn't name retailers, so this uses Open Food Facts instead: open data, grocery, and every product has categories. Only products in exactly one of 15 chosen categories are kept, so the label is unambiguous.

**Answer key choice.** Instead of labelling 300 products by hand, the source category is taken as the truth, 50 products get a deliberately wrong category, and a person hand-checks 50 of the rest to measure how often the source itself is wrong.

**Flag rules fixed in advance** (README) before any real run, so they can't be tuned to the answer key.

**Built and tested in the sandbox.** Open Food Facts and the model downloads are blocked from the build sandbox, so the pipeline was tested end to end on made-up products with stand-in models (10 tests pass). Stand-in results are written to `results/fake/` and are never reported. Real numbers come from a run on the owner's Mac.

## 2026-10-11, the real run (owner's Mac, Apple silicon)

**Fetch.** Open Food Facts answered "503 busy" often. The script retried; a few pages failed three times and were skipped (the fetch now waits longer and lists skipped pages). Enough products came back for 5,000 at scale.

**First eval (350 products, 50 planted).**

| Checker | Caught | False alarms | Precision | Per minute |
|---|---|---|---|---|
| Keyword | 50 | 164 | 0.23 | instant |
| Meaning match | 49 | 87 | 0.36 | 9,931 |
| Zero-shot (BART) | 50 | 83 | 0.38 | 454 |
| Team | 49 | 76 | 0.39 | 2,752 |

Scale: 5,000 products in 1.45 minutes, 664 sent to the slow model, 1,366 flagged.

**What that showed.** Planted errors are easy (a random wrong category), so every checker caught nearly all of them. The problem is false alarms: about a quarter of correct products get flagged, and 1,366 flags is more than anyone would read. So the measure that matters is how many of a checker's 50 most suspicious products are real errors. Added that, and stopped saving the brand column (unused, and some are shop own-brands; removed from the committed files too).

**Second eval, same models and answer key.**

| Checker | Real errors in top 50 | Per minute |
|---|---|---|
| Keyword | 24 | 6.7 million |
| Meaning match | 33 | 29,353 |
| Zero-shot (BART) | 30 | 452 |
| Team | 27 | 3,337 |

Speeds differ between the two runs (meaning match 9,931 vs 29,353 per minute): the first run included loading the model. Both are reported.

**The team ranks worse than its parts.** Its suspicion scores mix two scales (meaning-match distances for most products, zero-shot probabilities for the doubtful ones), so its top 50 is a muddle. It's still the cheapest way to get a short flag list, but for ranking, meaning match alone did best. A fix would be to rescore everything on one scale.

**Why the false alarms happen (counted from eval_rows.csv).** 95 of the 300 correct products have names of one or two words ("VECTOR", "Twiglets", "Goldfish", "Matcha"). They are 32% of correct products but 41 of meaning match's 87 false alarms (47%) and 37 of the team's 76 (49%). Names with no clue to what the product is, plus names in French ("Confiture d'abricot"), are where every checker struggles. A checker that only reads the name can't do better without more information, such as the ingredients list.

**Hand check:** not yet filled in.
