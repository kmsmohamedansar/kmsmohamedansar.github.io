import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { makeGlowSprite } from "../three/starField";

// Same per-section color cue the old solar-system backdrop used —
// whichever [data-star-accent] section is most visible slowly pulls
// the ambient glow behind the star field toward that section's color.
const SECTION_ACCENTS = {
  hero: "#22d3ee",
  source: "#8e7dff",
  lineage: "#fbbf24",
  build: "#34d399",
  commit: "#fb7185",
};

const ARM_COUNT = 2;
const ARM_TIGHTNESS = 1.55; // full rotations each arm makes out to maxRadius

// A point along a logarithmic-ish two-arm spiral, the same broad
// structure a real spiral galaxy (and the reference site's own
// formation) has: a dense, bright core thinning out along a couple of
// arms winding outward. `t` biased toward 0 (via the caller) concentrates
// more points near the core; a little jitter in both angle and radius
// keeps each arm reading as a loose band of stars rather than a single
// hairline curve.
function spiralPoint(t, armIndex, maxRadius) {
  const angle = (armIndex * (Math.PI * 2)) / ARM_COUNT + t * ARM_TIGHTNESS * Math.PI * 2;
  const radius = Math.pow(t, 0.55) * maxRadius;
  const armWidth = 0.55 + radius * 0.16;
  const jitterAngle = (Math.random() - 0.5) * (armWidth / Math.max(radius, 0.4));
  const jitterRadius = (Math.random() - 0.5) * armWidth * 0.5;
  const finalRadius = Math.max(0.05, radius + jitterRadius);
  const finalAngle = angle + jitterAngle;
  return [Math.cos(finalAngle) * finalRadius, Math.sin(finalAngle) * finalRadius];
}

// Uniform-in-volume sphere sample, same rejection method the old
// starfield used — where every particle ends up once fully dispersed.
function randomInSphere(radius) {
  let x, y, z;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
  } while (x * x + y * y + z * z > 1);
  return [x * radius, y * radius, z * radius];
}

/**
 * Builds the particle system: most particles are recruited into a
 * two-armed spiral (a bright core thinning out along a couple of
 * winding arms — the same broad structure the reference site's own
 * formation has), a minority are left as ambient background stars
 * that barely move, and every particle also carries a fully-dispersed
 * "blown apart into a starfield" target. A scroll-driven uniform
 * morphs between the two; a mouse-driven uniform (read in the vertex
 * shader) pushes nearby particles outward.
 */
function buildParticles(count, { shapeOffsetX, shapeOffsetY, shapeScale, pixelRatio }) {
  const shapeShare = 0.72;
  const shapeCount = Math.round(count * shapeShare);

  const formation = new Float32Array(count * 3);
  const dispersed = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const brightness = new Float32Array(count);
  const warm = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const [dx, dy, dz] = randomInSphere(1);
    const r = 16 + Math.random() * 34;
    dispersed[i * 3] = dx * r;
    dispersed[i * 3 + 1] = dy * r;
    dispersed[i * 3 + 2] = dz * r - 6;

    if (i < shapeCount) {
      // Biased toward t=0 so most particles land near the core, the
      // same brightness falloff a real galaxy (and the reference
      // formation) has, rather than an even spread out to the rim.
      const t = Math.pow(Math.random(), 1.6);
      const armIndex = Math.floor(Math.random() * ARM_COUNT);
      const [sx, sy] = spiralPoint(t, armIndex, shapeScale);
      formation[i * 3] = sx + shapeOffsetX;
      formation[i * 3 + 1] = sy + shapeOffsetY;
      formation[i * 3 + 2] = (Math.random() - 0.5) * (0.6 + t * 1.4);
    } else {
      // Ambient stars, already scattered near their dispersed spot —
      // present even while the spiral is fully assembled, the same
      // sparse "not an empty void" backdrop the reference site keeps
      // around its own formed shape.
      formation[i * 3] = dispersed[i * 3] * 0.4;
      formation[i * 3 + 1] = dispersed[i * 3 + 1] * 0.4;
      formation[i * 3 + 2] = dispersed[i * 3 + 2] * 0.4 - 4;
    }

    const roll = Math.random();
    if (roll > 0.985) {
      sizes[i] = 5.5 + Math.random() * 2.5;
      brightness[i] = 1;
    } else if (roll > 0.9) {
      sizes[i] = 3 + Math.random() * 1.5;
      brightness[i] = 0.75 + Math.random() * 0.25;
    } else {
      sizes[i] = 1.4 + Math.random() * 1.4;
      brightness[i] = 0.4 + Math.random() * 0.4;
    }
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.4 + Math.random() * 1.4;
    warm[i] = Math.random() > 0.82 ? 1 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("aFormationPos", new THREE.BufferAttribute(formation, 3));
  geometry.setAttribute("aDispersedPos", new THREE.BufferAttribute(dispersed, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute("aWarm", new THREE.BufferAttribute(warm, 1));
  // Position itself is required by BufferGeometry/Points but unused by
  // the shader (which reads aFormationPos/aDispersedPos instead) —
  // zero-filled, cheap, and keeps the geometry valid.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uMorph: { value: 0 },
      uMouseWorld: { value: new THREE.Vector3(9999, 9999, 9999) },
      uMouseActive: { value: 0 },
    },
  });

  return new THREE.Points(geometry, material);
}

