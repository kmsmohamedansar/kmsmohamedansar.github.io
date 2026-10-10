// Make a bar chart of "how many of the 17 numbers were found" for each
// ticker in a CSV exported by Sitescout.
//   node scripts/chart.mjs <export.csv> <out.svg> "<title>"
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output, title = "Numbers found per page"] = process.argv;
if (!input || !output) {
  console.error('usage: node scripts/chart.mjs <export.csv> <out.svg> "<title>"');
  process.exit(1);
}

// Small CSV reader that understands quoted cells.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [header, ...body] = parseCsv(readFileSync(input, "utf8")).filter((r) => r.length > 1);
const fieldCols = header.map((h, i) => i).filter((i) => !["symbol", "status", "url"].includes(header[i]));
const data = body.map((r) => ({
  symbol: r[0],
  found: fieldCols.filter((i) => r[i] !== "").length,
  total: fieldCols.length,
}));

const W = 640, barH = 26, gap = 12, left = 90, right = 70, top = 56;
const H = top + data.length * (barH + gap) + 30;
const scale = (n, t) => ((W - left - right) * n) / t;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const bars = data.map((d, i) => {
  const y = top + i * (barH + gap);
  const full = d.found === d.total;
  return `
  <text x="${left - 10}" y="${y + barH / 2 + 5}" text-anchor="end" class="label">${esc(d.symbol)}</text>
  <rect x="${left}" y="${y}" width="${scale(d.total, d.total)}" height="${barH}" rx="4" class="track"/>
  <rect x="${left}" y="${y}" width="${scale(d.found, d.total)}" height="${barH}" rx="4" class="${full ? "bar-full" : "bar"}"/>
  <text x="${left + scale(d.total, d.total) + 8}" y="${y + barH / 2 + 5}" class="value">${d.found} of ${d.total}</text>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif">
  <style>
    .title { font-size: 16px; font-weight: 700; fill: #111a2e; }
    .sub { font-size: 12px; fill: #5d6885; }
    .label { font-size: 13px; font-weight: 700; fill: #111a2e; }
    .value { font-size: 12px; fill: #5d6885; }
    .track { fill: #e8edf8; }
    .bar { fill: #7c3aed; }
    .bar-full { fill: #0891b2; }
  </style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="16" y="26" class="title">${esc(title)}</text>
  <text x="16" y="44" class="sub">Each bar: how many of the ${data[0]?.total ?? 0} numbers in the recipe were found on that page</text>
  ${bars}
</svg>
`;
writeFileSync(output, svg);
console.log(data.map((d) => `${d.symbol}: ${d.found}/${d.total}`).join("\n"));
