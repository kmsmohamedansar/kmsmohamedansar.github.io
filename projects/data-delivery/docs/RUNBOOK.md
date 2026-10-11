# Runbook: Monday delivery day

Ten things that go wrong on delivery day. The first five are planted in the generated data and happen for real when you run `python -m delivery.deliver --all`; the board and `delivered/<week>/status.json` show each one. The rest are common in real deliveries and are handled by the same checks.

The one rule behind all of them: **nothing goes out unless every customer loaded and every check passed.** A late delivery can be explained; a wrong one gets used.

Each entry: what you see, what's wrong, what to check first, how to fix it.

---

## 1. A customer's columns changed (W38, Northside)

**You see:** the board says `STOPPED · file's columns changed`. The alert reads: *Header doesn't match the settings file. Unexpected: PromoFlag.*

**What's wrong:** the customer added a column to their export. Every column after it has shifted, so reading it by position would put prices in the quantity column.

**Check first:** open the file and compare its header with `columns:` in `customers/northside.yaml`.

**Fix:** ask the customer whether the new column is permanent. If it is, add it to the settings file (and ignore it, or map it). Rerun the week. No code changes.

## 2. A file hasn't arrived (W39, Valley)

**You see:** `WAITING · file not arrived yet`. Dagster retries every 10 minutes, up to 6 times.

**Check first:** the customer's upload folder, then ask whether it was sent.

**Fix:** when it lands, rerun the week (`python -m delivery.deliver --week 2026-W39`). In this build the file arrives late with `python -m delivery.generate --arrive`, and the rerun delivers.

## 3. Rows sent twice, identical (W39, Harbour)

**You see:** nothing alarming. The board says `DELIVERED · 656 rows (37 resent rows removed)`.

**What's wrong:** the customer's export repeated 37 rows exactly.

**Fix:** none needed. Exact copies are safe to drop, and the staging model removes them. The count is shown so a person notices if it grows.

## 4. The same order line, two different values (W40, Harbour)

**You see:** `STOPPED · one row per order line`, with the line IDs.

**What's wrong:** 12 order lines were sent twice with different amounts. Unlike #3, there's no way to know which is right.

**Check first:** `select * from test_failures.one_row_per_order_line` in the warehouse lists every one.

**Fix:** send the customer the line IDs and ask which value is correct; they resend; rerun. Never pick one yourself.

## 5. Dates outside the week (W40, Valley)

**You see:** `STOPPED · dates inside the week`, with the line IDs.

**What's wrong:** 6 sales are dated 2062. Usually a typo at the source, or a date format that changed (day and month swapped).

**Check first:** `select * from test_failures.dates_inside_the_week`. If many rows are off by the same amount, suspect the format; if a few are wild, suspect typos.

**Fix:** a format change means updating `date_format` in the settings file. Typos mean asking for a corrected file.

## 6. A file cut short (W41, Northside)

**You see:** `STOPPED · row count in normal range`. 90 rows against a normal 700 to 1,300.

**What's wrong:** the export or upload stopped partway.

**Fix:** ask for a resend. If the customer genuinely had a quiet week (a store closure), widen `expected_rows` in their settings file, and note why.

## 7. Dates that can't be read at all

**You see:** `STOPPED · not null weekly sales sale date`.

**What's wrong:** the customer changed their date format (from `14/09/2026` to `2026-09-14`, say), so nothing parses.

**Fix:** update `date_format` in the settings file and rerun.

## 8. Decimal commas read as thousands

**You see:** revenue ten or a hundred times too big, or the row count test passing but totals looking wrong.

**What's wrong:** the settings file says `decimal: "."` but the customer writes `12,50`.

**Fix:** set `decimal: ","`. Worth a test of its own if it happens twice.

## 9. A new customer's file name doesn't match

**You see:** `WAITING` for a customer whose file is clearly there.

**What's wrong:** the `file_pattern` doesn't produce their real file name. This happened for real while building the onboarding kit: Lakeshore names files `LKS_2026_W41.tsv`, and the settings file could only build `2026-W41`.

**Fix:** use `{year}` and `{wk}` in `file_pattern` to build any naming style (`lakeshore/LKS_{year}_W{wk}.tsv`).

## 10. A rerun after a fix

**You see:** worry that rerunning will double the data.

**What's wrong:** nothing. Loading a week first deletes that customer's rows for that week, so a rerun replaces, never adds. A test checks this (`test_reloading_a_week_never_doubles_rows`).

**Fix:** rerun freely.
