// The tools both brains use, and the MCP server exposes. All read-only, all
// capped at MAX_ROWS rows, and every call is written to a log the screen shows.
// Parameters are flat (no nested objects) because small local models handle
// flat arguments far more reliably.

import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import { computeMetric, GROUPINGS, METRIC_NAMES, METRICS, weeksIn, type Filters, type MetricName, type Row } from "../data/metrics.ts";
import { REGIONS, WEEKS } from "../data/seed.ts";

// 60, not 50: a full year by week is 52 rows. (v1 used 50 and cut weekly trends short.)
export const MAX_ROWS = 60;

const week = z.coerce.number().int().min(1).max(WEEKS);
const filters = {
  brand: z.string().optional().describe("Exact brand name, from find_product"),
  subcategory: z.string().optional().describe("Exact subcategory: Flakes, Granola, Kids or Hot cereal"),
  region: z.enum(REGIONS).optional().describe("North, South, East or West"),
  sku: z.string().optional().describe("Exact product code like MF-01, from find_product"),
};
const metric = z.enum(METRIC_NAMES as [MetricName, ...MetricName[]]);

export const TOOL_SPECS = {
  find_product: {
    description: "Search brands, products, subcategories and regions by name. Use it first to turn words in a question into exact names.",
    params: z.object({ query: z.string().min(1).describe("Words to search for, like 'crunchwell' or 'oats'") }),
  },
  describe_metric: {
    description: "Explain what a metric means and how it is worked out. Metrics: " + METRIC_NAMES.join(", "),
    params: z.object({ metric }),
  },
  get_metric: {
    description: "Get one metric for a range of weeks (1 to 52, all in 2025), optionally for one brand, subcategory, region or product, and optionally split by brand, product, subcategory, region or week. Rows come back largest first (by week: in week order).",
    params: z.object({
      metric,
      from_week: week.default(1),
      to_week: week.default(WEEKS),
      ...filters,
      by: z.enum(GROUPINGS).optional().describe("Split the answer into one row per brand, product, subcategory, region or week"),
    }),
  },
  compare_periods: {
    description: "Compare one metric between period A and period B. Sales and units are compared per week, so periods of different length are fair. Returns A, B and the percent change.",
    params: z.object({
      metric,
      a_from: week, a_to: week, b_from: week, b_to: week,
      ...filters,
      by: z.enum(GROUPINGS).optional().describe("Compare each brand, product, subcategory or region separately"),
    }),
  },
  list_events: {
    description: "List dated events found in the data: promotions (weeks on promotion), lasting price changes, product launches, and products that stopped selling in a region. Use it for 'when', 'why' and 'during/after the promotion or price rise' questions.",
    params: z.object({ brand: filters.brand, region: filters.region }),
  },
  what_changed: {
    description: "List the biggest movers in weekly sales between period A and period B, split by brand, product or region. Use it for open questions like 'what changed' or 'what stands out'.",
    params: z.object({
      a_from: week, a_to: week, b_from: week, b_to: week,
      by: z.enum(["brand", "product", "region"]).default("brand"),
      ...filters,
    }),
  },
} as const;

export type ToolName = keyof typeof TOOL_SPECS;
export type ToolCall = { tool: ToolName; args: unknown; ok: boolean; rows: number; ms: number; result: unknown };

const limit = (rows: Row[], by?: string) => {
  const sorted = by === "week" ? rows : [...rows].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  return { rows: sorted.slice(0, MAX_ROWS), truncated: sorted.length > MAX_ROWS };
};
const pct = (a: number | null, b: number | null) => (a == null || b == null || a === 0 ? null : Math.round((1000 * (b - a)) / a) / 10);
const perWeek = (m: MetricName) => m === "sales" || m === "units";

