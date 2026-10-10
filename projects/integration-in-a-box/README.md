# Integration-in-a-box

Two made-up companies, and the engineer who connects them.

- **Harbourline** sells inventory software. It's the source of truth for stock.
- **Maple & Main** is a grocer with its own system and its own names for things (`item_code`, `description`, `qty` instead of `sku`, `name`, `stock_level`).
- **The connector** sits in the middle. It sends Maple & Main's orders to Harbourline, pulls stock changes back, and translates between the two using a mapping file.
- **The control room** is a live dashboard that shows all of it happening, and what happens when it goes wrong.

Everything is synthetic. Both companies and all their data are fictional.

![The control room after a sale at Maple & Main has synced to Harbourline](docs/screenshots/05-order-synced.png)

## Run it

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

Open **http://localhost:4000** for the control room. Press the buttons in the middle to make a shopper buy something or a delivery arrive, and watch the connector move the data.

The two companies' APIs are also open for poking at directly:

- Harbourline: http://localhost:4001/v1/products
- Maple & Main: http://localhost:4002/api/inventory

Stop with `Ctrl+C`. Add `-v` to `docker compose down -v` to wipe the data and start fresh.

## What it does today (milestone 1)

| Piece | What it shows |
|---|---|
| **Harbourline API** | Designed first, as a spec ([docs/api/harbourline.openapi.yaml](docs/api/harbourline.openapi.yaml)), then built to match. Lists products in pages with a cursor, filters by "changed since", adjusts stock, takes orders. |
| **Idempotency keys** | Every order carries a key. Sending the same order twice returns the first one instead of creating a duplicate, so a retry after a timeout can never double an order. |
| **All-or-nothing orders** | If any line in an order can't be filled, nothing changes. |
| **Mapping file** | [mapping.json](mapping.json) says which field is which. A renamed field fails loudly and names the missing field. |
| **Incremental sync** | After the first full sync, the connector only asks for what changed, and only moves its "last synced" marker once every page has been read. |
| **Two kinds of failure** | A rejected order (for example, not enough stock) is parked with its reason, and the connector stays healthy. A connection failure keeps the order waiting and retries, and the health badge turns red. |
| **Control room** | Both systems side by side, numbers that flash as they change, an animated pipe between them, and a live log of everything the connector does. |

## Coming next

- **Milestone 2:** logins. OAuth 2.0 client credentials for program-to-program calls, single sign-on for people through Keycloak, and signed webhooks with retries.
- **Milestone 3:** ten deliberate breaks with a "Break it" panel, plus a runbook entry for each: what you see, the cause, the fix, and how to prevent it.
- **Milestone 4:** diagrams, a recording, and the case study.

## Tests

```bash
npm install
npm test          # 16 tests: API rules, mapping, and full end-to-end syncs
npm run typecheck
```

The end-to-end tests start all three services for real on random ports with fresh databases.

## Stack

TypeScript, Node.js, Fastify, SQLite (built into Node, no database server), React, Framer Motion, Vite, Docker Compose, Vitest, Playwright (screenshots only).

## License

All rights reserved. See LICENSE.
