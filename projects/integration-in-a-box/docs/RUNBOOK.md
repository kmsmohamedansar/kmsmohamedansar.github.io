# Runbook: Harbourline ⇄ Maple & Main integration

What to do when the integration misbehaves. Each entry matches a card in the control room's **Break it** panel, so every one can be caused for real and practised. A test in [test/breaks.test.ts](../test/breaks.test.ts) proves each behaviour described here, and [breaks-evidence.md](breaks-evidence.md) has the connector's actual log from a live run.

Every entry follows the same shape:

- **What you see:** the symptom, in the control room or the log.
- **Cause:** what's actually wrong.
- **Confirm:** how to prove it before changing anything.
- **Fix:** what to do now.
- **Prevent:** what stops it happening again, or makes it harmless.

## Before you start

Get a token the way the connector does, so you can call Harbourline yourself:

```bash
TOKEN=$(curl -s -X POST localhost:8080/realms/harbourline/protocol/openid-connect/token \
  -d grant_type=client_credentials -d client_id=maple-connector \
  -d client_secret=dev-only-connector-secret-change-me | jq -r .access_token)
```

Three questions settle most incidents:

1. **Which side is it?** Harbourline, Maple & Main, the login server, or the connector in between.
2. **Will retrying help?** The connector already decides this for you. Network failures, timeouts, 5xx, 401, 403 and 429 mean *wait and retry*. Other 4xx answers (bad data, not enough stock) mean *park it with the reason*; retrying won't change the answer.
3. **Is anything lost or doubled?** Orders carry idempotency keys and webhook events carry ids, so the answer should always be no. Check anyway.

---

## 1. Access token rejected

**What you see:** In the log, "Harbourline rejected the access token, getting a new one and retrying", then "Got a new access token". Health stays green, nothing waits.

**Cause:** Harbourline refused a token the connector thought was still valid. In real life: the token was revoked, the login server's clock is ahead of Harbourline's, or the signing keys were rotated and the old ones expired.

**Confirm:** The log line carries Harbourline's reason, for example `invalid_token (401)` or `token_expired (401)`. If it repeats every few seconds, it isn't a one-off; go to entry 2.

**Fix:** None needed. The connector drops the cached token, gets a new one and retries the call once.

**Prevent:** Already built in: tokens are renewed 30 seconds before they expire, a 401 triggers one fresh token and one retry (never a loop), and if several calls need a token at the same moment, only one is requested. Keep server clocks synced (NTP).

## 2. Client secret rotated without telling us

**What you see:** Health turns red. The log says `Login server: unauthorized_client` or `invalid_client`. New orders show **waiting** and stay waiting. Stock stops updating.

**Cause:** The connector's client secret no longer matches the one on the login server. Usually someone rotated it on the login server and the connector's configuration wasn't updated.

**Confirm:**
```bash
curl -s -X POST localhost:8080/realms/harbourline/protocol/openid-connect/token \
  -d grant_type=client_credentials -d client_id=maple-connector -d client_secret="$SECRET_IN_CONNECTOR_CONFIG"
# {"error":"unauthorized_client","error_description":"Invalid client or Invalid client credentials"}
```

**Fix:** Put the current secret in the connector's configuration (`OAUTH_CLIENT_SECRET`) and restart it. Everything that was waiting goes through on the next cycle, in order, with nothing doubled.

**Prevent:** Rotate secrets with an overlap window (old and new both valid for a while). Keep secrets in a secret manager the connector reads, not in files. Alert on "login server refused" so a human hears about it in minutes, not when a store notices.

## 3. Permission removed by an admin

**What you see:** Orders show **waiting**. The log says `insufficient_scope (403) This call needs the "orders:write" scope`. Health turns red. Stock reads still work.

**Cause:** The token is valid, but it no longer carries the permission (scope) this call needs. An admin removed it from the client, or a new scope was introduced and not granted.

**Confirm:** Decode the token and look at `scope`:
```bash
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .scope
```
Harbourline also says which scope it wanted, in the `WWW-Authenticate` header of the 403.

**Fix:** Grant the scope back to the `maple-connector` client in the login server. Waiting orders go through by themselves.

**Prevent:** A 403 is treated as *wait*, not *reject*, on purpose: it's a configuration problem an admin can fix, and the orders are still good. Treat permission changes like code changes: reviewed, and announced to the teams that depend on them.

## 4. Order accepted, but the reply was lost

**What you see:** "Order … not sent yet, will retry" with `timeout`, then on the next cycle "Order … was already accepted, nothing doubled".

**Cause:** Harbourline accepted the order, but the reply never made it back (a network blip or a proxy timeout). From the connector's side it looks like a failure.

**Confirm:**
```bash
curl -s localhost:4001/v1/orders/<harbourline order id> -H "Authorization: Bearer $TOKEN"
```
One order exists, and Harbourline's stock dropped once.

**Fix:** None needed. The retry carries the same `Idempotency-Key` (`maple-<order id>`), so Harbourline returns the original order instead of creating a second one.

**Prevent:** This is the reason every write has an idempotency key. Without it, this exact situation is how customers get charged or shipped twice.

## 5. Webhooks arrive out of order

**What you see:** Two webhooks for the same product. The later one to arrive says something like *"webhook said 65, but Harbourline has 62 now (an older event); used 62"*. Maple & Main ends on Harbourline's real number.

**Cause:** Webhooks are not guaranteed to arrive in the order they were sent. Retries, parallel senders and network paths all shuffle them.