const particleVertexShader = /* glsl */ `
  attribute vec3 aFormationPos;
  attribute vec3 aDispersedPos;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aBrightness;
  attribute float aWarm;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMorph;
  uniform vec3 uMouseWorld;
  uniform float uMouseActive;
  varying float vBrightness;
  varying float vTwinkle;
  varying float vWarm;

  void main() {
    vec3 basePos = mix(aFormationPos, aDispersedPos, uMorph);

    // Cursor repel — a pure function of current distance (no persisted
    // velocity/state), so particles glide back the instant the cursor
    // moves away, at whatever rate their own distance to it changes.
    vec3 toParticle = basePos - uMouseWorld;
    float dist = length(toParticle);
    float repel = smoothstep(2.6, 0.0, dist) * uMouseActive;
    vec3 dir = dist > 0.0001 ? toParticle / dist : vec3(0.0, 1.0, 0.0);
    vec3 finalPos = basePos + dir * repel * 1.6;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mvPosition.z, 1.0)), 18.0 * uPixelRatio);
    vBrightness = aBrightness;
    vTwinkle = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
    vWarm = aWarm;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying float vBrightness;
  varying float vTwinkle;
  varying float vWarm;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float core = 1.0 - smoothstep(0.55, 1.0, d);
    if (core <= 0.0) discard;
    float alpha = core * vBrightness * vTwinkle;
    vec3 cool = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 1.0, 1.0), vBrightness);
    vec3 warmTone = mix(vec3(1.0, 0.82, 0.6), vec3(1.0, 0.95, 0.85), vBrightness);
    vec3 color = mix(cool, warmTone, vWarm);
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * The persistent backdrop for the whole scrollable experience. Most
 * particles start recruited into a spiral formation at the hero; as
 * the visitor scrolls past it, the spiral blows apart into an ordinary
 * scattered starfield that stays calm for the rest of the page. Bring
 * the cursor near any cluster and nearby particles glide out of the
 * way, springing back once it moves on. EMET keeps its own matrix-rain
 * takeover and the solar-system explorer keeps its own scene; this
 * never renders there.
 */
export default function StarFormationBackground({ scrollContainerRef }) {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    let width = container.clientWidth;
    let height = container.clientHeight;
    const isNarrow = width < 700;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isNarrow ? 2 : 3);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(new THREE.Color("#02050c"), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // On a wide layout the spiral sits to the right, clear of the
    // left-aligned text column (the same gutter trick the solar system
    // used). On narrow layouts there's no side-by-side gutter to dodge
    // — everything stacks in one column — so instead it's shrunk and
    // dropped low, mostly below the headline/stats block, plus made
    // smaller and dimmer overall so it doesn't fight the text that
    // does end up over it (the scrim + higher-contrast text tokens
    // handle the rest). shapeScale is the spiral's outer radius.
    const shapeOffsetX = isNarrow ? 0 : 4.6;
    const shapeOffsetY = isNarrow ? -2.5 : 0;
    const shapeScale = isNarrow ? 2 : 4.2;

    const ambientGlowTexture = new THREE.CanvasTexture(makeGlowSprite("#22d3ee"));
    const ambientGlowMaterial = new THREE.SpriteMaterial({
      map: ambientGlowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(SECTION_ACCENTS.hero),
      opacity: 0.55,
    });
    const ambientGlow = new THREE.Sprite(ambientGlowMaterial);
    // Small and well behind the spiral (not layered right on top of
    // it) — this is meant to read as a faint ambient wash the
    // section-accent color tints, not a bright blob that competes with
    // (and washes out) the sparkle pattern of the shape itself.
    ambientGlow.position.set(shapeOffsetX, shapeOffsetY, -6);
    ambientGlow.scale.setScalar(isNarrow ? 4.5 : 7);
    scene.add(ambientGlow);

    const particleCount = isNarrow ? 1400 : 2600;
    const particles = buildParticles(particleCount, { shapeOffsetX, shapeOffsetY, shapeScale, pixelRatio });
    scene.add(particles);

    // Pointer parallax + the cursor-repel effect share one listener —
    // a few pixels of camera drift (same restrained pattern the rest
    // of the site uses) plus the world-space point the shader repels
    // particles away from.
    const pointerTarget = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const repelPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 2);
    const mouseWorld = new THREE.Vector3(9999, 9999, 9999);
    let mouseActive = 0;
    function onPointerMove(e) {
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (reduced) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
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

    // Section-accent tracking — identical mechanism to the old
    // backdrop: whichever [data-star-accent] section is most visible
    // slowly pulls the ambient glow toward that section's color.
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

    // The spiral blows apart over roughly one viewport's worth of
    // scroll — by the time the hero has scrolled out of view it's a
    // calm, ordinary starfield for the rest of the page.
    function morphTarget() {
      const el = scrollContainerRef?.current;
      if (!el) return 0;
      const span = Math.max(el.clientHeight * 0.9, 1);
      return Math.min(1, Math.max(0, el.scrollTop / span));
    }

    let raf;
    const startTime = performance.now();
    let lastNow = startTime;
    let morphSmoothed = 0;
    let camXSmoothed = 0;
    let camYSmoothed = 0;

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      if (document.hidden) return;
      const dt = Math.min(now - lastNow, 100);
      lastNow = now;

      particles.material.uniforms.uTime.value = (now - startTime) * 0.001;
      morphSmoothed += (morphTarget() - morphSmoothed) * 0.06;
      particles.material.uniforms.uMorph.value = morphSmoothed;
      particles.material.uniforms.uMouseWorld.value.copy(mouseWorld);
      particles.material.uniforms.uMouseActive.value = mouseActive;

      currentAccent.lerp(targetAccent, 0.02);
      ambientGlowMaterial.color.copy(currentAccent);
      ambientGlowMaterial.opacity = 0.3 * (1 - morphSmoothed * 0.7);

      camXSmoothed += (pointerTarget.x * 0.5 - camXSmoothed) * 0.04;
      camYSmoothed += (pointerTarget.y * 0.3 - camYSmoothed) * 0.04;
      camera.position.set(camXSmoothed, camYSmoothed, 15);
      camera.lookAt(shapeOffsetX * (1 - morphSmoothed) * 0.3, 0, 0);

      particles.rotation.y += dt * 0.000015;

      renderer.render(scene, camera);
    }

    if (reduced) {
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);
      particles.material.uniforms.uMorph.value = 0;
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(renderFrame);
    }

    function onResize() {
      width = container.clientWidth;
      height = container.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      observer?.disconnect();
      ambientGlowTexture.dispose();
      ambientGlowMaterial.dispose();
      particles.geometry.dispose();
      particles.material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [scrollContainerRef]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02050c]">
      {!failed && <div ref={mountRef} className="w-full h-full" />}
      {/* A scrim over the text column, not the whole backdrop — the
          particle field is genuinely bright and dense, and the site's
          own text-shadow/color tokens alone weren't guaranteeing
          contrast against it. On the wide layout (text left, spiral
          right) this is a left-to-right fade so only the reading
          column darkens; the stacked mobile layout has no side gutter
          to lean on, so it darkens more evenly top-to-bottom instead. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/45 sm:bg-gradient-to-r sm:from-black/65 sm:via-black/30 sm:via-45% sm:to-transparent sm:to-75%" />
    </div>
  );
}
