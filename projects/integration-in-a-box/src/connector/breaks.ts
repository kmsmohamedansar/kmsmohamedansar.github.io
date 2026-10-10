import type { FastifyInstance } from "fastify";
import { sign, SIGNATURE_HEADER } from "../shared/webhook-signature.ts";
import type { HarbourlineClient, MapleClient } from "./clients.ts";
import type { EventLog } from "./events.ts";
import type { Connector } from "./sync.ts";
import type { TokenManager } from "./token.ts";

// The "Break it" panel. Ten things that really go wrong in integrations.
// Each one is caused for real (not faked in the UI), and each has a runbook
// entry in docs/RUNBOOK.md with the same number.

export interface BreakInfo {
  id: string;
  n: number;
  title: string;
  /** "toggle" stays broken until switched off; "once" happens a single time. */
  kind: "toggle" | "once";
  where: "Harbourline" | "Connector" | "Network";
  expect: string;
  active: boolean;
}

const CATALOGUE: Omit<BreakInfo, "active">[] = [
  { n: 1, id: "token-rejected", kind: "once", where: "Connector", title: "Access token rejected", expect: "One 401 from Harbourline, then a fresh token and a successful retry. Nothing waits." },
  { n: 2, id: "wrong-secret", kind: "toggle", where: "Connector", title: "Client secret rotated without telling us", expect: "The login server refuses the connector. Health turns red and orders wait. Fix the secret and they all go through." },
  { n: 3, id: "scope-revoked", kind: "toggle", where: "Harbourline", title: "Permission removed by an admin", expect: "Orders get 403 insufficient_scope and wait (not rejected). Restore the permission and they go through." },
  { n: 4, id: "lost-reply", kind: "once", where: "Network", title: "Order accepted, but the reply was lost", expect: "The connector retries with the same idempotency key. Harbourline says \"already accepted\". No double order." },
  { n: 5, id: "out-of-order", kind: "toggle", where: "Harbourline", title: "Webhooks arrive out of order", expect: "Two stock changes are delivered newest first. Maple & Main still ends on the right number, because each webhook triggers a fresh read." },
  { n: 6, id: "rate-limit", kind: "toggle", where: "Harbourline", title: "Rate limit hit (429)", expect: "Harbourline answers 429 with Retry-After. The connector pauses for exactly that long instead of hammering." },
  { n: 7, id: "renamed-field", kind: "toggle", where: "Harbourline", title: "Field renamed in a vendor release", expect: "Sync stops with an error naming the missing field (stock_level). No zeros or blanks are written to Maple & Main." },
  { n: 8, id: "slow-api", kind: "toggle", where: "Harbourline", title: "Harbourline too slow (timeouts)", expect: "Calls time out after 5s. Health turns red, work waits, and everything catches up once Harbourline is fast again." },
  { n: 9, id: "forged-webhook", kind: "once", where: "Network", title: "Forged webhook", expect: "Someone posts a fake stock change. The signature check fails, it's refused with 401, and nothing changes." },
  { n: 10, id: "outage", kind: "toggle", where: "Harbourline", title: "Harbourline outage (503)", expect: "Every call gets 503. Orders wait, health is red. When Harbourline comes back, everything waiting goes through." },
];

export function registerBreaks(
  app: FastifyInstance,
  deps: { connector: Connector; log: EventLog; hb: HarbourlineClient; mm: MapleClient; tokens?: TokenManager; harbourlineUrl: string; chaosKey?: string },
) {
  if (!deps.chaosKey) return;
  const active = new Set<string>();
  const hbChaos = (body: Record<string, unknown>) =>
    fetch(`${deps.harbourlineUrl}/_chaos`, { method: "PUT", headers: { "content-type": "application/json", "x-chaos-key": deps.chaosKey! }, body: JSON.stringify(body) }).then((r) => {
      if (!r.ok) throw new Error(`Harbourline refused the chaos switch (HTTP ${r.status})`);
    });
  const sellSomething = async () => {
    const item = (await deps.mm.inventory()).find((i) => i.qty > 0);
    if (item) await deps.mm.createOrder([{ item_code: item.item_code, qty: 1 }]);
  };

  const actions: Record<string, (on: boolean) => Promise<void>> = {
    "token-rejected": async () => {
      await deps.tokens?.get();
      deps.tokens?.corrupt();
    },
    "wrong-secret": async (on) => deps.tokens?.overrideSecret(on ? "rotated-secret-we-were-not-told-about" : null),
    "scope-revoked": async (on) => {
      await hbChaos({ revokedScope: on ? "orders:write" : null });
      if (on) await sellSomething();
    },
    "lost-reply": async () => {
      deps.connector.dropNextOrderResponse = true;
      await sellSomething();
    },
    "out-of-order": async (on) => {
      await hbChaos({ reverseWebhooks: on });
      if (on) {
        // Two quick changes to the same product: the newer one will be delivered first.
        await deps.hb.adjustStock("HB-1006", 10, "delivery");
        await deps.hb.adjustStock("HB-1006", -3, "count_correction");
      }
    },
    "rate-limit": async (on) => hbChaos({ rateLimitPer10s: on ? 4 : 0 }),
    "renamed-field": async (on) => hbChaos({ renameStockField: on }),
    "slow-api": async (on) => hbChaos({ slowMs: on ? 7000 : 0 }),
    "forged-webhook": async () => {
      const body = JSON.stringify({ id: "evt_forged", type: "stock.changed", data: { sku: "HB-1001", stock_level: 0 } });
      await app.inject({ method: "POST", url: "/webhooks/harbourline", headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign("a-guessed-secret", body) }, payload: body });
    },
    outage: async (on) => hbChaos({ outage: on }),
  };

  app.get("/api/breaks", async () => CATALOGUE.map((b) => ({ ...b, active: active.has(b.id) })));

  app.post<{ Params: { id: string }; Body: { on?: boolean } }>("/api/breaks/:id", async (req, reply) => {
    const b = CATALOGUE.find((x) => x.id === req.params.id);
    if (!b) return reply.code(404).send({ error: { code: "not_found", message: "No such break" } });
    const on = b.kind === "once" ? true : req.body?.on !== false;
    await actions[b.id](on);
    if (b.kind === "toggle") on ? active.add(b.id) : active.delete(b.id);
    deps.log.push("break", on ? `Break ${b.n} triggered: ${b.title}` : `Break ${b.n} fixed: ${b.title}`, { detail: on ? b.expect : "Back to normal" });
    // Run a cycle straight away so the effect (or the recovery) shows without waiting.
    setTimeout(() => deps.connector.cycle(), 200);
    return { ...b, active: active.has(b.id) };
  });

  app.delete("/api/breaks", async () => {
    for (const id of active) await actions[id](false);
    active.clear();
    deps.log.push("break", "All breaks fixed", { detail: "Everything back to normal" });
    setTimeout(() => deps.connector.cycle(), 200);
    return { ok: true };
  });
}
