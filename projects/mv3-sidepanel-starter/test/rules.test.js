import { test } from "node:test";
import assert from "node:assert/strict";
import { MOCK_CATALOGUE, evaluate, parseIds, toCsv } from "../rules.js";

test("parseIds splits, uppercases and de-duplicates", () => {
  assert.deepEqual(parseIds("a-1001, a-1001\nb-2001"), ["A-1001", "B-2001"]);
});

test("evaluate applies category and size rules", () => {
  assert.equal(evaluate("A-1001", MOCK_CATALOGUE["A-1001"]).in_scope, true);
  assert.equal(evaluate("A-1002", MOCK_CATALOGUE["A-1002"]).reason, "size over limit");
  assert.equal(evaluate("B-2001", MOCK_CATALOGUE["B-2001"]).in_scope, false);
  assert.equal(evaluate("X-9", undefined).reason, "unknown id");
});

test("toCsv escapes quotes", () => {
  assert.match(toCsv([{ id: 'a"b', in_scope: true, reason: "ok" }]), /"a""b",true,"ok"/);
});
