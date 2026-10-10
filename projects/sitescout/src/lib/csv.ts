import type { ExtractResult } from "../recipes/types";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per page, one column per field, plus symbol, url and status. */
export function toCsv(rows: { symbol: string; result: ExtractResult }[]): string {
  if (rows.length === 0) return "";
  const keys = rows[0].result.fields.map((f) => f.key);
  const header = ["symbol", ...keys, "status", "url"];
  const lines = rows.map(({ symbol, result }) => {
    const byKey = new Map(result.fields.map((f) => [f.key, f.value]));
    const status = result.ok ? "ok" : `missing: ${result.missing.join("; ")}`;
    return [symbol, ...keys.map((k) => byKey.get(k)), status, result.url].map(esc).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
