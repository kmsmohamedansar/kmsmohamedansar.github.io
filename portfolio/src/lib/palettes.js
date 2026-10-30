/* Each part of the home page has its own three-colour palette, and the
   whole page eases into it as that part reaches the middle of the screen.
   Sections opt in with data-palette="<name>"; anything above the first
   tagged element uses the opening palette, which is also what
   editorial.css declares on :root.

   paper     light surface, and text on dark sections
   ink       body text, and the dark sections' background
   accent    fills: bars, tabs, the contact button. Never small text.
   accentInk accent for text on paper (>= 4.5:1 against paper)
   onDark    accent for text on ink (>= 4.5:1 against ink) */
export const PALETTES = {
  // Opening: burnt orange, warm ivory, soft black.
  lumen: { paper: "#e6d5bd", ink: "#101010", accent: "#d5360c", accentInk: "#74200d", onDark: "#ff8a5f" },
  // 02 Things I've built: warm ivory, deep editorial blue, coral orange.
  bloom: { paper: "#eae6de", ink: "#1b4e76", accent: "#ef8557", accentInk: "#953812", onDark: "#ffc2a6" },
  // Test the claim: ink black, warm ivory, electric teal.
  lumora: { paper: "#e8e4d3", ink: "#031211", accent: "#00aebb", accentInk: "#00616a", onDark: "#00aebb" },
  // 03 What if I tried this?: jet black, cerulean blue, neon rose.
  neon: { paper: "#e9e7ee", ink: "#0a0a0a", accent: "#ff2d95", accentInk: "#b8005f", onDark: "#ff2d95" },
  // 04 The person: mocha brown, platinum, pale lavender.
  choreo: { paper: "#e6e0f0", ink: "#2e1f16", accent: "#6f4e37", accentInk: "#6f4e37", onDark: "#cdb8e8" },
  // 05 Experience: charcoal, earth brown, burnt amber.
  field: { paper: "#e9dfcf", ink: "#090907", accent: "#b99d73", accentInk: "#6c5636", onDark: "#b99d73" },
  // 06 Contact, the one dark ending: midnight navy, cobalt blue, bright red.
  blueBloom: { paper: "#e8ecf8", ink: "#021861", accent: "#de1110", accentInk: "#255dce", onDark: "#ff6b5e" },
};

export const DEFAULT_PALETTE = "lumen";

// CSS custom property for each palette key. --ed-blue and --ed-ivory are the
// site's original names for ink and paper; --ed-deep has always matched ink.
export const PALETTE_VARS = {
  paper: ["--ed-ivory"],
  ink: ["--ed-blue", "--ed-deep"],
  accent: ["--ed-coral"],
  accentInk: ["--ed-coral-ink"],
  onDark: ["--ed-on-dark"],
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// A palette holds from the moment its element's top passes the line until
// the next tagged element's does. So a tagged block inside a section (Test
// the claim inside Projects) carries on to the end of that section instead
// of handing back to the section's palette for a second change.
export function pickPalette(elements, lineY) {
  let name = DEFAULT_PALETTE;
  for (const el of elements) {
    if (el.getBoundingClientRect().top <= lineY && PALETTES[el.dataset.palette]) name = el.dataset.palette;
  }
  return name;
}

// Project pages take the palette of the home page section they are listed
// in: the open-source studies and tools sit under Test the claim.
export function paletteForRoute(route, openSourceSlugs) {
  if (route === "work") return "bloom";
  if (!route.startsWith("project/")) return null;
  return openSourceSlugs.has(route.slice("project/".length)) ? "lumora" : "bloom";
}

// The browser's own chrome (theme-color) follows the paper colour too.
function setThemeColor(root, color) {
  root.ownerDocument?.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

export function applyPalette(root, name) {
  const palette = PALETTES[name] || PALETTES[DEFAULT_PALETTE];
  for (const [key, vars] of Object.entries(PALETTE_VARS)) {
    for (const v of vars) root.style.setProperty(v, palette[key]);
  }
  setThemeColor(root, palette.paper);
}

export function clearPalette(root) {
  for (const vars of Object.values(PALETTE_VARS)) {
    for (const v of vars) root.style.removeProperty(v);
  }
  setThemeColor(root, PALETTES[DEFAULT_PALETTE].paper);
}
