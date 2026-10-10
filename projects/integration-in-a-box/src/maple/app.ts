import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { errorBody, now, openDb } from "../shared/db.ts";

// Maple & Main: a made-up grocer. This is its own in-house system, with its own
// names for things (item_code, description, qty) that don't match Harbourline's.
// Its shelves start empty: the connector fills them from Harbourline.

interface ItemRow { item_code: string; description: string; qty: number; last_synced_at: string }
interface OrderRow { id: string; lines: string; status: string; harbourline_order_id: string | null; error: string | null; created_at: string }

const toOrder = (r: OrderRow) => ({ ...r, lines: JSON.parse(r.lines) });
const STATUSES = ["pending_sync", "synced", "failed"];

export function createMaple(opts: { dbPath: string; logger?: boolean }): FastifyInstance {
  const db = openDb(opts.dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      item_code TEXT PRIMARY KEY, description TEXT NOT NULL, qty INTEGER NOT NULL, last_synced_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, lines TEXT NOT NULL, status TEXT NOT NULL,
      harbourline_order_id TEXT, error TEXT, created_at TEXT NOT NULL);
  `);

  const app = Fastify({ logger: opts.logger ?? false });

  app.get("/api/health", async () => ({ ok: true, service: "maple-and-main" }));

  app.get("/api/inventory", async () => db.prepare("SELECT * FROM inventory ORDER BY item_code").all());

  app.put<{ Params: { item_code: string }; Body: { description?: string; qty?: number } }>("/api/inventory/:item_code", async (req, reply) => {
    const { description, qty } = req.body ?? {};
    if (typeof description !== "string" || !Number.isInteger(qty) || qty! < 0) {
      return reply.code(400).send(errorBody("invalid_request", "Send description (text) and qty (whole number, 0 or more)"));
    }
    db.prepare(`INSERT INTO inventory VALUES (?, ?, ?, ?)
      ON CONFLICT(item_code) DO UPDATE SET description = excluded.description, qty = excluded.qty, last_synced_at = excluded.last_synced_at`)
      .run(req.params.item_code, description, qty!, now());
    return db.prepare("SELECT * FROM inventory WHERE item_code = ?").get(req.params.item_code);
  });

  // A shopper buys something. The order waits here until the connector sends it to Harbourline.
  app.post<{ Body: { lines?: { item_code: string; qty: number }[] } }>("/api/orders", async (req, reply) => {
    const lines = req.body?.lines;
    if (!Array.isArray(lines) || lines.length === 0 || lines.some((l) => typeof l.item_code !== "string" || !Number.isInteger(l.qty) || l.qty < 1)) {
      return reply.code(400).send(errorBody("invalid_request", "lines must be a list of { item_code, qty }"));
    }
    const row: OrderRow = { id: `mm_${randomUUID().slice(0, 8)}`, lines: JSON.stringify(lines), status: "pending_sync", harbourline_order_id: null, error: null, created_at: now() };
    db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)").run(row.id, row.lines, row.status, null, null, row.created_at);
    return reply.code(201).send(toOrder(row));
  });

  app.get<{ Querystring: { status?: string } }>("/api/orders", async (req) => {
    const rows = (req.query.status
      ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at").all(req.query.status)
      : db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 50").all()) as unknown as OrderRow[];
    return rows.map(toOrder);
  });

  app.patch<{ Params: { id: string }; Body: { status?: string; harbourline_order_id?: string; error?: string } }>("/api/orders/:id", async (req, reply) => {
    const { status, harbourline_order_id, error } = req.body ?? {};
    if (!status || !STATUSES.includes(status)) return reply.code(400).send(errorBody("invalid_request", `status must be one of ${STATUSES.join(", ")}`));
    const r = db.prepare("UPDATE orders SET status = ?, harbourline_order_id = ?, error = ? WHERE id = ?")
      .run(status, harbourline_order_id ?? null, error ?? null, req.params.id);
    if (r.changes === 0) return reply.code(404).send(errorBody("not_found", `No order ${req.params.id}`));
    return toOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as unknown as OrderRow);
  });

  return app;
}
