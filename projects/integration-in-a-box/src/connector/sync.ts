import { ApiError, type HarbourlineClient, type MapleClient } from "./clients.ts";
import type { EventLog } from "./events.ts";
import { applyMap, MappingError, type Mapping } from "./mapping.ts";

export interface ConnectorStats {
  lastRunAt: string | null;
  lastOk: boolean | null;
  highWaterMark: string | null;
  cycles: number;
  itemsUpdated: number;
  ordersSent: number;
  ordersFailed: number;
}

/**
 * The integration itself. One cycle:
 *  1. Send Maple & Main's waiting orders to Harbourline (each with an idempotency key).
 *  2. Pull products changed since the last sync from Harbourline, page by page,
 *     translate them with mapping.json, and write them into Maple & Main.
 */
export class Connector {
  readonly stats: ConnectorStats = { lastRunAt: null, lastOk: null, highWaterMark: null, cycles: 0, itemsUpdated: 0, ordersSent: 0, ordersFailed: 0 };
  private busy = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private hb: HarbourlineClient,
    private mm: MapleClient,
    private mapping: Mapping,
    private log: EventLog,
    private opts: { pageSize: number } = { pageSize: 5 },
  ) {}

  start(intervalMs: number, firstDelayMs = 500) {
    const tick = async () => {
      await this.cycle();
      this.timer = setTimeout(tick, intervalMs);
    };
    this.timer = setTimeout(tick, firstDelayMs);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }

  async cycle(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    let ok = true;
    try {
      ok = (await this.pushOrders()) && ok;
      ok = (await this.syncStock()) && ok;
    } finally {
      this.stats.cycles++;
      this.stats.lastRunAt = new Date().toISOString();
      this.stats.lastOk = ok;
      this.busy = false;
    }
  }

  async pushOrders(): Promise<boolean> {
    let pending;
    try {
      pending = await this.mm.orders("pending_sync");
    } catch (e) {
      this.fail("Couldn't read waiting orders", e);
      return false;
    }
    let ok = true;
    for (const order of pending) {
      try {
        const lines = order.lines.map((l) => applyMap(l, this.mapping.order_line_to_harbourline) as { sku: string; quantity: number });
        // The Maple & Main order id is the idempotency key, so a retry can never create a second order.
        const res = await this.hb.createOrder(`maple-${order.id}`, { external_ref: order.id, lines });
        await this.mm.updateOrder(order.id, { status: "synced", harbourline_order_id: res.body.id });
        this.stats.ordersSent++;
        const summary = lines.map((l) => `${l.quantity} x ${l.sku}`).join(", ");
        this.log.push("order", res.status === 200 ? `Order ${order.id} was already accepted, nothing doubled` : `Order ${order.id} sent to Harbourline`, {
          direction: "m2h",
          detail: `${summary} → ${res.body.id}`,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          // Harbourline said no for a reason that a retry won't fix. Park it, loudly.
          await this.mm.updateOrder(order.id, { status: "failed", error: `${e.code}: ${e.message}` }).catch(() => {});
          this.stats.ordersFailed++;
          this.log.push("error", `Order ${order.id} rejected by Harbourline`, { direction: "m2h", detail: `${e.code}: ${e.message}` });
          // Handled: the order is parked with its reason. The connector itself is still healthy.
        } else {
          // Network trouble or a 5xx: leave it waiting and try again next cycle.
          this.fail(`Order ${order.id} not sent yet, will retry`, e);
          ok = false;
        }
      }
    }
    return ok;
  }

  async syncStock(): Promise<boolean> {
    try {
      const current = new Map((await this.mm.inventory()).map((i) => [i.item_code, i]));
      let cursor: string | null = null;
      let pages = 0;
      let changed = 0;
      let newest = this.stats.highWaterMark;
      do {
        const page = await this.hb.listProducts({ limit: this.opts.pageSize, cursor, updated_since: this.stats.highWaterMark });
        pages++;
        for (const p of page.data) {
          const item = applyMap(p as unknown as Record<string, unknown>, this.mapping.product_to_item) as { item_code: string; description: string; qty: number };
          const before = current.get(item.item_code);
          if (!before || before.qty !== item.qty || before.description !== item.description) {
            await this.mm.upsertItem(item.item_code, { description: item.description, qty: item.qty });
            changed++;
            this.log.push("stock", before ? `${item.description}: ${before.qty} → ${item.qty}` : `${item.description} added (${item.qty})`, {
              direction: "h2m",
              detail: item.item_code,
            });
          }
          if (!newest || p.updated_at > newest) newest = p.updated_at;
        }
        cursor = page.next_cursor;
      } while (cursor);
      // Only move the high-water mark after every page succeeded, so nothing is skipped.
      this.stats.highWaterMark = newest;
      this.stats.itemsUpdated += changed;
      if (changed > 0) this.log.push("sync", `Stock sync: ${changed} changed`, { detail: `${pages} page${pages === 1 ? "" : "s"} read` });
      return true;
    } catch (e) {
      this.fail("Stock sync failed, will retry", e);
      return false;
    }
  }

  private fail(title: string, e: unknown) {
    const detail = e instanceof ApiError ? `${e.system}: ${e.code} (${e.status || "no response"}) ${e.message}` : e instanceof MappingError ? `Mapping: ${e.message}` : String(e);
    this.log.push("error", title, { detail });
  }
}
