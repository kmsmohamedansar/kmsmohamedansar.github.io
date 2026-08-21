import * as THREE from "three";

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.substring(0, 2), 16), parseInt(m.substring(2, 4), 16), parseInt(m.substring(4, 6), 16)];
}

// A per-destination line motif drawn behind the type — a second,
// wordless signal that these five cards aren't just recolored copies
// of one template.
function drawPattern(ctx, id, w, h) {
  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = 1;

  if (id === "emet") {
    // Terminal separators — thin horizontal rules, evenly spaced.
    for (let y = 48; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (id === "now") {
    // A live ping — concentric rings, like a status radar.
    const cx = w * 0.72;
    const cy = h * 0.28;
    for (let r = 40; r < w; r += 60) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === "before") {
    // A timeline — horizontal bands only, no verticals.
    for (let y = 90; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (id === "work") {
    // A lattice — crossed diagonals, structure being assembled.
    for (let x = -h; x < w; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + h, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  } else {
    // contact — signal lines radiating from the corner, reaching out.
    const ox = w + 40;
    const oy = h + 40;
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI + (i / 13) * (Math.PI / 2);
      const len = w * 1.4;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(angle) * len, oy + Math.sin(angle) * len);
      ctx.stroke();
    }
  }
}

// A drawn icon instead of a bare index number — "01/02/03" says
// nothing about what a card is, a small pulse/clock/rocket/envelope
// does. EMET keeps its terminal-prompt glyph, already a real symbol.
function drawMark(ctx, mark, accent) {
  const cx = 138;
  const cy = 300;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (mark === "terminal") {
    ctx.globalAlpha = 0.9;
    ctx.font = "700 170px 'JetBrains Mono', monospace";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(">_", 30, 390);
  } else if (mark === "pulse") {
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(72, cy);
    ctx.lineTo(102, cy - 75);
    ctx.lineTo(142, cy + 95);
    ctx.lineTo(178, cy - 35);
    ctx.lineTo(212, cy);
    ctx.lineTo(262, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(262, cy, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (mark === "clock") {
    const r = 96;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 15), cy + Math.sin(a) * (r - 15));
      ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
      ctx.stroke();
    }
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 56);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 42, cy + 18);
    ctx.stroke();
  } else if (mark === "rocket") {
    ctx.translate(cx - 8, cy + 6);
    ctx.rotate(-0.36);
    ctx.beginPath();
    ctx.moveTo(0, -112);
    ctx.quadraticCurveTo(46, -42, 46, 40);
    ctx.lineTo(46, 68);
    ctx.lineTo(-46, 68);
    ctx.lineTo(-46, 40);
    ctx.quadraticCurveTo(-46, -42, 0, -112);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-46, 38);
    ctx.lineTo(-88, 90);
    ctx.lineTo(-46, 74);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(46, 38);
    ctx.lineTo(88, 90);
    ctx.lineTo(46, 74);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(0, -12, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(-24, 68);
    ctx.lineTo(0, 118);
    ctx.lineTo(24, 68);
    ctx.closePath();
    ctx.fill();
  } else if (mark === "mail") {
    const x = 34;
    const y = 232;
    const ew = 208;
    const eh = 140;
    ctx.lineWidth = 9;
    ctx.strokeRect(x, y, ew, eh);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ew / 2, y + eh * 0.58);
    ctx.lineTo(x + ew, y);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The linear gradient behind everything runs diagonally from a
// lighter accent-tinted top-left to a near-black bottom-right; this
// mirrors that math for a single y so the image band's fade-out can
// end on a color that actually matches the backdrop at the seam,
// instead of a flat tone that shows a visible seam line.
function bgColorAtY(rgb, h, y) {
  const [r, g, b] = rgb;
  const t = Math.min(1, y / h);
  const c0 = [r * 0.1 + 10, g * 0.1 + 11, b * 0.12 + 15];
  const c1 = [r * 0.04 + 5, g * 0.04 + 6, b * 0.05 + 8];
  return c0.map((v, i) => Math.round(v + (c1[i] - v) * t));
}

// A picture instead of a drawn mark, for the four destinations that
// have a real image to show. "cover" crops full-bleed edge-to-edge —
// right for a piece of art, wrong for a wordmark (would slice off
// letters) — so a logo gets "contain" instead: the whole mark kept
// intact on its own soft tile, never cropped.
function drawImageBand(ctx, img, accent, fit, w, bandH, rgb, h) {
  if (fit === "cover") {
    const ir = img.width / img.height;
    const br = w / bandH;
    let sw, sh, sx, sy;
    if (ir > br) {
      sh = img.height;
      sw = sh * br;
      sy = 0;
      sx = (img.width - sw) / 2;
    } else {
      sw = img.width;
      sh = sw / br;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, bandH);

    const fadeH = 110;
    const seamColor = bgColorAtY(rgb, h, bandH);
    const fade = ctx.createLinearGradient(0, bandH - fadeH, 0, bandH);
    fade.addColorStop(0, `rgba(${seamColor.join(",")},0)`);
    fade.addColorStop(1, `rgba(${seamColor.join(",")},1)`);
    ctx.fillStyle = fade;
    ctx.fillRect(0, bandH - fadeH, w, fadeH);
  } else {
    const pad = 56;
    const boxX = pad;
    const boxY = 40;
    const boxW = w - pad * 2;
    const boxH = bandH - boxY - 24;
    ctx.save();
    roundRectPath(ctx, boxX, boxY, boxW, boxH, 22);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.restore();

    const ir = img.width / img.height;
    const br = boxW / boxH;
    let dw, dh;
    if (ir > br) {
      dw = boxW * 0.82;
      dh = dw / ir;
    } else {
      dh = boxH * 0.82;
      dw = dh * ir;
    }
    const dx = boxX + (boxW - dw) / 2;
    const dy = boxY + (boxH - dh) / 2;
    // Most real-world logo exports carry an opaque (often white) fill
    // rather than true alpha transparency, so drawn at its own square
    // corners it reads as a pasted screenshot. Clipping to a rounded
    // rect keeps the logo intact (still "contain", nothing cropped
    // off it) while making the tile look drawn on purpose.
    ctx.save();
    roundRectPath(ctx, dx, dy, dw, dh, 14);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bandH);
  ctx.lineTo(w, bandH);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

// Each nav card has no screenshot to show by default — it's a
// destination, not a project — so the face is a small typographic
// composition: a kicker, a drawn mark, and the destination's title.
// Four of the five now carry a real picture instead (a company logo,
// or — for EMET — a piece of art), passed in as an already-loaded
// image so this stays synchronous. Drawn on an offscreen canvas
// rather than a generic gradient placeholder, with the background
// gradient and line motif both tied to the card's own accent color so
// each of the five reads as a distinct place, not a recolored
// template.
export function buildNavCardTexture(card, { accent = "#22d3ee", image = null, imageFit = "contain" } = {}) {
  const w = 512;
  const h = 716;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const rgb = hexToRgb(accent);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `rgb(${bgColorAtY(rgb, h, 0).join(",")})`);
  bg.addColorStop(1, `rgb(${bgColorAtY(rgb, h, h).join(",")})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawPattern(ctx, card.id, w, h);

  if (image) {
    const bandH = 336;
    drawImageBand(ctx, image, accent, imageFit, w, bandH, rgb, h);

    ctx.fillStyle = accent;
    ctx.font = "600 20px 'JetBrains Mono', monospace";
    ctx.fillText(card.kicker.toUpperCase(), 34, bandH + 46);

    ctx.fillStyle = "#f4f6f8";
    ctx.font = "600 44px 'Space Grotesk', sans-serif";
    ctx.fillText(card.title, 34, bandH + 108);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 21px 'JetBrains Mono', monospace";
    wrapText(ctx, card.tagline, 34, bandH + 150, w - 68, 28);
  } else {
    ctx.fillStyle = accent;
    ctx.font = "600 20px 'JetBrains Mono', monospace";
    ctx.fillText(card.kicker.toUpperCase(), 34, 58);

    drawMark(ctx, card.mark, accent);

    ctx.fillStyle = "#f4f6f8";
    ctx.font = "600 52px 'Space Grotesk', sans-serif";
    ctx.fillText(card.title, 34, 520);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 22px 'JetBrains Mono', monospace";
    wrapText(ctx, card.tagline, 34, 570, w - 68, 30);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
