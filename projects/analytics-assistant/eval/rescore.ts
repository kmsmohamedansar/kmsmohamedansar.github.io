// Re-scores every saved result with the current scorer, without re-running
// any brain: the saved files keep each answer's full text. Used once, when a
// scorer bug was found ("West" matched inside "lowest").
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildDatabase } from "../src/data/seed.ts";
import { buildQuestions } from "./questions.ts";
import { buildHoldout } from "./holdout.ts";
import { score } from "./score.ts";

const db = buildDatabase();
const keys = new Map([...buildQuestions(db), ...buildHoldout(db)].map((q) => [q.id, q.expect]));
for (const file of [...readdirSync("eval/results").map((f) => `eval/results/${f}`), ...readdirSync("eval/results/holdout").map((f) => `eval/results/holdout/${f}`)].filter((f) => f.endsWith(".json"))) {
  const run = JSON.parse(readFileSync(file, "utf8"));
  const before = `${run.summary.correct}/${run.summary.partial}/${run.summary.wrong}`;
  const counts = { correct: 0, partial: 0, wrong: 0 };
  for (const r of run.results) {
    if (!r.error) { const s = score(r.answer, keys.get(r.id)!); if (s.verdict !== r.verdict) console.log(`  ${file} #${r.id}: ${r.verdict} -> ${s.verdict}`); r.verdict = s.verdict; r.missing = s.missing; }
    counts[r.verdict as keyof typeof counts]++;
  }
  Object.assign(run.summary, counts, { rescored_at: new Date().toISOString() });
  writeFileSync(file, JSON.stringify(run, null, 2));
  console.log(`${file}: ${before} -> ${counts.correct}/${counts.partial}/${counts.wrong}`);
}
