import type { ToolCall } from "../tools/tools.ts";

export type Chart = {
  title: string;
  kind: "bar" | "line" | "pair";
  unit: string;
  rows: { key: string; value: number | null; value2?: number | null }[];
  labels?: [string, string]; // for "pair": names of the two periods
};

export type Answer = {
  brain: "rules" | "ai";
  text: string;
  chart?: Chart;
  calls: ToolCall[];
  ms: number;
  model?: string;
  error?: string;
};

export const BRAIN_NAMES = { rules: "Rules (brain A)", ai: "Local AI (brain B)" } as const;
export type BrainName = keyof typeof BRAIN_NAMES;

/** Turn the last useful tool result into a chart, the same way for both brains. */
export function chartFromCalls(calls: ToolCall[]): Chart | undefined {
  for (let i = calls.length - 1; i >= 0; i--) {
    const c = calls[i];
    if (!c.ok) continue;
    const r = c.result as Record<string, unknown>;
    const unit = (r.unit as string) ?? "$";
    const metric = String(r.metric ?? "");
    if (c.tool === "get_metric") {
      const rows = r.rows as Chart["rows"];
      if (rows.length < 2) continue;
      const byWeek = rows.every((x) => /^\d+$/.test(x.key));
      return { title: `${metric}${byWeek ? " by week" : ""}`, kind: byWeek ? "line" : "bar", unit, rows: rows.slice(0, 12) };
    }
    if (c.tool === "compare_periods") {
      const [a, b] = [r.a as number[], r.b as number[]];
      const rows = (r.rows as { key: string; a: number | null; b: number | null }[]).map((x) => ({ key: x.key === "all" ? metric : x.key, value: x.a, value2: x.b }));
      return { title: `${metric}${r.per_week ? " per week" : ""}`, kind: "pair", unit, rows: rows.slice(0, 12), labels: [`Weeks ${a[0]}–${a[1]}`, `Weeks ${b[0]}–${b[1]}`] };
    }
    if (c.tool === "what_changed") {
      const [a, b] = [r.a as number[], r.b as number[]];
      const rows = (r.movers as { key: string; a: number | null; b: number | null }[]).map((x) => ({ key: x.key, value: x.a, value2: x.b }));
      return { title: "weekly sales, biggest movers", kind: "pair", unit: "$", rows, labels: [`Weeks ${a[0]}–${a[1]}`, `Weeks ${b[0]}–${b[1]}`] };
    }
  }
  return undefined;
}

export const fmt = (v: number | null | undefined, unit: string) => {
  if (v == null || Number.isNaN(v)) return "no data";
  if (unit === "$") return "$" + v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 2 : 0, minimumFractionDigits: v < 100 ? 2 : 0 });
  if (unit === "%") return `${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return Math.round(v).toLocaleString("en-US");
};
export const signed = (v: number | null) => (v == null ? "n/a" : `${v > 0 ? "+" : ""}${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`);
