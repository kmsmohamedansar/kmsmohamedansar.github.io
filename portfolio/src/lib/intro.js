export const INTRO_SESSION_KEY = "intro-played";

/* Whether the intro curtain should play: once per browser session, never
   with reduced motion, and never if storage is unavailable (private mode),
   since an intro that replays on every page is worse than none. */
export function shouldPlayIntro() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !window.sessionStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return false;
  }
}
