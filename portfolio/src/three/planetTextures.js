// Procedural surface textures for the solar-system backdrop's planets.
// There's no network access in this environment to fetch real NASA/USGS
// texture maps, so "photoreal" isn't on the table — this is the other
// lever: canvas-drawn color + bump maps per planet, generated once at
// mount and applied through the same MeshStandardMaterial/bumpMap
// pipeline real texture maps would use, so swapping in real images
// later (if this ever gets real assets) is a one-line change per
// planet, not a rewrite.

const TAU = Math.PI * 2;

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Wraps horizontally: anything drawn near the right edge is echoed near
// the left (and vice versa) so the seam where a SphereGeometry's UV
// wraps from u=1 back to u=0 doesn't show a visible hard edge.
function drawWrapped(ctx, width, height, x, y, r, draw) {
  draw(ctx, x, y, r);
  if (x < r) draw(ctx, x + width, y, r);
  if (x > width - r) draw(ctx, x - width, y, r);
}

/**
 * Rocky/cratered planets (Mercury, Mars — and Venus's cloud deck reuses
 * the same blob machinery with different color logic). Base color with
 * latitude-darkened poles, scattered soft craters, and a handful of
 * larger tonal "continent" patches so the sphere doesn't read as a flat
 * tint even before lighting is applied.
 */
export function makeRockyTexture({ base, dark, light, poleShadow = 0.35, craterCount = 220, patchCount = 5, seed = 1 }) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // A handful of large soft patches first (broad terrain variation),
  // then many small craters on top (fine detail) — same "big shapes
  // before detail" order a real terrain texture would use.
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < patchCount; i++) {
    const x = rand() * width;
    const y = height * 0.15 + rand() * height * 0.7;
    const r = 60 + rand() * 140;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      const tone = rand() > 0.5 ? light : dark;
      g.addColorStop(0, tone);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = 0.18;
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  for (let i = 0; i < craterCount; i++) {
    const x = rand() * width;
    const y = height * 0.08 + rand() * height * 0.84;
    const r = 3 + rand() * 16;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      const g = c.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
      g.addColorStop(0, light);
      g.addColorStop(0.45, base);
      g.addColorStop(1, dark);
      c.globalAlpha = 0.5 + rand() * 0.3;
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  // Pole darkening — a vertical gradient overlay, not baked into the
  // craters above, so it reads consistently regardless of how the
  // random draws landed.
  const poleGrad = ctx.createLinearGradient(0, 0, 0, height);
  poleGrad.addColorStop(0, `rgba(0,0,0,${poleShadow})`);
  poleGrad.addColorStop(0.18, "rgba(0,0,0,0)");
  poleGrad.addColorStop(0.82, "rgba(0,0,0,0)");
  poleGrad.addColorStop(1, `rgba(0,0,0,${poleShadow})`);
  ctx.fillStyle = poleGrad;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

// A grayscale height map from the same crater layout logic, used as a
// bumpMap so the craters read as actual relief under the sun light
// instead of only a flat color variation.
export function makeBumpTexture({ craterCount = 220, seed = 1 }) {
  const width = 512;
  const height = 256;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, width, height);

  let s = seed + 7;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < craterCount; i++) {
    const x = rand() * width;
    const y = height * 0.08 + rand() * height * 0.84;
    const r = 2 + rand() * 9;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, "#3a3a3a");
      g.addColorStop(0.6, "#808080");
      g.addColorStop(1, "#c8c8c8");
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
    });
  }
  return canvas;
}

/**
 * Banded gas/ice giants (Jupiter, Saturn, Uranus, Neptune). Horizontal
 * bands at varying widths with a sine-perturbed wobble so the seams
 * read as turbulent flow rather than ruled lines, plus a few soft
 * storm-spot blobs on the wider bands.
 */
