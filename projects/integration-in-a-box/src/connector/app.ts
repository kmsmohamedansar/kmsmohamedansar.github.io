import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { HarbourlineClient, MapleClient, type HbProduct } from "./clients.ts";
import { EventLog } from "./events.ts";
import type { Mapping } from "./mapping.ts";
import { Connector } from "./sync.ts";
import { registerSso, type SsoConfig } from "./sso.ts";
import { TokenManager, type ClientCredentialsConfig } from "./token.ts";
import { registerWebhookReceiver } from "./webhook-receiver.ts";

// The connector's own small server. The control room in the browser only ever
// talks to this, never to Harbourline or Maple & Main directly.

export function createConnectorApp(opts: {
  harbourlineUrl: string;
  mapleUrl: string;
  mapping: Mapping;
  pageSize?: number;
  webDist?: string;
  logger?: boolean;
  /** OAuth client credentials for calling Harbourline. Leave out for milestone 1 behaviour. */
  oauth?: ClientCredentialsConfig;
  /** Single sign-on for the control room. Leave out to run the control room unlocked. */
  sso?: SsoConfig;
  /** Where Harbourline should send webhooks, as Harbourline can reach it. */
  webhookUrl?: string;
}) {
  const log = new EventLog();
  const tokens = opts.oauth ? new TokenManager(opts.oauth, log) : undefined;
  const hb = new HarbourlineClient(opts.harbourlineUrl, tokens);
  const mm = new MapleClient(opts.mapleUrl);
  const connector = new Connector(hb, mm, opts.mapping, log, { pageSize: opts.pageSize ?? 5 });
  const app: FastifyInstance = Fastify({ logger: opts.logger ?? false });

  if (opts.sso) registerSso(app, opts.sso, log);
  else app.get("/auth/me", async () => ({ user: null, sso: false }));

  let webhookSecret: string | null = null;
  let webhookUrl = opts.webhookUrl;
  registerWebhookReceiver(app, { connector, log, getSecret: () => webhookSecret });

  /** Ask Harbourline to send stock changes here. Keeps trying until Harbourline (and the login server) are up. */
  async function subscribeToWebhooks(retryMs = 3000, url = webhookUrl): Promise<void> {
    if (!url) return;
    webhookUrl = url;
    for (;;) {
      try {
        const sub = await hb.subscribe(url, ["stock.changed"]);
        webhookSecret = sub.secret;
        log.push("webhook", "Subscribed to Harbourline's stock.changed webhooks", { detail: `${sub.id} → ${url}` });
        return;
      } catch (e) {
        log.push("error", "Couldn't subscribe to webhooks yet, retrying", { detail: String((e as Error).message) });
        await new Promise((r) => setTimeout(r, retryMs));
      }
    }
  }

  async function allProducts(): Promise<HbProduct[]> {
    const out: HbProduct[] = [];
    let cursor: string | null = null;
    do {
      const page = await hb.listProducts({ limit: 100, cursor });
      out.push(...page.data);
      cursor = page.next_cursor;
    } while (cursor);
    return out;
  }

  app.get("/api/state", async () => {
    const [harbourline, maple, orders, deliveries] = await Promise.allSettled([allProducts(), mm.inventory(), mm.orders(), webhookUrl ? hb.deliveries(8) : Promise.resolve([])]);
    const val = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
    return {
      harbourline: val(harbourline), maple: val(maple), orders: val(orders), deliveries: val(deliveries),
      connector: connector.stats,
      auth: tokens ? { tokenExpiresInSec: tokens.expiresInSec, tokensFetched: tokens.fetched } : null,
      webhooks: webhookUrl ? { subscribed: webhookSecret !== null } : null,
    };
  });

  // Server-Sent Events: a one-way live stream the browser can read with EventSource.
  app.get("/api/events", (req, reply) => {
    reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    const send = (e: unknown) => reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    for (const e of log.recent(60)) send(e);
    const off = log.subscribe(send);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15000);
    req.raw.on("close", () => {
      off();
      clearInterval(ping);
    });
  });

  app.post("/api/sync", async () => {
    await connector.cycle();
    return connector.stats;
  });

  // Demo buttons in the control room.
  app.post("/api/demo/sale", async (_req, reply) => {
    const inStock = (await mm.inventory()).filter((i) => i.qty > 0);
    if (inStock.length === 0) return reply.code(409).send({ error: { code: "nothing_to_sell", message: "Maple & Main has no stock yet" } });
    const item = inStock[Math.floor(Math.random() * inStock.length)];
    const qty = Math.min(item.qty, 1 + Math.floor(Math.random() * 3));
    const order = await mm.createOrder([{ item_code: item.item_code, qty }]);
    log.push("demo", `A shopper bought ${qty} x ${item.description} at Maple & Main`, { detail: `${order.id}, waiting to sync` });
    return order;
  });

  app.post("/api/demo/delivery", async () => {
    const products = await allProducts();
    const p = products[Math.floor(Math.random() * products.length)];
    const change = 5 + Math.floor(Math.random() * 11);
    const updated = await hb.adjustStock(p.sku, change, "delivery");
    log.push("demo", `A delivery of ${change} x ${p.name} arrived at Harbourline`, { detail: `${p.stock_level} → ${updated.stock_level}` });
    return updated;
  });

  if (opts.webDist && existsSync(opts.webDist)) {
    app.register(fastifyStatic, { root: opts.webDist });
  }

  return { app, connector, log, tokens, subscribeToWebhooks, webhookSecret: () => webhookSecret };
}
