import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Same per-section color cue the old backdrop used — whichever
// [data-star-accent] section is most visible slowly pulls the glow
// mesh behind the star field toward that section's color.
const SECTION_ACCENTS = {
  hero: "#22d3ee",
  source: "#8e7dff",
  lineage: "#fbbf24",
  build: "#34d399",
  commit: "#fb7185",
};

// Both counts scaled up ~29% alongside the shapeScale increase below
// (5.4/4.2 desktop, 2.6/2 mobile) — a curve's own density scales
// linearly with its length, not with area, so matching that ratio
// keeps the same spacing between stars along the loop at the larger
// size instead of thinning it out.
const PARTICLE_COUNT_DESKTOP = 3350;
const PARTICLE_COUNT_MOBILE = 1100;
const SHAPE_SHARE = 0.72; // ~72% recruited into the infinity loop, the rest ambient

// Uniform-in-volume sphere sample (rejection method) — both the
// "ambient" particles' resting spot and every particle's fully
// dispersed aTargetPosition come from this.
function randomInSphere(radius) {
  let x, y, z;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
  } while (x * x + y * y + z * z > 1);
  return [x * radius, y * radius, z * radius];
}

// A point on a Lemniscate of Bernoulli — a true figure-eight/infinity
// curve, not an approximation stitched from two circles:
//   x(theta) = scale * cos(theta) / (1 + sin(theta)^2)
//   y(theta) = scale * sin(theta) * cos(theta) / (1 + sin(theta)^2)
// theta in [0, 2*PI) traces both loops exactly once each, crossing
// through the origin twice (theta = PI/2 and 3*PI/2). `scale` is the
// distance from center to each loop's outer tip (theta = 0 and PI).
//
// The curve's own geometry already puts more particles near the
// center crossing than out at the tips — dx/dtheta and dy/dtheta both
// shrink as theta approaches the crossing angles, so a uniformly
// sampled `t` naturally spends more of its arc length there. That's
// the same "let the curve's own math supply the density gradient"
// approach the previous spiral formation used, for the same reason:
// stacking an extra bias on top of a formula that already concentrates
// on its own is how a "bright core" turns into an indistinct blob.
function infinityPoint(t, scale) {
  const theta = t * Math.PI * 2;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const denom = 1 + s * s;
  const x = (scale * c) / denom;
  const y = (scale * s * c) / denom;
  const radius = Math.sqrt(x * x + y * y); // 0 at the crossing, `scale` at the tips
  // Flat cartesian jitter (not one that divides by radius) for the
  // same reason the spiral's arm jitter did: a divide-by-radius term
  // blows up to scatter points almost randomly right at the crossing,
  // exactly where this curve already spends the most arc length.
  const bandWidth = scale * 0.05 + radius * 0.09;
  const jx = (Math.random() - 0.5) * bandWidth;
  const jy = (Math.random() - 0.5) * bandWidth;
  return [x + jx, y + jy, radius];
}

/**
 * Builds the particle system: ~72% of particles are recruited into an
 * infinity-shaped (lemniscate) loop, the rest sit as ambient background
 * stars that barely move. Every particle also carries a fully
 * dispersed aTargetPosition (uniform-in-a-sphere) that
 * `uScrollProgress` morphs it toward. Per-particle aColor runs a
 * three-stop gradient — bright cyan-white at the center crossing,
 * through vivid violet at the loops' midpoints, out to warm gold at
 * the two outer tips — spec'd as a fixed attribute (baked once here),
 * not something recomputed per frame.
 */
