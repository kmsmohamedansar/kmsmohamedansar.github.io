import { describe, expect, it } from "vitest";
import { applyMap, MappingError, validateMapping } from "../src/connector/mapping.ts";
import { realMapping } from "./helpers.ts";

describe("mapping", () => {
  it("translates Harbourline's names into Maple & Main's", () => {
    const m = realMapping();
    const out = applyMap({ sku: "HB-1", name: "Oats", stock_level: 4, unit_price_cents: 1, updated_at: "x" }, m.product_to_item);
    expect(out).toEqual({ item_code: "HB-1", description: "Oats", qty: 4 });
  });

  it("names the missing field when a source field is renamed", () => {
    const m = realMapping();
    expect(() => applyMap({ sku: "HB-1", name: "Oats", stock_on_hand: 4 }, m.product_to_item)).toThrow(/"stock_level" is missing/);
  });

  it("refuses a mapping file that can't produce what Maple & Main needs", () => {
    expect(() => validateMapping({ product_to_item: { sku: "item_code" }, order_line_to_harbourline: {} })).toThrow(MappingError);
  });
});
