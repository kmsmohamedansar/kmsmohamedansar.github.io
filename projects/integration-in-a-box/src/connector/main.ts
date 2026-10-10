import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createConnectorApp } from "./app.ts";
import { validateMapping } from "./mapping.ts";

const mapping = validateMapping(JSON.parse(readFileSync(process.env.MAPPING_PATH ?? "mapping.json", "utf8")));
const env = process.env;
const { app, connector, log, subscribeToWebhooks } = createConnectorApp({
  harbourlineUrl: process.env.HARBOURLINE_URL ?? "http://localhost:4001",
  mapleUrl: process.env.MAPLE_URL ?? "http://localhost:4002",
  mapping,
  pageSize: Number(process.env.PAGE_SIZE ?? 5),
  webDist: resolve(process.env.WEB_DIST ?? "web/dist"),
  logger: true,
  oauth: env.OAUTH_TOKEN_URL
    ? { tokenUrl: env.OAUTH_TOKEN_URL, clientId: env.OAUTH_CLIENT_ID ?? "maple-connector", clientSecret: env.OAUTH_CLIENT_SECRET ?? "" }
    : undefined,
  sso: env.SSO_PUBLIC_ISSUER
    ? {
        publicIssuer: env.SSO_PUBLIC_ISSUER,
        internalIssuer: env.SSO_INTERNAL_ISSUER ?? env.SSO_PUBLIC_ISSUER,
        clientId: env.SSO_CLIENT_ID ?? "control-room",
        clientSecret: env.SSO_CLIENT_SECRET ?? "",
        redirectUri: env.SSO_REDIRECT_URI ?? "http://localhost:4000/auth/callback",
        afterLogoutUri: env.SSO_AFTER_LOGOUT_URI ?? "http://localhost:4000/",
      }
    : undefined,
  webhookUrl: env.WEBHOOK_URL,
  chaosKey: env.CHAOS_KEY,
});

const interval = Number(process.env.SYNC_INTERVAL_MS ?? 4000);
log.push("sync", "Connector started", { detail: `Syncing every ${interval / 1000}s` });
connector.start(interval, Number(process.env.START_DELAY_MS ?? 500));
subscribeToWebhooks();
await app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