function buildParticles(count, { shapeOffsetX, shapeOffsetY, shapeScale, pixelRatio }) {
  const shapeCount = Math.round(count * SHAPE_SHARE);
  const centerColor = new THREE.Color("#a8f8ff"); // hot cyan-white at the crossing
  const midColor = new THREE.Color("#c77dff"); // vivid violet through the loops
  const outerColor = new THREE.Color("#ffb35c"); // warm gold at the tips
  const white = new THREE.Color("#ffffff");

  const position = new Float32Array(count * 3); // required by BufferGeometry/Points; unused by the shader, which reads the two attributes below instead
  const aTargetPosition = new Float32Array(count * 3);
  const aSize = new Float32Array(count);
  const aPhase = new Float32Array(count);
  const aSpeed = new Float32Array(count);
  const aColor = new Float32Array(count * 3);
  const aBrightness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const [dx, dy, dz] = randomInSphere(1);
    const r = 16 + Math.random() * 34;
    aTargetPosition[i * 3] = dx * r;
    aTargetPosition[i * 3 + 1] = dy * r;
    aTargetPosition[i * 3 + 2] = dz * r - 6;

    let radiusFrac = 1; // 0 = center crossing, 1 = outer tips; ambient particles count as "tip" for color/size
    if (i < shapeCount) {
      const t = Math.random();
      const [sx, sy, radius] = infinityPoint(t, shapeScale);
      radiusFrac = Math.min(1, radius / shapeScale);
      position[i * 3] = sx + shapeOffsetX;
      position[i * 3 + 1] = sy + shapeOffsetY;
      position[i * 3 + 2] = (Math.random() - 0.5) * (0.6 + radiusFrac * 1.4);
    } else {
      // Ambient stars, already scattered near their dispersed spot —
      // present even while the infinity loop is fully assembled, so it
      // never reads as an empty void around the shape.
      position[i * 3] = aTargetPosition[i * 3] * 0.4;
      position[i * 3 + 1] = aTargetPosition[i * 3 + 1] * 0.4;
      position[i * 3 + 2] = aTargetPosition[i * 3 + 2] * 0.4 - 4;
    }

    // Smaller near the core (still the densest area even with the
    // fixes above) so individual stars stay distinct; full-size range
    // at the rim, where points are already well spaced.
    const coreSizeScale = i < shapeCount ? 0.45 + 0.55 * radiusFrac : 1;
    const roll = Math.random();
    let brightness;
    // Halved from the previous 1.4-8 range: those sizes, run through
    // the perspective/pixel-ratio scale-up below, were landing most
    // points at or near the point-size cap — big enough that, even
    // with a mathematically sharp edge, a field of large overlapping
    // additively-blended circles reads as soft bokeh rather than
    // small, distinct points of light. Smaller base sizes fix that at
    // the source rather than fighting it in the fragment shader.
    if (roll > 0.985) {
      aSize[i] = (2.5 + Math.random() * 1.0) * coreSizeScale;
      brightness = 1;
    } else if (roll > 0.9) {
      aSize[i] = (1.5 + Math.random() * 0.7) * coreSizeScale;
      brightness = 0.75 + Math.random() * 0.25;
    } else {
      aSize[i] = (0.7 + Math.random() * 0.7) * coreSizeScale;
      brightness = 0.4 + Math.random() * 0.4;
    }
    aPhase[i] = Math.random() * Math.PI * 2;
    aSpeed[i] = 0.4 + Math.random() * 1.4;

    const colorT = i < shapeCount ? radiusFrac : 0.75 + Math.random() * 0.25;
    // Three-stop gradient: center -> mid across the first half of the
    // range, mid -> outer across the second half, so the vivid violet
    // shows up as a real midpoint band along each loop rather than
    // just an average blur between two endpoint colors.
    const color =
      colorT < 0.5
        ? centerColor.clone().lerp(midColor, colorT * 2)
        : midColor.clone().lerp(outerColor, (colorT - 0.5) * 2);
    color.lerp(white, brightness * 0.5);
    aColor[i * 3] = color.r;
    aColor[i * 3 + 1] = color.g;
    aColor[i * 3 + 2] = color.b;
    // Brightness multiplies into alpha per-frame in the fragment shader
    // (alongside the twinkle), not baked into aColor, so the twinkle
    // can still animate independently of it.
    aBrightness[i] = brightness;
  }

  return finishParticles();

  function finishParticles() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("aTargetPosition", new THREE.BufferAttribute(aTargetPosition, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(aSpeed, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    geometry.setAttribute("aBrightness", new THREE.BufferAttribute(aBrightness, 1));

    // One shared uniforms object, referenced by both materials below —
    // updating uTime/uScrollProgress/etc. once per frame (in the
    // component's render loop) keeps both layers in sync automatically,
    // with no separate bookkeeping for the halo's copy of the same values.
    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uScrollProgress: { value: 0 },
      uMouseWorld: { value: new THREE.Vector3(9999, 9999, 9999) },
      uMouseActive: { value: 0 },
    };

    const coreMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
    });
    const haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
    });

    // Halo drawn first: with additive blending the sum is the same
    // regardless of order, but drawing the soft, larger layer before
    // the crisp, smaller one keeps the crisp cores from ever being the
    // ones "underneath" in a renderer that doesn't sort perfectly.
    const halo = new THREE.Points(geometry, haloMaterial);
    const core = new THREE.Points(geometry, coreMaterial);
    const group = new THREE.Group();
    group.add(halo, core);

    return { group, geometry, coreMaterial, haloMaterial, uniforms };
  }
}

