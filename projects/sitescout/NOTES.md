# Sitescout notes

Dated log of what was built, what was run, and what happened. Only results from real runs go here.

## 2026-10-11

**Decided**
- Domain: stock quote pages on Yahoo Finance, so this stays clear of retail, which is what Undercut covers at work.
- Owner chose Yahoo Finance as the target and accepted the trade-off: Yahoo's terms don't invite scraping and it changes its pages often. Sitescout reads one public page at a time in the user's own browser, with a pause between pages, and no logins.
- No AI model for now. Click-to-pick repair and an optional local model can come later.
- Built inside the site repo at `projects/sitescout` for now, to move to its own repo later.

**Built**
- MV3 side panel in React and Framer Motion, recipe-based reader, background-tab runner with stop, CSV export.

**Ran**
- `npm test`: 3 files, 13 tests, all passing.
- `npm run build`: passes typecheck, builds `dist/`.
- `npm run demo`: real extension in headless Chromium, against synthetic pages served locally as finance.yahoo.com. Input `EXMP, DEMO, <BROKE link>, ACME, hello!`. Result: EXMP done, DEMO done, BROKE failed with "The price never appeared on the page", ACME stopped by pressing Stop, `hello!` rejected before the run. CSV export contained the 2 finished rows. Output saved to `docs/demo-export.csv.txt`, screenshots `docs/screenshots/01` to `06`.

**Went wrong, then fixed**
- Playwright's request interception didn't catch tabs the extension opened itself; those tabs showed Chrome's error page and all three cards failed. Fixed by running a local HTTPS server and mapping finance.yahoo.com to it inside the test browser only.
- Ticker parser rejected index symbols like `^GSPC`. Caught by a unit test, fixed.
- A missing value tile picked up the empty-state style (tall dashed box) because both used the class name `empty`. Renamed.
- The logo's radar sweep rotated around the wrong point. Fixed the transform origin.

**Not yet verified**
- Live Yahoo Finance pages. This build environment can't reach Yahoo, so the selectors in `src/recipes/yahooFinanceQuote.ts` are written from Yahoo's public markup but untested against the live site. First live run is the next step, on the owner's machine.
