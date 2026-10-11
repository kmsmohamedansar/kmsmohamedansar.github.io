# Results (Darwin arm64, 2026-10-11T03:29:26+00:00)

350 products, 50 with a planted wrong category.

| Checker | Real errors in its top 50 | Caught | False alarms | Precision | Recall | Products per minute |
|---|---|---|---|---|---|---|
| Keyword match | 24 of 50 | 50 of 50 | 164 | 0.23 | 1.00 | 6,701,681 |
| Meaning match | 33 of 50 | 49 of 50 | 87 | 0.36 | 0.98 | 29,353 |
| Zero-shot model | 30 of 50 | 50 of 50 | 83 | 0.38 | 1.00 | 452 |
| Team: meaning, then zero-shot | 27 of 50 | 49 of 50 | 76 | 0.39 | 0.98 | 3,337 |

**At scale:** 5,000 products checked by the team in 1.45 minutes; 664 went to the slow model; 1,366 flagged for review.
