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
  grad.addColorStop(0, `rgba(${color},0.9)`);
  grad.addColorStop(0.4, `rgba(${color},0.35)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  octx.fillStyle = grad;
  octx.beginPath();
  octx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  octx.fill();
  return off;
}

/**
 * Light-theme backdrop — a different visual language than the dark
 * neon "data mesh": soft morphing aurora blobs (CSS) plus slow-rising
 * bokeh motes (canvas) that sway and fade like dust in daylight, no
 * connecting lines. Interconnected wireframe lines read as
 * "cyberpunk" against white; drifting light does not.
 */
export default function LightAmbientField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // canvas blocked by a privacy extension / browser policy
    const reduced = prefersReducedMotion();

    const spriteCyan = makeGlowSprite("14,116,144");
    const spriteAmber = makeGlowSprite("217,119,6");
    const spriteViolet = makeGlowSprite("109,89,222");
    if (!spriteCyan || !spriteAmber || !spriteViolet) return;
    const sprites = [spriteCyan, spriteAmber, spriteViolet];

    let raf;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999, active: false };

    function moteCount() {
      const area = width * height;
      return Math.min(90, Math.max(45, Math.round(area / 17000)));
    }

    let motes = [];
    function seed() {
      motes = Array.from({ length: moteCount() }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          // gentle upward drift with per-mote sway, not a bouncing field
          riseSpeed: 0.08 + Math.random() * 0.16,
          swaySpeed: 0.4 + Math.random() * 0.5,
          swayAmp: 10 + Math.random() * 22,
          swayPhase: Math.random() * Math.PI * 2,
          r: 1.6 + Math.random() * 2.6,
          sprite: sprites[Math.floor(Math.random() * sprites.length)],
          twinkleSpeed: 0.4 + Math.random() * 0.9,
          twinklePhase: Math.random() * Math.PI * 2,
          baseAlpha: 0.22 + Math.random() * 0.24,
          trail: [{ x, y }, { x, y }, { x, y }],
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

    const POINTER_RADIUS = 240;

    function draw(t) {
      ctx.clearRect(0, 0, width, height);

      for (const m of motes) {
        const twinkle = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 0.001 * m.twinkleSpeed + m.twinklePhase);
        let alpha = m.baseAlpha * twinkle;
        let r = m.r;

        const sway = Math.sin(t * 0.0006 * m.swaySpeed + m.swayPhase) * m.swayAmp;
        const drawX = m.x + sway;

        if (pointer.active) {
          const dx = drawX - pointer.x;
          const dy = m.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < POINTER_RADIUS) {
            const boost = 1 - d / POINTER_RADIUS;
            alpha = Math.min(0.85, alpha + boost * 0.35);
            r += boost * 2;
          }
        }

        // A short, soft trail so each mote reads as gently smeared
        // light rising through the frame rather than a blinking dot.
        const trail = reduced ? [{ x: drawX, y: m.y }] : [...m.trail, { x: drawX, y: m.y }];
        for (let i = 0; i < trail.length; i++) {
          const p = trail[i];
          const fade = (i + 1) / trail.length;
          const s = r * 7 * (0.7 + fade * 0.3);
          ctx.globalAlpha = alpha * fade * 0.8;
          ctx.drawImage(m.sprite, p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;

        if (!reduced) {
          m.trail.push({ x: drawX, y: m.y });
          m.trail.shift();
          m.y -= m.riseSpeed;
          if (m.y < -20) {
            m.y = height + 20;
            m.x = Math.random() * width;
            m.trail = [{ x: m.x, y: m.y }, { x: m.x, y: m.y }, { x: m.x, y: m.y }];
          }
        }
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
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
      <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-0 pointer-events-none" />
    </>
  );
}
