import { createHmac, timingSafeEqual } from "node:crypto";

// Webhook signatures, in the same shape many payment and SaaS APIs use:
//   Harbourline-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
// The timestamp is signed too, so an old message can't be replayed later.

export const SIGNATURE_HEADER = "harbourline-signature";

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  const mac = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${mac}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "malformed" | "too_old" | "bad_signature" };

export function verify(secret: string, body: string, header: string | undefined, toleranceSec = 300, now = Math.floor(Date.now() / 1000)): VerifyResult {
  if (!header) return { ok: false, reason: "missing" };
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || !/^[0-9a-f]{64}$/.test(parts.v1)) return { ok: false, reason: "malformed" };
  if (Math.abs(now - t) > toleranceSec) return { ok: false, reason: "too_old" };
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest();
  const given = Buffer.from(parts.v1, "hex");
  // Constant-time compare, so response timing doesn't leak how much of the signature matched.
  return expected.length === given.length && timingSafeEqual(expected, given) ? { ok: true } : { ok: false, reason: "bad_signature" };
}
