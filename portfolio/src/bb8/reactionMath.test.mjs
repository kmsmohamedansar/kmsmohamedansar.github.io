import assert from "node:assert/strict";
import test from "node:test";
import {
  SCROLL_TRIGGER_PX,
  WATCH_MAX_YAW,
  WATCH_RADIUS,
  scrollPose,
  watchPose,
  watchStrength,
} from "./reactionMath.js";

test("watchStrength falls off with distance and stops at the radius", () => {
  assert.equal(watchStrength(0), 1);
  assert.equal(watchStrength(WATCH_RADIUS), 0);
  assert.equal(watchStrength(WATCH_RADIUS + 200), 0);
  assert.ok(watchStrength(100) > watchStrength(300), "nearer means more attention");
  // Eased, so halfway out the droid is already much less interested.
  assert.ok(watchStrength(WATCH_RADIUS / 2) < 0.3);
});

test("watchPose turns towards the cursor and ignores distant ones", () => {
  assert.equal(watchPose(WATCH_RADIUS + 10, 0), null);

  const right = watchPose(200, 0);
  const left = watchPose(-200, 0);
  assert.ok(right.yaw > 0, "a cursor to the right turns the head right");
  assert.ok(left.yaw < 0);
  assert.ok(Math.abs(right.yaw + left.yaw) < 1e-9, "the turn is symmetrical");
  assert.ok(Math.abs(right.yaw) <= WATCH_MAX_YAW);
  // The head counter-rolls against the turn, as it does for the cursor
  // tracking already in the animator.
  assert.ok(right.roll < 0 && left.roll > 0);
});

test("watchPose looks down for a cursor below and up for one above", () => {
  assert.ok(watchPose(0, 220).pitch > 0);
  assert.ok(watchPose(0, -220).pitch < 0);
});

test("watchPose stays within its limits even at point blank", () => {
  const pose = watchPose(WATCH_RADIUS - 1, WATCH_RADIUS - 1);
  assert.ok(pose === null || Math.abs(pose.yaw) <= WATCH_MAX_YAW);
  const close = watchPose(5, 5);
  assert.ok(Math.abs(close.yaw) <= WATCH_MAX_YAW);
  assert.ok(Math.abs(close.roll) <= 0.1);
});

test("scrollPose braces one way and recovers", () => {
  assert.ok(Math.abs(scrollPose(300, 0).pitch) < 1e-12, "flat at the very start");
  assert.equal(scrollPose(300, 1), null, "and gone once it is over");
  assert.equal(scrollPose(300, 1.5), null);

  const down = scrollPose(300, 0.5);
  const up = scrollPose(-300, 0.5);
  assert.ok(down.pitch < 0, "scrolling down pitches one way");
  assert.ok(up.pitch > 0, "scrolling up pitches the other");
  assert.ok(Math.abs(down.pitch + up.pitch) < 1e-9);

  // Strongest in the middle of the reaction, fading at both ends.
  assert.ok(Math.abs(scrollPose(300, 0.5).pitch) > Math.abs(scrollPose(300, 0.92).pitch));
});

test("scrollPose intensity grows with the scroll but is bounded", () => {
  const gentle = Math.abs(scrollPose(SCROLL_TRIGGER_PX + 1, 0.5).pitch);
  const hard = Math.abs(scrollPose(3000, 0.5).pitch);
  assert.ok(hard > gentle);
  assert.ok(hard <= 0.12 + 1e-9, "never beyond the full-intensity pose");
  assert.ok(gentle > 0, "even a small scroll registers");
});
