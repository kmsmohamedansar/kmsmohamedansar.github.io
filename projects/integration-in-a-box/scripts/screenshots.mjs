// Drive the running control room and capture the key moments.
// Usage: start the stack with START_DELAY_MS=12000 (so the first shot shows
// empty shelves), then: node scripts/screenshots.mjs [http://localhost:4000]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:4000";
const out = "docs/screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 2 });
await page.emulateMedia({ colorScheme: "dark" });
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, ...opts });
  console.log("shot", name);
};
const post = (path, body) =>
  page.evaluate(([p, b]) => fetch(p, { method: "POST", headers: { "content-type": "application/json" }, body: b && JSON.stringify(b) }).then((r) => r.json()), [path, body]);

await page.goto(base);
await page.waitForSelector(".panel");
await page.waitForTimeout(1500);
await shot("01-before-first-sync");

// First sync fills Maple & Main's empty shelves.
await page.waitForFunction(() => document.querySelectorAll(".tone-mm .rows li").length === 12, null, { timeout: 30000 });
await page.waitForTimeout(1800);
await shot("02-first-sync");

// A shopper buys something; catch the order packet mid-flight.
await page.click(".btn-mm");
await page.waitForSelector(".pill-pending_sync", { timeout: 5000 });
await page.waitForTimeout(400);
await shot("03-sale-waiting-to-sync");
await page.click(".btn-ghost");
await page.waitForSelector(".packet-order", { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(450);
await shot("04-order-in-flight");
await page.waitForSelector(".pill-synced", { timeout: 10000 });
await page.waitForTimeout(1200);
await shot("05-order-synced");

// A delivery arrives at Harbourline and flows to Maple & Main.
await page.click(".btn-hb");
await page.waitForTimeout(300);
await page.click(".btn-ghost");
await page.waitForSelector(".packet-stock", { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(450);
await shot("06-delivery-flowing");

// An order Harbourline can't fill: rejected loudly, parked as failed.
// Placed straight into Maple & Main's own API, the way its till would.
const mapleUrl = process.argv[3] ?? "http://localhost:4002";
await fetch(`${mapleUrl}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: [{ item_code: "HB-1010", qty: 500 }] }) });
await post("/api/sync");
await page.waitForSelector(".pill-failed", { timeout: 10000 });
await page.waitForTimeout(1200);
await shot("07-order-rejected");

// Phone width.
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(800);
await shot("08-phone");

await browser.close();
