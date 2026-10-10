export function fmtNumber(v: number, digits = 2): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCompact(v: number): string {
  const units: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [n, u] of units) if (Math.abs(v) >= n) return `${(v / n).toFixed(2)}${u}`;
  return String(v);
}

export function fmtValue(value: string | number | null, parse: string): string {
  if (value === null || value === "") return "--";
  if (typeof value === "string") return value;
  if (parse === "compact") return fmtCompact(value);
  if (parse === "percent") return `${value > 0 ? "+" : ""}${fmtNumber(value)}%`;
  return fmtNumber(value);
}
