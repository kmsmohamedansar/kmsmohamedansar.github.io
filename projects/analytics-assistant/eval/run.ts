// Runs the 30 test questions through a brain and scores every answer.
//   npm run eval -- rules            (brain A)
//   npm run eval -- ai               (brain B, needs Ollama running)
//   npm run eval -- rules --label v2 (saved as eval/results/rules-v2.json)
//   npm run eval -- rules --holdout  (the 10 held-out questions)

import { mkdirSync, writeFileSync } from "node:fs";
import { buildDatabase } from "../src/data/seed.ts";
import { makeTools } from "../src/tools/tools.ts";
import { askRules } from "../src/brains/rules.ts";
import { askAI, aiConfig } from "../src/brains/ai.ts";
import { buildQuestions } from "./questions.ts";
import { buildHoldout } from "./holdout.ts";
import { score, type Verdict } from "./score.ts";

const brain = process.argv[2] === "ai" ? "ai" : "rules";
const label = process.argv.includes("--label") ? process.argv[process.argv.indexOf("--label") + 1] : "latest";
const set = process.argv.includes("--holdout") ? "holdout" : "main";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",").map(Number) : null;

const db = buildDatabase();
const questions = (set === "holdout" ? buildHoldout(db) : buildQuestions(db)).filter((q) => !only || only.includes(q.id));
const results = [];
const counts: Record<Verdict, number> = { correct: 0, partial: 0, wrong: 0 };

console.log(`Brain: ${brain}${brain === "ai" ? ` (${aiConfig().model})` : ""}. ${questions.length} questions.\n`);
for (const q of questions) {
  const tools = makeTools(db);
  const a = brain === "ai" ? await askAI(q.q, tools) : await askRules(q.q, tools);
  const s = a.error ? { verdict: "wrong" as Verdict, passed: 0, total: 1, missing: ["(error)"] } : score(a.text, q.expect);
  counts[s.verdict]++;
  results.push({ id: q.id, kind: q.kind, question: q.q, expect: q.expect, answer: a.text, error: a.error, verdict: s.verdict, missing: s.missing, ms: a.ms, tools: a.calls.map((c) => c.tool) });
  const mark = { correct: "✔", partial: "~", wrong: "✘" }[s.verdict];
  console.log(`${mark} ${String(q.id).padStart(2)}. ${q.q}\n     ${a.error ? "ERROR: " + a.error : a.text}${s.missing.length ? `\n     missing: ${s.missing.join(", ")}` : ""}  [${a.ms} ms]`);
}

const ms = results.map((r) => r.ms).sort((a, b) => a - b);
const summary = {
  brain, label, set, model: brain === "ai" ? aiConfig().model : null, ran_at: new Date().toISOString(), node: process.version, platform: `${process.platform}-${process.arch}`,
  questions: questions.length, ...counts, median_ms: ms[Math.floor(ms.length / 2)], max_ms: ms.at(-1),
};
console.log(`\n${counts.correct} correct, ${counts.partial} partly correct, ${counts.wrong} wrong. Median ${summary.median_ms} ms per question.`);
mkdirSync("eval/results", { recursive: true });
const file = `eval/results/${set === "holdout" ? "holdout/" : ""}${brain}-${label}.json`;
mkdirSync("eval/results/holdout", { recursive: true });
writeFileSync(file, JSON.stringify({ summary, results }, null, 2));
console.log(`Saved ${file}`);
