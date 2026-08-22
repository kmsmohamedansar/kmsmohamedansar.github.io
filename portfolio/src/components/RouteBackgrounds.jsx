import { useAnimatedCanvas } from "../lib/useAnimatedCanvas";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGrid(ctx, width, height, color, step = 46) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/* ============================================================
   EMET — classic terminal rain: falling green glyph columns over
   near-black, the "first IBM computer" mood the CRT chassis already
   leans into. The only one of the five that's a full dark takeover
   (see .dark-surface on EmetSection) rather than a light-bg motif.
   Untouched by the rest of this file's redesign — it was already
   right.
   ============================================================ */
const MATRIX_GLYPHS = "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function setupMatrix(width, height) {
  const fontSize = 15;
  const cols = Math.ceil(width / fontSize);
  return {
    fontSize,
    drops: Array.from({ length: cols }, () => Math.random() * -height),
  };
}

function renderMatrix(ctx, width, height, t, state, reduced) {
  const { fontSize, drops } = state;
  if (reduced) {
    ctx.fillStyle = "#04120a";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "rgba(4, 18, 10, 0.14)";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
  for (let i = 0; i < drops.length; i++) {
    const x = i * fontSize;
    const y = drops[i];
    const glyph = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
    ctx.fillStyle = Math.random() > 0.94 ? "rgba(210,255,225,0.9)" : "rgba(52,211,153,0.75)";
    ctx.fillText(glyph, x, y);
    if (!reduced) {
      drops[i] += fontSize * (0.55 + Math.random() * 0.35);
      if (y > height && Math.random() > 0.975) drops[i] = Math.random() * -height * 0.4;
    }
  }
}

export function MatrixBackground() {
  const canvasRef = useAnimatedCanvas(setupMatrix, renderMatrix);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#04120a]">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/* ============================================================
   CURRENT (Datasembly) — an actual analytics dashboard glimpsed in
   the background: a graph-paper grid, two live area charts with
   gradient fills, a couple of KPI tiles with real numbers, metric
   readouts rising past them, and a soft scanline sweeping across
   like a live cursor — the "always-on dashboard" feel, made literal
   instead of just a couple of faint sparklines.
   ============================================================ */
const DATA_TICKS = ["+2.4%", "148ms", "+912 rows", "0.03%", "SELECT *", "99.98%", "p95 88ms", "OK", "342 rows", "+18"];
const DATA_TILES = [
  { x: 0.06, y: 0.12, label: "QUERIES/MIN", value: "428" },
  { x: 0.74, y: 0.66, label: "LATENCY", value: "88ms" },
  { x: 0.08, y: 0.74, label: "UPTIME", value: "99.98%" },
];

function spawnTick(width, height) {
  return {
    x: Math.random() * width,
    y: height + 20 + Math.random() * height * 0.6,
    speed: 0.1 + Math.random() * 0.12,
    text: DATA_TICKS[Math.floor(Math.random() * DATA_TICKS.length)],
    alpha: 0,
  };
}

function setupDataFlow(width, height) {
  const lines = Array.from({ length: 3 }, (_, i) => ({
    baseY: height * (0.2 + i * 0.28),
    amp: 24 + Math.random() * 18,
    speed: 0.5 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
  const ticks = Array.from({ length: 10 }, () => spawnTick(width, height));
  const tiles = DATA_TILES.map((tile) => ({ ...tile, phase: Math.random() * Math.PI * 2 }));
  return { lines, ticks, tiles, scanX: -200 };
}

function renderDataFlow(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const time = reduced ? 0 : t;

  drawGrid(ctx, width, height, "rgba(109,40,217,0.05)");

  for (const line of state.lines) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      const y =
        line.baseY +
        Math.sin(x * 0.012 + time * 0.0006 * line.speed + line.phase) * line.amp +
        Math.sin(x * 0.04 + time * 0.0004 * line.speed) * (line.amp * 0.35);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(109,40,217,0.34)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, line.baseY - line.amp, 0, height);
    fillGrad.addColorStop(0, "rgba(109,40,217,0.12)");
    fillGrad.addColorStop(1, "rgba(109,40,217,0)");
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // Below tablet width there's rarely open canvas away from stacked
  // content — the headline and the dashboard card both run edge to
  // edge, so a floating tile just collides with real text.
  const tiles = width < 700 ? [] : state.tiles;
  for (const tile of tiles) {
    const px = tile.x * width;
    const py = tile.y * height;
    const pulse = reduced ? 1 : 0.85 + Math.sin(time * 0.0012 + tile.phase) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse;
    roundRect(ctx, px, py, 128, 58, 10);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
    ctx.strokeStyle = "rgba(109,40,217,0.3)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(109,40,217,0.6)";
    ctx.font = "600 10px 'JetBrains Mono', monospace";
    ctx.fillText(tile.label, px + 12, py + 21);
    ctx.fillStyle = "rgba(109,40,217,0.78)";
    ctx.font = "700 19px 'JetBrains Mono', monospace";
    ctx.fillText(tile.value, px + 12, py + 43);
    ctx.restore();
  }

  ctx.font = "500 12px 'JetBrains Mono', monospace";
  for (const tick of state.ticks) {
    tick.alpha = Math.min(1, tick.alpha + 0.02);
    ctx.fillStyle = `rgba(109,40,217,${0.4 * tick.alpha})`;
    ctx.fillText(tick.text, tick.x, tick.y);
    if (!reduced) {
      tick.y -= tick.speed;
      if (tick.y < -20) Object.assign(tick, spawnTick(width, height));
    }
  }

  if (!reduced) state.scanX = state.scanX > width + 200 ? -200 : state.scanX + 1.1;
  const scanGrad = ctx.createLinearGradient(state.scanX - 90, 0, state.scanX + 90, 0);
  scanGrad.addColorStop(0, "rgba(109,40,217,0)");
  scanGrad.addColorStop(0.5, "rgba(109,40,217,0.07)");
  scanGrad.addColorStop(1, "rgba(109,40,217,0)");
  ctx.fillStyle = scanGrad;
  ctx.fillRect(state.scanX - 90, 0, 180, height);
}

export function DataFlowBackground() {
  const canvasRef = useAnimatedCanvas(setupDataFlow, renderDataFlow);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/* ============================================================
   BEFORE (Amazon) — a screening-room mood for the Prime Video years:
   brighter spotlight beams sweeping from overhead, warm bokeh
   drifting like a premiere, and a filmstrip — sprocket holes and
   frame dividers — drifting along the bottom edge, the one literal
   cinema prop in an otherwise abstract scene.
   ============================================================ */
function setupStudio(width, height) {
  const spots = Array.from({ length: 3 }, (_, i) => ({
    angle: (i / 3) * Math.PI * 2,
    speed: 0.00007 + i * 0.00002,
  }));
  const bokeh = Array.from({ length: 20 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 20 + Math.random() * 54,
    speed: 0.3 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
  return { spots, bokeh, filmX: 0 };
}

function renderStudio(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const time = reduced ? 0 : t;
  const cx = width * 0.5;
  const cy = height * 0.28;
  const reach = Math.max(width, height) * 0.95;

  for (const spot of state.spots) {
    const a = spot.angle + time * spot.speed;
    const x2 = cx + Math.cos(a) * reach;
    const y2 = cy + Math.sin(a) * reach * 0.6;
    const grad = ctx.createLinearGradient(cx, cy, x2, y2);
    grad.addColorStop(0, "rgba(180,83,9,0.16)");
    grad.addColorStop(1, "rgba(180,83,9,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 170;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (const b of state.bokeh) {
    const yy = b.y + Math.sin(time * 0.0005 * b.speed + b.phase) * 14;
    const xx = b.x + Math.cos(time * 0.0004 * b.speed + b.phase) * 10;
    const grad = ctx.createRadialGradient(xx, yy, 0, xx, yy, b.r);
    grad.addColorStop(0, "rgba(255,196,102,0.22)");
    grad.addColorStop(1, "rgba(255,196,102,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xx, yy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!reduced) state.filmX = (state.filmX + 0.25) % 64;
  const stripY = height - 46;
  ctx.fillStyle = "rgba(120,53,15,0.1)";
  ctx.fillRect(0, stripY, width, 46);
  for (let x = -state.filmX; x < width + 64; x += 64) {
    ctx.strokeStyle = "rgba(120,53,15,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, stripY);
    ctx.lineTo(x, stripY + 46);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    roundRect(ctx, x + 24, stripY + 8, 12, 9, 2);
    ctx.fill();
    roundRect(ctx, x + 24, stripY + 29, 12, 9, 2);
    ctx.fill();
  }
}

export function StudioBackground() {
  const canvasRef = useAnimatedCanvas(setupStudio, renderStudio);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/* ============================================================
   PROJECTS — a stats board that keeps shipping: a brighter bar-chart
   silhouette breathing along the bottom edge, shipped-metric labels
   rising past it, and a CI build log tailing up the right edge like
   a real deploy console — "shipped," made literal.
   ============================================================ */
const STAT_LABELS = ["+24%", "1.2k rows/s", "99.95%", "SLA OK", "p50 12ms", "10 shipped", "App Store ✓", "CI green"];
const BUILD_LOG_LINES = [
  "✓ npm run build",
  "✓ Tests: 42 passed",
  "Deploying to App Store Connect…",
  "✓ TestFlight build uploaded",
  "✓ Lint: 0 errors",
  "Bundling assets…",
  "✓ CI pipeline green",
  "Shipping RepTrack v1.4",
  "✓ SQL playground deployed",
];

function spawnStat(width, height) {
  return {
    x: Math.random() * width,
    y: height + 20 + Math.random() * height * 0.5,
    text: STAT_LABELS[Math.floor(Math.random() * STAT_LABELS.length)],
    alpha: 0,
    drift: (Math.random() - 0.5) * 0.12,
  };
}

function setupStats(width, height) {
  const barCount = Math.max(10, Math.floor(width / 60));
  const bars = Array.from({ length: barCount }, (_, i) => ({
    x: (i + 0.5) * (width / barCount),
    h: 30 + Math.random() * 100,
    target: 30 + Math.random() * 200,
  }));
  const labels = Array.from({ length: 7 }, () => spawnStat(width, height));
  const logLines = Array.from({ length: 8 }, (_, i) => ({
    text: BUILD_LOG_LINES[i % BUILD_LOG_LINES.length],
    y: height - i * 30,
  }));
  return { bars, labels, logLines };
}

function renderStats(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const baseY = height * 0.9;

  for (const bar of state.bars) {
    if (!reduced && Math.random() < 0.006) bar.target = 30 + Math.random() * 220;
    if (!reduced) bar.h += (bar.target - bar.h) * 0.02;
    const grad = ctx.createLinearGradient(0, baseY - bar.h, 0, baseY);
    grad.addColorStop(0, "rgba(4,120,87,0.22)");
    grad.addColorStop(1, "rgba(4,120,87,0.03)");
    ctx.fillStyle = grad;
    ctx.fillRect(bar.x - 14, baseY - bar.h, 28, bar.h);
  }

  // Same reasoning as the KPI tiles on Current: below tablet width
  // there's no open column on the right for a log to live in without
  // running straight through the project copy.
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  const logLines = width < 700 ? [] : state.logLines;
  for (const line of logLines) {
    const distFromBottom = height - line.y;
    const alpha = Math.max(0, 0.4 - distFromBottom / 900);
    ctx.fillStyle = `rgba(4,120,87,${alpha})`;
    ctx.fillText(line.text, width - 24, line.y);
    if (!reduced) line.y -= 0.18;
    if (line.y < -20) line.y = height + Math.random() * 60;
  }
  ctx.textAlign = "left";

  for (const label of state.labels) {
    label.alpha = Math.min(1, label.alpha + 0.015);
    ctx.fillStyle = `rgba(4,120,87,${0.4 * label.alpha})`;
    ctx.fillText(label.text, label.x, label.y);
    if (!reduced) {
      label.y -= 0.14;
      label.x += label.drift;
      if (label.y < -20) Object.assign(label, spawnStat(width, height));
    }
  }
}

export function StatsBackground() {
  const canvasRef = useAnimatedCanvas(setupStats, renderStats);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/* ============================================================
   CONTACT — signal rings pulsing outward from the middle of the
   page like a radar sweep, a warm core glow at the center, and
   particles drifting in toward it. "Reach out," rendered literally,
   now with more presence than before.
   ============================================================ */
function spawnPingDot(width, height) {
  return {
    angle: Math.random() * Math.PI * 2,
    dist: 60 + Math.random() * Math.max(width, height) * 0.48,
    speed: 0.12 + Math.random() * 0.14,
    r: 1.5 + Math.random() * 2.2,
  };
}

function setupPing(width, height) {
  const rings = [0, 1, 2, 3].map((i) => ({ delay: i * 1500 }));
  const dots = Array.from({ length: 30 }, () => spawnPingDot(width, height));
  return { rings, dots };
}

function renderPing(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const cx = width * 0.5;
  const cy = height * 0.4;
  const maxR = Math.max(width, height) * 0.55;

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
  coreGrad.addColorStop(0, "rgba(190,18,60,0.16)");
  coreGrad.addColorStop(1, "rgba(190,18,60,0)");
  ctx.fillStyle = coreGrad;
  ctx.fillRect(cx - 100, cy - 100, 200, 200);

  for (const ring of state.rings) {
    const cyc = reduced ? 0.5 : ((t + ring.delay) % 6000) / 6000;
    const r = cyc * maxR;
    ctx.strokeStyle = `rgba(190,18,60,${(1 - cyc) * 0.26})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const dot of state.dots) {
    const x = cx + Math.cos(dot.angle) * dot.dist;
    const y = cy + Math.sin(dot.angle) * dot.dist;
    ctx.fillStyle = "rgba(190,18,60,0.5)";
    ctx.beginPath();
    ctx.arc(x, y, dot.r, 0, Math.PI * 2);
    ctx.fill();
    if (!reduced) {
      dot.dist -= dot.speed;
      if (dot.dist < 20) Object.assign(dot, spawnPingDot(width, height));
    }
  }
}

export function PingBackground() {
  const canvasRef = useAnimatedCanvas(setupPing, renderPing);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

/* ============================================================
   DECK (homepage) — a bright water surface: a single drop lands at
   one point and sends out real waves, not thin geometric rings —
   each one a wobbly, textured band with a bright highlight riding
   its outer edge, the way light catches a raised swell of water.
   The full circumference of every wave is packed with the same
   vocabulary as the five destinations beyond it: stats, queries,
   metrics, small calculations, surfacing as the wave reaches them
   and sinking back under as it passes. Light and bright by design,
   the one background meant to feel like daylight on water rather
   than a screen.
   ============================================================ */
const WAVE_SNIPPETS = [
  "SELECT *",
  "GROUP BY",
  "COUNT(*)",
  "O(n log n)",
  "p95 88ms",
  "99.98%",
  "$128k",
  "6 yrs exp",
  "CI: green",
  "42 req/s",
  "0.03",
  "+18%",
  "JOIN",
  "1,024",
  "avg 4.2",
  "npm run build",
  "git push",
  "200 OK",
  "3.14159",
  "n=512",
  "MTTR 9m",
  "ROI +2.4x",
];

function setupWaterDrop(width, height) {
  const drop = { x: width * 0.5, y: height * 0.46 };
  const wavesPerCycle = 4;
  const cyclePeriod = 6600;
  const waves = Array.from({ length: wavesPerCycle }, (_, i) => ({
    startOffset: -(i * (cyclePeriod / wavesPerCycle)),
    wobbleSeed: Math.random() * Math.PI * 2,
    glyphs: Array.from({ length: 26 }, (_, gi) => ({
      angle: (gi / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.12,
      text: WAVE_SNIPPETS[Math.floor(Math.random() * WAVE_SNIPPETS.length)],
    })),
  }));
  return { drop, waves, cyclePeriod };
}

function waveRadius(ctx, drop, r, t, wave) {
  ctx.beginPath();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble = Math.sin(a * 5 + wave.wobbleSeed + t * 0.00045) * 6 + Math.sin(a * 9 - wave.wobbleSeed) * 2.5;
    const rr = r + wobble;
    const x = drop.x + Math.cos(a) * rr;
    const y = drop.y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function renderWaterDrop(ctx, width, height, t, state, reduced) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#eef8ff");
  bg.addColorStop(0.55, "#f7fcff");
  bg.addColorStop(1, "#ffffff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const { drop, cyclePeriod } = state;
  const maxR = Math.max(width, height) * 0.85;

  for (let idx = 0; idx < state.waves.length; idx++) {
    const wave = state.waves[idx];
    const phase = reduced
      ? (idx + 0.5) / state.waves.length
      : (((t + wave.startOffset) % cyclePeriod) + cyclePeriod) % cyclePeriod / cyclePeriod;
    const r = phase * maxR;
    const alpha = (1 - phase) * 0.45;
    if (alpha <= 0.012) continue;

    // The wave itself: a thick teal band (the body of the swell)
    // with a bright, thinner highlight riding its outer crest.
    waveRadius(ctx, drop, r, t, wave, width, height);
    ctx.strokeStyle = `rgba(14,116,144,${alpha * 0.55})`;
    ctx.lineWidth = 22;
    ctx.stroke();

    waveRadius(ctx, drop, r + 9, t, wave, width, height);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    waveRadius(ctx, drop, r - 9, t, wave, width, height);
    ctx.strokeStyle = `rgba(14,116,144,${alpha * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const glyph of wave.glyphs) {
      const wobble = Math.sin(glyph.angle * 5 + wave.wobbleSeed + t * 0.00045) * 6 + Math.sin(glyph.angle * 9 - wave.wobbleSeed) * 2.5;
      const rr = r + wobble;
      const gx = drop.x + Math.cos(glyph.angle) * rr;
      const gy = drop.y + Math.sin(glyph.angle) * rr;
      if (gx < -60 || gx > width + 60 || gy < -20 || gy > height + 20) continue;
      ctx.fillStyle = `rgba(14,116,144,${Math.min(0.6, alpha * 1.3)})`;
      ctx.fillText(glyph.text, gx, gy);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // A brief bright flash at the origin the instant a new wave is
  // "born" — the moment the drop hits the water.
  if (!reduced) {
    for (const wave of state.waves) {
      const birthPhase = (((t + wave.startOffset) % cyclePeriod) + cyclePeriod) % cyclePeriod / cyclePeriod;
      if (birthPhase < 0.05) {
        const flashAlpha = (1 - birthPhase / 0.05) * 0.55;
        const grad = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, 46);
        grad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(drop.x - 46, drop.y - 46, 92, 92);
      }
    }
  }
}

export function WaterDropBackground() {
  const canvasRef = useAnimatedCanvas(setupWaterDrop, renderWaterDrop);
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
