import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarbourline } from "../src/harbourline/app.ts";
import { TokenManager } from "../src/connector/token.ts";
import { HarbourlineClient } from "../src/connector/clients.ts";
import { startFakeIdp } from "./fake-idp.ts";

let idp: Awaited<ReturnType<typeof startFakeIdp>>;
let hb: ReturnType<typeof createHarbourline>;
let hbUrl: string;

beforeAll(async () => {
  idp = await startFakeIdp();
  hb = createHarbourline({ dbPath: ":memory:", auth: { issuer: idp.issuer, jwksUrl: idp.jwksUrl, audience: "harbourline-api" } });
  await hb.listen({ port: 0, host: "127.0.0.1" });
  const a = hb.server.address();
  hbUrl = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}`;
});
afterAll(async () => {
  await hb.close();
  await idp.close();
});

const get = (token?: string) => fetch(`${hbUrl}/v1/products?limit=1`, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then(async (r) => ({ status: r.status, body: await r.json(), www: r.headers.get("www-authenticate") }));

describe("Harbourline checks every access token", () => {
  it("refuses a call with no token, and says how to authenticate", async () => {
    const r = await get();
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("unauthorized");
    expect(r.www).toContain("Bearer");
  });

  it("accepts a valid token", async () => {
    expect((await get(await idp.mint())).status).toBe(200);
  });

  it("names an expired token as expired", async () => {
    const r = await get(await idp.mint({ expSec: -10 }));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("token_expired");
  });

  it("refuses a token issued for a different API", async () => {
    const r = await get(await idp.mint({ aud: "some-other-api" }));
    expect(r.body.error.code).toBe("invalid_audience");
  });

  it("refuses a token from a login server it doesn't trust", async () => {
    const r = await get(await idp.mint({ iss: "http://evil.example/realms/x" }));
    expect(r.body.error.code).toBe("invalid_issuer");
  });

  it("refuses a token signed with the wrong key", async () => {
    const r = await get(await idp.mint({ signWith: await idp.otherKey() }));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("invalid_token");
  });

  it("returns 403, not 401, when the token is fine but lacks the permission", async () => {
    const r = await get(await idp.mint({ scope: "orders:write" }));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("insufficient_scope");
    expect(r.www).toContain('scope="inventory:read"');
  });

  it("leaves the health check open", async () => {
    expect((await fetch(`${hbUrl}/v1/health`)).status).toBe(200);
  });
});

describe("the connector's token handling", () => {
  it("reuses one token across calls instead of asking every time", async () => {
    const before = idp.tokensIssued();
    const tm = new TokenManager({ tokenUrl: idp.tokenUrl, clientId: "maple-connector", clientSecret: "test-secret" });
    const client = new HarbourlineClient(hbUrl, tm);
    await Promise.all([client.listProducts({ limit: 1 }), client.listProducts({ limit: 1 }), client.listProducts({ limit: 1 })]);
    await client.listProducts({ limit: 1 });
    expect(idp.tokensIssued() - before).toBe(1);
  });

  it("gets a fresh token and retries once when Harbourline rejects the one it has (clock skew)", async () => {
    const tm = new TokenManager({ tokenUrl: idp.tokenUrl, clientId: "maple-connector", clientSecret: "test-secret" });
    const client = new HarbourlineClient(hbUrl, tm);
    const before = idp.tokensIssued();
    idp.issueExpiredNext();
    // First token is already expired: Harbourline says 401 token_expired, the client gets another and retries.
    const page = await client.listProducts({ limit: 1 });
    expect(page.data).toHaveLength(1);
    expect(idp.tokensIssued() - before).toBe(2);
  });

  it("reports wrong client credentials clearly", async () => {
    const tm = new TokenManager({ tokenUrl: idp.tokenUrl, clientId: "maple-connector", clientSecret: "wrong" });
    await expect(tm.get()).rejects.toMatchObject({ code: "invalid_client" });
  });
});
