import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { EventLog } from "./events.ts";

// Single sign-on for people, using OpenID Connect's "authorization code" flow with PKCE.
// The browser never sees a token: the connector swaps the one-time code for tokens
// on the server and gives the browser only a session cookie.
//
// The login server has two addresses. The browser reaches it at a public URL
// (http://localhost:8080). The connector, inside Docker, reaches the same server at
// an internal one (http://keycloak:8080). Tokens always name the public one as issuer.

export interface SsoConfig {
  publicIssuer: string;
  internalIssuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  afterLogoutUri: string;
}

export interface SessionUser { name: string; email: string }
interface Session { user: SessionUser; idToken: string; expiresAt: number }
interface Pending { verifier: string; nonce: string; expiresAt: number }

const b64url = (b: Buffer) => b.toString("base64url");
export const pkceChallenge = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

const COOKIE = "cr_session";
const parseCookies = (h?: string) => Object.fromEntries((h ?? "").split(";").map((c) => c.trim().split("=", 2)).filter((p) => p[0]));

export function registerSso(app: FastifyInstance, cfg: SsoConfig, log: EventLog) {
  const sessions = new Map<string, Session>();
  const pending = new Map<string, Pending>();
  const jwks = createRemoteJWKSet(new URL(`${cfg.internalIssuer}/protocol/openid-connect/certs`));

  const sessionOf = (req: FastifyRequest): Session | null => {
    const id = parseCookies(req.headers.cookie)[COOKIE];
    const s = id ? sessions.get(id) : undefined;
    if (!s || s.expiresAt < Date.now()) return null;
    return s;
  };

  // Lock the control room's API. Webhooks are not locked here: they're checked by signature instead.
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith("/api/") && !sessionOf(req)) {
      return reply.code(401).send({ error: { code: "login_required", message: "Sign in first" } });
    }
  });

  app.get("/auth/login", async (_req, reply) => {
    const state = b64url(randomBytes(16));
    const verifier = b64url(randomBytes(32));
    const nonce = b64url(randomBytes(16));
    pending.set(state, { verifier, nonce, expiresAt: Date.now() + 10 * 60_000 });
    const url = new URL(`${cfg.publicIssuer}/protocol/openid-connect/auth`);
    url.search = new URLSearchParams({
      response_type: "code", client_id: cfg.clientId, redirect_uri: cfg.redirectUri, scope: "openid profile email",
      state, nonce, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256",
    }).toString();
    return reply.redirect(url.toString());
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>("/auth/callback", async (req, reply) => {
    const { code, state, error } = req.query;
    const p = state ? pending.get(state) : undefined;
    if (state) pending.delete(state);
    if (error || !code || !p || p.expiresAt < Date.now()) {
      log.push("error", "A sign-in attempt failed", { detail: error ?? "unknown or expired state" });
      return reply.code(400).type("text/html").send(`<p>Sign-in failed (${error ?? "the login link expired"}). <a href="/auth/login">Try again</a></p>`);
    }

    const res = await fetch(`${cfg.internalIssuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri, client_id: cfg.clientId, client_secret: cfg.clientSecret, code_verifier: p.verifier }),
    });
    const tokens = (await res.json()) as { id_token?: string; error?: string; error_description?: string };
    if (!res.ok || !tokens.id_token) {
      log.push("error", "Couldn't swap the sign-in code for tokens", { detail: tokens.error_description ?? tokens.error ?? `HTTP ${res.status}` });
      return reply.code(502).type("text/html").send(`<p>Sign-in failed at the token step. <a href="/auth/login">Try again</a></p>`);
    }

    const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: cfg.publicIssuer, audience: cfg.clientId });
    if (payload.nonce !== p.nonce) return reply.code(400).send("Sign-in failed: nonce mismatch");

    const user = { name: String(payload.name ?? payload.preferred_username ?? "Unknown"), email: String(payload.email ?? "") };
    const id = b64url(randomBytes(32));
    sessions.set(id, { user, idToken: tokens.id_token, expiresAt: Date.now() + 8 * 3600_000 });
    log.push("auth", `${user.name} signed in`, { detail: `via Maple & Main single sign-on (${user.email})` });
    reply.header("set-cookie", `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
    return reply.redirect("/");
  });

  app.get("/auth/me", async (req, reply) => {
    const s = sessionOf(req);
    return s ? { user: s.user } : reply.code(401).send({ error: { code: "login_required", message: "Not signed in" } });
  });

  app.get("/auth/logout", async (req, reply) => {
    const id = parseCookies(req.headers.cookie)[COOKIE];
    const s = id ? sessions.get(id) : undefined;
    if (id) sessions.delete(id);
    reply.header("set-cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    if (s) log.push("auth", `${s.user.name} signed out`);
    // Also end the session at the login server, so "sign in" really asks again.
    const url = new URL(`${cfg.publicIssuer}/protocol/openid-connect/logout`);
    url.search = new URLSearchParams({ client_id: cfg.clientId, post_logout_redirect_uri: cfg.afterLogoutUri, ...(s ? { id_token_hint: s.idToken } : {}) }).toString();
    return reply.redirect(url.toString());
  });
}
