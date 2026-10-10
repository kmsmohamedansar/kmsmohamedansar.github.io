import { toCsv } from "../src/lib/csv";
import type { ExtractResult } from "../src/recipes/types";

const result = (ok: boolean): ExtractResult => ({
  recipeId: "r",
  url: "https://finance.yahoo.com/quote/EXMP/",
  ok,
  missing: ok ? [] : ["Price"],
  fields: [
    { key: "name", label: "Company", raw: "Ex, \"Corp\"", value: 'Ex, "Corp"', via: "h1", required: true },
    { key: "price", label: "Price", raw: "1.5", value: ok ? 1.5 : null, via: null, required: true },
  ],
});

it("writes a header, escapes quotes and commas, and marks failures", () => {
  const csv = toCsv([{ symbol: "EXMP", result: result(true) }, { symbol: "BAD", result: result(false) }]);
  expect(csv.split("\n")).toEqual([
    "symbol,name,price,status,url",
    'EXMP,"Ex, ""Corp""",1.5,ok,https://finance.yahoo.com/quote/EXMP/',
    'BAD,"Ex, ""Corp""",,missing: Price,https://finance.yahoo.com/quote/EXMP/',
  ]);
});
