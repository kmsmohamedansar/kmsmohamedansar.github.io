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
