// Every tool on a project page and every skill in About should explain itself
// on hover. This fails (exit 1) if any of them has no entry in src/data/tools.js.
//
//   npm run check:tools
import { PROJECTS } from "../src/data/projects.js";
import { ABOUT } from "../src/data/content.js";
import { TOOL_INFO } from "../src/data/tools.js";

const missing = [];
for (const p of PROJECTS) for (const t of p.stack || []) if (!TOOL_INFO[t]) missing.push(`${t}  (project: ${p.slug})`);
for (const g of ABOUT.groups) for (const t of g.items) if (!TOOL_INFO[t]) missing.push(`${t}  (About: ${g.title})`);

if (missing.length) {
  console.error(`No hover description in src/data/tools.js for:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
const n = new Set([...PROJECTS.flatMap((p) => p.stack || []), ...ABOUT.groups.flatMap((g) => g.items)]).size;
console.log(`All ${n} tools and skills have a hover description.`);
