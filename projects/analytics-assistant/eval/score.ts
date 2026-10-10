// Marks one answer against its key: correct (every check passes), partly
// correct (at least half pass) or wrong.

import type { Expected } from "./questions.ts";

export type Verdict = "correct" | "partial" | "wrong";

/** Every number written in the text, including "1.2 million" and "12k". */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(-?\d[\d,]*(?:\.\d+)?)\s*(million|m\b|k\b|thousand)?/gi)) {
    let v = Number(m[1].replace(/,/g, ""));
    const s = (m[2] ?? "").toLowerCase();
    if (s === "million" || s === "m") v *= 1e6;
    if (s === "thousand" || s === "k") v *= 1e3;
    if (!Number.isNaN(v)) out.push(v);
  }
  return out;
}

const close = (x: number, v: number) => Math.abs(Math.abs(x) - Math.abs(v)) <= Math.max(0.02 * Math.abs(v), 0.15);

export function score(text: string, e: Expected): { verdict: Verdict; passed: number; total: number; missing: string[] } {
  const t = text.toLowerCase();
  const nums = numbersIn(text);
  const missing: string[] = [];
  let passed = 0, total = 0;
  for (const n of e.names ?? []) (total++, t.includes(n.toLowerCase()) ? passed++ : missing.push(n));
  for (const v of e.numbers ?? []) (total++, nums.some((x) => close(x, v)) ? passed++ : missing.push(String(v)));
  if (e.anyWords) (total++, e.anyWords.some((w) => new RegExp(`\\b${w}\\b`).test(t)) ? passed++ : missing.push(e.anyWords.join("/")));
  const verdict: Verdict = total === 0 || passed === total ? "correct" : passed / total >= 0.5 ? "partial" : "wrong";
  return { verdict, passed, total, missing };
}
