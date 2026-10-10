import { createHarbourline } from "./app.ts";

const port = Number(process.env.PORT ?? 4001);
const env = process.env;
const app = createHarbourline({
  dbPath: env.DB_PATH ?? "data/harbourline.db",
  logger: true,
  auth: env.AUTH_ISSUER
    ? { issuer: env.AUTH_ISSUER, jwksUrl: env.AUTH_JWKS_URL ?? `${env.AUTH_ISSUER}/protocol/openid-connect/certs`, audience: env.AUTH_AUDIENCE ?? "harbourline-api" }
    : undefined,
});
await app.listen({ port, host: "0.0.0.0" });