**Confirm:** Compare the product on both sides:
```bash
curl -s localhost:4001/v1/products/HB-1006 -H "Authorization: Bearer $TOKEN" | jq .stock_level
curl -s localhost:4002/api/inventory | jq '.[] | select(.item_code=="HB-1006") | .qty'
```

**Fix:** None needed.

**Prevent:** Treat a webhook as a *hint that something changed*, not as the new value. The connector reads the product fresh from Harbourline every time a webhook arrives, so a late webhook can never put an old number back. The regular sync is a second safety net.

## 6. Rate limit hit (429)

**What you see:** "Rate limited by Harbourline, pausing for Ns", and a yellow **Paused by rate limit** badge in the connector card.

**Cause:** The connector made more calls than Harbourline allows in its window.

**Confirm:** Harbourline answers `429` with a `Retry-After` header:
```bash
curl -si localhost:4001/v1/products -H "Authorization: Bearer $TOKEN" | grep -iE "^HTTP|retry-after"
```

**Fix:** Usually none: the connector waits exactly as long as `Retry-After` says, then carries on. If it happens all the time, the connector is asking for too much.

**Prevent:** Ask for less. The connector only reads what changed since its last sync (`updated_since`), reads 5 products per page, and relies on webhooks for speed. Ask the vendor for a higher limit if the business really needs it. Never retry a 429 straight away.

## 7. Field renamed in a vendor release

**What you see:** Health turns red. "Stock sync failed" with *`Mapping: Field "stock_level" is missing from the source record. Was it renamed? Fields present: sku, name, unit_price_cents, updated_at, stock_on_hand`*. Maple & Main's numbers stay as they were.

**Cause:** Harbourline changed its response: `stock_level` is now `stock_on_hand`.

**Confirm:**
```bash
curl -s "localhost:4001/v1/products?limit=1" -H "Authorization: Bearer $TOKEN" | jq '.data[0] | keys'
```

**Fix:** Update [mapping.json](../mapping.json): `"stock_on_hand": "qty"` in `product_to_item`. Restart the connector. No code changes.

**Prevent:** The connector refuses to write anything when a mapped field is missing, so a rename can never turn into a shelf full of zeros. Subscribe to the vendor's changelog, ask for versioned APIs (`/v2/…`) with a deprecation period, and run a contract test against their sandbox before each of their releases.

## 8. Harbourline too slow (timeouts)

**What you see:** Health turns red. "Harbourline did not answer in time". Orders wait.

**Cause:** Harbourline is responding, but more slowly than the connector's 5 second limit.

**Confirm:**
```bash
curl -s -o /dev/null -w "%{time_total}s\n" "localhost:4001/v1/products?limit=1" -H "Authorization: Bearer $TOKEN"
```

**Fix:** Usually it's on Harbourline's side: check their status page and raise it with them. Everything catches up once they're fast again. Orders are safe to retry because of idempotency keys.

**Prevent:** Every call has a timeout, so a slow partner can't freeze the connector. Track response times and alert on a trend before it becomes an outage. Don't simply raise the timeout: that hides the problem and holds connections open longer.

## 9. Forged webhook

**What you see:** "Rejected a webhook: signature bad signature". The **Bad signatures** counter goes up. Nothing changes in Maple & Main.

**Cause:** Something posted to the webhook address without Harbourline's signing secret. Possibly an attacker, possibly a misconfigured test, possibly an old secret after a rotation.

**Confirm:** The connector's log says why: `missing`, `malformed`, `too_old` (a replay of an old message) or `bad_signature`.

**Fix:** If it's an attack: nothing was accepted, so block the source. If it's real Harbourline traffic failing: the secrets are out of step, so re-subscribe (restarting the connector does this) to get a fresh secret.

**Prevent:** Check every webhook's signature against the exact raw body, compare in constant time, and refuse messages more than 5 minutes old. Even a genuine webhook only triggers a fresh read from Harbourline, so a forged one couldn't set a number directly anyway.

## 10. Harbourline outage (503)

**What you see:** Health turns red. Every call gets `unavailable (503)`. Orders wait. Webhooks stop arriving.

**Cause:** Harbourline is down.

**Confirm:**
```bash
curl -s localhost:4001/v1/health
curl -si "localhost:4001/v1/products?limit=1" -H "Authorization: Bearer $TOKEN" | head -1
```

**Fix:** Wait, and tell the people who rely on the integration that stock numbers are frozen. When Harbourline comes back, the connector sends every waiting order and resyncs stock by itself.

**Prevent:** Nothing in the connector depends on Harbourline being up at the same moment as Maple & Main: orders queue safely, and the high-water mark means the first sync afterwards picks up everything that changed. Agree an uptime target with the vendor and a way to hear about planned maintenance.

---

## Setup problems seen while building this

### "localhost refused to connect" right after `docker compose up`

**Cause:** The control room is served by the connector, which starts last: it waits for Keycloak (about 30 seconds the first time), then Harbourline and Maple & Main to report healthy.

**Confirm:** `docker compose ps` lists each container and whether it's running. `docker compose logs connector` shows whether it started.

**Fix:** Wait for the connector's "Server listening" line. If a container exited, its logs say why.

### Tokens rejected as "invalid_issuer" inside Docker

**Cause:** The browser reaches Keycloak at `localhost:8080`, but containers reach it at `keycloak:8080`. If Keycloak names whichever address it was called on as the token's issuer, tokens fetched by containers don't match what Harbourline expects.

**Fix (already in docker-compose.yml):** `KC_HOSTNAME=http://localhost:8080` makes the issuer always the public address, and `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true` lets containers still fetch tokens and keys at `keycloak:8080`. Harbourline checks the issuer against `localhost:8080` and fetches keys from `keycloak:8080`, as separate settings.
