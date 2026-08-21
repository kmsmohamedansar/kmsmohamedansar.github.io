import * as THREE from "three";

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.substring(0, 2), 16), parseInt(m.substring(2, 4), 16), parseInt(m.substring(4, 6), 16)];
}

// A per-destination line motif drawn behind the type — a second,
// wordless signal that these five cards aren't just recolored copies
// of one template.
function drawPattern(ctx, id, w, h) {
  ctx.strokeStyle = "rgba(15,23,42,0.07)";
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

// A picture instead of a drawn mark, for the destinations that have
// a real image to show — cropped full-bleed to fill the entire card,
// edge to edge, with no background or tile showing around it. Right
// for a piece of art (EMET) where cropping a little off the edges
// doesn't lose the point of the image; wrong for a wordmark or a
// wide banner, which is what drawContainImage below is for instead.
function drawFullBleedImage(ctx, img, w, h) {
  const ir = img.width / img.height;
  const br = w / h;
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
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

// The "zoomed out" alternative: the whole image, nothing cropped off
// it, scaled down and centered with real breathing room — right for
// a logo or a wide banner where every letter matters and a tight
// crop would slice through the wordmark. The backdrop is a faint
// tint of the card's own accent rather than flat white, so a logo
// that already carries its own white background doesn't look like a
// sticker pasted onto the card.
function drawContainImage(ctx, img, w, h, rgb) {
  const tint = rgb.map((c) => Math.round(255 * 0.93 + c * 0.07));
  ctx.fillStyle = `rgb(${tint.join(",")})`;
  ctx.fillRect(0, 0, w, h);

  const scale = 1.08;
  const ir = img.width / img.height;
  const br = w / h;
  let dw, dh;
  if (ir > br) {
    dw = w * scale;
    dh = dw / ir;
  } else {
    dh = h * scale;
    dw = dh * ir;
  }
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Each card face carries no text at all — the destination's name
// shows as a floating label above the card on hover instead (see
// NavCardDeck), so the picture is the whole card. All five now have
// a real image, passed in already-loaded so this stays synchronous;
// card.imageFit picks full-bleed ("cover") vs zoomed-out ("contain").
// Any card whose image failed to load falls back to its drawn mark,
// centered and enlarged since it no longer shares the face with a
// title, on a soft pastel tint of the card's own accent color.
export function buildNavCardTexture(card, { accent = "#22d3ee", image = null } = {}) {
  const w = 512;
  const h = 716;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (image) {
    if (card.imageFit === "contain") {
      drawContainImage(ctx, image, w, h, hexToRgb(accent));
    } else {
      drawFullBleedImage(ctx, image, w, h);
    }
  } else {
    const rgb = hexToRgb(accent);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, `rgba(${rgb.join(",")},0.18)`);
    bg.addColorStop(1, "#ffffff");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    drawPattern(ctx, card.id, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1.35, 1.35);
    ctx.translate(-138, -300);
    drawMark(ctx, card.mark, accent);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
