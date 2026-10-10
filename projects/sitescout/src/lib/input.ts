// Turn what the user typed into a list of pages to visit.
// Accepts Yahoo Finance quote links and bare tickers, separated by
// commas, spaces or new lines.

export interface Target {
  input: string;
  symbol: string;
  url: string;
}

export interface ParsedInput {
  targets: Target[];
  rejected: { input: string; reason: string }[];
}

const TICKER = /^\^?[A-Z0-9][A-Z0-9.\-^=]{0,14}$/;

export function quoteUrl(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`;
}

export function parseInput(text: string): ParsedInput {
  const parts = text.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
  const targets: Target[] = [];
  const rejected: ParsedInput["rejected"] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    let symbol: string | null = null;

    if (/^https?:\/\//i.test(part)) {
      try {
        const u = new URL(part);
        const m = u.pathname.match(/^\/quote\/([^/]+)/);
        if (/(^|\.)finance\.yahoo\.com$/.test(u.hostname) && m) {
          symbol = decodeURIComponent(m[1]).toUpperCase();
        } else {
          rejected.push({ input: part, reason: "Only Yahoo Finance quote links for now" });
          continue;
        }
      } catch {
        rejected.push({ input: part, reason: "Not a valid link" });
        continue;
      }
    } else if (TICKER.test(part.toUpperCase())) {
      symbol = part.toUpperCase();
    } else {
      rejected.push({ input: part, reason: "Not a ticker or a link" });
      continue;
    }

    if (seen.has(symbol)) continue;
    seen.add(symbol);
    targets.push({ input: part, symbol, url: quoteUrl(symbol) });
  }

  return { targets, rejected };
}
