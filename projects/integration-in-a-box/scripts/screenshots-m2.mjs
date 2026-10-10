// Milestone 2 screenshots: real single sign-on through Keycloak, the access token,
// and webhooks. Run against the full docker compose stack.
//   node scripts/screenshots-m2.mjs part1   (sign in, webhook delivered)
//   node scripts/screenshots-m2.mjs part2   (after the connector was offline: recovered deliveries, sign out)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const part = process.argv[2] ?? "part1";
const base = "http://localhost:4000";
const out = "docs/screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await context.newPage();
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, ...opts });
  console.log("shot", name);
};

async function signIn({ capture }) {
  await page.goto(base);
  await page.waitForSelector(".signin-card");
  await page.waitForTimeout(900);
  if (capture) await shot("09-sign-in");
  await page.click(".btn-signin");
  await page.waitForURL(/localhost:8080\/realms\/maple-and-main/);
  await page.waitForSelector("#username");
  if (capture) await shot("10-keycloak-login", { fullPage: false });
  await page.fill("#username", "sam");
  await page.fill("#password", "maple-demo");
  await page.click("#kc-login");
  await page.waitForURL(base + "/");
  await page.waitForSelector(".who");
}

if (part === "part1") {
  await signIn({ capture: true });
  await page.waitForFunction(() => document.querySelectorAll(".tone-mm .rows li").length === 12, null, { timeout: 30000 });
  await page.waitForSelector(".token");
  await page.waitForTimeout(1500);
  await shot("11-signed-in");

  // A delivery at Harbourline: the webhook carries it across within a second.
  await page.click(".btn-hb");
  await page.waitForSelector(".packet-webhook", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(350);
  await shot("12-webhook-in-flight");
  await page.waitForSelector(".deliveries .pill-synced", { timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot("13-webhook-delivered");

  // Phone view of the sign-in screen, in a fresh context with no session.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
  const p2 = await phone.newPage();
  await p2.goto(base);
  await p2.waitForSelector(".signin-card");
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: `${out}/09b-sign-in-phone.png` });
  console.log("shot 09b-sign-in-phone");
} else {
  // The connector restarted, so its sessions are gone. Keycloak still remembers Sam,
  // so signing in again doesn't ask for a password: that's single sign-on.
  await page.goto(base);
  await page.waitForSelector(".signin-card");
  // Fresh browser context: sign in fully, then capture the recovered deliveries.
  await signIn({ capture: false });
  await page.waitForSelector(".deliveries li", { timeout: 15000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".deliveries li")].some((li) => li.textContent.includes("recovered from")), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("14-webhooks-recovered");

  await page.click(".signout");
  await page.waitForSelector(".signin-card", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("15-signed-out", { fullPage: false });
}

await browser.close();
