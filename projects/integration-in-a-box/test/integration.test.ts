import { afterEach, describe, expect, it } from "vitest";
import { startStack } from "./helpers.ts";

let stack: Awaited<ReturnType<typeof startStack>>;
afterEach(() => stack?.close());

describe("end to end: Harbourline ⇄ connector ⇄ Maple & Main", () => {
  it("first sync fills Maple & Main's empty shelves, reading 3 pages of 5", async () => {
    stack = await startStack(5);
    expect((await stack.json(`${stack.mmUrl}/api/inventory`)).body).toHaveLength(0);
    await stack.connector.cycle();
    const inv = (await stack.json(`${stack.mmUrl}/api/inventory`)).body;
    expect(inv).toHaveLength(12);
    expect(inv[0]).toMatchObject({ item_code: "HB-1001", description: "Rolled oats 1kg", qty: 42 });
    expect(stack.log.recent().some((e) => e.title.includes("12 changed") && e.detail === "3 pages read")).toBe(true);
  });

  it("a sale at Maple & Main reaches Harbourline, and the new stock flows back", async () => {
    stack = await startStack();
    await stack.connector.cycle();
    const sale = await stack.json(`${stack.mmUrl}/api/orders`, { method: "POST", body: JSON.stringify({ lines: [{ item_code: "HB-1004", qty: 3 }] }) });
    await stack.connector.cycle();
    expect((await stack.json(`${stack.hbUrl}/v1/products/HB-1004`)).body.stock_level).toBe(27);
    const mmItem = (await stack.json(`${stack.mmUrl}/api/inventory`)).body.find((i: { item_code: string }) => i.item_code === "HB-1004");
    expect(mmItem.qty).toBe(27);
    const synced = (await stack.json(`${stack.mmUrl}/api/orders`)).body.find((o: { id: string }) => o.id === sale.body.id);
    expect(synced.status).toBe("synced");
    expect(synced.harbourline_order_id).toMatch(/^ord_/);
  });

  it("a delivery at Harbourline shows up at Maple & Main, and only that item is re-sent", async () => {
    stack = await startStack();
    await stack.connector.cycle();
    await stack.json(`${stack.hbUrl}/v1/products/HB-1010/stock`, { method: "POST", body: JSON.stringify({ change: 10, reason: "delivery" }) });
    const before = stack.connector.stats.itemsUpdated;
    await stack.connector.cycle();
    expect(stack.connector.stats.itemsUpdated - before).toBe(1);
    const item = (await stack.json(`${stack.mmUrl}/api/inventory`)).body.find((i: { item_code: string }) => i.item_code === "HB-1010");
    expect(item.qty).toBe(17);
  });

  it("an order Harbourline can't fill is parked as failed with the reason, not retried forever", async () => {
    stack = await startStack();
    await stack.connector.cycle();
    const sale = await stack.json(`${stack.mmUrl}/api/orders`, { method: "POST", body: JSON.stringify({ lines: [{ item_code: "HB-1005", qty: 500 }] }) });
    await stack.connector.cycle();
    const o = (await stack.json(`${stack.mmUrl}/api/orders`)).body.find((x: { id: string }) => x.id === sale.body.id);
    expect(o.status).toBe("failed");
    expect(o.error).toMatch(/insufficient_stock/);
    expect(stack.log.recent().some((e) => e.kind === "error" && e.title.includes("rejected"))).toBe(true);
    // A rejection is handled, not an outage: the connector still reports healthy.
    expect(stack.connector.stats.lastOk).toBe(true);
  });

  it("reports unhealthy, and keeps the order waiting, when Harbourline can't be reached", async () => {
    stack = await startStack();
    await stack.connector.cycle();
    await stack.json(`${stack.mmUrl}/api/orders`, { method: "POST", body: JSON.stringify({ lines: [{ item_code: "HB-1001", qty: 1 }] }) });
    await stack.closeHarbourline();
    await stack.connector.cycle();
    expect(stack.connector.stats.lastOk).toBe(false);
    const o = (await stack.json(`${stack.mmUrl}/api/orders`)).body[0];
    expect(o.status).toBe("pending_sync");
    expect(stack.log.recent().some((e) => e.title.includes("will retry") && /unreachable/.test(e.detail ?? ""))).toBe(true);
  });

  it("the control room's state endpoint shows both systems side by side", async () => {
    stack = await startStack();
    await stack.connector.cycle();
    const s = (await stack.json(`${stack.cUrl}/api/state`)).body;
    expect(s.harbourline).toHaveLength(12);
    expect(s.maple).toHaveLength(12);
    expect(s.connector.lastOk).toBe(true);
  });
});
