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

/**
 * Fixed, viewport-sized "data mesh" backdrop — a field of slowly
 * drifting glowing nodes that link up when close enough, brightening
 * near the cursor. Viewport-relative (not tied to document scroll) so
 * it reads as a constant backdrop behind every section instead of
 * thinning out on a tall page. Glow is a pre-rendered sprite blit
 * (cheap) rather than per-frame shadowBlur (expensive) — the big color
 * wash lives in a separate CSS layer so the compositor handles it for
 * free instead of the canvas repainting full-viewport gradients.
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

    function nodeCount() {
      const area = width * height;
      return Math.min(130, Math.max(70, Math.round(area / 12000)));
    }

    let nodes = [];
    function seed() {
      nodes = Array.from({ length: nodeCount() }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.62,
        vy: (Math.random() - 0.5) * 0.62,
        r: 1.4 + Math.random() * 2.2,
        warm: Math.random() > 0.82,
        twinkleSpeed: 0.6 + Math.random() * 1.4,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
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

    const LINK_DIST = 165;
    const POINTER_RADIUS = 280;

    function draw(t) {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.34;
            ctx.strokeStyle = `rgba(120,225,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const twinkle = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * n.twinkleSpeed + n.twinklePhase);
        let alpha = (n.warm ? 0.85 : 0.75) * twinkle;
        let r = n.r;
        if (pointer.active) {
          const dx = n.x - pointer.x;
          const dy = n.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < POINTER_RADIUS) {
            const boost = 1 - d / POINTER_RADIUS;
            alpha = Math.min(1, alpha + boost * 0.4);
            r += boost * 2.4;
          }
        }
        const sprite = n.warm ? spriteAmber : spriteCyan;
        const s = r * 7;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, n.x - s / 2, n.y - s / 2, s, s);
        ctx.globalAlpha = 1;

        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;
        }
      }

      raf = requestAnimationFrame(draw);
    }

    if (reduced) {
      draw();
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
