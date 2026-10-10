import { afterEach, describe, expect, it } from "vitest";
import { startStack } from "./helpers.ts";

// One test per entry in docs/RUNBOOK.md: cause the break for real, check it's
// detected the way the runbook says, fix it, and check everything recovers.

let s: Awaited<ReturnType<typeof startStack>>;
afterEach(() => s?.close());

const until = async (cond: () => Promise<boolean> | boolean, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("timed out waiting");
};
const brk = (id: string, on = true) => s.json(`${s.cUrl}/api/breaks/${id}`, { method: "POST", body: JSON.stringify({ on }) });
const orders = async () => (await s.json(`${s.mmUrl}/api/orders`)).body as { id: string; status: string; error: string | null }[];
const mmQty = async (code: string) => ((await s.json(`${s.mmUrl}/api/inventory`)).body as { item_code: string; qty: number }[]).find((i) => i.item_code === code)?.qty;
const hbQty = async (sku: string) => (await s.json(`${s.hbUrl}/v1/products/${sku}`, { headers: { authorization: `Bearer ${await s.idp!.mint()}` } })).body.stock_level;
const logHas = (re: RegExp) => s.log.recent(300).some((e) => re.test(`${e.title} ${e.detail ?? ""}`));

async function ready() {
  s = await startStack(5, { secure: true });
  await s.connector.cycle();
  await s.subscribe();
}

describe("the Break it panel", () => {
  it("lists all ten breaks", async () => {
    await ready();
    const list = (await s.json(`${s.cUrl}/api/breaks`)).body;
    expect(list.map((b: { n: number }) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("1. token rejected: one 401, a fresh token, and the call succeeds", async () => {
    await ready();
    const before = s.tokens!.fetched;
    await brk("token-rejected");
    await s.connector.cycle();
    expect(s.tokens!.fetched).toBe(before + 1);
    expect(logHas(/rejected the access token/)).toBe(true);
    expect(s.connector.stats.lastOk).toBe(true);
  });

  it("2. wrong client secret: health goes red and orders wait, then all go through once fixed", async () => {
    await ready();
    await brk("wrong-secret");
    await s.json(`${s.mmUrl}/api/orders`, { method: "POST", body: JSON.stringify({ lines: [{ item_code: "HB-1001", qty: 1 }] }) });
    // The cached token is dropped, so the next call has to log in with the wrong secret.
    await s.connector.cycle();
    expect(s.connector.stats.lastOk).toBe(false);
    expect(logHas(/invalid_client|refused/i)).toBe(true);
    expect((await orders())[0].status).toBe("pending_sync");
    await brk("wrong-secret", false);
    await s.connector.cycle();
    expect((await orders())[0].status).toBe("synced");
  });

  it("3. permission removed: orders get 403 and wait instead of being rejected", async () => {
    await ready();
    await brk("scope-revoked");
    await s.connector.cycle();
    expect(logHas(/insufficient_scope/)).toBe(true);
    expect((await orders())[0].status).toBe("pending_sync");
    await brk("scope-revoked", false);
    await s.connector.cycle();
    expect((await orders())[0].status).toBe("synced");
  });

  it("4. lost reply: the retry is recognised and the order is not doubled", async () => {
    await ready();
    const code = ((await s.json(`${s.mmUrl}/api/inventory`)).body as { item_code: string; qty: number }[]).find((i) => i.qty > 0)!.item_code;
    const before = await hbQty(code);
    await brk("lost-reply");
    await s.connector.cycle(); // accepted, reply "lost"
    expect((await orders())[0].status).toBe("pending_sync");
    await s.connector.cycle(); // retried with the same key
    expect((await orders())[0].status).toBe("synced");
    expect(logHas(/already accepted, nothing doubled/)).toBe(true);
    expect(await hbQty(code)).toBe(before - 1);
  });

  it("5. webhooks out of order: Maple & Main still ends on Harbourline's number", async () => {
    await ready();
    await brk("out-of-order");
    await until(async () => (await mmQty("HB-1006")) === (await hbQty("HB-1006")) && s.connector.stats.webhooksReceived >= 2);
    expect(await mmQty("HB-1006")).toBe(62);
    // The older event (stock 65) arrived after the newer one, and was not allowed to put 65 back.
    await until(() => logHas(/webhook said 65, but Harbourline has 62 now/));
  });

  it("6. rate limit: the connector honours Retry-After and pauses", async () => {
    await ready();
    await brk("rate-limit");
    for (let i = 0; i < 4 && !logHas(/Rate limited/); i++) await s.connector.cycle();
    expect(logHas(/Rate limited by Harbourline, pausing for \d+s/)).toBe(true);
    expect(s.connector.pausedUntil).toBeGreaterThan(Date.now());
    await brk("rate-limit", false);
  });

  it("7. renamed field: sync stops and names the field; nothing bad is written", async () => {
    await ready();
    await brk("renamed-field");
    // A real change at Harbourline, so the sync has something to read.
    await s.json(`${s.hbUrl}/v1/products/HB-1002/stock`, { method: "POST", headers: { authorization: `Bearer ${await s.idp!.mint()}` }, body: JSON.stringify({ change: 5, reason: "delivery" }) });
    const before = await mmQty("HB-1002");
    await s.connector.syncStock();
    expect(logHas(/"stock_level" is missing/)).toBe(true);
    expect(await mmQty("HB-1002")).toBe(before);
    await brk("renamed-field", false);
    await s.connector.syncStock();
    expect(await mmQty("HB-1002")).toBe(23);
  });

  it("8. slow API: calls time out, health goes red, then catches up", async () => {
    await ready();
    await brk("slow-api");
    await s.connector.cycle();
    expect(s.connector.stats.lastOk).toBe(false);
    expect(logHas(/did not answer in time/)).toBe(true);
    await brk("slow-api", false);
    await new Promise((r) => setTimeout(r, 300));
    await s.connector.cycle();
    expect(s.connector.stats.lastOk).toBe(true);
  }, 30000);

  it("9. forged webhook: refused by the signature check, nothing changes", async () => {
    await ready();
    const before = await mmQty("HB-1001");
    await brk("forged-webhook");
    expect(s.connector.stats.webhooksRejected).toBe(1);
    expect(await mmQty("HB-1001")).toBe(before);
  });

  it("10. outage: everything waits, then goes through when Harbourline is back", async () => {
    await ready();
    await brk("outage");
    await s.json(`${s.mmUrl}/api/orders`, { method: "POST", body: JSON.stringify({ lines: [{ item_code: "HB-1003", qty: 2 }] }) });
    await s.connector.cycle();
    expect(s.connector.stats.lastOk).toBe(false);
    expect((await orders())[0].status).toBe("pending_sync");
    await brk("outage", false);
    await s.connector.cycle();
    expect((await orders())[0].status).toBe("synced");
    expect(s.connector.stats.lastOk).toBe(true);
  });
});
