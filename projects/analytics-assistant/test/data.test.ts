import { describe, expect, it } from "vitest";
import { buildDatabase, PLANTED } from "../src/data/seed.ts";
import { computeMetric } from "../src/data/metrics.ts";

const db = buildDatabase();
const YEAR = { from: 1, to: 52 };

describe("the made-up dataset", () => {
  it("is the same every time it is built", () => {
    const a = buildDatabase().prepare("SELECT SUM(revenue) AS r, SUM(units) AS u FROM sales").get();
    const b = buildDatabase().prepare("SELECT SUM(revenue) AS r, SUM(units) AS u FROM sales").get();
    expect(a).toEqual(b);
  });

  it("has the planted Crunchwell promotion in weeks 20 to 23 only", () => {
    const weeks = db.prepare("SELECT DISTINCT week FROM sales WHERE on_promo = 1 ORDER BY week").all().map((r: any) => r.week);
    expect(weeks).toEqual([20, 21, 22, 23]);
  });

  it("has Honey Rings missing from the West from week 35", () => {
    const r = db.prepare("SELECT MAX(week) AS w FROM sales WHERE sku = 'SS-01' AND region = 'West'").get() as { w: number };
    expect(r.w).toBe(PLANTED.honeyRingsWest.week - 1);
  });

  it("has no Little Grain sales before week 40", () => {
    const r = db.prepare("SELECT MIN(s.week) AS w FROM sales s JOIN products p USING (sku) WHERE p.brand = 'Little Grain'").get() as { w: number };
    expect(r.w).toBe(40);
  });
});

describe("metric definitions", () => {
  it("brand shares add up to 100%", () => {
    const total = computeMetric(db, "share", {}, YEAR, "brand").reduce((s, r) => s + (r.value ?? 0), 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("share of a subcategory is measured against the whole category, not itself", () => {
    const kids = computeMetric(db, "share", { subcategory: "Kids" }, YEAR)[0].value!;
    expect(kids).toBeGreaterThan(20);
    expect(kids).toBeLessThan(50);
  });

  it("promo lift is only defined for a brand that had a promotion", () => {
    const rows = Object.fromEntries(computeMetric(db, "promo_lift", {}, YEAR, "brand").map((r) => [r.key, r.value]));
    expect(rows.Crunchwell).toBeGreaterThan(100);
    expect(rows.Morningfield).toBeNull();
  });

  it("Morningfield's units drop about 18% after its week 30 price rise", () => {
    const before = computeMetric(db, "units", { brand: "Morningfield" }, { from: 1, to: 29 })[0].value! / 29;
    const after = computeMetric(db, "units", { brand: "Morningfield" }, { from: 30, to: 52 })[0].value! / 23;
    expect(after / before - 1).toBeCloseTo(-0.18, 1);
  });
});
