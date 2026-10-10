// Brain A: no AI model. It reads the question with fixed rules (keywords for
// the metric, names for brands and regions, patterns for weeks), picks one of
// a few answer shapes, calls the same tools brain B uses, and fills in a
// sentence. Fast and repeatable; it only understands what the rules cover.

import { METRICS, type MetricName } from "../data/metrics.ts";
import { WEEKS } from "../data/seed.ts";
import type { Tools } from "../tools/tools.ts";
import { chartFromCalls, fmt, signed, type Answer } from "./types.ts";

type Period = { from: number; to: number; label: string };
type Parsed = {
  intent: "define" | "changed" | "compare" | "rank" | "trend" | "value" | "event" | "unknown";
  metric: MetricName;
  metricSaid: boolean;
  brand?: string;
  sku?: string;
  product?: string;
  subcategory?: string;
  region?: string;
  periods: Period[];
  by?: "brand" | "product" | "subcategory" | "region";
  lowest: boolean;
  topN?: number;
  // v2: named events and yes/no questions.
  event?: "promotion" | "price_change" | "launch" | "stopped_selling";
  eventWhen?: "during" | "after";
  why?: boolean;
  yesNo?: "up" | "down";
};

const Q = (n: number): Period => ({ from: (n - 1) * 13 + 1, to: n * 13, label: `Q${n}` });
const weeks = (from: number, to: number): Period => ({ from, to, label: from === to ? `week ${from}` : `weeks ${from}–${to}` });

const METRIC_WORDS: [RegExp, MetricName][] = [
  [/\b(price gap|premium|cheaper|more expensive|priced (above|below))\b/, "price_gap"],
  [/\b(promo|promotion|promotions|lift|deal)\b/, "promo_lift"],
  [/\bshare\b/, "share"],
  [/\b(price|prices|priced|cost)\b/, "avg_price"],
  [/\b(units|packs|volume|how many)\b/, "units"],
  [/\b(sales|revenue|sold|sell|selling|takings|money)\b/, "sales"],
];

