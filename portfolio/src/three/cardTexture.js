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

// Each nav card has no screenshot to show — it's a destination, not a
// project — so the face is a small typographic composition: a kicker,
// a dominant mark (glyph/index), and the destination's title. Drawn on
// an offscreen canvas rather than a generic gradient placeholder, with
// the background gradient and line motif both tied to the card's own
// accent color so each of the five reads as a distinct place, not a
// recolored template.
export function buildNavCardTexture(card, { accent = "#22d3ee" } = {}) {
  const w = 512;
  const h = 716;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const [r, g, b] = hexToRgb(accent);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `rgb(${Math.round(r * 0.1 + 10)},${Math.round(g * 0.1 + 11)},${Math.round(b * 0.12 + 15)})`);
  bg.addColorStop(1, `rgb(${Math.round(r * 0.04 + 5)},${Math.round(g * 0.04 + 6)},${Math.round(b * 0.05 + 8)})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawPattern(ctx, card.id, w, h);

  ctx.fillStyle = accent;
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.fillText(card.kicker.toUpperCase(), 34, 58);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = accent;
  ctx.font = "700 190px 'JetBrains Mono', monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(card.mark, 30, 400);
  ctx.restore();

  ctx.fillStyle = "#f4f6f8";
  ctx.font = "600 52px 'Space Grotesk', sans-serif";
  ctx.fillText(card.title, 34, 520);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 22px 'JetBrains Mono', monospace";
  const words = card.tagline.split(" ");
  let line = "";
  let y = 570;
  const maxWidth = w - 68;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, 34, y);
      line = word;
      y += 30;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 34, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
