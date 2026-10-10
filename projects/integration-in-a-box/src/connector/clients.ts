// Thin HTTP clients for both systems. Every call has a timeout, and failures
// carry the status and the API's own error code so the log can say what broke.

export class ApiError extends Error {
  constructor(readonly system: string, readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

import type { TokenManager } from "./token.ts";

async function call<T>(system: string, base: string, path: string, init: RequestInit & { timeoutMs?: number; token?: string } = {}): Promise<{ status: number; body: T }> {
  let res: Response;
  try {
    res = await fetch(base + path, {
      ...init,
      headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(init.timeoutMs ?? 5000),
    });
  } catch (e) {
    const err = e as Error;
    const timedOut = err.name === "TimeoutError";
    throw new ApiError(system, 0, timedOut ? "timeout" : "unreachable", timedOut ? `${system} did not answer in time` : `${system} could not be reached (${err.message})`);
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(system, res.status, body?.error?.code ?? "http_error", body?.error?.message ?? `HTTP ${res.status}`);
  }
  return { status: res.status, body: body as T };
}

export interface HbProduct { sku: string; name: string; unit_price_cents: number; stock_level: number; updated_at: string }
export interface HbOrder { id: string; external_ref: string | null; status: string; lines: { sku: string; quantity: number }[] }
export interface MmItem { item_code: string; description: string; qty: number; last_synced_at: string }
export interface MmOrder { id: string; lines: { item_code: string; qty: number }[]; status: string; harbourline_order_id: string | null; error: string | null; created_at: string }

export interface HbDelivery { id: string; event_id: string; event_type: string; attempts: number; status: "pending" | "delivered" | "failed"; last_status_code: number | null; last_error: string | null; created_at: string; delivered_at: string | null }

export class HarbourlineClient {
  constructor(readonly base: string, private tokens?: TokenManager) {}

  /** Call Harbourline with a token. If it's rejected as expired or invalid, get a fresh one and try once more. */
  private async authed<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
    if (!this.tokens) return call<T>("Harbourline", this.base, path, init);
    try {
      return await call<T>("Harbourline", this.base, path, { ...init, token: await this.tokens.get() });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        this.tokens.invalidate();
        return call<T>("Harbourline", this.base, path, { ...init, token: await this.tokens.get() });
      }
      throw e;
    }
  }

  getProduct(sku: string) {
    return this.authed<HbProduct>(`/v1/products/${encodeURIComponent(sku)}`).then((r) => r.body);
  }
  subscribe(url: string, events: string[]) {
    return this.authed<{ id: string; secret: string }>("/v1/webhook-subscriptions", { method: "POST", body: JSON.stringify({ url, events }) }).then((r) => r.body);
  }
  deliveries(limit = 8) {
    return this.authed<{ data: HbDelivery[] }>(`/v1/webhook-deliveries?limit=${limit}`).then((r) => r.body.data);
  }
  listProducts(q: { limit?: number; cursor?: string | null; updated_since?: string | null }) {
    const p = new URLSearchParams();
    if (q.limit) p.set("limit", String(q.limit));
    if (q.cursor) p.set("cursor", q.cursor);
    if (q.updated_since) p.set("updated_since", q.updated_since);
    return this.authed<{ data: HbProduct[]; next_cursor: string | null }>(`/v1/products?${p}`).then((r) => r.body);
  }
  adjustStock(sku: string, change: number, reason: string) {
    return this.authed<HbProduct>(`/v1/products/${encodeURIComponent(sku)}/stock`, { method: "POST", body: JSON.stringify({ change, reason }) }).then((r) => r.body);
  }
  createOrder(idempotencyKey: string, body: { external_ref: string; lines: { sku: string; quantity: number }[] }) {
    return this.authed<HbOrder>("/v1/orders", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(body) });
  }
}

export class MapleClient {
  constructor(readonly base: string) {}
  inventory() {
    return call<MmItem[]>("Maple & Main", this.base, "/api/inventory").then((r) => r.body);
  }
  upsertItem(item_code: string, body: { description: string; qty: number }) {
    return call<MmItem>("Maple & Main", this.base, `/api/inventory/${encodeURIComponent(item_code)}`, { method: "PUT", body: JSON.stringify(body) }).then((r) => r.body);
  }
  orders(status?: string) {
    return call<MmOrder[]>("Maple & Main", this.base, `/api/orders${status ? `?status=${status}` : ""}`).then((r) => r.body);
  }
  createOrder(lines: { item_code: string; qty: number }[]) {
    return call<MmOrder>("Maple & Main", this.base, "/api/orders", { method: "POST", body: JSON.stringify({ lines }) }).then((r) => r.body);
  }
  updateOrder(id: string, body: { status: string; harbourline_order_id?: string; error?: string }) {
    return call<MmOrder>("Maple & Main", this.base, `/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.body);
  }
}
