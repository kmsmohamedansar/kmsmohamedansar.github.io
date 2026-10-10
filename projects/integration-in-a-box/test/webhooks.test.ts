import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { sign, verify, SIGNATURE_HEADER } from "../src/shared/webhook-signature.ts";
import { createHarbourline } from "../src/harbourline/app.ts";
import { startStack } from "./helpers.ts";

const until = async (cond: () => Promise<boolean> | boolean, ms = 5000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("timed out waiting");
};

describe("webhook signatures", () => {
  const body = JSON.stringify({ id: "evt_1", type: "stock.changed" });
  it("accepts a correct signature", () => expect(verify("s3cret", body, sign("s3cret", body))).toEqual({ ok: true }));
  it("catches a changed body", () => expect(verify("s3cret", body.replace("evt_1", "evt_2"), sign("s3cret", body))).toEqual({ ok: false, reason: "bad_signature" }));
  it("catches the wrong secret", () => expect(verify("other", body, sign("s3cret", body))).toEqual({ ok: false, reason: "bad_signature" }));
  it("refuses an old message, so it can't be replayed", () =>
    expect(verify("s3cret", body, sign("s3cret", body, Math.floor(Date.now() / 1000) - 3600))).toEqual({ ok: false, reason: "too_old" }));
  it("refuses a missing or garbled header", () => {
    expect(verify("s3cret", body, undefined)).toEqual({ ok: false, reason: "missing" });
    expect(verify("s3cret", body, "nonsense")).toEqual({ ok: false, reason: "malformed" });
  });
});

let stack: Awaited<ReturnType<typeof startStack>>;
afterEach(() => stack?.close());

describe("webhooks end to end, with logins on", () => {
  it("a delivery at Harbourline reaches Maple & Main by webhook, without waiting for a sync", async () => {
    stack = await startStack(5, { secure: true });
    await stack.connector.cycle();
    await stack.subscribe();
    const token = await stack.idp!.mint();
    await stack.json(`${stack.hbUrl}/v1/products/HB-1010/stock`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ change: 10, reason: "delivery" }) });
    await until(async () => (await stack.json(`${stack.mmUrl}/api/inventory`)).body.find((i: { item_code: string }) => i.item_code === "HB-1010").qty === 17);
    expect(stack.connector.stats.webhooksReceived).toBe(1);
    expect(stack.log.recent().some((e) => e.kind === "webhook" && e.title === "Olive oil 500ml: 7 → 17" && e.detail === "HB-1010, pushed by webhook")).toBe(true);
  });

  it("ignores the same event delivered twice", async () => {
    stack = await startStack(5, { secure: true });
    await stack.subscribe();
    const event = JSON.stringify({ id: "evt_dupe", type: "noop", data: {} });
    const send = () =>
      fetch(`${stack.cUrl}/webhooks/harbourline`, { method: "POST", headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign(stack.webhookSecret()!, event) }, body: event }).then((r) => r.json());
    expect(await send()).toEqual({ ok: true });
    expect(await send()).toEqual({ ok: true, duplicate: true });
  });

  it("rejects a webhook with a bad signature", async () => {
    stack = await startStack(5, { secure: true });
    await stack.subscribe();
    const body = JSON.stringify({ id: "evt_x", type: "stock.changed", data: { sku: "HB-1001" } });
    const r = await fetch(`${stack.cUrl}/webhooks/harbourline`, { method: "POST", headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign("not-the-secret", body) }, body });
    expect(r.status).toBe(401);
    expect(stack.connector.stats.webhooksRejected).toBe(1);
  });
});

describe("Harbourline retries failed deliveries", () => {
  const receiver = async (failFirst: number) => {
    let calls = 0;
    const app = Fastify();
    app.post("/hook", async (_req, reply) => (++calls <= failFirst ? reply.code(500).send({}) : { ok: true }));
    await app.listen({ port: 0, host: "127.0.0.1" });
    const a = app.server.address();
    return { url: `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}/hook`, calls: () => calls, close: () => app.close() };
  };
  const setup = async () => {
    const hb = createHarbourline({ dbPath: ":memory:", webhooks: { dispatchEveryMs: 20, baseDelayMs: 20 } });
    await hb.ready();
    return hb;
  };

  it("keeps trying, with growing gaps, until the receiver recovers", async () => {
    const rx = await receiver(2);
    const hb = await setup();
    await hb.inject({ method: "POST", url: "/v1/webhook-subscriptions", payload: { url: rx.url, events: ["stock.changed"] } });
    await hb.inject({ method: "POST", url: "/v1/products/HB-1001/stock", payload: { change: 1, reason: "delivery" } });
    await until(async () => (await hb.inject("/v1/webhook-deliveries")).json().data[0]?.status === "delivered");
    const d = (await hb.inject("/v1/webhook-deliveries")).json().data[0];
    expect(d.attempts).toBe(3);
    expect(rx.calls()).toBe(3);
    await hb.close();
    await rx.close();
  });

  it("still delivers deliveries that were waiting when the receiver re-subscribed with a new secret", async () => {
    const rx = await receiver(1);
    const hb = await setup();
    const first = (await hb.inject({ method: "POST", url: "/v1/webhook-subscriptions", payload: { url: rx.url, events: ["stock.changed"] } })).json();
    await hb.inject({ method: "POST", url: "/v1/products/HB-1001/stock", payload: { change: 1, reason: "delivery" } });
    await until(async () => (await hb.inject("/v1/webhook-deliveries")).json().data[0]?.attempts >= 1);
    // The receiver restarts and subscribes again: same subscription, fresh secret.
    const second = (await hb.inject({ method: "POST", url: "/v1/webhook-subscriptions", payload: { url: rx.url, events: ["stock.changed"] } })).json();
    expect(second.id).toBe(first.id);
    expect(second.secret).not.toBe(first.secret);
    await until(async () => (await hb.inject("/v1/webhook-deliveries")).json().data[0]?.status === "delivered");
    await hb.close();
    await rx.close();
  });

  it("gives up after 6 attempts and marks the delivery failed, with the last error", async () => {
    const rx = await receiver(999);
    const hb = await setup();
    await hb.inject({ method: "POST", url: "/v1/webhook-subscriptions", payload: { url: rx.url, events: ["stock.changed"] } });
    await hb.inject({ method: "POST", url: "/v1/products/HB-1001/stock", payload: { change: 1, reason: "delivery" } });
    await until(async () => (await hb.inject("/v1/webhook-deliveries")).json().data[0]?.status === "failed", 8000);
    const d = (await hb.inject("/v1/webhook-deliveries")).json().data[0];
    expect(d.attempts).toBe(6);
    expect(d.last_error).toBe("HTTP 500");
    await hb.close();
    await rx.close();
  });
});
