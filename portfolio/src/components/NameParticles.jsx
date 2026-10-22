import { useEffect, useRef } from "react";
import { HERO } from "../data/content";

/* One opening: infinity → name → what I build. Both text shapes keep the
   same pointer repulsion and spring return. Reduced motion shows a static
   name; Hero renders the statement as ordinary text beside it. */
const LOOP_HOLD = 0.05;
const NAME_FORM = 0.52;
const STAGGER = 0.12;
const NAME_PAUSE = 0.72;
const MORPH_START = LOOP_HOLD + NAME_FORM + STAGGER + NAME_PAUSE;
const MORPH_DURATION = 0.56;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => 1 - Math.pow(1 - k, 4);

// Soft-black letterforms carry the name; burnt orange catches the perimeter.
const STOPS = [[16, 16, 16], [16, 16, 16], [16, 16, 16], [213, 54, 12]];
function sweep(f) {
  const x = Math.min(0.999, Math.max(0, f)) * (STOPS.length - 1);
  const i = Math.floor(x), k = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const c = a.map((v, j) => Math.round(v + (b[j] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function sampleText(w, h, dpr, statement = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const narrow = w / dpr < 640;
  // The copy comes from HERO, so the canvas and accessible text stay in sync.
  const sentences = HERO.title.match(/[^.!?]+[.!?]+/g)?.map((line) => line.trim()) || [HERO.title];
  const lines = statement
    ? sentences.flatMap((line) => {
        if (!narrow) return [line];
        const words = line.split(" ");
        const middle = Math.ceil(words.length / 2);
        return [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
      })
    : narrow ? ["Mohamed", "Ansar"] : ["Mohamed Ansar"];
  g.font = statement ? "700 100px Outfit, sans-serif" : "400 100px Anton, sans-serif";
  const widest = Math.max(...lines.map((line) => g.measureText(line).width));
  const big = Math.min((w * 0.86 * 100) / widest, (h * 0.62) / (lines.length * 0.95 + (statement ? 0 : 0.55)));
  const small = statement ? 0 : big * 0.42;
  const lineHeight = big * (statement ? 1.15 : 0.95);
  const total = small * 1.1 + big + (lines.length - 1) * lineHeight;
  let y = (h - total) / 2 + (statement ? big * 0.78 : small);
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  if (!statement) {
    g.font = `600 ${small}px Outfit, sans-serif`;
    g.fillText("Hi, I'm", w / 2, y);
    y += small * 0.2 + big * 0.82;
  }
  g.font = statement ? `700 ${big}px Outfit, sans-serif` : `400 ${big}px Anton, sans-serif`;
  for (const line of lines) {
    g.fillText(line, w / 2, y);
    y += lineHeight;
  }
  const step = Math.max(2, Math.round((narrow ? 2.5 : 3) * dpr * Math.max(0.7, big / (220 * dpr))));
  const data = g.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      if (data[(py * w + px) * 4 + 3] > 128) pts.push([px + (Math.random() - 0.5) * step * 0.4, py + (Math.random() - 0.5) * step * 0.4]);
    }
  }
  return { pts, step };
}

// Quantized colors let us draw in color order instead of changing canvas
// fillStyle thousands of times per frame. The visual sweep stays the same.
const PALETTE = Array.from({ length: 16 }, (_, i) => sweep(i / 15));
const PHASES = 16;

export default function NameParticles({ ready = true, onSettled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ready) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onSettled?.();
      return;
    }
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    // On touch phones the pointer interaction is unavailable and a perpetual
    // canvas loop costs battery for little gain. Draw the name once instead.
    // Kept in step with the .ed-mobile-statement query in editorial.css.
    const staticQuery = window.matchMedia("(max-width: 640px), (pointer: coarse)");
    // Read live: someone can turn motion down, or resize past the breakpoint,
    // with the page already open.
    let staticMode = reducedQuery.matches || staticQuery.matches;
    let raf = null;
    let parts = [];
    let radius = 1;
    let elapsed = 0;
    let lastFrame = 0;
    let lastPointerMove = -Infinity;
    let settledSent = false;
    let initialized = false;
    let onScreen = true;
    let alive = true;
    let dpr = 1;
    const pointer = { x: -1e4, y: -1e4 };
    const waveX = new Float32Array(PHASES);
    const waveY = new Float32Array(PHASES);
    const waveIntro = new Float32Array(PHASES);

    function build(preservePhase = false) {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const w = canvas.width, h = canvas.height;
      const name = sampleText(w, h, dpr);
      // A static hero never morphs, so the statement shape is dead weight there.
      const statement = staticMode ? name : sampleText(w, h, dpr, true);
      const sampledCount = Math.max(name.pts.length, statement.pts.length);
      // Capping the animated hero keeps the per-frame cost down. A static one is
      // drawn once, so a cap buys no battery and only breaks up the letterforms.
      const count = Math.min(sampledCount, staticMode ? sampledCount : rect.width < 640 ? 3200 : 7000);
      // Slightly larger points retain the letter density with fewer particles.
      radius = Math.min(Math.min(name.step, statement.step) * 0.36 * Math.sqrt(sampledCount / Math.max(1, count)), 2.4 * dpr);
      const scale = Math.min(w * 0.38, h * 0.62);
      if (!name.pts.length || !statement.pts.length) {
        parts = [];
        canvas.dataset.particleCount = "0";
        return;
      }
      parts = Array.from({ length: count }, (_, i) => {
        const [nx, ny] = name.pts[Math.floor(i * name.pts.length / count)];
        const [tx, ty] = statement.pts[Math.floor(i * statement.pts.length / count)];
        const angle = i / count * Math.PI * 2 + Math.random() * 0.05;
        const denominator = 1 + Math.sin(angle) ** 2;
        const sx = w / 2 + scale * Math.cos(angle) / denominator + (Math.random() - 0.5) * scale * 0.08;
        const sy = h / 2 + scale * Math.sin(angle) * Math.cos(angle) / denominator + (Math.random() - 0.5) * scale * 0.08;
        const delay = Math.random() * STAGGER;
        const morph = staticMode ? 0 : ease(clamp01((elapsed - MORPH_START - delay) / MORPH_DURATION));
        const x = preservePhase ? nx + (tx - nx) * morph : sx;
        const y = preservePhase ? ny + (ty - ny) * morph : sy;
        const color = Math.random() < 0.18 ? 0 : Math.min(15, Math.max(0, Math.round((nx / w + (Math.random() - 0.5) * 0.08) * 15)));
        return { nx, ny, tx, ty, x, y, sx, sy, vx: 0, vy: 0, color, delay, phase: Math.floor(Math.random() * PHASES) };
      }).sort((a, b) => a.color - b.color);
      canvas.dataset.particleCount = String(parts.length);
    }

    function draw(dt = 1) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const pointerRadius = 70 * dpr;
      const damping = Math.pow(0.82, dt);
      // Shared phase buckets replace two trig calls per particle per frame.
      for (let i = 0; i < PHASES; i++) {
        const phase = i / PHASES * Math.PI * 2;
        waveX[i] = Math.sin(elapsed * 1.3 + phase) * 0.6 * dpr;
        waveY[i] = Math.cos(elapsed * 1.1 + phase) * 0.6 * dpr;
        waveIntro[i] = Math.sin(elapsed * 1.4 + phase) * 3 * dpr;
      }
      let allHome = true;
      let color = -1;
      for (const p of parts) {
        const k = staticMode ? 1 : clamp01((elapsed - LOOP_HOLD - p.delay) / NAME_FORM);
        if (k < 1) {
          allHome = false;
          const eased = ease(k);
          p.x = p.sx + (p.nx - p.sx) * eased + (1 - eased) * waveIntro[p.phase];
          p.y = p.sy + (p.ny - p.sy) * eased;
        } else if (!staticMode) {
          const morph = ease(clamp01((elapsed - MORPH_START - p.delay) / MORPH_DURATION));
          const homeX = p.nx + (p.tx - p.nx) * morph;
          const homeY = p.ny + (p.ty - p.ny) * morph;
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < pointerRadius * pointerRadius) {
            const distance = Math.sqrt(distanceSquared) || 1;
            const force = (1 - distance / pointerRadius) * 2.2 * dpr * dt;
            p.vx += dx / distance * force;
            p.vy += dy / distance * force;
          }
          p.vx += (homeX + waveX[p.phase] - p.x) * 0.06 * dt;
          p.vy += (homeY + waveY[p.phase] - p.y) * 0.06 * dt;
          p.vx *= damping;
          p.vy *= damping;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.x = p.nx;
          p.y = p.ny;
        }
        if (p.color !== color) {
          color = p.color;
          ctx.fillStyle = PALETTE[color];
        }
        ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
      }
      if (allHome && !settledSent) {
        settledSent = true;
        onSettled?.();
      }
    }

    function frame(now) {
      raf = null;
      // Full rate during the entrance and pointer interaction; the tiny
      // resting drift only needs 30fps. Scrolling away cancels RAF entirely.
      const active = elapsed < MORPH_START + MORPH_DURATION + STAGGER || now - lastPointerMove < 600;
      if (lastFrame && now - lastFrame < (active ? 1000 / 60 : 1000 / 30) - 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const seconds = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
      lastFrame = now;
      elapsed += seconds;
      draw(Math.min(seconds * 60, 2));
      raf = requestAnimationFrame(frame);
    }

    function sync() {
      if (!initialized || !alive) return;
      const running = !staticMode && onScreen && !document.hidden;
      if (running && raf === null) raf = requestAnimationFrame(frame);
      if (!running) {
        cancelAnimationFrame(raf);
        raf = null;
        lastFrame = 0; // Pause the timeline as well as drawing.
        pointer.x = pointer.y = -1e4;
      }
      canvas.dataset.animationState = staticMode ? "static" : running ? "running" : "paused";
    }

    function initialize() {
      if (!alive || initialized) return;
      clearTimeout(fontTimer);
      build();
      initialized = true;
      if (staticMode) draw();
      sync();
    }
    // Don't leave the entire opening blank behind a slow font request.
    const fontTimer = setTimeout(initialize, 350);
    const fontReady = document.fonts?.load
      ? Promise.all([document.fonts.load("400 100px Anton"), document.fonts.load("700 100px Outfit")])
      : Promise.resolve();
    fontReady.then(() => {
      if (!alive) return;
      if (!initialized) initialize();
      else {
        build(true);
        if (staticMode) draw();
      }
    }, initialize);

    function onMove(event) {
      // Canvas-local offsets avoid a forced layout read on every pointer move.
      pointer.x = event.offsetX * dpr;
      pointer.y = event.offsetY * dpr;
      lastPointerMove = performance.now();
    }
    function onLeave() { pointer.x = pointer.y = -1e4; }
    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!initialized || !alive) return;
        build(true);
        if (staticMode) draw();
      }, 100);
    }
    // Switching between the animated and static hero changes the particle
    // budget, so rebuild rather than letting the old set drift on screen.
    function onModeChange() {
      const next = reducedQuery.matches || staticQuery.matches;
      if (next === staticMode) return;
      staticMode = next;
      if (!initialized || !alive) return;
      build(true);
      if (staticMode) draw();
      sync();
    }
    reducedQuery.addEventListener?.("change", onModeChange);
    staticQuery.addEventListener?.("change", onModeChange);
    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    }, { rootMargin: "50px" });
    intersection?.observe(canvas);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", sync);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(fontTimer);
      clearTimeout(resizeTimer);
      intersection?.disconnect();
      resizeObserver?.disconnect();
      reducedQuery.removeEventListener?.("change", onModeChange);
      staticQuery.removeEventListener?.("change", onModeChange);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready, onSettled]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
