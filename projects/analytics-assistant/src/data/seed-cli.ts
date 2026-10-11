import { mkdirSync, rmSync } from "node:fs";
import { buildDatabase, PLANTED } from "./seed.ts";

const path = process.env.DB_PATH ?? "data/cereal.db";
mkdirSync("data", { recursive: true });
rmSync(path, { force: true });
const db = buildDatabase(path);
const n = db.prepare("SELECT COUNT(*) AS n, SUM(revenue) AS r FROM sales").get() as { n: number; r: number };
console.log(`Built ${path}: ${n.n} weekly sales rows, $${Math.round(n.r).toLocaleString()} in total.`);
console.log("Planted surprises:");
for (const p of Object.values(PLANTED)) console.log("  - " + p.text);
