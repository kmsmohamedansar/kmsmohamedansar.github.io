# Break evidence

Recorded by `scripts/run-breaks.mjs` against the full `docker compose` stack on 2026-10-10.
Each section is the connector's own event log, copied from the live stream: what it said while the break was on, and after it was fixed.

## 1. Access token rejected

**Expected:** One 401 from Harbourline, then a fresh token and a successful retry. Nothing waits.

**While broken** (health: green):

- Break 1 triggered: Access token rejected  
  `One 401 from Harbourline, then a fresh token and a successful retry. Nothing waits.`
- Harbourline rejected the access token, getting a new one and retrying  
  `invalid_token (401) The access token couldn't be verified.`
- Harbourline rejected the access token, getting a new one and retrying  
  `invalid_token (401) The access token couldn't be verified.`
- Got a new access token  
  `Valid for 300s`

## 2. Client secret rotated without telling us

**Expected:** The login server refuses the connector. Health turns red and orders wait. Fix the secret and they all go through.

**While broken** (health: red):

- Break 2 triggered: Client secret rotated without telling us  
  `The login server refuses the connector. Health turns red and orders wait. Fix the secret and they all go through.`
- Stock sync failed, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Order mm_64e5ef6f not sent yet, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Stock sync failed, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Order mm_64e5ef6f not sent yet, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Stock sync failed, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Order mm_64e5ef6f not sent yet, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`
- Stock sync failed, will retry  
  `Login server: unauthorized_client. Invalid client or Invalid client credentials`

**After the fix** (health: green):

- Break 2 fixed: Client secret rotated without telling us  
  `Back to normal`
- Got a new access token  
  `Valid for 300s`
- Order mm_64e5ef6f sent to Harbourline  
  `1 x HB-1012 → ord_88695341`
- Greek yoghurt 500g: 14 → 13  
  `HB-1012`
- Stock sync: 1 changed  
  `1 page read`
- Greek yoghurt 500g: already up to date (13)  
  `HB-1012, pushed by webhook`

## 3. Permission removed by an admin

**Expected:** Orders get 403 insufficient_scope and wait (not rejected). Restore the permission and they go through.

**While broken** (health: red):

- Break 3 triggered: Permission removed by an admin  
  `Orders get 403 insufficient_scope and wait (not rejected). Restore the permission and they go through.`
- Order mm_48121cba not sent yet, will retry  
  `Harbourline: insufficient_scope (403) This call needs the "orders:write" scope. The token has: webhooks:manage, inventory:read`
- Order mm_48121cba not sent yet, will retry  
  `Harbourline: insufficient_scope (403) This call needs the "orders:write" scope. The token has: webhooks:manage, inventory:read`
- Order mm_48121cba not sent yet, will retry  
  `Harbourline: insufficient_scope (403) This call needs the "orders:write" scope. The token has: webhooks:manage, inventory:read`
- Order mm_48121cba not sent yet, will retry  
  `Harbourline: insufficient_scope (403) This call needs the "orders:write" scope. The token has: webhooks:manage, inventory:read`

**After the fix** (health: green):

- Break 3 fixed: Permission removed by an admin  
  `Back to normal`
- Order mm_48121cba sent to Harbourline  
  `1 x HB-1001 → ord_bb361975`
- Rolled oats 1kg: 42 → 41  
  `HB-1001`
- Stock sync: 1 changed  
  `1 page read`
- Rolled oats 1kg: already up to date (41)  
  `HB-1001, pushed by webhook`

## 4. Order accepted, but the reply was lost

**Expected:** The connector retries with the same idempotency key. Harbourline says "already accepted". No double order.

**While broken** (health: green):

- Break 4 triggered: Order accepted, but the reply was lost  
  `The connector retries with the same idempotency key. Harbourline says "already accepted". No double order.`
- Order mm_e4d39405 not sent yet, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time (the reply was lost)`
- Rolled oats 1kg: 41 → 40  
  `HB-1001`
- Stock sync: 1 changed  
  `1 page read`
- Order mm_e4d39405 was already accepted, nothing doubled  
  `1 x HB-1001 → ord_5a30a733`
- Rolled oats 1kg: already up to date (40)  
  `HB-1001, pushed by webhook`

## 5. Webhooks arrive out of order

**Expected:** Two stock changes are delivered newest first. Maple & Main still ends on the right number, because each webhook triggers a fresh read.

**While broken** (health: green):

- Break 5 triggered: Webhooks arrive out of order  
  `Two stock changes are delivered newest first. Maple & Main still ends on the right number, because each webhook triggers a fresh read.`
- Bananas per kg: 55 → 62  
  `HB-1006`
- Stock sync: 1 changed  
  `1 page read`
- Bananas per kg: already up to date (62)  
  `HB-1006, pushed by webhook`
