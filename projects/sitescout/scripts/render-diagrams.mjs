// Render every docs/diagrams/*.mmd to an SVG next to it, using Mermaid
// inside headless Chromium. GitHub renders the Mermaid text itself; the SVG
// copies are for places that don't (the portfolio site, slides).
import { chromium } from "playwright";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "docs/diagrams");
const mermaidJs = readFileSync(resolve(root, "node_modules/mermaid/dist/mermaid.min.js"), "utf8");

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({ content: mermaidJs });
await page.evaluate(() =>
  window.mermaid.initialize({ startOnLoad: false, htmlLabels: false, theme: "neutral", fontFamily: "Helvetica, Arial, sans-serif", flowchart: { htmlLabels: false } }),
);

for (const file of readdirSync(dir).filter((f) => f.endsWith(".mmd"))) {
  const src = readFileSync(resolve(dir, file), "utf8").replaceAll("<br/>", "\n");
  const id = "d" + file.replace(/\W/g, "");
  const svg = await page.evaluate(async ([id, src]) => (await window.mermaid.render(id, src)).svg, [id, src]);
  // Mermaid can emit HTML-style <br>, which is not valid in a standalone SVG.
  writeFileSync(resolve(dir, file.replace(/\.mmd$/, ".svg")), svg.replace(/<br\s*>/g, "<br/>"));
  console.log("rendered", file);
}
await browser.close();