// aTargetPosition: fully-dispersed resting spot every particle morphs
// toward as uScrollProgress goes 0 -> 1 (mix() in the vertex shader).
// uMouseWorld: the world-space point the cursor currently projects to
// (computed once per pointermove on the CPU via a single raycast —
// see the component below for why that's the right place for it, not
// a per-vertex reconstruction in this shader). uMouseActive gates the
// repel to zero when the pointer has left the window.
const particleVertexShader = /* glsl */ `
  attribute vec3 aTargetPosition;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  attribute float aBrightness;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScrollProgress;
  uniform vec3 uMouseWorld;
  uniform float uMouseActive;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkle;
  // Carries the exact gl_PointSize this vertex resolved to (after
  // perspective attenuation and the pixel-ratio scale) down to the
  // fragment stage, so the edge anti-aliasing there can be sized as
  // "exactly one physical pixel" for THIS point, not a guess.
  varying float vComputedPointSize;

  void main() {
    vec3 basePos = mix(position, aTargetPosition, uScrollProgress);

    // GPU-side repel: a pure function of the particle's current
    // (already-morphed) distance to uMouseWorld, with zero persisted
    // velocity — particles drift back at whatever rate their distance
    // to the cursor changes, the instant it moves away or scroll
    // progress shifts the base position out from under them.
    vec3 toParticle = basePos - uMouseWorld;
    float dist = length(toParticle);
    float repel = smoothstep(3.2, 0.0, dist) * uMouseActive;
    vec3 dir = dist > 0.0001 ? toParticle / dist : vec3(0.0, 1.0, 0.0);
    vec3 finalPos = basePos + dir * repel * 2.3;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Perspective-correct size attenuation, capped so a particle that
    // ends up nearly on the camera's view axis can't balloon into an
    // out-of-place disc. Cap halved (18 -> 9 CSS px) alongside the
    // halved base sizes above — the old cap was routinely being hit,
    // which is how a field of "stars" ended up reading as a field of
    // largeish soft circles instead.
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mvPosition.z, 1.0)), 9.0 * uPixelRatio);
    vComputedPointSize = gl_PointSize;
    vColor = aColor;
    vBrightness = aBrightness;
    vTwinkle = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
  }
`;

