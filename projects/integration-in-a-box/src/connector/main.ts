import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createConnectorApp } from "./app.ts";
import { validateMapping } from "./mapping.ts";

const mapping = validateMapping(JSON.parse(readFileSync(process.env.MAPPING_PATH ?? "mapping.json", "utf8")));
const { app, connector, log } = createConnectorApp({
  harbourlineUrl: process.env.HARBOURLINE_URL ?? "http://localhost:4001",
  mapleUrl: process.env.MAPLE_URL ?? "http://localhost:4002",
  mapping,
  pageSize: Number(process.env.PAGE_SIZE ?? 5),
  webDist: resolve(process.env.WEB_DIST ?? "web/dist"),
  logger: true,
});

const interval = Number(process.env.SYNC_INTERVAL_MS ?? 4000);
log.push("sync", "Connector started", { detail: `Syncing every ${interval / 1000}s` });
connector.start(interval, Number(process.env.START_DELAY_MS ?? 500));
await app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
