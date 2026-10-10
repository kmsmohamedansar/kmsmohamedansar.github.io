import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { extractWithRecipe } from "../src/scrape/extract";
import { findRecipe, yahooFinanceQuote } from "../src/recipes/yahooFinanceQuote";

const load = (name: string) =>
  new JSDOM(readFileSync(resolve(__dirname, "fixtures", name), "utf8")).window.document;

const URL_A = "https://finance.yahoo.com/quote/EXMP/";

describe("extractWithRecipe on the synthetic layout A page", () => {
  const res = extractWithRecipe(yahooFinanceQuote, load("quote-layout-a.html"), URL_A);
  const v = (k: string) => res.fields.find((f) => f.key === k)!.value;

  it("succeeds with nothing missing", () => {
    expect(res.ok).toBe(true);
    expect(res.missing).toEqual([]);
  });

  it("reads the headline numbers", () => {
    expect(v("name")).toBe("Example Corp (EXMP)");
    expect(v("price")).toBe(1234.56);
    expect(v("change")).toBe(-12.34);
    expect(v("changePct")).toBe(-0.99);
  });

  it("reads label/value statistics and expands K/M/B/T", () => {
    expect(v("prevClose")).toBe(1246.9);
    expect(v("volume")).toBe(5432100);
    expect(v("marketCap")).toBe(2.345e12);
    expect(v("pe")).toBe(31.5);
    expect(v("dayRange")).toBe("1,220.10 - 1,250.00");
    expect(v("dividend")).toBe("4.00 (0.32%)");
  });

  it("treats -- as empty, not zero", () => {
    expect(v("target")).toBeNull();
  });

  it("records how each value was found", () => {
    expect(res.fields.find((f) => f.key === "price")!.via).toBe('[data-testid="qsp-price"]');
    expect(res.fields.find((f) => f.key === "pe")!.via).toBe('label "pe ratio (ttm)"');
  });
});

describe("extractWithRecipe on the redesigned layout B page", () => {
  const res = extractWithRecipe(yahooFinanceQuote, load("quote-layout-b.html"), URL_A);

  it("fails loudly and names the broken fields", () => {
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("Price");
  });
});

describe("the function survives being sent into a page", () => {
  it("still works after a round trip through its source text", () => {
    // chrome.scripting.executeScript copies the function as text, so any
    // outside reference would break. Rebuild it from text to prove it.
    const rebuilt = new Function(`return (${extractWithRecipe.toString()})`)();
    const res = rebuilt(yahooFinanceQuote, load("quote-layout-a.html"), URL_A);
    expect(res.ok).toBe(true);
  });
});

describe("findRecipe", () => {
  it("matches quote links and ignores others", () => {
    expect(findRecipe("https://finance.yahoo.com/quote/AAPL/")?.id).toBe("yahoo-finance-quote");
    expect(findRecipe("https://uk.finance.yahoo.com/quote/BP.L/")?.id).toBe("yahoo-finance-quote");
    expect(findRecipe("https://news.yahoo.com/some-story")).toBeUndefined();
  });
});
