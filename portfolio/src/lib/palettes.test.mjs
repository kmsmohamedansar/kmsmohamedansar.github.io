import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTES, contrast, paletteForRoute, pickPalette } from "./palettes.js";

test("the contact palette keeps large ink type legible on its accent button", () => {
  assert.ok(contrast(PALETTES.slow.ink, PALETTES.slow.accent) >= 3);
});

for (const [name, p] of Object.entries(PALETTES)) {
  test(`${name}: text pairs stay readable`, () => {
    // Body copy runs as small as .5rem in mono, so hold every text pair to AA.
    assert.ok(contrast(p.ink, p.paper) >= 4.5, `ink on paper ${contrast(p.ink, p.paper).toFixed(2)}`);
    assert.ok(contrast(p.accentInk, p.paper) >= 4.5, `accentInk on paper ${contrast(p.accentInk, p.paper).toFixed(2)}`);
    assert.ok(contrast(p.onDark, p.ink) >= 4.5, `onDark on ink ${contrast(p.onDark, p.ink).toFixed(2)}`);
    // Start-here cards invert to paper on accentInk when hovered.
    assert.ok(contrast(p.paper, p.accentInk) >= 4.5, `paper on accentInk ${contrast(p.paper, p.accentInk).toFixed(2)}`);
    // Accent fills must read as shapes against one of the two surfaces.
    assert.ok(Math.max(contrast(p.accent, p.paper), contrast(p.accent, p.ink)) >= 3, "accent disappears");
  });
}

const el = (palette, top, bottom) => ({ dataset: { palette }, getBoundingClientRect: () => ({ top, bottom }) });

test("a palette holds until the next tagged element reaches the line", () => {
  const section = el("bloom", -500, 3000);
  const block = el("lumora", 200, 900);
  const next = el("neon", 3000, 4000);
  assert.equal(pickPalette([section, block, next], 100), "bloom");
  assert.equal(pickPalette([section, block, next], 400), "lumora");
  // Past the block but still inside its section: no hand-back to bloom.
  assert.equal(pickPalette([section, block, next], 1000), "lumora");
  assert.equal(pickPalette([section, block, next], 3100), "neon");
});

test("above the first tagged element, and for unknown names, the opening palette applies", () => {
  assert.equal(pickPalette([el("bloom", 600, 900)], 400), "lumen");
  assert.equal(pickPalette([el("nope", 0, 900)], 400), "lumen");
});

test("project pages use the palette of the section that lists them", () => {
  const openSource = new Set(["jev"]);
  assert.equal(paletteForRoute("project/jev", openSource), "lumora");
  assert.equal(paletteForRoute("project/jarvis", openSource), "bloom");
  assert.equal(paletteForRoute("work", openSource), "bloom");
  assert.equal(paletteForRoute("main", openSource), null);
  assert.equal(paletteForRoute("emet", openSource), null);
});
