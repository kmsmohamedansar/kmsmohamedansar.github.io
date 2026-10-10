# Integration-in-a-box notes

Dated log of what was built, what was run, and what happened. Only results from real runs go here.

## 2026-10-10

**Decided**
- Docker Compose to run everything, so Keycloak (milestone 2) can run the standard way.
- One image for all three services. SQLite through Node's built-in `node:sqlite`, so there's no database server and no native modules to compile.
- The browser only talks to the connector. Harbourline and Maple & Main are never called from the page.

**Built (milestone 1)**
- Harbourline API spec first (`docs/api/harbourline.openapi.yaml`), then the API to match it.
- Maple & Main API with different field names and empty shelves at start.
- Connector: mapping file, order push with idempotency keys, incremental stock sync with cursor paging, event log, control-room API with a live event stream.
- Control room UI.

**Ran**
- `npm test`: 4 files, 16 tests, all passing.
- `docker compose up` (built with a sandbox-only certificate file, see below): all three containers started, Harbourline and Maple & Main healthy. First sync read 3 pages of 5 and filled Maple & Main's 12 empty items.
- `node scripts/screenshots.mjs`: 8 screenshots in `docs/screenshots`, from the empty shelves to a rejected order and a phone-width view.

**Went wrong, then fixed**
- The Docker build couldn't download packages in my build sandbox: its network intercepts secure connections with its own certificate, which containers don't trust. Built with a throwaway copy of the Dockerfile that trusts that certificate. The committed Dockerfile is unchanged and needs nothing special on a normal machine.
- The browser's TypeScript check failed because the web code and the server code need different module settings. Gave the web code its own `tsconfig.json`.
- The screenshots showed the health badge saying "Problem, retrying" after an order was rejected for lack of stock. Wrong: that rejection is handled (the order is parked with its reason) and nothing is retrying. Now only connection failures turn the badge red. Added a test for each case.

**Not yet verified**
- The stack hasn't been run on the owner's Mac yet.

**Milestone 2, same day**

*Built*
- Keycloak in Docker Compose with two realms loaded from files: `harbourline` (client credentials for the connector, with an audience mapper and three scopes) and `maple-and-main` (a staff user and the control-room client).
- Harbourline: token checks on every route (signature, issuer, expiry, audience, scope); webhook subscriptions, a delivery log, and a dispatcher with retries.
- Connector: token manager (cache, renew early, one retry on 401); webhook receiver (signature check on the raw body, timestamp check, duplicate check); single sign-on with PKCE and a server-side session.
- Control room: sign-in screen, signed-in user, token countdown, webhook delivery panel.

*Ran*
- `npm test`: 7 files, 38 tests, all passing.
- Keycloak issued a token with `aud: harbourline-api` and scopes `inventory:read orders:write webhooks:manage`, valid for 300s.
- With the stack up: Harbourline without a token returned 401 `unauthorized`; the control room API without a session returned 401; `/auth/login` redirected to Keycloak with a PKCE challenge.
- Playwright signed in as `sam` through the real Keycloak login page, captured the control room, triggered a delivery (webhook delivered on the first try), then signed out.
- Outage test: stopped the connector, changed stock twice. Both deliveries reached 4 attempts with `unreachable: fetch failed`. Restarted the connector: both delivered on attempt 5. Output in `docs/outage-deliveries-*.txt`.

*Went wrong, then fixed*
- The test login server added routes after it started listening, which Fastify refuses. Reordered.
- My first token-retry test assumed rotating the signing key would make old tokens fail at once. It doesn't: Harbourline caches the old key for a while, which is correct. Rewrote the test around a real cause of a rejected token: clock skew, where the login server hands out a token that's already expired.
- Found a bug while planning the outage demo: re-subscribing to webhooks deleted the old subscription, which would leave deliveries waiting to retry pointing at nothing, stuck forever. Wrote a failing test first, then changed re-subscribing to keep the subscription and only rotate its secret. The outage test above passed because of this fix.
- A delivered webhook used to forget the errors before it succeeded. It now keeps the last error, so the panel can say "recovered from: unreachable".

**Milestones 3 and 4, same day**

*Built*
- Harbourline fault switches (outage, slow responses, tight rate limit, renamed field, removed scope, newest-first webhooks), only registered when `CHAOS_KEY` is set. A normal rate limit is always on.
- Connector: retry rules (network, timeout, 5xx, 401, 403, 429 wait; other 4xx park), pause on `Retry-After`, switches for a corrupted token, a wrong secret, a lost reply and a forged webhook.
- Break it panel in the control room. Runbook with ten entries plus two setup problems. Six diagrams. Case study. Customer integration planning guide.

*Ran*
- `npm test`: 8 files, 49 tests, all passing, including one per break.
- `scripts/run-breaks.mjs` against the full Docker stack: signed in through Keycloak, triggered all ten breaks, recorded the connector's log during each and after each fix (`docs/breaks-evidence.md`), took five screenshots and a 3 minute 38 second video. Every toggle break went back to green after its fix.

*Went wrong, then fixed*
- The break 2 test failed: when the login server refused the connector, the log said only "Error: Invalid client credentials", with no source or code. Now: "Login server: unauthorized_client. Invalid client or Invalid client credentials".
- Reading the first live run: break 1 recovered so quietly the 401 never appeared in the log. Now logged before the retry.
- Also from the first live run: webhook events logged "62 → 62" as if something changed, and break 5 didn't show the out-of-order event. Each webhook now logs what it claimed next to what was read fresh ("webhook said 65, but Harbourline has 62 now (an older event); used 62"), and unchanged items say "already up to date".
- The diagram renderer copied from Sitescout turned `<br/>` into real line breaks, which breaks Mermaid sequence diagrams. Now only done for flowcharts.
- On the owner's Mac: `docker compose` wasn't found (Docker installed without the Compose plugin). Fixed with Homebrew. Then "localhost refused to connect", most likely because the connector was still starting. Added both to the README and runbook.

*Not yet verified*
- A full sign-in and click-through on the owner's Mac.
