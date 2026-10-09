import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// The loop only ever lives in the hero now, so its glow is the hero's
// cyan; there are no other sections for it to take a color from.
const HERO_ACCENT = "#22d3ee";

// Both counts scaled to match the shapeScale increase below (6.5/5.4
// desktop, 2.9/2.6 mobile) — a curve's own density scales linearly with
// its length, not with area, so matching that ratio keeps the same
// spacing between stars along the loop at the larger size instead of
// thinning it out.
const PARTICLE_COUNT_DESKTOP = 4050;
const PARTICLE_COUNT_MOBILE = 1230;
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
    float thresholdEdge = 0.46;
    // How wide one physical pixel is, expressed in this point's own
    // normalized 0-0.5 radius units — a big point's edge fades over
    // the same *physical* pixel as a small point's, not the same
    // fraction of its own size.
    float sharpnessMargin = 0.7 / max(vComputedPointSize, 1.0);
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
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mvPosition.z, 1.0)) * 3.2, 26.0 * uPixelRatio);
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
    float glowAlpha = glow * vBrightness * vBrightness * 0.2;
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

// The atmosphere: one quad covering the whole canvas, written straight to clip space
// so it never depends on the camera, and drawn opaque before anything
// else. It replaces the old flat near-black clear color with a deep
// navy base, a slow domain-warped value-noise field in blue/slate, and
// a soft lift centered on the infinity loop's projected position.
//
// Colors are sRGB constants on purpose: none of this file's custom
// ShaderMaterials include three's colorspace_fragment chunk, so what a
// shader writes is what lands on screen, and these hex values are the
// art-directed targets. (uAccent comes in as a linear THREE.Color and
// gets an approximate sqrt() encode for the same reason.)
const atmosphereVertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uScrollProgress;
  uniform vec3 uAccent;
  uniform vec2 uFocus;

  const vec3 BASE_DEEP = vec3(0.0431, 0.0784, 0.1490);  // #0B1426
  const vec3 BASE_MID  = vec3(0.0510, 0.1059, 0.1882);  // #0D1B30
  const vec3 ATMOS     = vec3(0.0706, 0.1333, 0.2275);  // #12223A
  const vec3 SLATE     = vec3(0.0902, 0.1686, 0.2863);  // #172B49
  const vec3 HIGHLIGHT = vec3(0.1490, 0.2353, 0.3765);  // #263C60
  const vec3 CYAN      = vec3(0.3333, 0.7961, 0.9098);  // #55CBE8
  const vec3 VIOLET    = vec3(0.6314, 0.5412, 1.0);     // #A18AFF

  // Hash without sine (Dave Hoskins) — stable on mobile GPUs, where
  // the classic fract(sin(dot())) hash loses precision and bands.
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // OCTAVES comes in as a material define: 3 on desktop, 2 on narrow
  // layouts, which also tend to be the highest-DPR screens.
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < OCTAVES; i++) {
      v += amp * valueNoise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3;
      amp *= 0.5;
    }
    return v / (1.0 - exp2(-float(OCTAVES)));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
    // ~0.024/s: individual features take roughly 40s to visibly re-form.
    float t = uTime * 0.024;

    vec3 base = mix(BASE_DEEP, BASE_MID, smoothstep(0.0, 1.0, uv.y));

    vec2 fp = p * 1.35;
    float warp = fbm(fp * 0.8 + vec2(t, -t * 0.6));
    float n = fbm(fp + warp * 1.3 + vec2(-t * 0.5, t * 0.35));
    float cloud = smoothstep(0.3, 0.78, n);

    // Soft lift around the loop. Widens and fades as the loop
    // disperses, so the light spreads out with the stars instead of
    // staying pinned to a shape that no longer exists.
    vec2 fd = vec2((uv.x - uFocus.x) * aspect, uv.y - uFocus.y);
    float focusR = mix(0.55, 0.95, uScrollProgress);
    float focus = exp(-dot(fd, fd) / (focusR * focusR)) * mix(1.0, 0.45, uScrollProgress);

    vec3 col = mix(base, mix(ATMOS, SLATE, cloud), (0.35 + 0.65 * focus) * (0.55 + 0.45 * cloud));
    col = mix(col, HIGHLIGHT, focus * cloud * 0.35);
    col += CYAN * (focus * smoothstep(0.55, 0.9, n) * 0.05);
    col += VIOLET * (smoothstep(0.5, 0.85, warp) * (0.25 + 0.75 * focus) * 0.035);
    // Section accent: an environmental tint near the loop, clamped low
    // so it shifts the lighting rather than recoloring the page.
    col = mix(col, sqrt(max(uAccent, vec3(0.0))), focus * 0.06);

    // Gentle edge falloff keeps the frame from reading as a flat fill.
    float vignette = smoothstep(1.25, 0.35, length(p * vec2(0.9, 1.15)));
    col *= mix(0.82, 1.0, vignette);

    // Static +-0.5 LSB dither: dark, slow gradients like this one band
    // visibly on 8-bit panels without it.
    col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function buildAtmosphere(sharedUniforms, octaves) {
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    defines: { OCTAVES: octaves },
    depthTest: false,
    depthWrite: false,
    uniforms: sharedUniforms,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // positioned in clip space, not world space
  mesh.renderOrder = -10;
  return mesh;
}


