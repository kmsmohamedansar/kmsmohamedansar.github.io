import { useEffect, useRef } from "react";

/**
 * A crosshair-style cursor that reads as an extension of the CRT/
 * terminal aesthetic — a dot with a trailing ring that snaps onto
 * interactive elements. Desktop-only (hover + fine pointer); touch
 * devices keep their native cursor entirely. Positions are pushed via
 * refs on every pointermove, not React state, so this never re-renders.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!supportsHover || reduced) return;

    document.documentElement.classList.add("has-custom-cursor");

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;
    let raf;

    function onMove(e) {
      targetX = e.clientX;
      targetY = e.clientY;
      dot.style.transform = `translate(${targetX}px, ${targetY}px)`;

      const hit = e.target.closest("a, button, input, [role='button'], .magnetic");
      ring.dataset.active = hit ? "1" : "0";
    }

    function tick() {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      raf = requestAnimationFrame(tick);
    }

    function onLeave() {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    }
    function onEnter() {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} aria-hidden className="ma-cursor-dot" />
      <div ref={ringRef} aria-hidden className="ma-cursor-ring" />
    </>
  );
}