export function makeBandedTexture({ colors, spots = 2, seed = 1 }) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let s = seed + 3;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const bandCount = colors.length;
  const bandHeight = height / bandCount;
  for (let b = 0; b < bandCount; b++) {
    const yBase = b * bandHeight;
    const wobbleAmp = 4 + rand() * 10;
    const wobbleFreq = 1 + rand() * 3;
    const phase = rand() * TAU;
    ctx.fillStyle = colors[b];
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= width; x += 8) {
      const y = yBase + Math.sin((x / width) * TAU * wobbleFreq + phase) * wobbleAmp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, yBase + bandHeight);
    ctx.lineTo(0, yBase + bandHeight);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < spots; i++) {
    const x = rand() * width;
    const y = height * 0.2 + rand() * height * 0.6;
    const rx = 30 + rand() * 60;
    const ry = rx * (0.55 + rand() * 0.25);
    drawWrapped(ctx, width, height, x, y, rx, (c, px) => {
      const g = c.createRadialGradient(px, y, 0, px, y, rx);
      const tone = colors[Math.floor(rand() * colors.length)];
      g.addColorStop(0, tone);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = 0.5;
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(px, y, rx, ry, 0, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  return canvas;
}

/**
 * Earth's color map: ocean base, soft continent masses (not
 * geographically accurate — this is stylized, same spirit as the rest
 * of the scene's compressed/fictional scale), and a faint desert tint.
 * The cloud layer is a separate alpha-only texture so it can sit on
 * its own slightly-larger sphere and rotate at a different rate.
 */
export function makeEarthTexture(seed = 11) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, "#0a2f6b");
  ocean.addColorStop(0.5, "#0f3f82");
  ocean.addColorStop(1, "#0a2f6b");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const continents = ["#2f6b3a", "#3c7a44", "#5a8f4f"];
  for (let i = 0; i < 16; i++) {
    const x = rand() * width;
    const y = height * 0.12 + rand() * height * 0.76;
    const r = 40 + rand() * 130;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      c.fillStyle = continents[i % continents.length];
      c.globalAlpha = 0.85;
      c.beginPath();
      c.ellipse(px, py, pr, pr * (0.6 + rand() * 0.3), rand() * TAU, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  // Desert band tint
  for (let i = 0; i < 5; i++) {
    const x = rand() * width;
    const y = height * 0.4 + rand() * height * 0.2;
    const r = 40 + rand() * 70;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, "#c9b26b");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = 0.45;
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
  }

  // Polar caps
  const poles = ctx.createLinearGradient(0, 0, 0, height);
  poles.addColorStop(0, "rgba(240,248,255,0.9)");
  poles.addColorStop(0.06, "rgba(240,248,255,0)");
  poles.addColorStop(0.94, "rgba(240,248,255,0)");
  poles.addColorStop(1, "rgba(240,248,255,0.9)");
  ctx.fillStyle = poles;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

export function makeEarthCloudTexture(seed = 21) {
  const width = 1024;
  const height = 512;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 46; i++) {
    const x = rand() * width;
    const y = height * 0.1 + rand() * height * 0.8;
    const r = 20 + rand() * 55;
    drawWrapped(ctx, width, height, x, y, r, (c, px, py, pr) => {
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, pr, 0, TAU);
      c.fill();
    });
  }
  return canvas;
}

/**
 * Saturn's ring: a 1D radial gradient (mapped along U by the ring
 * geometry's remapped UVs in SolarSystemBackground) with a visible
 * Cassini-division-style gap instead of a single smooth fade, so it
 * reads as banded ring structure rather than a plain halo.
 */
export function makeRingTexture() {
  const width = 512;
  const height = 4;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "rgba(212,189,131,0)");
  grad.addColorStop(0.12, "rgba(212,189,131,0.55)");
  grad.addColorStop(0.32, "rgba(226,205,155,0.75)");
  grad.addColorStop(0.5, "rgba(190,167,112,0.3)");
  grad.addColorStop(0.56, "rgba(190,167,112,0.05)");
  grad.addColorStop(0.62, "rgba(226,205,155,0.7)");
  grad.addColorStop(0.85, "rgba(212,189,131,0.5)");
  grad.addColorStop(1, "rgba(212,189,131,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}
