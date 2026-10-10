import Fastify from "fastify";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";

// A tiny stand-in for Keycloak, for tests only. It signs real RS256 tokens,
// publishes its public key as a JWKS, and supports the client credentials grant.

export async function startFakeIdp(opts: { lifespanSec?: number; scopes?: string[] } = {}) {
  let key: { privateKey: CryptoKey; publicKey: CryptoKey } = await generateKeyPair("RS256", { extractable: true });
  let kid = "k1";
  const app = Fastify();
  let issuer = "";
  let tokensIssued = 0;
  let expiredNext = false;

  const mint = (o: { aud?: string; scope?: string; expSec?: number; iss?: string; signWith?: CryptoKey } = {}) =>
    new SignJWT({ scope: o.scope ?? (opts.scopes ?? ["inventory:read", "orders:write", "webhooks:manage"]).join(" "), azp: "maple-connector" })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(o.iss ?? issuer)
      .setAudience(o.aud ?? "harbourline-api")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + (o.expSec ?? opts.lifespanSec ?? 300))
      .sign(o.signWith ?? key.privateKey);

  app.get("/realms/harbourline/protocol/openid-connect/certs", async () => ({ keys: [{ ...(await exportJWK(key.publicKey)), kid, alg: "RS256", use: "sig" }] }));
  app.post<{ Body: Record<string, string> }>("/realms/harbourline/protocol/openid-connect/token", async (req, reply) => {
    const b = req.body;
    if (b.grant_type !== "client_credentials") return reply.code(400).send({ error: "unsupported_grant_type" });
    if (b.client_id !== "maple-connector" || b.client_secret !== "test-secret") return reply.code(401).send({ error: "invalid_client", error_description: "Invalid client credentials" });
    tokensIssued++;
    // Simulates clock skew: the token is already expired, but the server still says "valid for 300s".
    const access_token = await mint(expiredNext ? { expSec: -60 } : {});
    expiredNext = false;
    return { access_token, token_type: "Bearer", expires_in: opts.lifespanSec ?? 300 };
  });
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_r, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string))));

  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  issuer = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}/realms/harbourline`;

  return {
    issuer,
    jwksUrl: `${issuer}/protocol/openid-connect/certs`,
    tokenUrl: `${issuer}/protocol/openid-connect/token`,
    mint,
    tokensIssued: () => tokensIssued,
    /** The next token issued will already be expired (clock skew between servers). */
    issueExpiredNext() {
      expiredNext = true;
    },
    /** Swap to a new signing key, as a login server does periodically. Old tokens stop verifying. */
    async rotateKeys() {
      key = await generateKeyPair("RS256", { extractable: true });
      kid = `k${Number(kid.slice(1)) + 1}`;
    },
    otherKey: async () => (await generateKeyPair("RS256")).privateKey,
    close: () => app.close(),
  };
}