// No texture sample — the circle is pure math from gl_PointCoord.
// Edge anti-aliasing is computed analytically from the point's own
// resolved screen-space size (vComputedPointSize, passed in from the
// vertex stage) rather than via fwidth()/dFdx()/dFdy(): derivative
// functions are evaluated per 2x2-fragment quad by the rasterizer,
// and for small, sparse primitives like point sprites those quads are
// frequently only partially covered by the primitive, which makes the
// derivative estimate at exactly the pixels that matter most — the
// edge — inconsistent across GPUs and drivers (particularly software
// rasterizers). Sizing the fade as "exactly one pixel" directly from
// 1/vComputedPointSize sidesteps that dependency entirely: every star
// gets the same crisp, ~1px-wide edge regardless of point size, pixel
// ratio, or renderer.
const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkle;
  varying float vComputedPointSize;

  void main() {
    // Transform coordinates from (0.0 -> 1.0) to centered space (-0.5 -> 0.5)
    vec2 relativeCoordinates = gl_PointCoord - vec2(0.5);
    float distanceCalculated = length(relativeCoordinates);

    // Edge sits at 0.48, not 0.5 — pulling it in a hair keeps every
    // point a true, tight disc with no residual anti-aliased fringe
    // reading as extra softness at the boundary.
    float thresholdEdge = 0.48;
    // How wide one physical pixel is, expressed in this point's own
    // normalized 0-0.5 radius units — a big point's edge fades over
    // the same *physical* pixel as a small point's, not the same
    // fraction of its own size.
    float sharpnessMargin = 1.0 / max(vComputedPointSize, 1.0);
    float analyticalAlpha = smoothstep(thresholdEdge, thresholdEdge - sharpnessMargin, distanceCalculated);
    if (analyticalAlpha <= 0.0) discard;
    // Brightness stays folded into alpha alongside the twinkle (not
    // just the edge factor) — it's what gives dim/common stars vs.
    // rare bright ones their distinct read, independent of the
    // twinkle's own animation.
    float alpha = analyticalAlpha * vBrightness * vTwinkle;

    // A flat-filled disc reads as a colored bubble, not a star — real
    // starlight is brightest dead center and falls off toward its own
    // edge. Blending toward white as distanceCalculated shrinks gives
    // each point a small hot core inside its own boundary, independent
    // of the crisp edge computed above (that edge is still exactly
    // where alpha above hits zero; this only changes the color inside
    // it).
    float hotCore = pow(1.0 - clamp(distanceCalculated / thresholdEdge, 0.0, 1.0), 2.0);
    vec3 starColor = mix(vColor, vec3(1.0), hotCore * 0.85);
    gl_FragColor = vec4(starColor, alpha);
  }
`;

// The halo layer: a second, much larger and much dimmer point drawn
// at the exact same position as each star's crisp core (same geometry,
// same attributes, same repel/twinkle math — only the size formula and
// fragment falloff differ). This is what gives bright stars a soft
// glint without reintroducing the "big soft blob" bug the core sizes
// were shrunk to fix: unlike that bug, this halo is deliberately soft
// (a smooth pow() falloff, not the core's sharp analytic edge) and
// deliberately dim (a low fixed alpha ceiling below), so it reads as
// a gentle bloom sitting *under* a still-crisp point of light, not as
// the point itself getting blurrier.
const haloVertexShader = /* glsl */ `
  attribute vec3 aTargetPosition;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  attribute float aBrightness;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScrollProgress;
  uniform vec3 uMouseWorld;
  uniform float uMouseActive;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkle;

  void main() {
    vec3 basePos = mix(position, aTargetPosition, uScrollProgress);
    vec3 toParticle = basePos - uMouseWorld;
    float dist = length(toParticle);
    float repel = smoothstep(3.2, 0.0, dist) * uMouseActive;
    vec3 dir = dist > 0.0001 ? toParticle / dist : vec3(0.0, 1.0, 0.0);
    vec3 finalPos = basePos + dir * repel * 2.3;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // 4.5x the core's own size (up from 3.5x), its own (much more
    // generous) cap — this needs real canvas room for the diffraction
    // spikes drawn in the fragment shader below to read as thin rays
    // reaching well past the core, not a cramped smudge.
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mvPosition.z, 1.0)) * 4.5, 40.0 * uPixelRatio);
    vColor = aColor;
    vBrightness = aBrightness;
    vTwinkle = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
  }
