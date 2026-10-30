import assert from "node:assert/strict";
import test from "node:test";
import {
  arcAmplitude,
  arcPoint,
  contentPenaltyFor,
  createBB8Roaming,
  pickWaypointFor,
  settleOffset,
  travelVelocity,
} from "./createBB8Roaming.js";

const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: expected about ${expected}, got ${actual}`);

test("travelVelocity builds up speed instead of starting at full tilt", () => {
  const cruise = 240;
  let velocity = 0;
  const speeds = [];
  for (let frame = 0; frame < 4; frame += 1) {
    velocity = travelVelocity(velocity, 1000, cruise, 1 / 60);
    speeds.push(velocity);
  }
  assert.ok(speeds[0] > 0 && speeds[0] < cruise, "first frame is already moving but not at cruise");
  for (let i = 1; i < speeds.length; i += 1) assert.ok(speeds[i] > speeds[i - 1], "speed keeps rising");
  assert.ok(speeds[speeds.length - 1] <= cruise);
});

test("travelVelocity never exceeds what the remaining distance can brake away", () => {
  // Travelling fast with almost nowhere left to go: the next frame must slow.
  const slowed = travelVelocity(240, 4, 240, 1 / 60);
  assert.ok(slowed < 240, `expected braking, got ${slowed}`);
  assert.equal(travelVelocity(10, 0, 240, 1 / 60), 0);
});

test("travelVelocity reaches and holds the cruising speed", () => {
  let velocity = 0;
  for (let frame = 0; frame < 120; frame += 1) velocity = travelVelocity(velocity, 100000, 200, 1 / 60);
  assert.equal(velocity, 200);
});

test("arcPoint bows away from the straight line and meets it at both ends", () => {
  const origin = { x: 0, y: 0 };
  const target = { x: 100, y: 0 };
  const start = arcPoint(origin, target, 20, 0);
  near(start.x, 0, "start x");
  near(start.y, 0, "start y");
  const end = arcPoint(origin, target, 20, 1);
  near(end.x, 100, "end x");
  near(end.y, 0, "end y");

  const middle = arcPoint(origin, target, 20, 0.5);
  assert.equal(Math.round(middle.x), 50);
  assert.equal(Math.round(middle.y), 20);

  const other = arcPoint(origin, target, -20, 0.5);
  assert.equal(Math.round(other.y), -20);
});

test("arcPoint falls back to the straight line without an amplitude", () => {
  const straight = arcPoint({ x: 0, y: 0 }, { x: 40, y: 40 }, 0, 0.5);
  near(straight.x, 20, "straight x");
  near(straight.y, 20, "straight y");
  // A path of no length cannot have a direction to bow away from.
  assert.deepEqual(arcPoint({ x: 7, y: 7 }, { x: 7, y: 7 }, 30, 0.5), { x: 7, y: 7 });
});

test("arcAmplitude scales with the trip and stays capped", () => {
  assert.ok(Math.abs(arcAmplitude(100, 1) - 14) < 1e-9);
  assert.ok(Math.abs(arcAmplitude(100, -1) + 14) < 1e-9);
  assert.equal(arcAmplitude(10000, 1), 90, "a long trip is still only gently bowed");
});

test("settleOffset rocks and dies away", () => {
  assert.equal(settleOffset(0), 0);
  assert.equal(settleOffset(1), 0);
  assert.equal(settleOffset(1.4), 0);
  const early = Math.abs(settleOffset(0.17));
  const late = Math.abs(settleOffset(0.84));
  assert.ok(early > late, `the rock should shrink: ${early} then ${late}`);
  assert.ok(early > 0.5, "the first rock is visible");
});

test("contentPenaltyFor rejects a waypoint covering readable DOM", () => {
  const heading = {
    getBoundingClientRect: () => ({ left: 20, right: 280, top: 80, bottom: 220, width: 260, height: 140 }),
    matches: (selector) => selector.includes("h1"),
    closest: () => null,
  };
  const element = { contains: () => false };
  const documentRef = {
    querySelectorAll: (selector) => selector === "canvas" ? [] : [heading],
    elementsFromPoint: () => [],
  };
  const bounds = { width: 180, height: 220 };

  assert.ok(contentPenaltyFor({ x: 40, y: 70 }, bounds, element, { documentRef, viewportWidth: 800, viewportHeight: 600 }) >= 4);
  assert.equal(contentPenaltyFor({ x: 580, y: 340 }, bounds, element, { documentRef, viewportWidth: 800, viewportHeight: 600 }), 0);
});

test("pickWaypointFor chooses the safe lane and keeps phones on the bottom", () => {
  const bounds = { width: 180, height: 220, maxX: 286, maxY: 376 };
  const picked = pickWaypointFor(
    bounds,
    { x: 14, y: 376 },
    (candidate) => candidate.x < 200 ? 3 : 0,
    { random: () => 0, viewportWidth: 480, viewportHeight: 600 },
  );
  assert.deepEqual(picked, { x: 286, y: 376 });
});

test("pickWaypointFor waits in the clearer bottom corner when nowhere is safe", () => {
  const bounds = { width: 120, height: 160, maxX: 666, maxY: 436 };
  const picked = pickWaypointFor(
    bounds,
    { x: 14, y: 436 },
    (candidate) => (candidate.x === 666 && candidate.y === 436 ? 1 : 5),
    { random: () => 0.5, viewportWidth: 800, viewportHeight: 600 },
  );
  assert.deepEqual(picked, { x: 666, y: 436 });
});

test("contentPenaltyFor counts the speech bubble beside the droid", () => {
  const copy = {
    getBoundingClientRect: () => ({ left: 380, right: 470, top: 300, bottom: 340, width: 90, height: 40 }),
    matches: () => false,
  };
  const element = { contains: () => false };
  const documentRef = {
    querySelectorAll: (selector) => (selector === "canvas" ? [] : [copy]),
    elementsFromPoint: () => [],
  };
  const bounds = { width: 120, height: 160 };
  const options = { documentRef, viewportWidth: 800, viewportHeight: 600 };
  assert.equal(contentPenaltyFor({ x: 480, y: 260 }, bounds, element, options), 0);
  assert.ok(contentPenaltyFor({ x: 480, y: 260 }, bounds, element, { ...options, bubbleWidth: 160 }) > 0);
});

test("reduced motion starts parked and schedules no roaming frames", () => {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousRequestAnimationFrame = global.requestAnimationFrame;
  const previousCancelAnimationFrame = global.cancelAnimationFrame;
  let frames = 0;
  const listeners = new Map();
  global.window = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: (name, callback) => listeners.set(`window:${name}`, callback),
    removeEventListener: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
  };
  global.document = {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(`document:${name}`, callback),
    removeEventListener: () => {},
    querySelectorAll: () => [],
    elementsFromPoint: () => [],
  };
  global.requestAnimationFrame = () => { frames += 1; return frames; };
  global.cancelAnimationFrame = () => {};
  const style = {
    transform: "",
    removeProperty(name) { if (name === "transform") this.transform = ""; },
  };
  const element = {
    offsetWidth: 180,
    offsetHeight: 220,
    style,
    classList: { toggle: () => {}, remove: () => {} },
    contains: () => false,
  };

  const roaming = createBB8Roaming(element, { reducedMotion: true });
  assert.equal(style.transform, "translate3d(606.00px, 376.00px, 0)");
  assert.equal(frames, 0);
  roaming.dispose();

  global.window = previousWindow;
  global.document = previousDocument;
  global.requestAnimationFrame = previousRequestAnimationFrame;
  global.cancelAnimationFrame = previousCancelAnimationFrame;
});
