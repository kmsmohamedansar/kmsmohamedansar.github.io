import assert from "node:assert/strict";
import test from "node:test";
import { shouldObserveCompanionInput } from "./companionMotion.js";

test("watch, tap and scroll reactions stay off for reduced motion", () => {
  assert.equal(shouldObserveCompanionInput({ dismissed: false, reducedMotion: true, routeHidden: false, started: true }), false);
  assert.equal(shouldObserveCompanionInput({ dismissed: false, reducedMotion: false, routeHidden: false, started: true }), true);
});

test("hidden, dismissed and not-yet-started companions do not observe input", () => {
  assert.equal(shouldObserveCompanionInput({ dismissed: true, reducedMotion: false, routeHidden: false, started: true }), false);
  assert.equal(shouldObserveCompanionInput({ dismissed: false, reducedMotion: false, routeHidden: true, started: true }), false);
  assert.equal(shouldObserveCompanionInput({ dismissed: false, reducedMotion: false, routeHidden: false, started: false }), false);
});
