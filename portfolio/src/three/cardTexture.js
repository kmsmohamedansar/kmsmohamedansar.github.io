import * as THREE from "three";

// There are no real project screenshots to sample, so each card face is
// drawn as a small representative composition (title, kicker, tag rail)
// on an offscreen canvas rather than falling back to a generic gradient.
export function buildProjectTexture(project, { accent = "#5fd7ff" } = {}) {
  const w = 512;
  const h = 716;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, project.warm ? "#1c1712" : "#101418");
  bg.addColorStop(1, project.warm ? "#0f0c09" : "#070a0d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (project.kicker) {
    ctx.fillStyle = accent;
    ctx.font = "600 22px 'JetBrains Mono', monospace";
    ctx.fillText(project.kicker.toUpperCase(), 36, 64);
  }

  ctx.fillStyle = "#f4f6f8";
  ctx.font = "600 40px 'Space Grotesk', sans-serif";
  const words = project.title.split(" ");
  let line = "";
  let y = h * 0.42;
  const maxWidth = w - 72;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, 36, y);
      line = word;
      y += 48;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 36, y);

  const tags = (project.tags || []).slice(0, 3);
  let ty = h - 56;
  ctx.font = "500 18px 'JetBrains Mono', monospace";
  let tx = 36;
  for (const tag of tags) {
    const label = tag;
    const tw = ctx.measureText(label).width + 20;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(tx, ty - 24, tw, 32);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(label, tx + 10, ty - 2);
    tx += tw + 10;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
