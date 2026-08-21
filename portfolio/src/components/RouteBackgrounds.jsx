import { useAnimatedCanvas } from "../lib/useAnimatedCanvas";

/* ============================================================
   EMET — classic terminal rain: falling green glyph columns over
   near-black, the "first IBM computer" mood the CRT chassis already
   leans into. The only one of the five that's a full dark takeover
   (see .dark-surface on EmetSection) rather than a light-bg motif.
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
   CURRENT (Datasembly) — an analytics dashboard that never stops
   moving: soft sparkline traces drifting across the page and small
   metric readouts rising and fading, in the route's own violet.
   ============================================================ */
const DATA_TICKS = ["+2.4%", "148ms", "+912 rows", "0.03%", "SELECT *", "99.98%", "p95 88ms", "OK", "342 rows", "+18"];

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
  const lines = Array.from({ length: 4 }, (_, i) => ({
    baseY: height * (0.14 + i * 0.24),
    amp: 16 + Math.random() * 14,
    speed: 0.5 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
  const ticks = Array.from({ length: 9 }, () => spawnTick(width, height));
  return { lines, ticks };
}

function renderDataFlow(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const time = reduced ? 0 : t;

  for (const line of state.lines) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(109,40,217,0.14)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= width; x += 10) {
      const y =
        line.baseY +
        Math.sin(x * 0.014 + time * 0.0006 * line.speed + line.phase) * line.amp +
        Math.sin(x * 0.045 + time * 0.0004 * line.speed) * (line.amp * 0.3);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.font = "500 12px 'JetBrains Mono', monospace";
  for (const tick of state.ticks) {
    tick.alpha = Math.min(1, tick.alpha + 0.02);
    ctx.fillStyle = `rgba(109,40,217,${0.32 * tick.alpha})`;
    ctx.fillText(tick.text, tick.x, tick.y);
    if (!reduced) {
      tick.y -= tick.speed;
      if (tick.y < -20) Object.assign(tick, spawnTick(width, height));
    }
  }
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
   slow spotlight beams sweeping from overhead and warm bokeh drifting
   like a premiere, in the route's own amber.
   ============================================================ */
function setupStudio(width, height) {
  const spots = Array.from({ length: 3 }, (_, i) => ({
    angle: (i / 3) * Math.PI * 2,
    speed: 0.00007 + i * 0.00002,
  }));
  const bokeh = Array.from({ length: 16 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 18 + Math.random() * 46,
    speed: 0.3 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  }));
  return { spots, bokeh };
}

function renderStudio(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const time = reduced ? 0 : t;
  const cx = width * 0.5;
  const cy = height * 0.3;
  const reach = Math.max(width, height) * 0.9;

  for (const spot of state.spots) {
    const a = spot.angle + time * spot.speed;
    const x2 = cx + Math.cos(a) * reach;
    const y2 = cy + Math.sin(a) * reach * 0.6;
    const grad = ctx.createLinearGradient(cx, cy, x2, y2);
    grad.addColorStop(0, "rgba(180,83,9,0.09)");
    grad.addColorStop(1, "rgba(180,83,9,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 140;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (const b of state.bokeh) {
    const yy = b.y + Math.sin(time * 0.0005 * b.speed + b.phase) * 12;
    const xx = b.x + Math.cos(time * 0.0004 * b.speed + b.phase) * 8;
    const grad = ctx.createRadialGradient(xx, yy, 0, xx, yy, b.r);
    grad.addColorStop(0, "rgba(255,196,102,0.16)");
    grad.addColorStop(1, "rgba(255,196,102,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xx, yy, b.r, 0, Math.PI * 2);
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
   PROJECTS — a stats board that keeps ticking: a faint bar-chart
   silhouette breathing along the bottom edge and shipped-metric
   labels rising past it, in the route's own green.
   ============================================================ */
const STAT_LABELS = ["+24%", "1.2k rows/s", "99.95%", "SLA OK", "p50 12ms", "10 shipped", "App Store ✓", "CI green"];

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
  const barCount = Math.max(10, Math.floor(width / 70));
  const bars = Array.from({ length: barCount }, (_, i) => ({
    x: (i + 0.5) * (width / barCount),
    h: 30 + Math.random() * 100,
    target: 30 + Math.random() * 160,
  }));
  const labels = Array.from({ length: 7 }, () => spawnStat(width, height));
  return { bars, labels };
}

function renderStats(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const baseY = height * 0.88;

  for (const bar of state.bars) {
    if (!reduced && Math.random() < 0.006) bar.target = 30 + Math.random() * 180;
    if (!reduced) bar.h += (bar.target - bar.h) * 0.02;
    const grad = ctx.createLinearGradient(0, baseY - bar.h, 0, baseY);
    grad.addColorStop(0, "rgba(4,120,87,0.13)");
    grad.addColorStop(1, "rgba(4,120,87,0.02)");
    ctx.fillStyle = grad;
    ctx.fillRect(bar.x - 15, baseY - bar.h, 30, bar.h);
  }

  ctx.font = "500 12px 'JetBrains Mono', monospace";
  for (const label of state.labels) {
    label.alpha = Math.min(1, label.alpha + 0.015);
    ctx.fillStyle = `rgba(4,120,87,${0.3 * label.alpha})`;
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
   page like a radar sweep, with small particles drifting in toward
   the center, in the route's own rose. "Reach out," rendered
   literally.
   ============================================================ */
function spawnPingDot(width, height) {
  return {
    angle: Math.random() * Math.PI * 2,
    dist: 60 + Math.random() * Math.max(width, height) * 0.45,
    speed: 0.12 + Math.random() * 0.14,
    r: 1.5 + Math.random() * 2,
  };
}

function setupPing(width, height) {
  const rings = [0, 1, 2, 3].map((i) => ({ delay: i * 1500 }));
  const dots = Array.from({ length: 24 }, () => spawnPingDot(width, height));
  return { rings, dots };
}

function renderPing(ctx, width, height, t, state, reduced) {
  ctx.clearRect(0, 0, width, height);
  const cx = width * 0.5;
  const cy = height * 0.42;
  const maxR = Math.max(width, height) * 0.5;

  for (const ring of state.rings) {
    const cyc = reduced ? 0.5 : ((t + ring.delay) % 6000) / 6000;
    const r = cyc * maxR;
    ctx.strokeStyle = `rgba(190,18,60,${(1 - cyc) * 0.16})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const dot of state.dots) {
    const x = cx + Math.cos(dot.angle) * dot.dist;
    const y = cy + Math.sin(dot.angle) * dot.dist;
    ctx.fillStyle = "rgba(190,18,60,0.35)";
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
