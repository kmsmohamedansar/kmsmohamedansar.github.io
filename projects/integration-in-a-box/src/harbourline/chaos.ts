import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { errorBody } from "../shared/db.ts";

// Deliberate faults for the "Break it" panel. Only switched on when the server is
// started with chaos enabled (the demo does; a real deployment never would).

export interface HarbourlineChaos {
  /** Every API call answers 503 Service Unavailable, as in an outage. */
  outage: boolean;
  /** Every API call takes this long to answer. */
  slowMs: number;
  /** A tight rate limit: this many calls per 10 seconds. 0 means the normal limit. */
  rateLimitPer10s: number;
  /** Products come back with stock_level renamed to stock_on_hand, as after a vendor release. */
  renameStockField: boolean;
  /** An admin removed this scope from the integration's permissions. */
  revokedScope: string | null;
  /** Hold webhooks and send them newest first. */
  reverseWebhooks: boolean;
}

export const NORMAL: HarbourlineChaos = { outage: false, slowMs: 0, rateLimitPer10s: 0, renameStockField: false, revokedScope: null, reverseWebhooks: false };
const NORMAL_LIMIT_PER_10S = 200;

export function registerChaos(app: FastifyInstance, chaos: HarbourlineChaos, opts: { enabled: boolean; key?: string }) {
  // Rate limiting is always on (generous normally), so a client that ignores 429s would be caught in real life too.
  const hits: number[] = [];
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.url.startsWith("/v1/") || req.url === "/v1/health") return;
    if (chaos.outage) return reply.code(503).header("retry-after", "5").send(errorBody("unavailable", "Harbourline is down for maintenance"));
    const limit = chaos.rateLimitPer10s || NORMAL_LIMIT_PER_10S;
    const now = Date.now();
    while (hits.length && hits[0] < now - 10_000) hits.shift();
    if (hits.length >= limit) {
      const retryAfter = Math.max(1, Math.ceil((hits[0] + 10_000 - now) / 1000));
      return reply.code(429).header("retry-after", String(retryAfter)).send(errorBody("rate_limited", `Too many requests. Try again in ${retryAfter}s.`));
    }
    hits.push(now);
    if (chaos.slowMs) await new Promise((r) => setTimeout(r, chaos.slowMs));
  });

  if (!opts.enabled) return;
  // The switchboard. Protected by a shared key, and never registered unless chaos is enabled.
  const guard = async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.headers["x-chaos-key"] !== opts.key) return reply.code(403).send(errorBody("forbidden", "Wrong chaos key"));
  };
  app.get("/_chaos", { preHandler: guard }, async () => chaos);
  app.put<{ Body: Partial<HarbourlineChaos> }>("/_chaos", { preHandler: guard }, async (req) => {
    Object.assign(chaos, req.body ?? {});
    return chaos;
  });
  app.delete("/_chaos", { preHandler: guard }, async () => Object.assign(chaos, NORMAL));
}
