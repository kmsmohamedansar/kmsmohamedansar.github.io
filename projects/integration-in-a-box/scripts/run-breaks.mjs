// Trigger every break against the running docker compose stack, record what the
// connector logged during the failure and after the fix, and take screenshots.
// Writes docs/breaks-evidence.md and docs/screenshots/2x-*.png, and records a video.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readdirSync, renameSync } from "node:fs";

const base = "http://localhost:4000";
mkdirSync("docs/screenshots", { recursive: true });
mkdirSync("docs/video-raw", { recursive: true });

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark",
  recordVideo: { dir: "docs/video-raw", size: { width: 1360, height: 900 } },
});
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);

// Sign in through the real Keycloak page.
await page.goto(base);
await page.waitForSelector(".signin-card");
await wait(1200);
await page.click(".btn-signin");
await page.waitForSelector("#username");
await page.fill("#username", "sam");
await wait(300);
await page.fill("#password", "maple-demo");
await wait(300);
await page.click("#kc-login");
await page.waitForSelector(".who");
await page.waitForFunction(() => document.querySelectorAll(".tone-mm .rows li").length === 12, null, { timeout: 30000 });
await wait(2000);

// Collect the connector's events from the live stream, in the page.
await page.evaluate(() => {
  window.__ev = [];
  const es = new EventSource("/api/events");
  es.onmessage = (m) => window.__ev.push(JSON.parse(m.data));
});
await wait(800);
const mark = () => page.evaluate(() => (window.__ev.at(-1)?.id ?? 0));
const since = (id) => page.evaluate((i) => window.__ev.filter((e) => e.id > i && e.kind !== "demo"), id);
const health = () => page.evaluate(() => fetch("/api/state").then((r) => r.json()).then((s) => ({ ok: s.connector.lastOk, paused: s.pausedForSec })));
const post = (path, body) => page.evaluate(([p, b]) => fetch(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b ?? {}) }).then((r) => r.json()), [path, body]);

// A normal sale and delivery first, for the video.
await page.click(".btn-mm");
await wait(2500);
await page.click(".btn-hb");
await wait(3000);

const breaks = await page.evaluate(() => fetch("/api/breaks").then((r) => r.json()));
const plan = {
  "token-rejected": { during: 6000, shot: false },
  "wrong-secret": { during: 9000, shot: true, sale: true },
  "scope-revoked": { during: 9000, shot: false },
  "lost-reply": { during: 12000, shot: false },
  "out-of-order": { during: 9000, shot: false },
  "rate-limit": { during: 12000, shot: true },
  "renamed-field": { during: 9000, shot: true, delivery: true },
  "slow-api": { during: 14000, shot: false },
  "forged-webhook": { during: 3000, shot: true },
  outage: { during: 9000, shot: true, sale: true },
};

let md = `# Break evidence\n\nRecorded by \`scripts/run-breaks.mjs\` against the full \`docker compose\` stack on ${new Date().toISOString().slice(0, 10)}.\nEach section is the connector's own event log, copied from the live stream: what it said while the break was on, and after it was fixed.\n`;
const fmt = (evs) => evs.map((e) => `- ${e.title}${e.detail ? `  \n  \`${e.detail}\`` : ""}`).join("\n") || "- (nothing logged)";

for (const b of breaks) {
  const p = plan[b.id];
  const card = page.locator(".break-card").nth(b.n - 1);
  await card.scrollIntoViewIfNeeded();
  const m0 = await mark();
  await card.locator("button").click();
  if (p.sale) { await wait(500); await post("/api/demo/sale"); }
  if (p.delivery) { await wait(500); await post("/api/demo/delivery"); }
  await wait(p.during);
  const h1 = await health();
  if (p.shot) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(400);
    await page.screenshot({ path: `docs/screenshots/2${b.n - 1}-break-${b.n}-${b.id}.png`, fullPage: true });
    await card.scrollIntoViewIfNeeded();
  }
  const during = await since(m0);
  let after = [];
  let h2 = h1;
  if (b.kind === "toggle") {
    const m1 = await mark();
    await card.locator("button").click();
    await wait(b.id === "rate-limit" ? 12000 : 7000);
    after = await since(m1);
    h2 = await health();
  }
  md += `\n## ${b.n}. ${b.title}\n\n**Expected:** ${b.expect}\n\n**While broken** (health: ${h1.ok === false ? "red" : "green"}${h1.paused ? `, paused ${h1.paused}s` : ""}):\n\n${fmt(during)}\n`;
  if (b.kind === "toggle") md += `\n**After the fix** (health: ${h2.ok === false ? "red" : "green"}):\n\n${fmt(after)}\n`;
  console.log(`break ${b.n} done: during=${during.length} events, health during=${h1.ok}, after=${h2.ok}`);
}

await page.evaluate(() => window.scrollTo(0, 0));
await wait(2500);
writeFileSync("docs/breaks-evidence.md", md);
await context.close();
await browser.close();
const vid = readdirSync("docs/video-raw").find((f) => f.endsWith(".webm"));
if (vid) renameSync(`docs/video-raw/${vid}`, "docs/video-raw/control-room-walkthrough.webm");
console.log("video:", vid ? "docs/video-raw/control-room-walkthrough.webm" : "none");
