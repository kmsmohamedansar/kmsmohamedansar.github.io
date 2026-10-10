// Load the built extension in Chromium and drive it end to end.
// Yahoo is never contacted: every finance.yahoo.com request is answered
// with a local SYNTHETIC page from test/fixtures. Screenshots go to
// docs/screenshots.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:https";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const shots = resolve(root, "docs/screenshots");
mkdirSync(shots, { recursive: true });

const fixture = (n) => readFileSync(resolve(root, "test/fixtures", n), "utf8");
const pageFor = (symbol) => {
  if (symbol === "BROKE") return fixture("quote-layout-b.html");
  if (symbol === "NOPE") return "<html><body><h1>Symbol not found</h1></body></html>";
  return fixture("quote-layout-a.html").replaceAll("EXMP", symbol).replaceAll("Example Corp", `${symbol} Demo Inc`);
};

// Local HTTPS server with a throwaway self-signed certificate. Chromium is
// told that finance.yahoo.com lives here, for this test browser only.
const certDir = mkdtempSync(resolve(tmpdir(), "scout-cert-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
  "-subj", "/CN=finance.yahoo.com", "-keyout", `${certDir}/k.pem`, "-out", `${certDir}/c.pem`], { stdio: "ignore" });
const log = [];
const server = createServer({ key: readFileSync(`${certDir}/k.pem`), cert: readFileSync(`${certDir}/c.pem`) }, async (req, res) => {
  const m = req.url.match(/\/quote\/([^/?#]+)/);
  const symbol = m ? decodeURIComponent(m[1]) : "";
  if (!symbol) { res.writeHead(404); res.end(); return; }
  log.push(`served synthetic page for ${symbol}`);
  // Answer after a short wait, like a real page load, so the running
  // state is visible in screenshots.
  await new Promise((r) => setTimeout(r, 1800));
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(pageFor(symbol));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const ctx = await chromium.launchPersistentContext(mkdtempSync(resolve(tmpdir(), "scout-")), {
  headless: true,
  channel: "chromium",
  viewport: { width: 400, height: 860 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    "--no-proxy-server",
    `--host-resolver-rules=MAP finance.yahoo.com 127.0.0.1:${port}`,
    "--ignore-certificate-errors",
  ],
});


let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent("serviceworker");
const extId = new URL(sw.url()).host;

const panel = await ctx.newPage();
await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
await panel.emulateMedia({ colorScheme: process.env.SCHEME ?? "dark" });
const shot = async (name) => {
  await panel.screenshot({ path: resolve(shots, `${name}.png`) });
  console.log("shot", name);
};

await panel.waitForTimeout(800);
await shot("01-empty");

await panel.fill("textarea", "EXMP, DEMO https://finance.yahoo.com/quote/BROKE/ ACME hello!");
await panel.waitForTimeout(700);
await shot("02-chips");

await panel.click(".btn-go");
await panel.waitForSelector(".card.status-running");
await panel.waitForTimeout(900);
await shot("03-running");

await panel.waitForFunction(() => document.querySelectorAll(".card.status-done, .card.status-failed").length >= 3, null, { timeout: 60000 });
await panel.waitForTimeout(400);
// Stop with the last page still queued or running, to show partial results.
if (await panel.locator(".btn-stop").count()) await panel.click(".btn-stop");
await panel.waitForSelector(".btn-go");
await panel.waitForTimeout(1500);
await shot("04-results");

await panel.locator(".card.status-failed").first().scrollIntoViewIfNeeded();
await panel.waitForTimeout(300);
await shot("05-failed-loudly");

await panel.locator(".card.status-done .link-btn").first().click();
await panel.locator(".card.status-done").first().scrollIntoViewIfNeeded();
await panel.waitForTimeout(600);
await shot("06-how-found");

const [download] = await Promise.all([panel.waitForEvent("download"), panel.click("text=Export CSV")]);
const csvPath = resolve(root, "docs/demo-export.csv.txt");
await download.saveAs(csvPath);

const summary = await panel.$$eval(".card", (cs) =>
  cs.map((c) => `${c.querySelector(".symbol")?.textContent}: ${c.querySelector(".pill")?.textContent}`),
);
console.log(summary.join("\n"));
console.log(log.join("\n"));
console.log("csv:\n" + readFileSync(csvPath, "utf8"));
await ctx.close();
server.close();
