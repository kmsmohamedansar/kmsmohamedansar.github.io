import type { FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { createHarbourline } from "../src/harbourline/app.ts";
import { createMaple } from "../src/maple/app.ts";
import { createConnectorApp } from "../src/connector/app.ts";
import { validateMapping } from "../src/connector/mapping.ts";
import { startFakeIdp } from "./fake-idp.ts";

export const realMapping = () => validateMapping(JSON.parse(readFileSync("mapping.json", "utf8")));

async function listen(app: FastifyInstance) {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  return `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
}

/** Start Harbourline, Maple & Main and the connector on random ports, with fresh in-memory databases. */
export async function startStack(pageSize = 5, opts: { secure?: boolean } = {}) {
  const idp = opts.secure ? await startFakeIdp() : null;
  const hb = createHarbourline({
    dbPath: ":memory:",
    auth: idp ? { issuer: idp.issuer, jwksUrl: idp.jwksUrl, audience: "harbourline-api" } : undefined,
    webhooks: { dispatchEveryMs: 50, baseDelayMs: 50 },
  });
  const mm = createMaple({ dbPath: ":memory:" });
  const hbUrl = await listen(hb);
  const mmUrl = await listen(mm);
  const c = createConnectorApp({
    harbourlineUrl: hbUrl, mapleUrl: mmUrl, mapping: realMapping(), pageSize,
    oauth: idp ? { tokenUrl: idp.tokenUrl, clientId: "maple-connector", clientSecret: "test-secret" } : undefined,
  });
  const cUrl = await listen(c.app);
  const json = async (url: string, init?: RequestInit) => {
    const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    return { status: r.status, body: await r.json() };
  };
  return {
    hbUrl, mmUrl, cUrl, json,
    connector: c.connector,
    log: c.log,
    idp,
    tokens: c.tokens,
    webhookSecret: c.webhookSecret,
    subscribe: () => c.subscribeToWebhooks(50, `${cUrl}/webhooks/harbourline`),
    closeHarbourline: () => hb.close(),
    close: async () => Promise.all([c.app.close(), hb.close(), mm.close(), idp?.close()]),
  };
}
