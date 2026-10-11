// Every number the assistant can report is defined here, once. Tools, both
// brains and the test answer key all go through these functions, so two
// answers about the same thing can never disagree.

import type { DatabaseSync } from "node:sqlite";

export const METRICS = {
  sales: { label: "Sales", unit: "$", meaning: "Money taken at the till: units sold times the price paid, added up." },
  units: { label: "Units", unit: "", meaning: "How many packs were sold." },
  avg_price: { label: "Average price", unit: "$", meaning: "Sales divided by units: what a shopper paid per pack on average, after any promotion." },
  share: { label: "Share", unit: "%", meaning: "A brand's (or product's) sales as a percent of all cereal sales in the same weeks and region." },
  price_gap: { label: "Price gap", unit: "%", meaning: "How much more (or less) a brand's average price is than the whole category's average price in the same weeks and region, in percent." },
  promo_lift: { label: "Promo lift", unit: "%", meaning: "How many more units sold per week while on promotion than in the weeks without one, in percent." },
} as const;

export type MetricName = keyof typeof METRICS;
export const METRIC_NAMES = Object.keys(METRICS) as MetricName[];
export const GROUPINGS = ["brand", "product", "subcategory", "region", "week"] as const;
export type Grouping = (typeof GROUPINGS)[number];

export type Filters = { brand?: string; subcategory?: string; region?: string; sku?: string };
export type Period = { from: number; to: number };
export type Row = { key: string; value: number | null };

const COL: Record<Grouping, string> = {
  brand: "p.brand",
  product: "p.name",
  subcategory: "p.subcategory",
  region: "s.region",
  week: "s.week",
};

// whole = true gives the denominator for share and price gap: the whole
// category in the same weeks and region, ignoring brand, product and subcategory.
function where(f: Filters, period: Period, whole = false) {
  const parts = ["s.week BETWEEN ? AND ?"];
  const args: (string | number)[] = [period.from, period.to];
  if (!whole && f.brand) (parts.push("p.brand = ?"), args.push(f.brand));
  if (!whole && f.sku) (parts.push("p.sku = ?"), args.push(f.sku));
  if (!whole && f.subcategory) (parts.push("p.subcategory = ?"), args.push(f.subcategory));
  if (f.region) (parts.push("s.region = ?"), args.push(f.region));
  return { sql: parts.join(" AND "), args };
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** One metric, for one filter and period, optionally split by a grouping. */
export function computeMetric(db: DatabaseSync, metric: MetricName, f: Filters, period: Period, by?: Grouping): Row[] {
  const key = by ? COL[by] : "'all'";
  const order = by === "week" ? "ORDER BY key + 0" : "";
  const w = where(f, period);
  const base = `FROM sales s JOIN products p ON p.sku = s.sku WHERE ${w.sql}`;

  if (metric === "sales" || metric === "units" || metric === "avg_price") {
    const expr = metric === "sales" ? "SUM(s.revenue)" : metric === "units" ? "SUM(s.units)" : "SUM(s.revenue) * 1.0 / NULLIF(SUM(s.units), 0)";
    const rows = db.prepare(`SELECT ${key} AS key, ${expr} AS value ${base} GROUP BY 1 ${order}`).all(...w.args) as Row[];
    return rows.map((r) => ({ key: String(r.key), value: r.value == null ? null : round(Number(r.value)) }));
  }

  const d = where(f, period, true);
  const dbase = `FROM sales s JOIN products p ON p.sku = s.sku WHERE ${d.sql}`;
  const dkey = by === "week" || by === "region" ? key : "'all'";

  if (metric === "share") {
    const num = db.prepare(`SELECT ${key} AS key, ${by === "week" || by === "region" ? key : "'all'"} AS dk, SUM(s.revenue) AS v ${base} GROUP BY 1 ${order}`).all(...w.args) as { key: string; dk: string; v: number }[];
    const den = new Map((db.prepare(`SELECT ${dkey} AS dk, SUM(s.revenue) AS v ${dbase} GROUP BY 1`).all(...d.args) as { dk: string; v: number }[]).map((r) => [String(r.dk), r.v]));
    return num.map((r) => ({ key: String(r.key), value: round((100 * r.v) / (den.get(String(r.dk)) || NaN), 1) }));
  }

  if (metric === "price_gap") {
    const num = db.prepare(`SELECT ${key} AS key, ${by === "week" || by === "region" ? key : "'all'"} AS dk, SUM(s.revenue) * 1.0 / SUM(s.units) AS v ${base} GROUP BY 1 ${order}`).all(...w.args) as { key: string; dk: string; v: number }[];
    const den = new Map((db.prepare(`SELECT ${dkey} AS dk, SUM(s.revenue) * 1.0 / SUM(s.units) AS v ${dbase} GROUP BY 1`).all(...d.args) as { dk: string; v: number }[]).map((r) => [String(r.dk), r.v]));
    return num.map((r) => ({ key: String(r.key), value: round(100 * (r.v / (den.get(String(r.dk)) || NaN) - 1), 1) }));
  }

  // promo_lift: weekly units on promotion versus off, per group.
  const rows = db
    .prepare(
      `SELECT key, AVG(CASE WHEN promo = 1 THEN u END) AS on_avg, AVG(CASE WHEN promo = 0 THEN u END) AS off_avg FROM (
         SELECT ${key} AS key, s.week, MAX(s.on_promo) AS promo, SUM(s.units) AS u ${base} GROUP BY 1, 2
       ) GROUP BY key ${order}`,
    )
    .all(...w.args) as { key: string; on_avg: number | null; off_avg: number | null }[];
  return rows.map((r) => ({ key: String(r.key), value: r.on_avg == null || !r.off_avg ? null : round(100 * (r.on_avg / r.off_avg - 1), 1) }));
}

/** Weeks in a period, for per-week comparisons between periods of different length. */
export const weeksIn = (p: Period) => p.to - p.from + 1;
