import { useEffect, useRef } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeGlowSprite(color) {
  const size = 48;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const octx = off.getContext("2d");
  if (!octx) return null; // canvas blocked by a privacy extension / browser policy
  const grad = octx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${color},0.95)`);
  grad.addColorStop(0.35, `rgba(${color},0.5)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  octx.fillStyle = grad;
  octx.beginPath();
  octx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  octx.fill();
  return off;
}

// Cheap pseudo flow-field: no real Perlin/simplex noise, just two
// out-of-phase sine waves sampled at a point. Smooth and directional
// enough to read as "current," not random jitter.
function flowAngle(x, y, t) {
  return Math.sin(x * 0.0021 + t * 0.00018) * Math.PI + Math.cos(y * 0.0026 - t * 0.00014) * 0.9;
}

// Each destination has its own particle "mood" so the backdrop is
// part of that view's identity, not just a shared wash behind
// whatever's mounted. Every mode shares the same seed/render
// machinery (glow sprites, trails, pointer boost, reduced-motion
// bailout) and only swaps how a particle moves per frame and how
// long a trail it leaves.
const MODES = {
  // deck — the neutral home state: a slow directional current.
  stream: {
    trail: 7,
    seed: () => ({ speed: 0.5 + Math.random() * 0.9 }),
    update(s, t, width, height) {
      const angle = flowAngle(s.x, s.y, t);
      s.x += Math.cos(angle) * s.speed;
      s.y += Math.sin(angle) * s.speed * 0.6 + s.speed * 0.35;
      if (s.x < -20) s.x = width + 20;
      if (s.x > width + 20) s.x = -20;
      if (s.y > height + 20) {
        s.y = -20;
        s.x = Math.random() * width;
        return true; // respawned — caller resets the trail
      }
      return false;
    },
  },
  // emet — data scrolling down a terminal: fast, mostly vertical,
  // narrow lateral jitter.
  signal: {
    trail: 9,
    seed: () => ({ speed: 1.1 + Math.random() * 1.3 }),
    update(s, t, width, height) {
      s.y += s.speed;
      s.x += Math.sin(t * 0.0007 + s.twinklePhase) * 0.35;
      if (s.x < -20) s.x = width + 20;
      if (s.x > width + 20) s.x = -20;
      if (s.y > height + 20) {
        s.y = -20;
        s.x = Math.random() * width;
        return true;
      }
      return false;
    },
  },
  // now — a live status pulse: particles hold position and breathe
  // in place rather than travel.
  pulse: {
    trail: 1,
    seed: (width, height) => {
      const ox = Math.random() * width;
      const oy = Math.random() * height;
      return { ox, oy, orbit: 8 + Math.random() * 22, orbitPhase: Math.random() * Math.PI * 2, orbitSpeed: 0.3 + Math.random() * 0.4 };
    },
    update(s, t) {
      s.x = s.ox + Math.cos(t * 0.0004 * s.orbitSpeed + s.orbitPhase) * s.orbit;
      s.y = s.oy + Math.sin(t * 0.0005 * s.orbitSpeed + s.orbitPhase) * s.orbit;
      return false;
    },
    pulseAmp: 0.6,
  },
  // before — dust settling: drifts down, decelerating, then fades
  // and resets — a quiet, retrospective motion.
  settle: {
    trail: 4,
    seed: () => ({ vy: 0.35 + Math.random() * 0.35, sway: Math.random() * Math.PI * 2 }),
    update(s, t, width, height) {
      s.vy *= 0.997;
      s.y += Math.max(s.vy, 0.03);
      s.x += Math.sin(t * 0.0003 + s.sway) * 0.15;
      if (s.y > height + 20 || s.vy < 0.035) {
        s.y = -20;
        s.x = Math.random() * width;
        s.vy = 0.35 + Math.random() * 0.35;
        return true;
      }
      return false;
    },
  },
  // work — particles ease into a loose grid, like a system
  // assembling itself into structure.
  lattice: {
    trail: 1,
    seed: (width, height) => {
      const cell = 90;
      const cols = Math.max(1, Math.round(width / cell));
      const rows = Math.max(1, Math.round(height / cell));
      const gx = (Math.floor(Math.random() * cols) + 0.5) * (width / cols);
      const gy = (Math.floor(Math.random() * rows) + 0.5) * (height / rows);
      return { gx, gy, jitterPhase: Math.random() * Math.PI * 2 };
    },
    update(s, t) {
      s.x += (s.gx - s.x) * 0.018 + Math.sin(t * 0.001 + s.jitterPhase) * 0.25;
      s.y += (s.gy - s.y) * 0.018 + Math.cos(t * 0.0011 + s.jitterPhase) * 0.25;
      return false;
    },
  },
  // contact — signals converging toward a center point, brightening
  // as they connect, then re-emitting from the edge.
  converge: {
    trail: 6,
    seed: () => ({ speed: 0.006 + Math.random() * 0.01 }),
    update(s, t, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const dx = cx - s.x;
      const dy = cy - s.y;
      const dist = Math.hypot(dx, dy);
      s.x += dx * s.speed;
      s.y += dy * s.speed;
      if (dist < 24) {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { s.x = Math.random() * width; s.y = -20; }
        else if (edge === 1) { s.x = width + 20; s.y = Math.random() * height; }
        else if (edge === 2) { s.x = Math.random() * width; s.y = height + 20; }
        else { s.x = -20; s.y = Math.random() * height; }
        return true;
      }
      return false;
    },
    convergeGlow: true,
  },
};