`;

// A round glow alone still reads as a soft dot, not a star — the cue
// that actually says "star" to most people is the four-point
// diffraction spike seen in real astrophotography (light bending
// around a telescope's or camera's internal structure). This adds
// that: two thin, bright blades through the point's exact center,
// one horizontal and one vertical, each fading along its own length
// and narrowing away from the centerline, layered on top of the same
// soft round glow as before.
const haloFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv) * 2.0;
    float glow = pow(max(0.0, 1.0 - d), 2.2);

    // Each blade: bright exactly on its centerline (uv.y == 0 for the
    // horizontal one), narrowing sharply off-axis (the *36.0 term),
    // and fading out with distance from the center along its own
    // length (the *1.3 term, longer reach than before) so it extends
    // well past the core without just hitting the sprite's hard edge.
    float horizontal = exp(-abs(uv.y) * 36.0) * max(0.0, 1.0 - abs(uv.x) * 1.3);
    float vertical = exp(-abs(uv.x) * 36.0) * max(0.0, 1.0 - abs(uv.y) * 1.3);
    float spike = horizontal + vertical;

    // Glow stays gated the same way it always was (brightness^2, a low
    // ceiling) — it's meant to be a near-universal soft wash. The spike
    // is a separate, deliberately more exclusive design element: gated
    // by a threshold starting partway up the brightness range rather
    // than brightness^2, so it shows up clearly on every "uncommon" and
    // "rare" star (not just the rarest sliver of them), each rendered
    // at real visual weight instead of a barely-there hint — while
    // "common" stars (below the threshold) stay plain circles, so the
    // sparkle reads as a deliberate accent, not noise on every point.
    float spikeGate = smoothstep(0.7, 0.95, vBrightness);
    float glowAlpha = glow * vBrightness * vBrightness * 0.3;
    float spikeAlpha = spike * spikeGate * 0.85;
    float alpha = max(glowAlpha, spikeAlpha) * vTwinkle;
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// The glow mesh's own shader: a large plane behind the infinity loop's
// entirely procedural (no canvas texture) — a radial falloff from the
// plane's own UV center, tinted by uGlowColor and faded by uOpacity
// (both driven from the component below).
const glowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    // Steeper falloff (4.0, up from 2.4) so this stays a tight tint
    // right at the core instead of a wide soft wash sitting under the
    // whole loop — the latter read as extra haze on top of the
    // per-point blur fixed elsewhere in this file.
    float falloff = pow(max(0.0, 1.0 - d), 4.0);
    gl_FragColor = vec4(uGlowColor, falloff * uOpacity);
  }
`;

function buildGlowMesh(initialColorHex) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uGlowColor: { value: new THREE.Color(initialColorHex) },
      uOpacity: { value: 0.2 },
    },
  });
  return new THREE.Mesh(geometry, material);
}

/**
 * The persistent backdrop for the whole scrollable experience. Most
 * particles start recruited into an infinity-shaped loop at the hero;
 * as the visitor scrolls past it, the loop blows apart into an ordinary
 * scattered starfield that stays calm for the rest of the page. Bring
 * the cursor near any cluster and nearby particles glide out of the
 * way, springing back once it moves on. EMET keeps its own matrix-rain
 * takeover and the solar-system explorer keeps its own scene; this
 * never renders there.
 *
 * Renders a single fixed, full-viewport <canvas> (plus one lightweight
 * DOM scrim for text legibility — see the return statement) rather
 * than mounting Three.js into a wrapper div, and drives everything off
 * refs: no per-frame mouse position, scroll offset, or particle state
 * ever touches React state, so 60/120fps animation never fights a
 * React re-render.
 */