export function makeTools(db: DatabaseSync) {
  const brands = (db.prepare("SELECT DISTINCT brand FROM products ORDER BY 1").all() as { brand: string }[]).map((r) => r.brand);
  const subcats = (db.prepare("SELECT DISTINCT subcategory FROM products ORDER BY 1").all() as { subcategory: string }[]).map((r) => r.subcategory);
  const products = db.prepare("SELECT sku, name, brand, subcategory, launch_week FROM products ORDER BY sku").all() as { sku: string; name: string; brand: string; subcategory: string; launch_week: number }[];

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9& ]/g, " ").replace(/\s+/g, " ").trim();
  const matches = (hay: string, q: string) => {
    const h = norm(hay);
    return norm(q).split(" ").filter((w) => w.length > 1).some((w) => h.includes(w) || (w.endsWith("s") && h.includes(w.slice(0, -1))));
  };

  function compare(m: MetricName, a: { from: number; to: number }, b: { from: number; to: number }, f: Filters, by?: (typeof GROUPINGS)[number]) {
    const A = computeMetric(db, m, f, a, by);
    const B = new Map(computeMetric(db, m, f, b, by).map((r) => [r.key, r.value]));
    const keys = new Set([...A.map((r) => r.key), ...B.keys()]);
    const aMap = new Map(A.map((r) => [r.key, r.value]));
    const scale = (v: number | null | undefined, p: { from: number; to: number }) =>
      v == null ? null : perWeek(m) ? Math.round((100 * v) / weeksIn(p)) / 100 : v;
    return [...keys].map((key) => {
      const av = scale(aMap.get(key), a), bv = scale(B.get(key), b);
      return { key, a: av, b: bv, change_pct: pct(av, bv) };
    });
  }

  // Events are found from the data itself, not written in by hand.
  type Event = { type: "promotion" | "price_change" | "launch" | "stopped_selling"; brand: string; product?: string; region?: string; from_week: number; to_week?: number; detail: string };
  function findEvents(brand?: string, region?: string): Event[] {
    const out: Event[] = [];
    const bf = brand ? " AND p.brand = ?" : "", rf = region ? " AND s.region = ?" : "";
    const args = [brand, region].filter(Boolean) as string[];
    // Promotions: runs of consecutive weeks where a brand was on promotion.
    const promo = db.prepare(`SELECT p.brand AS brand, s.week AS week FROM sales s JOIN products p ON p.sku = s.sku WHERE s.on_promo = 1${bf}${rf} GROUP BY 1, 2 ORDER BY 1, 2`).all(...args) as { brand: string; week: number }[];
    for (let i = 0; i < promo.length; ) {
      let j = i;
      while (j + 1 < promo.length && promo[j + 1].brand === promo[i].brand && promo[j + 1].week === promo[j].week + 1) j++;
      out.push({ type: "promotion", brand: promo[i].brand, from_week: promo[i].week, to_week: promo[j].week, detail: `${promo[i].brand} on promotion in weeks ${promo[i].week}-${promo[j].week}` });
      i = j + 1;
    }
    // Lasting price changes: shelf price (off promotion) moves 5% or more and stays.
    const prices = db.prepare(`SELECT p.brand AS brand, s.week AS week, AVG(s.price) AS price FROM sales s JOIN products p ON p.sku = s.sku WHERE s.on_promo = 0${bf}${rf} GROUP BY 1, 2 ORDER BY 1, 2`).all(...args) as { brand: string; week: number; price: number }[];
    for (let i = 1; i < prices.length; i++) {
      const [a, b] = [prices[i - 1], prices[i]];
      if (a.brand !== b.brand || b.week - a.week > 6) continue;
      const after = prices.filter((x) => x.brand === b.brand && x.week >= b.week && x.week < b.week + 4);
      const chg = b.price / a.price - 1;
      if (Math.abs(chg) >= 0.05 && after.every((x) => Math.abs(x.price / a.price - 1) >= 0.05))
        out.push({ type: "price_change", brand: b.brand, from_week: b.week, detail: `${b.brand} shelf price ${chg > 0 ? "up" : "down"} ${Math.round(Math.abs(chg) * 1000) / 10}% from week ${b.week}` });
    }
    // Launches and products that stopped selling in a region.
    for (const p of products) {
      if (brand && p.brand !== brand) continue;
      if (p.launch_week > 1) out.push({ type: "launch", brand: p.brand, product: p.name, from_week: p.launch_week, detail: `${p.name} launched in week ${p.launch_week}` });
    }
    const last = db.prepare(`SELECT p.brand AS brand, p.name AS name, s.region AS region, MAX(s.week) AS last FROM sales s JOIN products p ON p.sku = s.sku WHERE 1=1${bf}${rf} GROUP BY p.sku, s.region HAVING MAX(s.week) < ?`).all(...args, WEEKS) as { brand: string; name: string; region: string; last: number }[];
    for (const r of last) out.push({ type: "stopped_selling", brand: r.brand, product: r.name, region: r.region, from_week: r.last + 1, detail: `${r.name} stopped selling in the ${r.region} from week ${r.last + 1}` });
    return out.sort((x, y) => x.from_week - y.from_week);
  }

  const run: { [K in ToolName]: (args: z.infer<(typeof TOOL_SPECS)[K]["params"]>) => unknown } = {
    find_product: ({ query }) => ({
      brands: brands.filter((b) => matches(b, query)),
      products: products.filter((p) => matches(`${p.name} ${p.sku}`, query)).slice(0, MAX_ROWS),
      subcategories: subcats.filter((s) => matches(s, query)),
      regions: REGIONS.filter((r) => matches(r, query)),
    }),
    describe_metric: ({ metric }) => ({ metric, ...METRICS[metric] }),
    get_metric: ({ metric, from_week, to_week, by, ...f }) => ({
      metric, unit: METRICS[metric].unit, weeks: [from_week, to_week], ...limit(computeMetric(db, metric, f, { from: from_week, to: to_week }, by), by),
    }),
    compare_periods: ({ metric, a_from, a_to, b_from, b_to, by, ...f }) => {
      const rows = compare(metric, { from: a_from, to: a_to }, { from: b_from, to: b_to }, f, by);
      return { metric, unit: METRICS[metric].unit, per_week: perWeek(metric), a: [a_from, a_to], b: [b_from, b_to], rows: rows.slice(0, MAX_ROWS) };
    },
    list_events: ({ brand, region }) => ({ events: findEvents(brand, region).slice(0, MAX_ROWS) }),
    what_changed: ({ a_from, a_to, b_from, b_to, by, ...f }) => {
      const rows = compare("sales", { from: a_from, to: a_to }, { from: b_from, to: b_to }, f, by)
        .map((r) => ({ ...r, change: Math.round(((r.b ?? 0) - (r.a ?? 0)) * 100) / 100 }))
        .sort((x, y) => Math.abs(y.change) - Math.abs(x.change));
      return { metric: "sales", per_week: true, a: [a_from, a_to], b: [b_from, b_to], movers: rows.slice(0, 5) };
    },
  };

  const log: ToolCall[] = [];

  /** Run a tool by name with untrusted arguments (from a model or the MCP client). */
  function call(tool: string, rawArgs: unknown): { ok: boolean; result: unknown } {
    const t0 = performance.now();
    const spec = TOOL_SPECS[tool as ToolName];
    let ok = false, result: unknown;
    if (!spec) result = { error: `Unknown tool "${tool}". Tools: ${Object.keys(TOOL_SPECS).join(", ")}` };
    else {
      const parsed = spec.params.safeParse(rawArgs ?? {});
      if (!parsed.success) result = { error: "Bad arguments: " + parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ") };
      else {
        try {
          result = (run[tool as ToolName] as (a: unknown) => unknown)(parsed.data);
          ok = true;
        } catch (e) {
          result = { error: (e as Error).message };
        }
      }
    }
    const r = result as { rows?: unknown[]; movers?: unknown[]; events?: unknown[] };
    const rows = (r?.rows ?? r?.movers ?? r?.events)?.length ?? 1;
    log.push({ tool: tool as ToolName, args: rawArgs, ok, rows, ms: Math.round((performance.now() - t0) * 10) / 10, result });
    return { ok, result };
  }

  return { call, log, brands, subcats, products };
}

export type Tools = ReturnType<typeof makeTools>;
