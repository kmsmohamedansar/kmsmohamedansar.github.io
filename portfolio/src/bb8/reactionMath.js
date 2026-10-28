// The maths behind Emet's reactions to things happening outside its own
// canvas: a cursor moving anywhere on the page, and the page scrolling.
//
// Kept free of three.js so it can be unit tested on its own, and so the
// numbers that decide how the droid feels sit in one readable place.

// How far from the droid, in pixels, a cursor still counts as worth
// watching. Past this it is just someone using the site.
export const WATCH_RADIUS = 520;
// How long the droid keeps looking after the cursor last moved.
export const WATCH_MEMORY_MS = 2400;
// The widest the head turns to follow something off to one side.
export const WATCH_MAX_YAW = 0.46;
export const WATCH_MAX_PITCH = 0.15;
export const SCROLL_DURATION_MS = 620;
// Below this many pixels in one burst, scrolling is not worth a reaction.
export const SCROLL_TRIGGER_PX = 34;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * How strongly the droid attends to a cursor `distance` pixels away: full
 * attention when it is close, tailing off to nothing at WATCH_RADIUS.
 */
export function watchStrength(distance) {
  if (!(distance >= 0) || distance >= WATCH_RADIUS) return 0;
  const closeness = 1 - distance / WATCH_RADIUS;
  // Eased so the droid commits to a nearby cursor rather than drifting.
  return closeness * closeness;
}

/**
 * Head pose for a cursor offset (dx, dy) pixels from the droid on screen.
 * Returns null when the cursor is too far away to care about.
 */
export function watchPose(dx, dy) {
  const distance = Math.hypot(dx, dy);
  const strength = watchStrength(distance);
  if (!strength) return null;
  // Normalised against the radius so the turn grows with how far to the
  // side the cursor is, not with raw pixels.
  const yaw = clamp((dx / WATCH_RADIUS) * 1.6, -1, 1) * WATCH_MAX_YAW * strength;
  const pitch = clamp((dy / WATCH_RADIUS) * 1.4, -1, 1) * WATCH_MAX_PITCH * strength;
  return {
    yaw,
    pitch,
    roll: clamp(-yaw * 0.22, -0.1, 0.1),
    strength,
  };
}

/**
 * Head pose for a scroll of `amount` pixels (positive is downward), at
 * `progress` through the reaction. Emet braces against the movement and
 * recovers, so it reads as the page being pulled past it.
 */
export function scrollPose(amount, progress) {
  if (progress < 0 || progress >= 1) return null;
  const direction = Math.sign(amount) || 1;
  // Rises and falls once across the reaction.
  const envelope = Math.sin(progress * Math.PI);
  const intensity = clamp(Math.abs(amount) / 900, 0.25, 1);
  return {
    pitch: -direction * envelope * 0.12 * intensity,
    roll: direction * envelope * 0.05 * intensity,
    lift: envelope * 0.03 * intensity,
    antenna: -direction * envelope * 0.09 * intensity,
  };
}
