import { randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { now } from "../shared/db.ts";
import { SIGNATURE_HEADER, sign } from "../shared/webhook-signature.ts";

// Outgoing webhooks: Harbourline calls its customers when something changes.
// Every delivery is recorded, signed, and retried with growing gaps
// (1s, 2s, 4s, 8s, 16s) before it's marked failed.

export const MAX_ATTEMPTS = 6;

export interface Delivery {
  id: string; subscription_id: string; event_id: string; event_type: string; payload: string;
  attempts: number; status: "pending" | "delivered" | "failed";
  last_status_code: number | null; last_error: string | null; next_attempt_at: string; created_at: string; delivered_at: string | null;
}

export function setupWebhookTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id TEXT PRIMARY KEY, url TEXT UNIQUE NOT NULL, secret TEXT NOT NULL, events TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, event_id TEXT NOT NULL, event_type TEXT NOT NULL,
      payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL,
      last_status_code INTEGER, last_error TEXT, next_attempt_at TEXT NOT NULL, created_at TEXT NOT NULL, delivered_at TEXT);
  `);
}

export function subscribe(db: DatabaseSync, url: string, events: string[]) {
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  // Registering the same URL again keeps the same subscription (so deliveries still
  // waiting to retry aren't orphaned) and rotates its secret.
  const existing = db.prepare("SELECT id FROM webhook_subscriptions WHERE url = ?").get(url) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE webhook_subscriptions SET secret = ?, events = ? WHERE id = ?").run(secret, JSON.stringify(events), existing.id);
    return { id: existing.id, url, events, secret };
  }
  const id = `whsub_${randomUUID().slice(0, 8)}`;
  db.prepare("INSERT INTO webhook_subscriptions VALUES (?, ?, ?, ?, ?)").run(id, url, secret, JSON.stringify(events), now());
  return { id, url, events, secret };
}

/** Queue an event for every subscriber that wants it. */
export function emit(db: DatabaseSync, type: string, data: unknown) {
  const subs = db.prepare("SELECT id, events FROM webhook_subscriptions").all() as { id: string; events: string }[];
  const event = { id: `evt_${randomUUID().slice(0, 12)}`, type, created_at: now(), data };
  for (const s of subs) {
    if (!JSON.parse(s.events).includes(type)) continue;
    db.prepare(`INSERT INTO webhook_deliveries (id, subscription_id, event_id, event_type, payload, status, next_attempt_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`).run(`whdel_${randomUUID().slice(0, 8)}`, s.id, event.id, type, JSON.stringify(event), now(), now());
  }
}

/** Send what's due. Called on a short timer. */
export async function dispatchDue(db: DatabaseSync, opts: { timeoutMs?: number; baseDelayMs?: number; newestFirst?: boolean } = {}) {
  const due = db.prepare(`SELECT d.*, s.url, s.secret FROM webhook_deliveries d JOIN webhook_subscriptions s ON s.id = d.subscription_id
    WHERE d.status = 'pending' AND d.next_attempt_at <= ? ORDER BY d.created_at ${opts.newestFirst ? "DESC" : "ASC"} LIMIT 20`).all(now()) as unknown as (Delivery & { url: string; secret: string })[];
  // Out-of-order break: hold a lone first attempt for up to 3s so a second event can overtake it.
  if (opts.newestFirst && due.length === 1 && due[0].attempts === 0 && Date.now() - Date.parse(due[0].created_at) < 3000) return;
  for (const d of due) {
    const attempts = d.attempts + 1;
    let code: number | null = null;
    let err: string | null = null;
    try {
      const res = await fetch(d.url, {
        method: "POST",
        headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign(d.secret, d.payload), "harbourline-event-id": d.event_id, "harbourline-delivery-attempt": String(attempts) },
        body: d.payload,
        signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
      });
      code = res.status;
      if (!res.ok) err = `HTTP ${res.status}`;
    } catch (e) {
      err = (e as Error).name === "TimeoutError" ? "timed out" : `unreachable: ${(e as Error).message}`;
    }
    if (!err) {
      // last_error is kept, so a delivery that recovered still shows what went wrong before.
      db.prepare("UPDATE webhook_deliveries SET attempts = ?, status = 'delivered', last_status_code = ?, delivered_at = ? WHERE id = ?").run(attempts, code, now(), d.id);
    } else if (attempts >= MAX_ATTEMPTS) {
      db.prepare("UPDATE webhook_deliveries SET attempts = ?, status = 'failed', last_status_code = ?, last_error = ? WHERE id = ?").run(attempts, code, err, d.id);
    } else {
      const wait = (opts.baseDelayMs ?? 1000) * 2 ** (attempts - 1);
      db.prepare("UPDATE webhook_deliveries SET attempts = ?, last_status_code = ?, last_error = ?, next_attempt_at = ? WHERE id = ?")
        .run(attempts, code, err, new Date(Date.now() + wait).toISOString(), d.id);
    }
  }
}
