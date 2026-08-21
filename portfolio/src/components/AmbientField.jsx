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

/**
 * Fixed, viewport-sized backdrop: particles riding a slow directional
 * flow field, each trailing a short fading comet instead of sitting
 * still and wiring up to its neighbors. Reads as data moving through a
 * system (a signal, a stream) rather than a static proximity mesh —
 * the previous "everyone's connected to everyone nearby" look. Glow is
 * a pre-rendered sprite blit (cheap) rather than per-frame shadowBlur.
 */
export default function AmbientField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // canvas blocked by a privacy extension / browser policy
    const reduced = prefersReducedMotion();

    const spriteCyan = makeGlowSprite("120,225,255");
    const spriteAmber = makeGlowSprite("251,191,36");
    if (!spriteCyan || !spriteAmber) return;

    let raf;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999, active: false };

    function streamCount() {
      const area = width * height;
      return Math.min(110, Math.max(50, Math.round(area / 15000)));
    }

    const TRAIL_LEN = 7;

    let streams = [];
    function seed() {
      streams = Array.from({ length: streamCount() }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          speed: 0.5 + Math.random() * 0.9,
          r: 1.3 + Math.random() * 2,
          warm: Math.random() > 0.85,
          twinkleSpeed: 0.6 + Math.random() * 1.2,
          twinklePhase: Math.random() * Math.PI * 2,
          trail: Array.from({ length: TRAIL_LEN }, () => ({ x, y })),
        };
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

    function draw(t) {
      ctx.clearRect(0, 0, width, height);

      for (const s of streams) {
        if (!reduced) {
          const angle = flowAngle(s.x, s.y, t);
          s.x += Math.cos(angle) * s.speed;
          s.y += Math.sin(angle) * s.speed * 0.6 + s.speed * 0.35;

          if (s.x < -20) s.x = width + 20;
          if (s.x > width + 20) s.x = -20;
          if (s.y > height + 20) {
            s.y = -20;
            s.x = Math.random() * width;
            s.trail = Array.from({ length: TRAIL_LEN }, () => ({ x: s.x, y: s.y }));
          }

          s.trail.push({ x: s.x, y: s.y });
          s.trail.shift();
        }

        const twinkle = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 0.001 * s.twinkleSpeed + s.twinklePhase);
        const sprite = s.warm ? spriteAmber : spriteCyan;
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
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <div
          className="ambient-drift absolute -inset-[20%]"
          style={{
            background:
              "radial-gradient(80% 80% at 20% 26%, rgba(34,211,238,.4) 0%, rgba(34,211,238,.14) 45%, transparent 85%), radial-gradient(75% 75% at 82% 68%, rgba(251,191,36,.32) 0%, rgba(251,191,36,.11) 45%, transparent 85%), radial-gradient(70% 70% at 55% 8%, rgba(142,125,255,.3) 0%, rgba(142,125,255,.1) 45%, transparent 85%), #050b14",
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