- Bananas per kg: already up to date (62)  
  `webhook said 65, but Harbourline has 62 now (an older event); used 62`

**After the fix** (health: green):

- Break 5 fixed: Webhooks arrive out of order  
  `Back to normal`

## 6. Rate limit hit (429)

**Expected:** Harbourline answers 429 with Retry-After. The connector pauses for exactly that long instead of hammering.

**While broken** (health: green):

- Break 6 triggered: Rate limit hit (429)  
  `Harbourline answers 429 with Retry-After. The connector pauses for exactly that long instead of hammering.`
- Stock sync failed, will retry  
  `Harbourline: rate_limited (429) Too many requests. Try again in 2s.`
- Rate limited by Harbourline, pausing for 2s  
  `Honouring the Retry-After header instead of retrying straight away`
- Stock sync failed, will retry  
  `Harbourline: rate_limited (429) Too many requests. Try again in 1s.`
- Rate limited by Harbourline, pausing for 1s  
  `Honouring the Retry-After header instead of retrying straight away`
- Stock sync failed, will retry  
  `Harbourline: rate_limited (429) Too many requests. Try again in 1s.`
- Rate limited by Harbourline, pausing for 1s  
  `Honouring the Retry-After header instead of retrying straight away`

**After the fix** (health: green):

- Break 6 fixed: Rate limit hit (429)  
  `Back to normal`

## 7. Field renamed in a vendor release

**Expected:** Sync stops with an error naming the missing field (stock_level). No zeros or blanks are written to Maple & Main.

**While broken** (health: red):

- Break 7 triggered: Field renamed in a vendor release  
  `Sync stops with an error naming the missing field (stock_level). No zeros or blanks are written to Maple & Main.`
- Webhook follow-up failed, the regular sync will catch it  
  `Field "stock_level" is missing from the source record. Was it renamed? Fields present: sku, name, unit_price_cents, updated_at, stock_on_hand`
- Stock sync failed, will retry  
  `Mapping: Field "stock_level" is missing from the source record. Was it renamed? Fields present: sku, name, unit_price_cents, updated_at, stock_on_hand`
- Stock sync failed, will retry  
  `Mapping: Field "stock_level" is missing from the source record. Was it renamed? Fields present: sku, name, unit_price_cents, updated_at, stock_on_hand`

**After the fix** (health: green):

- Stock sync failed, will retry  
  `Mapping: Field "stock_level" is missing from the source record. Was it renamed? Fields present: sku, name, unit_price_cents, updated_at, stock_on_hand`
- Break 7 fixed: Field renamed in a vendor release  
  `Back to normal`
- Ground coffee 250g: 21 → 30  
  `HB-1011`
- Stock sync: 1 changed  
  `1 page read`

## 8. Harbourline too slow (timeouts)

**Expected:** Calls time out after 5s. Health turns red, work waits, and everything catches up once Harbourline is fast again.

**While broken** (health: red):

- Break 8 triggered: Harbourline too slow (timeouts)  
  `Calls time out after 5s. Health turns red, work waits, and everything catches up once Harbourline is fast again.`
- Stock sync failed, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time`
- Stock sync failed, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time`
- Stock sync failed, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time`
- Stock sync failed, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time`

**After the fix** (health: green):

- Break 8 fixed: Harbourline too slow (timeouts)  
  `Back to normal`
- Stock sync failed, will retry  
  `Harbourline: timeout (no response) Harbourline did not answer in time`

## 9. Forged webhook

**Expected:** Someone posts a fake stock change. The signature check fails, it's refused with 401, and nothing changes.

**While broken** (health: green):

- Rejected a webhook  
  `signature bad signature`
- Break 9 triggered: Forged webhook  
  `Someone posts a fake stock change. The signature check fails, it's refused with 401, and nothing changes.`

## 10. Harbourline outage (503)

**Expected:** Every call gets 503. Orders wait, health is red. When Harbourline comes back, everything waiting goes through.

**While broken** (health: red):

- Break 10 triggered: Harbourline outage (503)  
  `Every call gets 503. Orders wait, health is red. When Harbourline comes back, everything waiting goes through.`
- Stock sync failed, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Order mm_3fb7b004 not sent yet, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Stock sync failed, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Order mm_3fb7b004 not sent yet, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Stock sync failed, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Order mm_3fb7b004 not sent yet, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`
- Stock sync failed, will retry  
  `Harbourline: unavailable (503) Harbourline is down for maintenance`

**After the fix** (health: green):

- Break 10 fixed: Harbourline outage (503)  
  `Back to normal`
- Order mm_3fb7b004 sent to Harbourline  
  `3 x HB-1008 → ord_5a1a8b79`
- Basmati rice 2kg: 16 → 13  
  `HB-1008`
- Stock sync: 1 changed  
  `1 page read`
- Basmati rice 2kg: already up to date (13)  
  `HB-1008, pushed by webhook`
