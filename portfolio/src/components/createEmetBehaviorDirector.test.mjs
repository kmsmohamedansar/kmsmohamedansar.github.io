import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmetBehaviorDirector,
  pickReadingContext,
  visibleFraction,
} from "./createEmetBehaviorDirector.js";

test("visibleFraction measures the portion visible in the viewport", () => {
  assert.equal(visibleFraction({ top: 100, bottom: 500, height: 400 }, 800), 1);
  assert.equal(visibleFraction({ top: -200, bottom: 200, height: 400 }, 800), 0.5);
  assert.equal(visibleFraction({ top: 900, bottom: 1100, height: 200 }, 800), 0);
});

test("pickReadingContext prefers the most visible section", () => {
  const elements = new Map([
    ["#projects", { getBoundingClientRect: () => ({ top: -300, bottom: 300, height: 600 }) }],
    ["#about", { getBoundingClientRect: () => ({ top: 300, bottom: 780, height: 480 }) }],
  ]);
  global.document = { querySelector: (selector) => elements.get(selector) || null };

  const context = pickReadingContext([
    { id: "projects", selector: "#projects" },
    { id: "about", selector: "#about" },
  ], 800);

  assert.equal(context.id, "about");
});

test("the director waits for calm dwell, offers once, and retreats on activity", () => {
  let timestamp = 0;
  let tick;
  let offer;
  let retreats = 0;
  const listeners = new Map();
  const storage = new Map();
  const section = { getBoundingClientRect: () => ({ top: 0, bottom: 800, height: 800 }) };

  global.Element = class Element {};
  global.document = {
    activeElement: null,
    hidden: false,
    querySelector: (selector) => selector === "#projects" ? section : null,
    addEventListener: (name, listener) => listeners.set(`document:${name}`, listener),
    removeEventListener: () => {},
  };
  global.window = {
    innerHeight: 800,
    innerWidth: 1200,
    getSelection: () => ({ isCollapsed: true, toString: () => "" }),
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    addEventListener: (name, listener) => listeners.set(`window:${name}`, listener),
    removeEventListener: () => {},
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => {},
  };

  const director = createEmetBehaviorDirector({
    getRoute: () => "main",
    canOffer: () => true,
    onOffer: (value) => { offer = value; },
    onRetreat: () => { retreats += 1; },
    random: () => 0,
    now: () => timestamp,
  });

  tick();
  timestamp = 8499;
  tick();
  assert.equal(offer, undefined);

  timestamp = 8501;
  tick();
  assert.equal(offer.id, "projects");
  assert.match(offer.message, /short version/i);

  timestamp = 9000;
  listeners.get("window:scroll")({ target: null });
  assert.equal(retreats, 1);

  timestamp = 100000;
  tick();
  assert.equal(offer.id, "projects");
  assert.equal(retreats, 1);
  director.dispose();
});
