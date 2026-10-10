import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { errorBody, now, openDb } from "../shared/db.ts";
import { SEED_PRODUCTS } from "../shared/seed.ts";
import { makeRequireScope, type AuthConfig } from "./auth.ts";
import { dispatchDue, emit, setupWebhookTables, subscribe } from "./webhooks.ts";
import { NORMAL, registerChaos, type HarbourlineChaos } from "./chaos.ts";

// Harbourline: a made-up inventory software company. This is its public API,
// built to match docs/api/harbourline.openapi.yaml.

interface ProductRow { sku: string; name: string; unit_price_cents: number; stock_level: number; updated_at: string }
interface OrderRow { id: string; external_ref: string | null; idem_key: string; lines: string; created_at: string }

const encodeCursor = (sku: string) => Buffer.from(sku).toString("base64url");
const decodeCursor = (c: string) => Buffer.from(c, "base64url").toString();
/** How a product looks on the wire. Normally the stored row; during the "renamed field" break, one field changes name. */
const present = (p: ProductRow, renamed: boolean) => {
  if (!renamed) return p;
  const { stock_level, ...rest } = p;
  return { ...rest, stock_on_hand: stock_level };
};
const toOrder = (r: OrderRow) => ({ id: r.id, external_ref: r.external_ref, status: "accepted", lines: JSON.parse(r.lines), created_at: r.created_at });

