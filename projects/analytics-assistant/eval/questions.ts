// The 30 test questions. Each answer key is worked out from the dataset with
// the shared metric definitions, so the key and the tools always agree on
// what "share" or "promo lift" means. A question is about the data, not about
// either brain: they're written the way a category manager might ask.
//
// An answer must mention every name in `names` and every number in
// `numbers` (within a small tolerance). `anyWords` adds "one of these words
// must appear", for yes/no questions.

import type { DatabaseSync } from "node:sqlite";
import { computeMetric, weeksIn, type Filters, type MetricName, type Period } from "../src/data/metrics.ts";

export type Expected = { names?: string[]; numbers?: number[]; anyWords?: string[] };
export type Question = { id: number; q: string; kind: string; expect: Expected };

const H1: Period = { from: 1, to: 26 }, H2: Period = { from: 27, to: 52 };
const Q = (n: number): Period => ({ from: (n - 1) * 13 + 1, to: n * 13 });
const YEAR: Period = { from: 1, to: 52 };

export function buildQuestions(db: DatabaseSync): Question[] {
  const one = (m: MetricName, f: Filters, p: Period) => computeMetric(db, m, f, p)[0]?.value as number;
  const ranked = (m: MetricName, f: Filters, p: Period, by: "brand" | "product" | "region" | "subcategory") =>
    computeMetric(db, m, f, p, by).filter((r) => r.value != null).sort((a, b) => (b.value as number) - (a.value as number));
  const perWeek = (m: MetricName, f: Filters, p: Period) => Math.round((100 * one(m, f, p)) / weeksIn(p)) / 100;
  const change = (a: number, b: number) => Math.round((1000 * (b - a)) / a) / 10;
  const movers = (a: Period, b: Period, by: "brand" | "product") => {
    const A = new Map(computeMetric(db, "sales", {}, a, by).map((r) => [r.key, (r.value as number) / weeksIn(a)]));
    return computeMetric(db, "sales", {}, b, by)
      .map((r) => ({ key: r.key, d: (r.value as number) / weeksIn(b) - (A.get(r.key) ?? 0) }))
      .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  };

  const shareBrand = ranked("share", {}, YEAR, "brand");
  const lift = ranked("promo_lift", {}, YEAR, "brand")[0];
  const mfUnits = [perWeek("units", { brand: "Morningfield" }, { from: 1, to: 29 }), perWeek("units", { brand: "Morningfield" }, { from: 30, to: 52 })];
  const mfPrice = [one("avg_price", { brand: "Morningfield" }, { from: 1, to: 29 }), one("avg_price", { brand: "Morningfield" }, { from: 30, to: 52 })];
  const mfShare = [one("share", { brand: "Morningfield" }, { from: 1, to: 29 }), one("share", { brand: "Morningfield" }, { from: 30, to: 52 })];
  const fhQ = [one("share", { brand: "Fernhill" }, Q(1)), one("share", { brand: "Fernhill" }, Q(4))];
  const fhH = [one("share", { brand: "Fernhill" }, H1), one("share", { brand: "Fernhill" }, H2)];
  const regions = ranked("sales", {}, YEAR, "region");
  const ringsH2 = ranked("sales", { sku: "SS-01" }, H2, "region");
  const q3q4 = movers(Q(3), Q(4), "brand");
  const h1h2 = movers(H1, H2, "product");
  const price = ranked("avg_price", {}, YEAR, "brand");
  const units3 = ranked("units", {}, Q(3), "brand").slice(0, 3);
  const subs = ranked("sales", {}, YEAR, "subcategory");
  const hot = computeMetric(db, "sales", { subcategory: "Hot cereal" }, YEAR, "week");
  const cw = [perWeek("sales", { brand: "Crunchwell" }, { from: 16, to: 19 }), perWeek("sales", { brand: "Crunchwell" }, { from: 20, to: 23 })];
  const gr = [perWeek("sales", { subcategory: "Granola" }, H1), perWeek("sales", { subcategory: "Granola" }, H2)];

  const list: Omit<Question, "id">[] = [
    { kind: "value", q: "What were total cereal sales this year?", expect: { numbers: [one("sales", {}, YEAR)] } },
    { kind: "rank", q: "Which brand had the highest share of sales?", expect: { names: [shareBrand[0].key], numbers: [shareBrand[0].value as number] } },
    { kind: "rank", q: "Which brand has the smallest share?", expect: { names: [shareBrand.at(-1)!.key], numbers: [shareBrand.at(-1)!.value as number] } },
    { kind: "define", q: "What does promo lift mean?", expect: { anyWords: ["promotion", "promo"] } },
    { kind: "rank", q: "Which brand got the biggest lift from promotions?", expect: { names: [lift.key], numbers: [lift.value as number] } },
    { kind: "value", q: "By how much did Crunchwell's weekly units go up during its promotion?", expect: { names: ["Crunchwell"], numbers: [lift.value as number] } },
    { kind: "compare", q: "How did Morningfield units change before and after week 30?", expect: { names: ["Morningfield"], numbers: [change(mfUnits[0], mfUnits[1])] } },
    { kind: "compare", q: "What happened to Morningfield's average price after week 30?", expect: { names: ["Morningfield"], numbers: [change(mfPrice[0], mfPrice[1])] } },
    { kind: "compare", q: "What was Fernhill's share in Q1 versus Q4?", expect: { names: ["Fernhill"], numbers: fhQ } },
    { kind: "compare", q: "Is the store brand gaining share?", expect: { names: ["Fernhill"], numbers: fhH, anyWords: ["yes", "grew", "gain", "gained", "gaining", "up", "increase", "increased", "rose"] } },
    { kind: "fact", q: "When did Little Grain launch?", expect: { names: ["Little Grain"], numbers: [40] } },
    { kind: "value", q: "What were Little Grain sales in Q4?", expect: { names: ["Little Grain"], numbers: [one("sales", { brand: "Little Grain" }, Q(4))] } },
    { kind: "rank", q: "Which region sells the most cereal?", expect: { names: [regions[0].key] } },
    { kind: "rank", q: "Which region had the lowest sales of Sunny Spoon Honey Rings in the second half?", expect: { names: [ringsH2.at(-1)!.key] } },
    { kind: "changed", q: "What changed between Q3 and Q4?", expect: { names: [q3q4[0].key] } },
    { kind: "changed", q: "Which products grew the most from the first half to the second half?", expect: { names: [h1h2[0].key] } },
    { kind: "value", q: "What is Morningfield's price gap to the category?", expect: { names: ["Morningfield"], numbers: [one("price_gap", { brand: "Morningfield" }, YEAR)] } },
    { kind: "rank", q: "Which brand is cheapest?", expect: { names: [price.at(-1)!.key] } },
    { kind: "value", q: "How many packs of Oat & Acre Rolled Oats sold in the North in Q1?", expect: { numbers: [one("units", { sku: "OA-01", region: "North" }, Q(1))] } },
    { kind: "value", q: "What share of sales did Kids cereal have in the West?", expect: { numbers: [one("share", { subcategory: "Kids", region: "West" }, YEAR)] } },
    { kind: "trend", q: "Show the weekly sales trend for hot cereal.", expect: { numbers: [hot[0].value as number, hot.at(-1)!.value as number] } },
    { kind: "compare", q: "Compare Crunchwell sales in weeks 16 to 19 with weeks 20 to 23.", expect: { names: ["Crunchwell"], numbers: [change(cw[0], cw[1])] } },
    { kind: "value", q: "What were total sales in Q2?", expect: { numbers: [one("sales", {}, Q(2))] } },
    { kind: "compare", q: "How did granola do in the second half compared with the first half?", expect: { names: ["Granola"], numbers: [change(gr[0], gr[1])] } },
    { kind: "why", q: "Why did Sunny Spoon sales drop in the West?", expect: { names: ["Honey Rings"], numbers: [35] } },
    { kind: "value", q: "What was Crunchwell's average price during its promotion?", expect: { names: ["Crunchwell"], numbers: [one("avg_price", { brand: "Crunchwell" }, { from: 20, to: 23 })] } },
    { kind: "rank", q: "What were the top 3 brands by units in Q3?", expect: { names: units3.map((r) => r.key) } },
    { kind: "rank", q: "Which subcategory has the highest sales?", expect: { names: [subs[0].key] } },
    { kind: "value", q: "How much did the East region sell in the last 4 weeks?", expect: { numbers: [one("sales", { region: "East" }, { from: 49, to: 52 })] } },
    { kind: "compare", q: "Did Morningfield lose share after its price rise?", expect: { names: ["Morningfield"], numbers: mfShare, anyWords: ["yes", "lost", "fell", "down", "dropped", "decreased", "lower"] } },
  ];
  return list.map((x, i) => ({ id: i + 1, ...x }));
}
