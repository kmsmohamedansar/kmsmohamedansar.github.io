import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarbourline } from "../src/harbourline/app.ts";

const app = createHarbourline({ dbPath: ":memory:" });
beforeAll(() => app.ready());
afterAll(() => app.close());

const order = (key: string, lines: unknown) =>
  app.inject({ method: "POST", url: "/v1/orders", headers: { "idempotency-key": key }, payload: { external_ref: "x", lines } });

describe("Harbourline API", () => {
  it("pages through products with a cursor until next_cursor is null", async () => {
    const skus: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r: Awaited<ReturnType<typeof app.inject>> = await app.inject(`/v1/products?limit=5${cursor ? `&cursor=${cursor}` : ""}`);
      const body: { data: { sku: string }[]; next_cursor: string | null } = r.json();
      skus.push(...body.data.map((p: { sku: string }) => p.sku));
      cursor = body.next_cursor;
      pages++;
    } while (cursor);
    expect(pages).toBe(3);
    expect(skus).toHaveLength(12);
    expect(new Set(skus).size).toBe(12);
  });

  it("rejects a bad page size with a clear error code", async () => {
    const r = await app.inject("/v1/products?limit=500");
    expect(r.statusCode).toBe(400);
    expect(r.json().error.code).toBe("invalid_request");
  });

  it("takes stock when an order is placed", async () => {
    const before = (await app.inject("/v1/products/HB-1001")).json().stock_level;
    const r = await order("k-1", [{ sku: "HB-1001", quantity: 2 }]);
    expect(r.statusCode).toBe(201);
    expect((await app.inject("/v1/products/HB-1001")).json().stock_level).toBe(before - 2);
  });

  it("does not double an order sent twice with the same Idempotency-Key", async () => {
    const before = (await app.inject("/v1/products/HB-1002")).json().stock_level;
    const first = await order("k-2", [{ sku: "HB-1002", quantity: 1 }]);
    const again = await order("k-2", [{ sku: "HB-1002", quantity: 1 }]);
    expect(first.statusCode).toBe(201);
    expect(again.statusCode).toBe(200);
    expect(again.json().id).toBe(first.json().id);
    expect((await app.inject("/v1/products/HB-1002")).json().stock_level).toBe(before - 1);
  });

  it("refuses an order without an Idempotency-Key", async () => {
    const r = await app.inject({ method: "POST", url: "/v1/orders", payload: { lines: [{ sku: "HB-1001", quantity: 1 }] } });
    expect(r.statusCode).toBe(400);
  });

  it("rejects the whole order if any line lacks stock, and changes nothing", async () => {
    const a = (await app.inject("/v1/products/HB-1003")).json().stock_level;
    const r = await order("k-3", [{ sku: "HB-1003", quantity: 1 }, { sku: "HB-1010", quantity: 999 }]);
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe("insufficient_stock");
    expect((await app.inject("/v1/products/HB-1003")).json().stock_level).toBe(a);
  });

  it("filters by updated_since so a sync only reads what changed", async () => {
    const mark = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await app.inject({ method: "POST", url: "/v1/products/HB-1005/stock", payload: { change: 3, reason: "delivery" } });
    const r = (await app.inject(`/v1/products?updated_since=${encodeURIComponent(mark)}`)).json();
    expect(r.data.map((p: { sku: string }) => p.sku)).toEqual(["HB-1005"]);
  });
});
