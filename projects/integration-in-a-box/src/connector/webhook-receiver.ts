import type { FastifyInstance } from "fastify";
import { SIGNATURE_HEADER, verify } from "../shared/webhook-signature.ts";
import type { EventLog } from "./events.ts";
import type { Connector } from "./sync.ts";

// Receives Harbourline's webhooks. Checks the signature against the raw body,
// ignores events it has already handled, answers fast, then does the work.

export function registerWebhookReceiver(app: FastifyInstance, deps: { connector: Connector; log: EventLog; getSecret: () => string | null }) {
  const seen = new Set<string>();
  const remember = (id: string) => {
    seen.add(id);
    if (seen.size > 5000) seen.delete(seen.values().next().value!);
  };

  // Keep the body as the exact text that was signed; re-serialising JSON would change it.
  app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => done(null, body));

    scope.post("/webhooks/harbourline", async (req, reply) => {
      const raw = req.body as string;
      const secret = deps.getSecret();
      if (!secret) return reply.code(503).send({ error: { code: "not_ready", message: "Not subscribed yet" } });

      const check = verify(secret, raw, req.headers[SIGNATURE_HEADER] as string | undefined);
      if (!check.ok) {
        deps.connector.stats.webhooksRejected++;
        deps.log.push("error", "Rejected a webhook", { detail: `signature ${check.reason.replace("_", " ")}` });
        return reply.code(401).send({ error: { code: `signature_${check.reason}`, message: "Signature check failed" } });
      }

      const event = JSON.parse(raw) as { id: string; type: string; data: { sku: string; stock_level?: number } };
      if (seen.has(event.id)) {
        deps.log.push("webhook", "Duplicate webhook ignored", { detail: event.id });
        return reply.code(200).send({ ok: true, duplicate: true });
      }
      remember(event.id);
      deps.connector.stats.webhooksReceived++;

      // Answer straight away so Harbourline doesn't time out, then do the work.
      if (event.type === "stock.changed") {
        setImmediate(() => deps.connector.applyProductChange(event.data.sku, event.data.stock_level).catch((e) => deps.log.push("error", "Webhook follow-up failed, the regular sync will catch it", { detail: String(e.message ?? e) })));
      }
      return reply.code(200).send({ ok: true });
    });
  });
}