export function createHarbourline(opts: {
  dbPath: string;
  logger?: boolean;
  /** Leave out to run without logins (milestone 1 behaviour). */
  auth?: AuthConfig;
  webhooks?: { dispatchEveryMs?: number; baseDelayMs?: number; timeoutMs?: number };
  chaos?: { enabled: boolean; key?: string };
}): FastifyInstance {
  const db = openDb(opts.dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      sku TEXT PRIMARY KEY, name TEXT NOT NULL, unit_price_cents INTEGER NOT NULL,
      stock_level INTEGER NOT NULL CHECK (stock_level >= 0), updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, external_ref TEXT, idem_key TEXT UNIQUE NOT NULL,
      lines TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const count = db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  if (count.n === 0) {
    const ins = db.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?)");
    for (const p of SEED_PRODUCTS) ins.run(p.sku, p.name, p.unit_price_cents, p.stock_level, now());
  }

  setupWebhookTables(db);

  const getProduct = db.prepare("SELECT * FROM products WHERE sku = ?");
  const app = Fastify({ logger: opts.logger ?? false });
  const chaos: HarbourlineChaos = { ...NORMAL };
  registerChaos(app, chaos, opts.chaos ?? { enabled: false });

  // Each route names the permission it needs. Without auth configured, every check passes.
  const requireScope = opts.auth ? makeRequireScope(opts.auth, () => chaos.revokedScope) : () => async () => {};
  const read = { preHandler: requireScope("inventory:read") };
  const writeOrders = { preHandler: requireScope("orders:write") };
  const manageHooks = { preHandler: requireScope("webhooks:manage") };

  const stockChanged = (before: ProductRow, reason: string) => {
    const after = getProduct.get(before.sku) as unknown as ProductRow;
    emit(db, "stock.changed", { sku: after.sku, name: after.name, stock_level: after.stock_level, previous_stock_level: before.stock_level, reason });
  };

  // Send queued webhooks on a short timer.
  let dispatching = false;
  const timer = setInterval(async () => {
    if (dispatching) return;
    dispatching = true;
    try { await dispatchDue(db, { ...opts.webhooks, newestFirst: chaos.reverseWebhooks }); } finally { dispatching = false; }
  }, opts.webhooks?.dispatchEveryMs ?? 500);
  app.addHook("onClose", async () => clearInterval(timer));

  app.get("/v1/health", async () => ({ ok: true, service: "harbourline" }));

  app.get<{ Querystring: { limit?: string; cursor?: string; updated_since?: string } }>("/v1/products", read, async (req, reply) => {
    const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return reply.code(400).send(errorBody("invalid_request", "limit must be a whole number from 1 to 100"));
    }
    const after = req.query.cursor ? decodeCursor(req.query.cursor) : "";
    const since = req.query.updated_since ?? "";
    // Fetch one extra row to know whether another page exists.
    const rows = db
      .prepare("SELECT * FROM products WHERE sku > ? AND updated_at > ? ORDER BY sku LIMIT ?")
      .all(after, since, limit + 1) as unknown as ProductRow[];
    const page = rows.slice(0, limit);
    return { data: page.map((p) => present(p, chaos.renameStockField)), next_cursor: rows.length > limit ? encodeCursor(page[page.length - 1].sku) : null };
  });

  app.get<{ Params: { sku: string } }>("/v1/products/:sku", read, async (req, reply) => {
    const p = getProduct.get(req.params.sku) as ProductRow | undefined;
    return p ? present(p, chaos.renameStockField) : reply.code(404).send(errorBody("not_found", `No product with sku ${req.params.sku}`));
  });

  app.post<{ Params: { sku: string }; Body: { change?: number; reason?: string } }>("/v1/products/:sku/stock", writeOrders, async (req, reply) => {
    const { change, reason } = req.body ?? {};
    if (!Number.isInteger(change) || !["delivery", "count_correction", "damage"].includes(reason ?? "")) {
      return reply.code(400).send(errorBody("invalid_request", "Send a whole-number change and a reason of delivery, count_correction or damage"));
    }
    const p = getProduct.get(req.params.sku) as ProductRow | undefined;
    if (!p) return reply.code(404).send(errorBody("not_found", `No product with sku ${req.params.sku}`));
    if (p.stock_level + change! < 0) {
      return reply.code(409).send(errorBody("insufficient_stock", `Only ${p.stock_level} in stock`));
    }
    db.prepare("UPDATE products SET stock_level = stock_level + ?, updated_at = ? WHERE sku = ?").run(change!, now(), p.sku);
    stockChanged(p, reason!);
    return getProduct.get(p.sku);
  });

  app.post<{ Body: { external_ref?: string; lines?: { sku: string; quantity: number }[] } }>("/v1/orders", writeOrders, async (req, reply) => {
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || key.length === 0 || key.length > 100) {
      return reply.code(400).send(errorBody("invalid_request", "Send an Idempotency-Key header so retries are safe"));
    }
    const seen = db.prepare("SELECT * FROM orders WHERE idem_key = ?").get(key) as OrderRow | undefined;
    if (seen) return reply.code(200).send(toOrder(seen));

    const lines = req.body?.lines;
    if (!Array.isArray(lines) || lines.length === 0 || lines.some((l) => typeof l.sku !== "string" || !Number.isInteger(l.quantity) || l.quantity < 1)) {
      return reply.code(400).send(errorBody("invalid_request", "lines must be a list of { sku, quantity } with quantity of at least 1"));
    }

    // All lines succeed or none do.
    db.exec("BEGIN");
    const touched: ProductRow[] = [];
    try {
      for (const l of lines) {
        const p = getProduct.get(l.sku) as ProductRow | undefined;
        if (!p) throw Object.assign(new Error(`No product with sku ${l.sku}`), { code: "not_found", status: 400 });
        if (p.stock_level < l.quantity) {
          throw Object.assign(new Error(`Only ${p.stock_level} of ${l.sku} in stock, ${l.quantity} requested`), { code: "insufficient_stock", status: 409 });
        }
        db.prepare("UPDATE products SET stock_level = stock_level - ?, updated_at = ? WHERE sku = ?").run(l.quantity, now(), l.sku);
        touched.push(p);
      }
      const row: OrderRow = { id: `ord_${randomUUID().slice(0, 8)}`, external_ref: req.body?.external_ref ?? null, idem_key: key, lines: JSON.stringify(lines), created_at: now() };
      db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?)").run(row.id, row.external_ref, row.idem_key, row.lines, row.created_at);
      db.exec("COMMIT");
      for (const p of touched) stockChanged(p, "order");
      return reply.code(201).send(toOrder(row));
    } catch (e) {
      db.exec("ROLLBACK");
      const err = e as Error & { code?: string; status?: number };
      if (err.code) return reply.code(err.status!).send(errorBody(err.code, err.message));
      throw e;
    }
  });

  app.get<{ Params: { id: string } }>("/v1/orders/:id", read, async (req, reply) => {
    const r = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as OrderRow | undefined;
    return r ? toOrder(r) : reply.code(404).send(errorBody("not_found", `No order ${req.params.id}`));
  });

  app.post<{ Body: { url?: string; events?: string[] } }>("/v1/webhook-subscriptions", manageHooks, async (req, reply) => {
    const { url, events } = req.body ?? {};
    if (typeof url !== "string" || !/^https?:\/\//.test(url) || !Array.isArray(events) || events.length === 0) {
      return reply.code(400).send(errorBody("invalid_request", "Send a url (http or https) and a list of events, e.g. [\"stock.changed\"]"));
    }
    // The signing secret is only ever shown here, once.
    return reply.code(201).send(subscribe(db, url, events));
  });

  app.get<{ Querystring: { limit?: string } }>("/v1/webhook-deliveries", manageHooks, async (req) => {
    const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
    const rows = db.prepare(`SELECT id, event_id, event_type, attempts, status, last_status_code, last_error, next_attempt_at, created_at, delivered_at
      FROM webhook_deliveries ORDER BY created_at DESC LIMIT ?`).all(limit);
    return { data: rows };
  });

  return app;
}
