import assert from "node:assert/strict";
import test from "node:test";
import { createMotionCueTracker } from "./motionCues.js";

test("screen motion emits one roll cue and one arrival cue per trip", () => {
  const cues = [];
  const tracker = createMotionCueTracker((cue) => cues.push(cue));
  tracker.start();
  tracker.start();
  tracker.stop();
  tracker.stop();
  assert.deepEqual(cues, ["roll", "arrive"]);
});

test("reset stops disposal from pretending a trip arrived", () => {
  const cues = [];
  const tracker = createMotionCueTracker((cue) => cues.push(cue));
  tracker.start();
  tracker.reset();
  tracker.stop();
  assert.deepEqual(cues, ["roll"]);
});
