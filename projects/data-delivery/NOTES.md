# Build notes

Dated log of what was done, what broke and what was measured. Numbers here come from runs in this repo.

## 2026-10-11

**Choices.** DuckDB instead of a Snowflake trial: free, local, never expires, and close to Snowflake's SQL. dbt with the DuckDB adapter, and Dagster for the schedule. Three made-up pharmacies with three formats: comma CSV with ISO dates; semicolons with day/month/year and decimal commas; JSON lines with month-day-year.

**Planted problems** (in `delivery/generate.py`): a new column mid-header (W38 Northside), a late file (W39 Valley), 37 exactly resent rows (W39 Harbour), 12 order lines resent with different amounts (W40 Harbour), 6 rows dated 2062 (W40 Valley), a partial file of 90 rows (W41 Northside).

**First full run** (`docs/first-run-output.txt`): W36 and W37 delivered; W38 blocked (Northside header); W39 blocked (Valley file missing); W40 blocked (Harbour duplicates and Valley dates); W41 blocked (Northside row count). Every planted problem was caught, each with the right customer and check. After the late file arrived, W39 delivered, with Harbour's 37 resent rows removed (693 loaded, 656 delivered). Each week took about 7 to 9 seconds, most of it dbt starting up.

**Bugs found while building.**
- A column named `at` in the load log is a reserved word in DuckDB; renamed.
- The first full run delivered W39 because the late file was left over from an earlier test. The generator now removes it on a fresh run, and the run was repeated from clean.
- A dry run of onboarding found that Lakeshore names files `LKS_2026_W41`, which a `{week}` placeholder (`2026-W41`) can't build. Added `{year}` and `{wk}`. That dry run was mine and isn't the onboarding time; the owner times the real one.

**Dagster.** Three runs from the command line: W37 succeeded, W40 and W41 failed with "Delivery blocked" and the reasons. Dagster's web screen didn't render in the sandbox's headless browser (its scripts loaded but the page stayed blank), so there's no screenshot of it from here.

**Tests.** 11 passing: settings validation, number and date formats, week boundaries, reruns never doubling, each planted problem blocking with the right reason, and resent rows being cleaned rather than blocked.

**First onboarding attempt (owner).** The owner opened the blank settings template and couldn't tell what to type: it asks for things like `%d.%m.%Y` without showing how to find them. That's a real onboarding problem, not a user problem. Added `delivery/onboard.py`, which reads one of the new customer's files and drafts the settings file (delimiter, decimal mark, date format, which column is which, file naming, a normal row count), with a note on every guess. On the three existing customers' files it drafts the same column mapping that was written by hand (tested). It first set Northside's normal range from its smallest to largest file, which included the 90-row partial file and would have let a partial file through; it now uses a typical file and warns about odd ones (tested). The onboarding time will be measured with this helper.

**Onboarding, timed (owner, on a Mac).** Drafted by `delivery.onboard` at 00:20:02 EDT, delivered at 00:20:39: 37 seconds, first try, no changes to the draft. Before the helper existed, the owner opened the blank template at about 00:15 and couldn't fill it in.

**Full rerun with Lakeshore as the fourth customer.** Same outcome for every week as the first run (Lakeshore's six weeks all clean). 15 tests pass.
