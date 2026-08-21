import { useEffect, useRef } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Shared plumbing for a full-viewport 2D canvas background: dpr-aware
 * resize, a requestAnimationFrame loop, and a reduced-motion bailout
 * that still paints one frame instead of animating. Every route
 * background only supplies two pure functions — `setup(width, height)`
 * to build whatever state the animation needs, and
 * `render(ctx, width, height, t, state, reduced)` to draw one frame —
 * so five very different animations don't each re-implement the same
 * resize/raf/cleanup bookkeeping.
 */
export function useAnimatedCanvas(setup, render) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // canvas blocked by a privacy extension / browser policy

    const reduced = prefersReducedMotion();
    let raf;
    let width = 0;
    let height = 0;
    let state = {};

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = setup(width, height);
    }
    resize();

    let resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }
    window.addEventListener("resize", onResize);

    function frame(t) {
      render(ctx, width, height, t, state, false);
      raf = requestAnimationFrame(frame);
    }

    if (reduced) {
      render(ctx, width, height, 0, state, true);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
}