/**
 * Fixed, viewport-sized backdrop: particles riding whichever motion
 * mood the current view specifies (`theme.mode`), colored from that
 * view's own accent pair. Glow is a pre-rendered sprite blit (cheap)
 * rather than per-frame shadowBlur.
 */
export default function AmbientField({ theme }) {
  const canvasRef = useRef(null);
  const mode = MODES[theme?.mode] || MODES.stream;
  const accent = theme?.accent || "34,211,238";
  const accent2 = theme?.accent2 || "251,191,36";
  // "stream" is the deck's mode exclusively — no other view uses it —
  // so it doubles as the flag for "this is the homepage." Every other
  // view fades to near-black; the landing deck gets a visibly lighter
  // base, a bigger warm wash, and stronger accent glow so it actually
  // reads as bright next to the moodier destinations, not just a
  // slightly-less-dark version of the same navy.
  const isHome = theme?.mode === "stream";
  const base = isHome ? "#41598c" : "#050b14";
  const glowA1 = isHome ? 0.58 : 0.4;
  const glowA1b = isHome ? 0.24 : 0.14;
  const glowA2 = isHome ? 0.46 : 0.32;
  const glowA2b = isHome ? 0.2 : 0.11;
  const homeWash = isHome
    ? `radial-gradient(72% 62% at 50% 30%, rgba(255,255,255,.28) 0%, rgba(255,255,255,.1) 45%, transparent 80%), `
    : "";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // canvas blocked by a privacy extension / browser policy
    const reduced = prefersReducedMotion();

    const spriteA = makeGlowSprite(accent);
    const spriteB = makeGlowSprite(accent2);
    if (!spriteA || !spriteB) return;

    let raf;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999, active: false };

    function particleCount() {
      const area = width * height;
      return Math.min(110, Math.max(50, Math.round(area / 15000)));
    }

    const trailLen = mode.trail;

    let particles = [];
    function seed() {
      particles = Array.from({ length: particleCount() }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const base = {
          x,
          y,
          r: 1.3 + Math.random() * 2,
          warm: Math.random() > 0.82,
          twinkleSpeed: 0.6 + Math.random() * 1.2,
          twinklePhase: Math.random() * Math.PI * 2,
          trail: Array.from({ length: trailLen }, () => ({ x, y })),
        };
        return Object.assign(base, mode.seed(width, height));
      });
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    resize();

    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }
    window.addEventListener("resize", onResize);

    function onPointerMove(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const POINTER_RADIUS = 260;
    const pulseAmp = mode.pulseAmp || 0.3;

    function draw(t) {
      ctx.clearRect(0, 0, width, height);

      for (const s of particles) {
        if (!reduced) {
          const respawned = mode.update(s, t, width, height);
          if (respawned) {
            s.trail = Array.from({ length: trailLen }, () => ({ x: s.x, y: s.y }));
          } else {
            s.trail.push({ x: s.x, y: s.y });
            s.trail.shift();
          }
        }

        const twinkle = reduced ? 1 : 1 - pulseAmp + pulseAmp * (0.5 + 0.5 * Math.sin(t * 0.001 * s.twinkleSpeed + s.twinklePhase));
        const sprite = s.warm ? spriteB : spriteA;
        const baseAlpha = (s.warm ? 0.8 : 0.7) * twinkle;

        let pointerBoost = 0;
        let pointerRBoost = 0;
        if (pointer.active) {
          const dx = s.x - pointer.x;
          const dy = s.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < POINTER_RADIUS) {
            const boost = 1 - d / POINTER_RADIUS;
            pointerBoost = boost * 0.35;
            pointerRBoost = boost * 2;
          }
        }

        const trail = reduced ? [s.trail[s.trail.length - 1]] : s.trail;
        for (let i = 0; i < trail.length; i++) {
          const p = trail[i];
          const fade = (i + 1) / trail.length;
          const r = s.r + pointerRBoost * fade;
          const alpha = Math.min(1, (baseAlpha * fade * fade + pointerBoost) * fade);
          const size = r * 7;
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    }

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme?.mode, accent, accent2]);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <div
          className="ambient-drift absolute -inset-[20%]"
          style={{
            background: `${homeWash}radial-gradient(80% 80% at 20% 26%, rgba(${accent},${glowA1}) 0%, rgba(${accent},${glowA1b}) 45%, transparent 85%), radial-gradient(75% 75% at 82% 68%, rgba(${accent2},${glowA2}) 0%, rgba(${accent2},${glowA2b}) 45%, transparent 85%), radial-gradient(70% 70% at 55% 8%, rgba(142,125,255,.22) 0%, rgba(142,125,255,.08) 45%, transparent 85%), ${base}`,
          }}
        />
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
      />
    </>
  );
}
