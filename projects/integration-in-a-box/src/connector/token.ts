import type { EventLog } from "./events.ts";

// OAuth 2.0 client credentials: the connector proves who it is with its
// client id and secret, and gets a short-lived access token back.
// The token is cached and reused until shortly before it expires.

export interface ClientCredentialsConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  /** Renew this many seconds before expiry, so a token never dies mid-request. */
  renewBeforeSec?: number;
}

export class TokenManager {
  private token: string | null = null;
  private expiresAt = 0;
  private inflight: Promise<string> | null = null;
  fetched = 0;

  constructor(private cfg: ClientCredentialsConfig, private log?: EventLog) {}

  get expiresInSec(): number | null {
    return this.token ? Math.max(0, Math.round((this.expiresAt - Date.now()) / 1000)) : null;
  }

  /** "Break it": damage the cached token, as if it had been revoked. */
  corrupt() {
    if (this.token) this.token = this.token.slice(0, -6) + "broken";
  }

  /** "Break it": use a wrong client secret (as if it was rotated without telling us). null restores it. */
  overrideSecret(secret: string | null) {
    this.secretOverride = secret;
    this.invalidate();
  }
  private secretOverride: string | null = null;

  /** Forget the cached token, e.g. after the API said it was rejected. */
  invalidate() {
    this.token = null;
    this.expiresAt = 0;
  }

  async get(): Promise<string> {
    const margin = (this.cfg.renewBeforeSec ?? 30) * 1000;
    if (this.token && Date.now() < this.expiresAt - margin) return this.token;
    // If several requests need a token at once, only ask the login server once.
    this.inflight ??= this.fetchNew().finally(() => (this.inflight = null));
    return this.inflight;
  }

  private async fetchNew(): Promise<string> {
    let res: Response;
    try {
      res = await fetch(this.cfg.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.cfg.clientId, client_secret: this.secretOverride ?? this.cfg.clientSecret }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      throw new TokenError("unreachable", `The login server could not be reached (${(e as Error).message})`);
    }
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
    if (!res.ok || !body.access_token) {
      throw new TokenError(body.error ?? `http_${res.status}`, body.error_description ?? `The login server refused (HTTP ${res.status})`);
    }
    this.token = body.access_token;
    this.expiresAt = Date.now() + (body.expires_in ?? 60) * 1000;
    this.fetched++;
    this.log?.push("auth", "Got a new access token", { detail: `Valid for ${body.expires_in}s` });
    return this.token;
  }
}

export class TokenError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
