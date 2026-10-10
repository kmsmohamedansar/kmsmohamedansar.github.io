import { useEffect, useRef } from "react";

/* The opening: a few thousand dots start out tracing the infinity loop,
   then drift into "Hi, I'm / Mohamed Ansar". Plain 2D canvas (no three.js),
   so it paints fast. The pointer gently pushes dots aside. With reduced
   motion the name is drawn straight away, no movement. */

// A sweep across the name, left to right: deep cyan, violet, rose, amber.
const STOPS = [[14, 116, 144], [109, 40, 217], [190, 24, 93], [180, 83, 9]];
function sweep(f) {
  const x = Math.min(0.999, Math.max(0, f)) * (STOPS.length - 1);
  const i = Math.floor(x), k = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const c = a.map((v, j) => Math.round(v + (b[j] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function sampleText(w, h, dpr) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const narrow = w / dpr < 640;
  const lines = narrow ? ["Mohamed", "Ansar"] : ["Mohamed Ansar"];
  // Biggest size that fits the width, capped by height.
  g.font = `700 100px Outfit, sans-serif`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  const big = Math.min((w * 0.86 * 100) / widest, (h * 0.62) / (lines.length * 0.95 + 0.55));
  const small = big * 0.42;
  const total = small * 1.1 + lines.length * big * 0.95;
  let y = (h - total) / 2 + small;
  g.fillStyle = "#000";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.font = `500 ${small}px Outfit, sans-serif`;
  g.fillText("Hi, I'm", w / 2, y);
  y += small * 0.2 + big * 0.82;
  g.font = `700 ${big}px Outfit, sans-serif`;
  for (const l of lines) {
    g.fillText(l, w / 2, y);
    y += big * 0.95;
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

export default function NameParticles({ ready = true, onSettled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ready) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let parts = [];
    let radius = 1;
    let start = 0;
    let settledSent = false;
    const pointer = { x: -1e4, y: -1e4 };
    let dpr = 1;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      const { pts, step } = sampleText(canvas.width, canvas.height, dpr);
      radius = step * 0.36;
      const w = canvas.width, h = canvas.height;
      const s = Math.min(w * 0.38, h * 0.62);
      parts = pts.map(([tx, ty], i) => {
        // Start on the infinity loop (a lemniscate), like the old opening.
        const t = (i / pts.length) * Math.PI * 2 + Math.random() * 0.05;
        const d = 1 + Math.sin(t) ** 2;
        const sx = w / 2 + (s * Math.cos(t)) / d + (Math.random() - 0.5) * s * 0.08;
        const sy = h / 2 + (s * Math.sin(t) * Math.cos(t)) / d + (Math.random() - 0.5) * s * 0.08;
        return { tx, ty, x: sx, y: sy, sx, sy, vx: 0, vy: 0, c: Math.random() < 0.18 ? "#0b1220" : sweep(tx / w + (Math.random() - 0.5) * 0.08), delay: Math.random() * 0.5, ph: Math.random() * 6.28 };
      });
    }

    const ease = (k) => 1 - Math.pow(1 - k, 4);
    const HOLD = 0.7, FLY = 1.6;

    function frame(now) {
      if (!start) start = now;
      const el = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const pr = 70 * dpr;
      let allHome = true;
      for (const p of parts) {
        const k = reduced ? 1 : Math.min(1, Math.max(0, (el - HOLD - p.delay) / FLY));
        if (k < 1) {
          allHome = false;
          // Before the move, the loop slowly turns.
          const e = ease(k);
          const wob = (1 - e) * Math.sin(el * 1.4 + p.ph) * 3 * dpr;
          p.x = p.sx + (p.tx - p.sx) * e + wob;
          p.y = p.sy + (p.ty - p.sy) * e;
        } else if (!reduced) {
          // Settled: spring home, pushed aside by the pointer.
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < pr * pr) {
            const f = (1 - Math.sqrt(d2) / pr) * 2.2 * dpr;
            const d = Math.sqrt(d2) || 1;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
          p.vx += (p.tx + Math.sin(el * 1.3 + p.ph) * 0.6 * dpr - p.x) * 0.06;
          p.vy += (p.ty + Math.cos(el * 1.1 + p.ph) * 0.6 * dpr - p.y) * 0.06;
          p.vx *= 0.82;
          p.vy *= 0.82;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          p.x = p.tx;
          p.y = p.ty;
        }
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
      }
      if (allHome && !settledSent) {
        settledSent = true;
        onSettled?.();
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    }

    let alive = true;
    (document.fonts?.load ? document.fonts.load("700 100px Outfit") : Promise.resolve()).finally(() => {
      if (!alive) return;
      build();
      raf = requestAnimationFrame(frame);
    });

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) * dpr;
      pointer.y = (e.clientY - r.top) * dpr;
    }
    function onLeave() {
      pointer.x = pointer.y = -1e4;
    }
    let resizeT;
    function onResize() {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        build();
        start = performance.now() - (HOLD + FLY + 0.6) * 1000; // no replay on resize
        if (reduced) frame(performance.now());
      }, 150);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeT);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [ready, onSettled]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
