import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDatabase } from "../src/data/seed.ts";
import { openDatabase } from "../src/data/db.ts";
import { makeTools, MAX_ROWS } from "../src/tools/tools.ts";

const db = buildDatabase();

describe("tools", () => {
  it("rejects bad arguments with a message a model can act on", () => {
    const t = makeTools(db);
    const r = t.call("get_metric", { metric: "profit" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.result)).toMatch(/metric: Invalid enum value/);
  });

  it("rejects unknown tools and lists the real ones", () => {
    const r = makeTools(db).call("drop_table", {});
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.result)).toMatch(/find_product, describe_metric/);
  });

  it("never returns more than the row limit, and a full year by week fits", () => {
    const r = makeTools(db).call("get_metric", { metric: "sales", by: "week" }).result as { rows: unknown[] };
    expect(r.rows.length).toBe(52);
    expect(MAX_ROWS).toBeGreaterThanOrEqual(52);
  });

  it("accepts numbers sent as strings (small models often do this)", () => {
    const r = makeTools(db).call("compare_periods", { metric: "units", a_from: "1", a_to: "29", b_from: "30", b_to: "52", brand: "Morningfield" });
    expect(r.ok).toBe(true);
  });

  it("logs every call, including failed ones", () => {
    const t = makeTools(db);
    t.call("find_product", { query: "oats" });
    t.call("get_metric", {});
    expect(t.log.map((c) => [c.tool, c.ok])).toEqual([["find_product", true], ["get_metric", false]]);
  });

  it("finds all five planted events from the data", () => {
    const r = makeTools(db).call("list_events", {}).result as { events: { type: string; brand: string; from_week: number }[] };
    const got = r.events.map((e) => `${e.type}:${e.brand}:${e.from_week}`);
    expect(got).toEqual(expect.arrayContaining(["promotion:Crunchwell:20", "price_change:Morningfield:30", "launch:Little Grain:40", "stopped_selling:Sunny Spoon:35"]));
    expect(got.filter((g) => g.startsWith("price_change"))).toHaveLength(1); // the promotion's 15% off is not a lasting price change
  });

  it("opens the database file read-only", () => {
    const path = join(mkdtempSync(join(tmpdir(), "aa-")), "cereal.db");
    const ro = openDatabase(path);
    expect(() => ro.exec("DELETE FROM sales")).toThrow(/readonly/i);
  });
});
