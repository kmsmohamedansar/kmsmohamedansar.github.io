import { parseInput } from "../src/lib/input";

describe("parseInput", () => {
  it("accepts tickers in any separator and dedupes", () => {
    const r = parseInput("aapl, MSFT\nnvda; AAPL");
    expect(r.targets.map((t) => t.symbol)).toEqual(["AAPL", "MSFT", "NVDA"]);
    expect(r.targets[0].url).toBe("https://finance.yahoo.com/quote/AAPL/");
  });

  it("pulls the ticker out of a quote link", () => {
    const r = parseInput("https://finance.yahoo.com/quote/TSLA/?p=TSLA");
    expect(r.targets[0].symbol).toBe("TSLA");
  });

  it("handles index and currency symbols", () => {
    const r = parseInput("^GSPC EURUSD=X BRK-B");
    expect(r.targets.map((t) => t.symbol)).toEqual(["^GSPC", "EURUSD=X", "BRK-B"]);
  });

  it("rejects other sites and junk with a reason", () => {
    const r = parseInput("https://example.com/quote/X hello!");
    expect(r.targets).toEqual([]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["Only Yahoo Finance quote links for now", "Not a ticker or a link"]);
  });
});