// The loop is built once at this reference size and the group is scaled
// to fit whatever window it's shown in, so a resize never rebuilds it.
const BUILD_SCALE = 6.5;
// How much of the window's half-width the loop's tips reach (0-1). The
// lemniscate is only ~0.35x as tall as it is wide, so width is always the
// binding constraint. A tall (mobile) oval is widest exactly where the
// tips sit, on its horizontal axis, so the loop can fill more of it.
const FIT_WIDE = 0.6;
const FIT_TALL = 0.8;
// Bounded sway instead of a continuous spin: a full spin turns the loop
// edge-on (and, with an off-center pivot, out of frame) within a minute.
const SWAY_RADIANS = 0.15;
const SWAY_PERIOD_S = 22;

/**
 * The hero's signature visual: an infinity-shaped (lemniscate) particle
 * loop floating in deep-blue space, rendered into whatever box its
 * parent gives it (the hero's oval window). As the visitor scrolls past
 * the hero, the loop blows apart into a scattered starfield; bring the
 * cursor near it and nearby particles glide out of the way.
 *
 * One <canvas> sized to its container (not the viewport), rendering
 * only while that container is on screen and the tab is visible.
 * Everything per-frame lives in refs and uniforms, never React state.
 */
export default function InfinityLoop({ scrollContainerRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

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

    let width = Math.max(wrap.clientWidth, 1);
    let height = Math.max(wrap.clientHeight, 1);
    const isNarrow = window.innerWidth < 700;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    // Uncapped devicePixelRatio, deliberately: the canvas is pinned with
    // image-rendering: pixelated (see the JSX below), so a capped ratio
    // would be upscaled nearest-neighbor and turn crisp stars blocky on
    // 3x phones. The canvas now only covers the hero's oval rather than
    // the whole viewport, which is what keeps native density affordable.
    let pixelRatio = window.devicePixelRatio || 1;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // No filmic tone mapping: this is graphic sparkle, not a photograph,
    // so the additive points render at face value instead of rolling off.
    renderer.toneMapping = THREE.NoToneMapping;
    // Never actually visible (the atmosphere quad covers every pixel).
    renderer.setClearColor(new THREE.Color("#0b1426"), 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    const glow = buildGlowMesh(HERO_ACCENT);
    glow.position.set(0, 0, -8);
    glow.renderOrder = -2;
    scene.add(glow);

    const particleCount = isNarrow ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    // Centered at the origin, so the group's own rotation pivots on the
    // loop's crossing point rather than swinging the loop around.
    const particles = buildParticles(particleCount, { shapeOffsetX: 0, shapeOffsetY: 0, shapeScale: BUILD_SCALE, pixelRatio });
    scene.add(particles.group);
    const drawingBufferSize = new THREE.Vector2();

    // The atmosphere shares the particles' clock, resolution and scroll
    // uniforms and the glow's color by reference (the same { value }
    // objects), so none of that state exists twice.
    const focusUv = new THREE.Vector2(0.5, 0.5);
    const atmosphere = buildAtmosphere(
      {
        uTime: particles.uniforms.uTime,
        uResolution: particles.uniforms.uResolution,
        uScrollProgress: particles.uniforms.uScrollProgress,
        uAccent: glow.material.uniforms.uGlowColor,
        uFocus: { value: focusUv },
      },
      isNarrow ? 2 : 3
    );
    scene.add(atmosphere);

    // Fit the loop (and the glow behind it) to the window: the visible
    // half-width at z = 0 is tan(fov/2) * distance * aspect.
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    function fitToWindow() {
      const halfWidth = Math.tan(halfFov) * camera.position.z * camera.aspect;
      const s = (halfWidth * (camera.aspect < 1.2 ? FIT_TALL : FIT_WIDE)) / BUILD_SCALE;
      particles.group.scale.setScalar(s);
      const glowSize = 14 * s;
      glow.scale.set(glowSize, glowSize, 1);
    }

    function applySize() {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      particles.uniforms.uResolution.value.copy(renderer.getDrawingBufferSize(drawingBufferSize));
      particles.uniforms.uPixelRatio.value = pixelRatio;
      fitToWindow();
    }
    applySize();

    // Where the loop's center lands in the window (0-1 uv), for the
    // atmosphere's lift. It moves only with camera parallax.
    const focusWorld = new THREE.Vector3();
    function updateFocus() {
      focusWorld.set(0, 0, 0).project(camera);
      focusUv.set(focusWorld.x * 0.5 + 0.5, focusWorld.y * 0.5 + 0.5);
    }

    // Pointer: one listener drives both camera parallax and the repel.
    // Coordinates are relative to this window, not the viewport. The
    // repel point is raycast onto a fixed plane, then converted into the
    // particle group's local space, because the vertex shader compares it
    // against un-transformed positions and the group is scaled and swaying.
    const pointerTarget = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const repelPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 2);
    const mouseWorld = new THREE.Vector3(9999, 9999, 9999);
    const ndc = new THREE.Vector2();
    let mouseActive = 0;
    function onPointerMove(e) {
      const rect = wrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerTarget.x = Math.max(-1, Math.min(1, x));
      pointerTarget.y = Math.max(-1, Math.min(1, y));
      const inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
      if (!inside) {
        mouseActive = 0;
        return;
      }
      raycaster.setFromCamera(ndc.set(x, -y), camera);
      mouseActive = raycaster.ray.intersectPlane(repelPlane, mouseWorld) ? 1 : 0;
    }
    function onPointerLeave() {
      mouseActive = 0;
    }
    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerLeave, { passive: true });
    }

    // The loop blows apart over roughly one viewport of scroll — by the
    // time the hero has scrolled out of view it's a scattered starfield.
    function scrollProgressTarget() {
      const el = scrollContainerRef?.current;
      if (!el) return 0;
      const span = Math.max(el.clientHeight * 0.9, 1);
      return Math.min(1, Math.max(0, el.scrollTop / span));
    }

    let raf = null;
    const startTime = performance.now();
    let firstFrameRevealed = false;
    let scrollSmoothed = 0;
    let camXSmoothed = 0;
    let camYSmoothed = 0;
    const localMouse = new THREE.Vector3();

    function revealOnce() {
      if (firstFrameRevealed) return;
      firstFrameRevealed = true;
      // The canvas starts at opacity 0 and fades in only once a real
      // frame is in the framebuffer, so there's never a blank WebGL flash.
      requestAnimationFrame(() => {
        canvas.style.opacity = "1";
      });
    }

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      const elapsed = (now - startTime) * 0.001;

      const uniforms = particles.uniforms;
      uniforms.uTime.value = elapsed;
      scrollSmoothed += (scrollProgressTarget() - scrollSmoothed) * 0.1;
      uniforms.uScrollProgress.value = scrollSmoothed;
      glow.material.uniforms.uOpacity.value = 0.26 * (1 - scrollSmoothed * 0.7);

      camXSmoothed += (pointerTarget.x * 0.7 - camXSmoothed) * 0.07;
      camYSmoothed += (pointerTarget.y * 0.45 - camYSmoothed) * 0.07;
      camera.position.set(camXSmoothed, camYSmoothed, 15);
      camera.lookAt(0, 0, 0);

      particles.group.rotation.y = SWAY_RADIANS * Math.sin((elapsed * Math.PI * 2) / SWAY_PERIOD_S);
      particles.group.updateMatrixWorld();
      uniforms.uMouseWorld.value.copy(particles.group.worldToLocal(localMouse.copy(mouseWorld)));
      uniforms.uMouseActive.value = mouseActive;

      updateFocus();
      renderer.render(scene, camera);
      revealOnce();
    }

    function renderStatic() {
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);
      particles.uniforms.uScrollProgress.value = 0;
      updateFocus();
      renderer.render(scene, camera);
      revealOnce();
    }

    // Only animate while the window is actually on screen and the tab is
    // visible; the hero is one section of a long page.
    let onScreen = true;
    function sync() {
      const shouldRun = !reduced && onScreen && !document.hidden;
      if (shouldRun && raf === null) raf = requestAnimationFrame(renderFrame);
      else if (!shouldRun && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visibility.observe(wrap);
    document.addEventListener("visibilitychange", sync);

    if (reduced) renderStatic();
    else sync();

    const resizer = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (w === 0 || h === 0 || (w === width && h === height && dpr === pixelRatio)) return;
      width = w;
      height = h;
      pixelRatio = dpr;
      applySize();
      // Reduced motion has no render loop to pick up the new size.
      if (reduced) renderStatic();
    });
    resizer.observe(wrap);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      visibility.disconnect();
      resizer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      glow.geometry.dispose();
      glow.material.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      particles.geometry.dispose();
      particles.coreMaterial.dispose();
      particles.haloMaterial.dispose();
      renderer.dispose();
    };
  }, [scrollContainerRef]);

  return (
    <div ref={wrapRef} aria-hidden="true" className="absolute inset-0">
      {failed ? (
        <div className="atmosphere-fallback absolute inset-0" />
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full"
          style={{
            opacity: 0,
            transition: "opacity 0.4s ease",
            // Guards against the compositor smoothing the shader's own
            // crisp, analytically anti-aliased star edges if it ever has
            // to rescale this element (fractional zoom or DPR).
            imageRendering: "pixelated",
          }}
        />
      )}
    </div>
  );
}
