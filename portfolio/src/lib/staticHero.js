import { useEffect, useState } from "react";

/* The hero draws a static name instead of the animated one when motion is
   turned down, on narrow screens, and wherever the pointer is coarse (no
   cursor to disperse the particles). The canvas and the text fallback beside
   it have to agree on that, or the positioning statement ends up shown twice
   or not at all, so both read the condition from here. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const COARSE_OR_NARROW_QUERY = "(max-width: 640px), (pointer: coarse)";

export function matchesStaticHero() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches || window.matchMedia(COARSE_OR_NARROW_QUERY).matches;
}

// Live, so turning motion down with the page open moves the statement out of
// the canvas and into the text beside it in the same render.
export function useStaticHero() {
  const [isStatic, setIsStatic] = useState(matchesStaticHero);
  useEffect(() => {
    if (!window.matchMedia) return;
    const queries = [window.matchMedia(REDUCED_MOTION_QUERY), window.matchMedia(COARSE_OR_NARROW_QUERY)];
    const sync = () => setIsStatic(matchesStaticHero());
    sync();
    for (const query of queries) query.addEventListener?.("change", sync);
    return () => { for (const query of queries) query.removeEventListener?.("change", sync); };
  }, []);
  return isStatic;
}
