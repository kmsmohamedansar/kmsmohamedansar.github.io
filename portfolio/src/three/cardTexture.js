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

// Each nav card has no screenshot to show — it's a destination, not a
// project — so the face is a small typographic composition: a kicker,
// a drawn mark, and the destination's title. Drawn on an offscreen
// canvas rather than a generic gradient placeholder, with the
// background gradient and line motif both tied to the card's own
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

  drawMark(ctx, card.mark, accent);

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
