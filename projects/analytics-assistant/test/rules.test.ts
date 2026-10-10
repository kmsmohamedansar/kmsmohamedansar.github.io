import { describe, expect, it } from "vitest";
import { buildDatabase } from "../src/data/seed.ts";
import { makeTools } from "../src/tools/tools.ts";
import { askRules, parse } from "../src/brains/rules.ts";

const db = buildDatabase();
const ask = (q: string) => askRules(q, makeTools(db));

describe("brain A (rules)", () => {
  it("reads quarters, regions and brands", () => {
    const p = parse("Fernhill share in the West, Q1 vs Q4", makeTools(db));
    expect(p).toMatchObject({ brand: "Fernhill", region: "West", metric: "share", intent: "compare" });
    expect(p.periods.map((x) => [x.from, x.to])).toEqual([[1, 13], [40, 52]]);
  });

  it("uses the events tool for 'after its price rise'", async () => {
    const a = await ask("Did Morningfield lose share after its price rise?");
    expect(a.calls.map((c) => c.tool)).toEqual(["list_events", "compare_periods"]);
    expect(a.text).toMatch(/^Yes\./);
  });

  it("says so when it can't parse a question, instead of guessing", async () => {
    const a = await ask("tell me a joke");
    expect(a.text).toMatch(/couldn't work out/);
    expect(a.calls).toHaveLength(0);
  });

  it("returns a chart for ranked answers", async () => {
    const a = await ask("Which brand had the highest share of sales?");
    expect(a.chart?.kind).toBe("bar");
    expect(a.chart?.rows[0].key).toBe("Crunchwell");
  });
});
