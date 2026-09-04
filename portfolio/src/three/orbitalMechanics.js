// Real Keplerian orbital mechanics — not a simulated "feel." Each
// planet's shape and orientation come from JPL's published J2000
// osculating elements (the standard reference set used for
// approximate planet positions between 1800-2050 AD); position along
// that fixed ellipse at any moment comes from actually solving
// Kepler's equation, the same procedure any orbital mechanics
// textbook uses. What's stylized is the clock (a fictional
// accelerated time, not the real current date/time — a portfolio
// backdrop that only visibly moved once a year would defeat the
// point) and the display scale (radial distance and body size are
// both compressed so Mercury and Neptune can share a frame — no
// visualization anywhere shows the real solar system to one scale
// and stays readable).
//
// Elements: a = semi-major axis (AU), e = eccentricity,
// i = inclination (deg), L = mean longitude at epoch (deg),
// longPeri = longitude of perihelion (deg), longNode = longitude of
// ascending node (deg), period = orbital period (days).
// Body radii are compressed too (a linear-to-real scale would make
// Jupiter loom 6x wider than the sun once its true 11x-Earth radius
// meets this scene's compressed orbital distances) — order and
// relative "small rocky vs. big gas giant" impression are preserved,
// true ratios are not. Kept well under SUN_RADIUS specifically so no
// planet reads as bigger than the star it orbits.
export const PLANETS = [
  { name: "Mercury", a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.2503235, longPeri: 77.45779628, longNode: 48.33076593, period: 87.9691, radius: 0.1, color: "#9a9186" },
  { name: "Venus", a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.979095, longPeri: 131.60246718, longNode: 76.67984255, period: 224.701, radius: 0.16, color: "#c9a96b" },
  { name: "Earth", a: 1.00000261, e: 0.01671123, i: 0.0, L: 100.46457166, longPeri: 102.93768193, longNode: 0.0, period: 365.256, radius: 0.17, color: "#5b8fb0" },
  { name: "Mars", a: 1.52371034, e: 0.0933941, i: 1.84969142, L: -4.55343205, longPeri: -23.94362959, longNode: 49.55953891, period: 686.98, radius: 0.13, color: "#b4562f" },
  { name: "Jupiter", a: 5.202887, e: 0.04838624, i: 1.30439695, L: 34.39644051, longPeri: 14.72847983, longNode: 100.47390909, period: 4332.589, radius: 0.55, color: "#b8977a" },
  { name: "Saturn", a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, longPeri: 92.59887831, longNode: 113.66242448, period: 10759.22, radius: 0.5, color: "#d4bd83", ring: true },
  { name: "Uranus", a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, longPeri: 170.9542763, longNode: 74.01692503, period: 30688.5, radius: 0.32, color: "#8fc4d4" },
  { name: "Neptune", a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, longPeri: 44.96476227, longNode: 131.78422574, period: 60182, radius: 0.3, color: "#5470c9" },
];

const DEG2RAD = Math.PI / 180;

// Newton-Raphson solution to Kepler's equation M = E - e*sin(E).
// Converges in a handful of iterations for every eccentricity in
// this solar system (all well under the near-parabolic regime where
// this method struggles).
function solveEccentricAnomaly(meanAnomalyRad, e) {
  let E = meanAnomalyRad;
  for (let iter = 0; iter < 8; iter++) {
    const dE = (E - e * Math.sin(E) - meanAnomalyRad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/**
 * Heliocentric ecliptic position (AU) of a planet at simulated time
 * `days` (days elapsed from the J2000 epoch the elements are
 * defined at — a fictional, accelerated clock, not a real date).
 * Returns { x, y, z } with z as the out-of-ecliptic axis, matching
 * this scene's Y-up convention once the caller swaps y/z.
 */
export function planetPosition(planet, days) {
  const meanMotion = 360 / planet.period; // deg/day
  const M = ((planet.L + meanMotion * days - planet.longPeri) % 360) * DEG2RAD;
  const e = planet.e;
  const E = solveEccentricAnomaly(M, e);

  // Position in the orbital plane, perihelion on the +x axis.
  const xOrbit = Math.cos(E) - e;
  const yOrbit = Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.sqrt(xOrbit * xOrbit + yOrbit * yOrbit);
  const trueAnomaly = Math.atan2(yOrbit, xOrbit);

  // Rotate by argument of periapsis, inclination, and ascending node
  // to go from the orbital plane to heliocentric ecliptic coordinates.
  const omega = (planet.longPeri - planet.longNode) * DEG2RAD;
  const incl = planet.i * DEG2RAD;
  const node = planet.longNode * DEG2RAD;
  const u = trueAnomaly + omega; // argument of latitude

  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosIncl = Math.cos(incl);
  const sinIncl = Math.sin(incl);
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);

  const x = r * (cosNode * cosU - sinNode * sinU * cosIncl);
  const y = r * (sinNode * cosU + cosNode * sinU * cosIncl);
  const z = r * (sinU * sinIncl);

  return { x, y, z, r };
}

// A compressed radial scale (sqrt, not linear) so Mercury and
// Neptune can share a frame — the real ~77x spread between them
// would otherwise crowd every inner planet into a few pixels around
// the sun or push the camera absurdly far back to fit Neptune.
export function displayRadius(auDistance, scale) {
  return Math.sqrt(auDistance) * scale;
}

// Trace an orbit's full ellipse as a line — drawn once per planet at
// scene-build time (the ellipse's shape is fixed; only the planet's
// position along it moves), not recomputed per frame.
export function buildOrbitPoints(planet, scale, segments = 128) {
  const points = [];
  for (let s = 0; s <= segments; s++) {
    const days = (s / segments) * planet.period;
    const { x, y, z, r } = planetPosition(planet, days);
    const dr = displayRadius(r, scale) / r;
    points.push([x * dr, z * dr, -y * dr]);
  }
  return points;
}
