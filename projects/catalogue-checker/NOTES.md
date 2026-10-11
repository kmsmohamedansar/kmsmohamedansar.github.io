# Build notes

Dated log of what was done, what broke and what was measured. Numbers here come from runs in this repo.

## 2026-10-11

**Plan.** Scale the old categorization notebook (5 products in about 12 minutes) into a measured comparison of three checkers plus a fast-then-slow team, on thousands of real products.

**Data choice.** The old notebook used a public product file from a large retailer. The site doesn't name retailers, so this uses Open Food Facts instead: open data, grocery, and every product has categories. Only products in exactly one of 15 chosen categories are kept, so the label is unambiguous.

**Answer key choice.** Instead of labelling 300 products by hand, the source category is taken as the truth, 50 products get a deliberately wrong category, and a person hand-checks 50 of the rest to measure how often the source itself is wrong.

**Flag rules fixed in advance** (README) before any real run, so they can't be tuned to the answer key.

**Built and tested in the sandbox.** Open Food Facts and the model downloads are blocked from the build sandbox, so the pipeline was tested end to end on made-up products with stand-in models (10 tests pass). Stand-in results are written to `results/fake/` and are never reported. Real numbers come from a run on the owner's Mac.
