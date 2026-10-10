// Screenshots of the screen for the docs. Needs the server running (npm run server).
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:4300";
const out = "docs/screenshots";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

async function ask(q) {
  await p.fill(".qbox input", q);
  await p.click(".qbox button");
  await p.waitForSelector(".answer .text, .answer .error");
  await p.waitForTimeout(1000);
}
await p.goto(base);
await p.waitForSelector(".switch");
await ask("Did Morningfield lose share after its price rise?");
await p.locator(".calls li button").first().click();
await p.screenshot({ path: `${out}/01-ask-price-rise.png`, fullPage: true });
await ask("Which brand had the highest share of sales?");
await p.screenshot({ path: `${out}/02-ask-rank.png`, fullPage: true });
await ask("Show the weekly sales trend for hot cereal.");
await p.screenshot({ path: `${out}/03-ask-trend.png`, fullPage: true });
await ask("Why did Sunny Spoon sales drop in the West?");
await p.screenshot({ path: `${out}/04-ask-why.png`, fullPage: true });
await ask("What changed between Q3 and Q4?");
await p.screenshot({ path: `${out}/05-ask-changed.png`, fullPage: true });
await p.getByRole("radio", { name: /Brain B/ }).click();
await ask("Which brand had the highest share of sales?");
await p.screenshot({ path: `${out}/06-brain-b-not-running.png`, fullPage: true });
await p.getByRole("button", { name: "Test results" }).click();
await p.waitForSelector(".score");
await p.screenshot({ path: `${out}/07-results.png`, fullPage: true });
await p.getByRole("button", { name: "The data" }).click();
await p.getByRole("button", { name: /Show them/ }).click();
await p.waitForSelector(".planted");
await p.screenshot({ path: `${out}/08-data.png`, fullPage: true });

const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(base);
await m.fill(".qbox input", "Which brand had the highest share of sales?");
await m.click(".qbox button");
await m.waitForSelector(".answer .text");
await m.waitForTimeout(1000);
await m.screenshot({ path: `${out}/09-phone.png`, fullPage: true });
await b.close();
console.log("screenshots saved");
