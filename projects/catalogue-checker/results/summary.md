# Results (Darwin arm64, 2026-10-11T02:51:32+00:00)

350 products, 50 with a planted wrong category.

| Checker | Caught | False alarms | Precision | Recall | Products per minute |
|---|---|---|---|---|---|
| Keyword match | 50 of 50 | 164 | 0.23 | 1.00 | 7,324,942 |
| Meaning match | 49 of 50 | 87 | 0.36 | 0.98 | 9,931 |
| Zero-shot model | 50 of 50 | 83 | 0.38 | 1.00 | 454 |
| Team: meaning, then zero-shot | 49 of 50 | 76 | 0.39 | 0.98 | 2,752 |

**At scale:** 5,000 products checked by the team in 1.45 minutes; 664 went to the slow model; 1,366 flagged for review.
