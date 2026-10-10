// Ten held-out questions, written after brain A's v2 fixes, in new wording.
// They check whether the fixes were general or just tuned to the first 30.
// Never edit brain A to pass these: that would make them useless.

import type { DatabaseSync } from "node:sqlite";
import { computeMetric, weeksIn, type Period } from "../src/data/metrics.ts";
import type { Question } from "./questions.ts";

export function buildHoldout(db: DatabaseSync): Question[] {
  const Y: Period = { from: 1, to: 52 };
  const one = (m: Parameters<typeof computeMetric>[1], f: object, p: Period) => computeMetric(db, m, f, p)[0]?.value as number;
  const ranked = (m: Parameters<typeof computeMetric>[1], f: object, p: Period, by: "brand" | "product" | "region") =>
    computeMetric(db, m, f, p, by).filter((r) => r.value != null).sort((a, b) => (b.value as number) - (a.value as number));
  const pw = (m: "sales" | "units", f: object, p: Period) => one(m, f, p) / weeksIn(p);
  const chg = (a: number, b: number) => Math.round((1000 * (b - a)) / a) / 10;

  const list: Omit<Question, "id">[] = [
    { kind: "value", q: "How much money did Oat & Acre bring in during Q1?", expect: { names: ["Oat & Acre"], numbers: [one("sales", { brand: "Oat & Acre" }, { from: 1, to: 13 })] } },
    { kind: "rank", q: "Which product sold the most units in the South?", expect: { names: [ranked("units", { region: "South" }, Y, "product")[0].key] } },
    { kind: "compare", q: "Did Crunchwell sell more after its promotion ended?", expect: { names: ["Crunchwell"], numbers: [chg(pw("sales", { brand: "Crunchwell" }, { from: 1, to: 23 }), pw("sales", { brand: "Crunchwell" }, { from: 24, to: 52 }))] } },
    { kind: "fact", q: "When did Honey Rings stop selling in the West?", expect: { names: ["Honey Rings"], numbers: [35] } },
    { kind: "value", q: "What's the share for Little Grain in Q4?", expect: { names: ["Little Grain"], numbers: [one("share", { brand: "Little Grain" }, { from: 40, to: 52 })] } },
    { kind: "rank", q: "Name the three biggest products by sales.", expect: { names: ranked("sales", {}, Y, "product").slice(0, 3).map((r) => r.key) } },
    { kind: "define", q: "How is price gap worked out?", expect: { anyWords: ["average price", "category"] } },
    { kind: "compare", q: "Compare hot cereal sales in Q1 and Q3.", expect: { numbers: [chg(pw("sales", { subcategory: "Hot cereal" }, { from: 1, to: 13 }), pw("sales", { subcategory: "Hot cereal" }, { from: 27, to: 39 }))] } },
    { kind: "rank", q: "Which region has the most expensive average price?", expect: { names: [ranked("avg_price", {}, Y, "region")[0].key] } },
    { kind: "why", q: "Why did Morningfield's units fall in the second half?", expect: { names: ["Morningfield"], numbers: [30], anyWords: ["price"] } },
  ];
  return list.map((x, i) => ({ id: 101 + i, ...x }));
}