export function parse(q: string, tools: Tools): Parsed {
  const s = " " + q.toLowerCase().replace(/[?.,!]/g, " ").replace(/\s+/g, " ") + " ";
  const p: Parsed = { intent: "unknown", metric: "sales", metricSaid: false, periods: [], lowest: false };

  // v2: phrases that name an event ("during its promotion", "after the price
  // rise") set the period later, so they mustn't also pick the metric.
  const ev = /\b(during|after) (its|the|their) (promotion|promo|price (rise|increase|change|cut))\b/.exec(s);
  let ms = s;
  if (ev) {
    p.event = /price/.test(ev[3]) ? "price_change" : "promotion";
    p.eventWhen = ev[1] as "during" | "after";
    ms = s.replace(ev[0], " ");
    if (p.event === "promotion" && p.eventWhen === "during" && /\b(go up|went up|increase|rise|lift|jump)\b/.test(s)) { p.metric = "promo_lift"; p.metricSaid = true; }
  }
  if (/\bwhen did\b/.test(s)) p.event = /\b(stop|stopped|delist)/.test(s) ? "stopped_selling" : /\b(launch|launched|start|introduced)\b/.test(s) ? "launch" : p.event;
  if (/\bwhy (did|does|is|are)\b/.test(s)) p.why = true;
  if (/^ (did|is|are|has|have|does) /.test(s)) p.yesNo = /\b(lose|lost|losing|drop|fall|fell|decline|shrink)\b/.test(s) ? "down" : /\b(gain|gaining|grow|growing|rise|rising|increase)\b/.test(s) ? "up" : undefined;

  if (!p.metricSaid) for (const [re, m] of METRIC_WORDS) if (re.test(ms)) { p.metric = m; p.metricSaid = true; break; }

  // Names: brands, products, subcategories, regions.
  for (const b of tools.brands) if (s.includes(" " + b.toLowerCase())) p.brand = b;
  if (/\b(store brand|own brand|own label|private label)\b/.test(s)) p.brand = "Fernhill";
  for (const pr of tools.products) {
    const words = pr.name.toLowerCase().split(" ").slice(1).join(" ");
    if (s.includes(words) || s.includes(" " + pr.sku.toLowerCase() + " ")) { p.sku = pr.sku; p.product = pr.name; p.brand = undefined; }
  }
  const SUB: [RegExp, string][] = [[/\bflakes\b/, "Flakes"], [/\bgranola\b/, "Granola"], [/\bkids\b/, "Kids"], [/\b(hot cereal|oats|porridge|oatmeal)\b/, "Hot cereal"]];
  if (!p.sku) for (const [re, name] of SUB) if (re.test(s)) p.subcategory = name;
  for (const r of ["north", "south", "east", "west"]) if (s.includes(` ${r} `)) p.region = r[0].toUpperCase() + r.slice(1);

  // Periods.
  let m: RegExpExecArray | null;
  const rangeRe = /weeks? (\d{1,2})(?: ?(?:to|-|through|and) ?(\d{1,2}))?/g;
  while ((m = rangeRe.exec(s))) p.periods.push(weeks(+m[1], m[2] ? +m[2] : +m[1]));
  for (const qm of s.matchAll(/\bq([1-4])\b/g)) p.periods.push(Q(+qm[1]));
  if (/\b(first half|h1)\b/.test(s)) p.periods.push(weeks(1, 26));
  if (/\b(second half|h2)\b/.test(s)) p.periods.push(weeks(27, 52));
  const last = /\blast (\d{1,2}) weeks\b/.exec(s);
  if (last) p.periods = [weeks(WEEKS - +last[1] + 1, WEEKS)];
  const ba = /\bbefore and after week (\d{1,2})\b/.exec(s);
  if (ba) p.periods = [weeks(1, +ba[1] - 1), weeks(+ba[1], WEEKS)];
  // v2: "after week 30" on its own means before versus after.
  const aw = /\bafter week (\d{1,2})\b/.exec(s);
  if (aw && !ba) p.periods = [weeks(1, +aw[1] - 1), weeks(+aw[1], WEEKS)];
  if (p.yesNo && !p.periods.length && !p.event) p.periods = [weeks(1, 26), weeks(27, 52)];
  const top = /\btop (\d{1,2})\b/.exec(s);
  if (top) p.topN = +top[1];

  // Grouping and direction.
  if (/\b(which|what|top|biggest|largest|highest|best|most|lowest|smallest|least|worst|cheapest|rank)\b/.test(s)) {
    if (/\bbrands?\b/.test(s)) p.by = "brand";
    else if (/\bproducts?\b|\bitems?\b|\bskus?\b/.test(s)) p.by = "product";
    else if (/\bregions?\b/.test(s)) p.by = "region";
    else if (/\bsubcategor(y|ies)\b|\bsegments?\b/.test(s)) p.by = "subcategory";
  }
  p.lowest = /\b(lowest|smallest|least|worst|cheapest|fewest)\b/.test(s);

  // Intent, most specific first.
  if (p.event && (p.why || /\bwhen did\b/.test(s))) p.intent = "event";
  else if (p.why) p.intent = "event";
  else if (/\b(what does|what is|what's|define|meaning of|how is .* (worked out|calculated|defined))\b/.test(s) && p.metricSaid && !p.brand && !p.by && !p.periods.length) p.intent = "define";
  else if (/\b(what changed|biggest movers|stand out|stands out|moved most|grew most|fell most)\b/.test(s)) p.intent = "changed";
  else if (p.event === "price_change" || (p.event === "promotion" && p.eventWhen === "after")) p.intent = "compare";
  else if (p.event === "promotion") p.intent = "value";
  else if (p.periods.length >= 2 || /\b(compare|versus|vs)\b/.test(s)) p.intent = "compare";
  else if (p.by) p.intent = "rank";
  else if (/\b(trend|over time|each week|by week)\b/.test(s) || (/\bweekly\b/.test(s) && !p.event)) p.intent = "trend";
  else if (p.metricSaid || p.brand || p.sku) p.intent = "value";
  return p;
}

export async function askRules(question: string, tools: Tools): Promise<Answer> {
  const t0 = performance.now();
  const p = parse(question, tools);
  const f = { brand: p.brand, sku: p.sku, subcategory: p.subcategory, region: p.region };
  const who = p.product ?? p.brand ?? (p.subcategory ? (p.subcategory === "Hot cereal" ? "Hot cereal" : `${p.subcategory} cereal`) : "the cereal category");
  const where = p.region ? ` in the ${p.region}` : "";
  const res = (tool: Parameters<Tools["call"]>[0], args: object) => tools.call(tool, args).result as Record<string, any>;

  // v2: turn a named event into weeks, using the events found in the data.
  type Ev = { type: string; brand: string; product?: string; region?: string; from_week: number; to_week?: number; detail: string };
  let events: Ev[] = [];
  if (p.event || p.why) {
    events = res("list_events", { brand: p.brand, region: p.region }).events as Ev[];
    const e = events.find((x) => x.type === p.event);
    // Promo lift already compares promotion weeks with the rest, so it keeps the whole year.
    if (p.metric === "promo_lift") { /* keep the year */ }
    else if (e && p.intent !== "event" && p.event === "promotion" && p.eventWhen === "during") p.periods = [weeks(e.from_week, e.to_week ?? e.from_week)];
    else if (e && p.intent !== "event") p.periods = [weeks(1, e.from_week - 1), weeks(e.from_week, WEEKS)];
  }
  const unit = METRICS[p.metric].unit;
  const label = METRICS[p.metric].label.toLowerCase();
  const period = p.periods[0] ?? { from: 1, to: WEEKS, label: "the year" };
  const inPeriod = period.label === "the year" ? "over the year" : `in ${period.label}`;
  let text: string;

  switch (p.intent) {
    case "define": {
      const r = res("describe_metric", { metric: p.metric });
      text = `${r.label}: ${r.meaning}`;
      break;
    }
    case "changed": {
      const [a, b] = p.periods.length >= 2 ? p.periods : [weeks(1, 26), weeks(27, 52)];
      const by = p.by === "subcategory" ? "brand" : p.by ?? "brand";
      const r = res("what_changed", { a_from: a.from, a_to: a.to, b_from: b.from, b_to: b.to, by, ...f });
      const top = (r.movers as any[]).slice(0, 3).map((x) => `${x.key} (${x.a == null ? "new" : signed(x.change_pct)})`);
      text = `Biggest movers in weekly sales from ${a.label} to ${b.label}${where}: ${top.join(", ")}.`;
      break;
    }
    case "compare": {
      const [a, b] = p.periods.length >= 2 ? p.periods : [weeks(1, 26), weeks(27, 52)];
      const r = res("compare_periods", { metric: p.metric, a_from: a.from, a_to: a.to, b_from: b.from, b_to: b.to, ...f });
      const row = r.rows[0];
      const pw = r.per_week ? " per week" : "";
      const yes = p.yesNo && row.change_pct != null ? ((row.change_pct < 0) === (p.yesNo === "down") ? "Yes. " : "No. ") : "";
      text = `${yes}${who}${where}: ${label}${pw} went from ${fmt(row.a, unit)} in ${a.label} to ${fmt(row.b, unit)} in ${b.label} (${signed(row.change_pct)}).`;
      break;
    }
    case "rank": {
      const r = res("get_metric", { metric: p.metric, from_week: period.from, to_week: period.to, by: p.by, ...f });
      const rows = (r.rows as { key: string; value: number | null }[]).filter((x) => x.value != null);
      const pick = p.lowest ? rows[rows.length - 1] : rows[0];
      if (p.topN && rows.length) {
        const top = (p.lowest ? [...rows].reverse() : rows).slice(0, p.topN);
        text = `${p.lowest ? "Bottom" : "Top"} ${top.length} by ${label}${where} ${inPeriod}: ${top.map((x) => `${x.key} (${fmt(x.value, unit)})`).join(", ")}.`;
        break;
      }
      text = pick
        ? `${pick.key} has the ${p.lowest ? "lowest" : "highest"} ${label}${where} ${inPeriod}: ${fmt(pick.value, unit)}.`
        : `No ${label} data for that.`;
      break;
    }
    case "trend": {
      const r = res("get_metric", { metric: p.metric, from_week: period.from, to_week: period.to, by: "week", ...f });
      const rows = r.rows as { key: string; value: number }[];
      const first = rows[0], lastRow = rows[rows.length - 1];
      text = `${who}${where}: weekly ${label} went from ${fmt(first?.value, unit)} in week ${first?.key} to ${fmt(lastRow?.value, unit)} in week ${lastRow?.key}.`;
      break;
    }
    case "value": {
      const r = res("get_metric", { metric: p.metric, from_week: period.from, to_week: period.to, ...f });
      text = `${who}${where} ${inPeriod}: ${label} ${fmt(r.rows[0]?.value, unit)}.`;
      break;
    }
    case "event": {
      const found = p.event ? events.filter((x) => x.type === p.event) : events;
      text = found.length
        ? (p.why ? "From the data: " : "") + found.map((x) => x.detail).join(". ") + "."
        : `I found no ${p.event?.replace("_", " ") ?? "events"} for ${who}${where}.`;
      break;
    }
    default:
      text = "Sorry, I couldn't work out that question. Try naming a measure (sales, share, price, promo lift) and a brand, region or weeks.";
  }

  return { brain: "rules", text, chart: chartFromCalls(tools.log), calls: tools.log, ms: Math.round(performance.now() - t0) };
}
