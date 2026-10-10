import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { errorBody } from "../shared/db.ts";

// Harbourline checks an OAuth 2.0 access token on every call:
// signed by the expected login server, not expired, meant for this API,
// and carrying the permission (scope) the route needs.

export interface AuthConfig {
  /** The `iss` value tokens must carry, e.g. http://localhost:8080/realms/harbourline */
  issuer: string;
  /** Where to fetch the signing keys. May differ from the issuer inside Docker. */
  jwksUrl: string;
  audience: string;
  /** For tests: supply keys directly instead of fetching them. */
  keys?: JWTVerifyGetKey;
}

export function makeRequireScope(cfg: AuthConfig) {
  const keys = cfg.keys ?? createRemoteJWKSet(new URL(cfg.jwksUrl));

  return (scope: string) => async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      reply.header("www-authenticate", 'Bearer realm="harbourline"');
      return reply.code(401).send(errorBody("unauthorized", "Send an access token: Authorization: Bearer <token>"));
    }
    try {
      const { payload } = await jwtVerify(header.slice(7), keys, { issuer: cfg.issuer, audience: cfg.audience });
      const scopes = String(payload.scope ?? "").split(" ");
      if (!scopes.includes(scope)) {
        reply.header("www-authenticate", `Bearer error="insufficient_scope", scope="${scope}"`);
        return reply.code(403).send(errorBody("insufficient_scope", `This call needs the "${scope}" scope. The token has: ${scopes.join(", ") || "none"}`));
      }
      (req as FastifyRequest & { client?: string }).client = String(payload.azp ?? payload.sub);
    } catch (e) {
      const [code, msg] =
        e instanceof errors.JWTExpired ? ["token_expired", "The access token has expired. Get a new one."]
        : e instanceof errors.JWTClaimValidationFailed && e.claim === "aud" ? ["invalid_audience", "This token wasn't issued for the Harbourline API."]
        : e instanceof errors.JWTClaimValidationFailed && e.claim === "iss" ? ["invalid_issuer", "This token comes from a login server Harbourline doesn't trust."]
        : ["invalid_token", "The access token couldn't be verified."];
      reply.header("www-authenticate", `Bearer error="invalid_token", error_description="${code}"`);
      return reply.code(401).send(errorBody(code, msg));
    }
  };
}
