import { test } from "node:test";
import assert from "node:assert/strict";
import { getInsights, resolveCategory } from "../src/data.js";

test("resolveCategory matches case-insensitively", () => {
  assert.equal(resolveCategory("oat")[0]?.id, "cat-002");
});

test("resolveCategory returns nothing for an empty query", () => {
  assert.deepEqual(resolveCategory("  "), []);
});

test("getInsights respects limit and rejects unknown ids", () => {
  assert.equal(getInsights("cat-001", 2)?.length, 2);
  assert.equal(getInsights("nope", 2), null);
});
