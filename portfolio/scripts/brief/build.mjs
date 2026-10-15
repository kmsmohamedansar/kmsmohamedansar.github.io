// Builds the private interview brief: one page with every project as a map,
// encrypted with a password so the published file shows nothing without it.
//
//   BRIEF_PASSWORD='your passphrase' node scripts/brief/build.mjs
//
// The password is never written anywhere. The output is a single static page
// at public/p/<BRIEF_SLUG>/index.html holding only ciphertext plus the unlock
// screen. Re-run after editing projects.js to refresh it.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECTS } from "../../src/data/projects.js";

const BRIEF_SLUG = "k7q2-brief-9xw4m";
const ITERATIONS = 600_000;

const password = process.env.BRIEF_PASSWORD;
if (!password || password.length < 4) {
  console.error("Set BRIEF_PASSWORD (4+ characters) to build the brief.");
  process.exit(1);
}

// Lanes on the map, in reading order. Anything not listed lands in "Other".
const LANES = [
  { label: "AI evaluation & agents", slugs: ["decision-models", "analytics-assistant", "catalogue-checker", "mcp-workflow", "local-agent", "grocery-assistant", "smart-categorization", "category-copilot"] },
  { label: "Data engineering & integration", slugs: ["data-delivery", "integration", "lineage-explorer", "taskmaster", "sql-playground"] },
  { label: "Internal tools & extensions", slugs: ["sidecar", "scope-checker", "health-dashboard", "sitescout"] },
  { label: "Apps & 3D", slugs: ["haloscript", "reptrack", "digital-double"] },
  { label: "Analysis & early work", slugs: ["customer-predictor", "fine-food-sentiment", "spotify-trends", "cpl-dream-xi", "news-scraper", "forex-tools", "f1-telemetry"] },
];

const strip = (s) => (typeof s === "string" ? s : "");
const summarize = (p) => ({
  slug: p.slug,
  title: p.title,
  kind: p.kind,
  status: p.status,
  accent: p.accent,
  what: strip(p.hook),
  why: strip(p.story?.[0]),
  role: strip(p.role),
  stats: (p.stats || []).map((s) => ({ value: s.value, label: s.short || s.label })),
  found: (p.learned || []).map(strip).filter(Boolean),
  results: p.results ? { headers: p.results.headers, rows: p.results.rows, note: p.results.note } : null,
  flow: p.flow ? p.flow.columns.map((c) => ({ label: c.label, nodes: c.nodes })) : null,
  stack: p.stack || [],
});

const bySlug = new Map(PROJECTS.map((p) => [p.slug, p]));
const used = new Set();
const lanes = LANES.map((l) => ({
  label: l.label,
  projects: l.slugs.filter((s) => bySlug.has(s)).map((s) => (used.add(s), summarize(bySlug.get(s)))),
}));
const rest = PROJECTS.filter((p) => !used.has(p.slug)).map(summarize);
if (rest.length) lanes.push({ label: "Other", projects: rest });

const payload = new TextEncoder().encode(JSON.stringify({ built: new Date().toISOString().slice(0, 10), lanes }));
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload));
const b64 = (u) => Buffer.from(u).toString("base64");

const here = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(here, "shell.html"), "utf8");
const html = shell.replace("__BLOB__", JSON.stringify({ v: 1, it: ITERATIONS, s: b64(salt), i: b64(iv), c: b64(ct) }));
const out = join(here, "../../public/p", BRIEF_SLUG, "index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Brief: ${lanes.reduce((n, l) => n + l.projects.length, 0)} projects → public/p/${BRIEF_SLUG}/`);
