import * as THREE from "three";

// Each nav card has no screenshot to show — it's a destination, not a
// project — so the face is a small typographic composition: a kicker,
// a dominant mark (glyph/index), and the destination's title. Drawn on
// an offscreen canvas rather than a generic gradient placeholder.
export function buildNavCardTexture(card, { accent = "#22d3ee" } = {}) {
  const w = 512;
  const h = 716;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, card.warm ? "#1c1712" : "#10151b");
  bg.addColorStop(1, card.warm ? "#0f0c09" : "#070a0d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let y = 48; y < h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

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
