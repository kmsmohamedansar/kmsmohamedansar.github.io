import type { Recipe } from "./types";

// Yahoo Finance quote page, for example https://finance.yahoo.com/quote/AAPL/
// Selectors were written against Yahoo's public markup as of late 2026.
// Yahoo changes its pages often; when this breaks, the run reports which
// fields failed instead of returning empty rows.

const stats = (key: string, label: string, text: string[], parse: "text" | "number" | "compact" | "percent") => ({
  key,
  label,
  parse,
  byLabel: {
    container: '[data-testid="quote-statistics"]',
    row: "li",
    label: ".label",
    value: ".value",
    text,
  },
});

export const yahooFinanceQuote: Recipe = {
  id: "yahoo-finance-quote",
  name: "Yahoo Finance quote",
  matches: "^https://(?:[a-z]+\\.)?finance\\.yahoo\\.com/quote/[^/?#]+",
  waitFor: '[data-testid="qsp-price"], fin-streamer[data-field="regularMarketPrice"]',
  fields: [
    {
      key: "name",
      label: "Company",
      selectors: ['[data-testid="quote-hdr"] h1', "section h1", "h1"],
      parse: "text",
      required: true,
    },
    {
      key: "price",
      label: "Price",
      selectors: ['[data-testid="qsp-price"]', 'fin-streamer[data-field="regularMarketPrice"]'],
      parse: "number",
      required: true,
    },
    {
      key: "change",
      label: "Change",
      selectors: ['[data-testid="qsp-price-change"]', 'fin-streamer[data-field="regularMarketChange"]'],
      parse: "number",
    },
    {
      key: "changePct",
      label: "Change %",
      selectors: ['[data-testid="qsp-price-change-percent"]', 'fin-streamer[data-field="regularMarketChangePercent"]'],
      parse: "percent",
    },
    stats("prevClose", "Previous close", ["Previous Close"], "number"),
    stats("open", "Open", ["Open"], "number"),
    stats("dayRange", "Day's range", ["Day's Range"], "text"),
    stats("yearRange", "52 week range", ["52 Week Range"], "text"),
    stats("volume", "Volume", ["Volume"], "compact"),
    stats("avgVolume", "Avg. volume", ["Avg. Volume"], "compact"),
    stats("marketCap", "Market cap", ["Market Cap (intraday)", "Market Cap"], "compact"),
    stats("beta", "Beta (5Y)", ["Beta (5Y Monthly)"], "number"),
    stats("pe", "P/E (TTM)", ["PE Ratio (TTM)"], "number"),
    stats("eps", "EPS (TTM)", ["EPS (TTM)"], "number"),
    stats("earningsDate", "Earnings date", ["Earnings Date"], "text"),
    stats("dividend", "Dividend & yield", ["Forward Dividend & Yield"], "text"),
    stats("target", "1y target", ["1y Target Est"], "number"),
  ],
};

export const recipes: Recipe[] = [yahooFinanceQuote];

export function findRecipe(url: string): Recipe | undefined {
  return recipes.find((r) => new RegExp(r.matches).test(url));
}