export default function StarFormationBackground({ scrollContainerRef }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let supportsWebGL = false;
    try {
      const test = document.createElement("canvas");
      supportsWebGL = !!(test.getContext("webgl2") || test.getContext("webgl"));
    } catch {
      supportsWebGL = false;
    }
    if (!supportsWebGL) {
      setFailed(true);
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isNarrow = width < 700;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    // Capped at 3 — a real 4K/5K panel reports a devicePixelRatio of
    // 2-3, and this is the one part of the page that's pure sparkle
    // detail, so it's worth the extra fill-rate cost to render every
    // point at native pixel density instead of leaving it at 2 and
    // upscaling. GPU throttling when the tab is hidden (below) keeps
    // this from costing anything while the page isn't even visible.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    renderer.setPixelRatio(pixelRatio);
    // updateStyle=false here too, matching the resize handler below —
    // this canvas's CSS box is pinned to 100%/100% by its own inline
    // style, so three.js doesn't need to also write explicit pixel
    // dimensions into canvas.style on top of that.
    renderer.setSize(width, height, false);
    // setSize already sets these to the same values internally; set
    // them again explicitly and directly on the element so the
    // backbuffer's actual size is never implicit or left for the
    // compositor to infer from layout — it's read right back off the
    // canvas's own attributes.
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // No filmic tone mapping here — ACES's photographic highlight
    // rolloff is built for HDR scenes with real overexposure, and on
    // these small additively-blended points it just softened the
    // transition from bright core to background, reading as haze on
    // top of the per-point blur already fixed above. This is graphic
    // sparkle, not a photograph, so it renders at face value instead.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(new THREE.Color("#02050c"), 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // On a wide layout the infinity loop sits to the right, clear of the
    // left-aligned text column; on narrow layouts there's no
    // side-by-side gutter to dodge, so it's shrunk and dropped low
    // instead, mostly below the headline/stats block. Scaled up from
    // the previous 4.2/2 (~30% bigger) for a more commanding presence,
    // with the offset trimmed slightly so the larger loop still clears
    // the text column and stays inside the camera's view frustum.
    const shapeOffsetX = isNarrow ? 0 : 4.4;
    const shapeOffsetY = isNarrow ? -2.5 : 0;
    const shapeScale = isNarrow ? 2.6 : 5.4;

    const glow = buildGlowMesh(SECTION_ACCENTS.hero);
    glow.position.set(shapeOffsetX, shapeOffsetY, -8);
    const glowSize = isNarrow ? 7.6 : 12;
    glow.scale.set(glowSize, glowSize, 1);
    scene.add(glow);

    const particleCount = isNarrow ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const particles = buildParticles(particleCount, { shapeOffsetX, shapeOffsetY, shapeScale, pixelRatio });
    scene.add(particles.group);

    // Pointer parallax + the cursor-repel effect share one listener —
    // a few pixels of camera drift plus the world-space point the
    // shader repels particles away from. The mouse's screen position
    // is projected into the scene's 3D space here, once per
    // pointermove, via a single raycast against a fixed plane — doing
    // that same ray/plane intersection redundantly inside the vertex
    // shader (recomputing an identical result for every one of ~2600
    // vertices, every frame) would cost far more than it's worth for
    // a value that's the same for all of them; the per-particle part
    // that actually needs to run per-vertex — the distance check and
    // outward push — already does, in particleVertexShader above.
    const pointerTarget = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const repelPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 2);
    const mouseWorld = new THREE.Vector3(9999, 9999, 9999);
    let mouseActive = 0;
    function onPointerMove(e) {
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (reduced) return;
      const ndc = new THREE.Vector2(pointerTarget.x, -pointerTarget.y);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(repelPlane, mouseWorld);
      mouseActive = hit ? 1 : 0;
    }
    function onPointerLeave() {
      mouseActive = 0;
    }
    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerLeave, { passive: true });
    }

    // Section-accent tracking: whichever [data-star-accent] section is
    // most visible slowly pulls the glow mesh toward that section's
    // color, smoothed with a time-based (not frame-rate-based) decay
    // so the ~1.2s transition feels the same at 30fps or 120fps.
    const targetAccent = new THREE.Color(SECTION_ACCENTS.hero);
    const currentAccent = new THREE.Color(SECTION_ACCENTS.hero);
    let observer;
    const scrollEl = scrollContainerRef?.current;
    if (scrollEl && !reduced) {
      const ratios = new Map();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
          let bestKey = null;
          let bestRatio = 0;
          for (const [el, ratio] of ratios) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestKey = el.dataset.starAccent;
            }
          }
          if (bestKey && SECTION_ACCENTS[bestKey]) targetAccent.set(SECTION_ACCENTS[bestKey]);
        },
        { root: scrollEl, threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      scrollEl.querySelectorAll("[data-star-accent]").forEach((el) => observer.observe(el));
    }

    // The infinity loop blows apart over roughly one viewport's worth of
    // scroll — by the time the hero has scrolled out of view it's a
    // calm, ordinary starfield for the rest of the page.
    function scrollProgressTarget() {
      const el = scrollContainerRef?.current;
      if (!el) return 0;
      const span = Math.max(el.clientHeight * 0.9, 1);
      return Math.min(1, Math.max(0, el.scrollTop / span));
    }

    let raf = null;
    const startTime = performance.now();
    let lastNow = startTime;
    let firstFrameRevealed = false;
    let scrollSmoothed = 0;
    let camXSmoothed = 0;
    let camYSmoothed = 0;

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      const dt = Math.min(now - lastNow, 100);
      lastNow = now;

      const uniforms = particles.uniforms;
      uniforms.uTime.value = (now - startTime) * 0.001;
      // Faster catch-up (0.06 -> 0.1) so the dispersion visibly tracks
      // scroll input instead of trailing noticeably behind it.
      scrollSmoothed += (scrollProgressTarget() - scrollSmoothed) * 0.1;
      uniforms.uScrollProgress.value = scrollSmoothed;
      uniforms.uMouseWorld.value.copy(mouseWorld);
      uniforms.uMouseActive.value = mouseActive;

      // Exponential (time-based) decay toward the target color:
      // reaches ~95% of the way there in about 3x the time constant,
      // so a ~400ms constant lands the transition at roughly 1.2s
      // regardless of frame rate.
      const colorLerp = 1 - Math.exp(-dt / 400);
      currentAccent.lerp(targetAccent, colorLerp);
      glow.material.uniforms.uGlowColor.value.copy(currentAccent);
      glow.material.uniforms.uOpacity.value = 0.26 * (1 - scrollSmoothed * 0.7);

      // Parallax drift: wider range and quicker response (0.04 -> 0.07)
      // so the camera visibly reacts to the cursor instead of a barely
      // perceptible creep.
      camXSmoothed += (pointerTarget.x * 0.7 - camXSmoothed) * 0.07;
      camYSmoothed += (pointerTarget.y * 0.45 - camYSmoothed) * 0.07;
      camera.position.set(camXSmoothed, camYSmoothed, 15);
      camera.lookAt(shapeOffsetX * (1 - scrollSmoothed) * 0.3, 0, 0);

      // Doubled from the original rate — still a slow, ambient drift,
      // but enough to actually read as continuous motion rather than
      // motion you'd only notice by comparing two screenshots.
      particles.group.rotation.y += dt * 0.00003;

      renderer.render(scene, camera);

      // First-frame flash prevention: the canvas starts at opacity 0
      // (see the returned style below) and only fades in once a real
      // frame has actually been drawn to the framebuffer, so there's
      // never a blank/undrawn WebGL flash on load.
      if (!firstFrameRevealed) {
        firstFrameRevealed = true;
        requestAnimationFrame(() => {
          canvas.style.opacity = "1";
        });
      }
    }

    if (reduced) {
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);
      particles.uniforms.uScrollProgress.value = 0;
      renderer.render(scene, camera);
      requestAnimationFrame(() => {
        canvas.style.opacity = "1";
      });
    } else {
      raf = requestAnimationFrame(renderFrame);
    }

    // GPU power throttle: fully stop issuing new animation frames the
    // instant the tab is hidden (not just skip the render call, as a
    // hidden-check inside the loop would still do) and resume
    // instantly when it's visible again — the point of the Page
    // Visibility API, used the way it's meant to be used.
    function onVisibilityChange() {
      if (document.hidden) {
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
      } else if (raf === null && !reduced) {
        lastNow = performance.now(); // avoid a giant dt spike after resuming
        raf = requestAnimationFrame(renderFrame);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Re-read devicePixelRatio too, not just the CSS size — dragging
      // the window to a display with a different pixel ratio fires a
      // resize without changing width/height, and would otherwise
      // leave the backbuffer at the old display's density.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      renderer.setPixelRatio(dpr);
      // updateStyle=false: this canvas's CSS size is already pinned
      // to 100%/100% by its own inline style (see the returned JSX
      // below), so there's nothing for three.js's own style-syncing
      // to usefully do here — skipping it just avoids one redundant
      // style write on every resize.
      renderer.setSize(width, height, false);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      particles.uniforms.uResolution.value.set(width * dpr, height * dpr);
    }
    particles.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
    window.addEventListener("resize", onResize);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      observer?.disconnect();
      glow.geometry.dispose();
      glow.material.dispose();
      particles.geometry.dispose();
      particles.coreMaterial.dispose();
      particles.haloMaterial.dispose();
      renderer.dispose();
    };
  }, [scrollContainerRef]);

  return (
    <>
      {!failed ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            // Absolute, not fixed: this canvas's nearest positioned
            // ancestor (AppShell's root wrapper) is itself pinned to
            // the full viewport height and never scrolls on its own,
            // so an absolutely-positioned full-bleed child of it lands
            // in exactly the same place a fixed one would — while
            // staying unambiguously anchored to that layout box rather
            // than the viewport, so there's never a question of which
            // box its backbuffer dimensions are meant to track.
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            // Deliberately 0, not a negative value: a WebGL canvas
            // nested under a negative z-index can fail to composite
            // into the final painted frame in some rendering paths
            // (headless/software-GPU Chromium in particular) even
            // though the GL rendering itself is perfectly correct —
            // it just never makes it into the shown frame. Zero still
            // sits behind the scrim (1) and the real content (z-10).
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 0.4s ease",
            // The canvas's drawing buffer is already sized to exactly
            // match its CSS box at the current device pixel ratio (see
            // renderer.setPixelRatio/setSize above), so there's no
            // browser-side scaling happening for this hint to affect in
            // the normal case — it's here as a guard against the
            // compositor ever having to rescale this element (e.g. a
            // fractional zoom level, or a fractional devicePixelRatio
            // that doesn't divide evenly into physical pixels) doing it
            // with a smoothing filter that would blur the shader's own
            // crisp, analytically anti-aliased edges.
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, background: "#02050c" }} />
      )}
      {/* A scrim over the text column, not the whole backdrop — the
          particle field is genuinely bright and dense, and text-shadow
          / color tokens alone weren't guaranteeing contrast against
          it. On the wide layout (text left, loop right) this is a
          left-to-right fade so only the reading column darkens; the
          stacked mobile layout has no side gutter to lean on, so it
          darkens more evenly top-to-bottom instead. Sits just above
          the canvas (still well below the actual page content, which
          stacks at z-10). Promoted to its own compositor layer (the
          translate3d/backface/will-change trio below) so this overlay
          never shares a paint pass with the canvas underneath it. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-black/20 to-black/45 sm:bg-gradient-to-r sm:from-black/65 sm:via-black/30 sm:via-45% sm:to-transparent sm:to-75%"
        style={{
          zIndex: 1,
          mixBlendMode: "normal",
          backfaceVisibility: "hidden",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
    </>
  );
}
