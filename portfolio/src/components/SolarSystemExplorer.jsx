import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { X, Pause, Play, Locate } from "lucide-react";
import { PLANETS, planetPosition, displayRadius, buildOrbitPoints } from "../three/orbitalMechanics";
import { makeGlowSprite, buildBackgroundStars } from "../three/starField";
import {
  SURFACE_RECIPES,
  makeRockyTexture,
  makeBumpTexture,
  makeBandedTexture,
  makeEarthTexture,
  makeEarthCloudTexture,
  makeRingTexture,
} from "../three/planetTextures";
import { PLANET_FACTS } from "../data/planetFacts";

const SCALE = 1.6; // Same AU -> scene-unit compression as the backdrop, so both views agree.
// Kept well under Mercury's display radius (sqrt(0.387)*1.6 ~= 0.995) so
// no planet's orbit sits inside the sun's own sphere here — unlike the
// passive backdrop, this view's free camera and click-to-inspect raycasts
// can get close enough for that overlap to matter.
const SUN_RADIUS = 0.55;
const BLOOM_LAYER = 1;
// Real asteroid belt spans roughly 2.1-3.3 AU, between Mars (1.52 AU)
// and Jupiter (5.2 AU) — not fabricated, the actual gap.
const BELT_INNER_AU = 2.1;
const BELT_OUTER_AU = 3.3;

const SUN_FACT = {
  type: "Star (G-type main-sequence)",
  moons: "—",
  fact: "Contains 99.8% of the solar system's mass — everything else, all eight planets included, is the remaining 0.2%.",
};

/* ---------- Asteroid belt: real Kepler-consistent angular speed per
   particle (period scales with a^1.5, same physics as the planets),
   not just a decorative spin. Positions are recomputed on the CPU each
   frame (cheap enough at a couple thousand points) rather than in a
   shader, since the belt needs to react to the same play/pause and
   speed controls as the planets. ---------- */
function buildAsteroidBelt(count) {
  const semiMajorAU = new Float32Array(count);
  const angle0 = new Float32Array(count);
  const heightAU = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    semiMajorAU[i] = BELT_INNER_AU + Math.random() * (BELT_OUTER_AU - BELT_INNER_AU);
    angle0[i] = Math.random() * Math.PI * 2;
    heightAU[i] = (Math.random() - 0.5) * 0.15;
    sizes[i] = 1 + Math.random() * 1.6;
  }
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.PointsMaterial({
    color: "#9a8f7f",
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  return { points, semiMajorAU, angle0, heightAU };
}

function updateAsteroidBelt(belt, simDays) {
  const { points, semiMajorAU, angle0, heightAU } = belt;
  const pos = points.geometry.attributes.position.array;
  const count = semiMajorAU.length;
  for (let i = 0; i < count; i++) {
    const a = semiMajorAU[i];
    const periodDays = 365.25 * Math.pow(a, 1.5); // Kepler's third law
    const angle = angle0[i] + (simDays / periodDays) * Math.PI * 2;
    const r = displayRadius(a, SCALE);
    pos[i * 3] = Math.cos(angle) * r;
    pos[i * 3 + 1] = heightAU[i] * SCALE;
    pos[i * 3 + 2] = Math.sin(angle) * r;
  }
  points.geometry.attributes.position.needsUpdate = true;
}

/* ---------- Shooting stars: a small pool of streaks, each mostly idle
   and occasionally firing across the outer starfield on its own random
   timer, so they never all fire in sync. ---------- */
function buildShootingStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({ color: "#eaf2ff", transparent: true, opacity: 0 });
    const line = new THREE.Line(geometry, material);
    stars.push({ line, state: "idle", t: 0, life: 0, start: new THREE.Vector3(), end: new THREE.Vector3(), nextAt: Math.random() * 6 });
  }
  return stars;
}

function randomSkyPoint(radius) {
  let x, y, z;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
  } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.3);
  const len = Math.sqrt(x * x + y * y + z * z);
  return new THREE.Vector3((x / len) * radius, (y / len) * radius, (z / len) * radius);
}

function updateShootingStars(stars, dtSeconds, elapsedSeconds) {
  for (const s of stars) {
    if (s.state === "idle") {
      if (elapsedSeconds >= s.nextAt) {
        s.start.copy(randomSkyPoint(55 + Math.random() * 20));
        // A short chord near the start point, not a full sky crossing —
        // reads as a quick streak, not a slow-moving object.
        const dir = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize();
        s.end.copy(s.start).addScaledVector(dir, 8 + Math.random() * 6);
        s.state = "active";
        s.t = 0;
        s.life = 0.35 + Math.random() * 0.25;
      }
      continue;
    }
    s.t += dtSeconds;
    const p = Math.min(1, s.t / s.life);
    const pos = s.line.geometry.attributes.position.array;
    const head = s.start.clone().lerp(s.end, p);
    const tail = s.start.clone().lerp(s.end, Math.max(0, p - 0.25));
    pos[0] = tail.x; pos[1] = tail.y; pos[2] = tail.z;
    pos[3] = head.x; pos[4] = head.y; pos[5] = head.z;
    s.line.geometry.attributes.position.needsUpdate = true;
    s.line.material.opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    if (p >= 1) {
      s.state = "idle";
      s.line.material.opacity = 0;
      s.nextAt = elapsedSeconds + 4 + Math.random() * 10;
    }
  }
}

/* ---------- Milky Way band: a soft diagonal glow band across the
   outer starfield, computed per-pixel from the angle to a fixed
   "galactic plane" direction rather than painted onto a texture —
   resolution-independent at any zoom. ---------- */
const milkyWayVertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const milkyWayFragmentShader = /* glsl */ `
  uniform vec3 uPlaneNormal;
  uniform vec3 uColor;
  varying vec3 vWorldDir;
  // Smooth (interpolated) value noise, not a hard per-cell hash — a
  // floor()-based hash gave every cell a flat, uniform color with a
  // hard edge at its boundary, which read as an obvious checkerboard
  // once stretched across a giant sphere. This blends between lattice
  // corners instead, so the mottling is continuous.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d2 = hash(i + vec3(1.0, 1.0, 0.0));
    float e = hash(i + vec3(0.0, 0.0, 1.0));
    float f2 = hash(i + vec3(1.0, 0.0, 1.0));
    float g = hash(i + vec3(0.0, 1.0, 1.0));
    float h = hash(i + vec3(1.0, 1.0, 1.0));
    float xy1 = mix(mix(a, b, f.x), mix(c, d2, f.x), f.y);
    float xy2 = mix(mix(e, f2, f.x), mix(g, h, f.x), f.y);
    return mix(xy1, xy2, f.z);
  }
  void main() {
    float d = abs(dot(normalize(vWorldDir), uPlaneNormal));
    float band = pow(max(0.0, 1.0 - d * 3.2), 2.2);
    float mottle = noise(vWorldDir * 3.0) * 0.3 + 0.75;
    float alpha = band * mottle * 0.14;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function buildMilkyWayBand() {
  const geometry = new THREE.SphereGeometry(85, 32, 32);
  const material = new THREE.ShaderMaterial({
    vertexShader: milkyWayVertexShader,
    fragmentShader: milkyWayFragmentShader,
    uniforms: {
      uPlaneNormal: { value: new THREE.Vector3(0.35, 0.82, -0.45).normalize() },
      uColor: { value: new THREE.Color("#b7c8f5") },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geometry, material);
}

/* ---------- Atmosphere rim glow: a Fresnel-lit shell just outside a
   planet's surface, additive-blended so it only brightens (never
   darkens) — the "sunlit haze" look real atmosphere renders have,
   distinct from the sun's own bloom. ---------- */
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;
const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float rim = 1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0);
    float intensity = pow(rim, 4.0);
    gl_FragColor = vec4(uColor, intensity * 0.45);
  }
`;

const ATMOSPHERE_COLORS = {
  Earth: "#6fb7ff",
  Jupiter: "#e8c48a",
  Saturn: "#e8d8a0",
  Uranus: "#8fe0e6",
  Neptune: "#7f9bff",
};

function buildAtmosphere(radius, color, segments) {
  const geometry = new THREE.SphereGeometry(radius * 1.06, segments, segments);
  const material = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: { uColor: { value: new THREE.Color(color) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(geometry, material);
}

function formatDistance(au) {
  return `${au.toFixed(2)} AU`;
}

function formatPeriod(days) {
  if (days < 365) return `${Math.round(days)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}

/**
 * A dedicated, fully interactive solar system view — drag to orbit,
 * scroll/pinch to zoom, click a planet to inspect it. Distinct from
 * SolarSystemBackground (the passive scroll backdrop): that one
 * deliberately ignores pointer input so it doesn't fight scrolling and
 * clicks on the actual page; this one IS the page, reached as its own
 * route (like EMET's takeover), so capturing the pointer is exactly
 * the point. Shares the real orbital mechanics, planet textures, and
 * starfield with the backdrop — same solar system, two ways to see it.
 */
export default function SolarSystemExplorer() {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(null); // planet name, or "Sun", or null
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(6);
  const [showHint, setShowHint] = useState(true);
  const stateRef = useRef({ isPlaying: true, speed: 6, selected: null });
  const recenterRef = useRef(() => {});

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.speed = speed;
  }, [isPlaying, speed]);
  useEffect(() => {
    stateRef.current.selected = selected;
  }, [selected]);

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
    if (reduced) setIsPlaying(false);

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.03, 500);
    camera.position.set(6, 5, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 70;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    let followedName = null;
    controls.addEventListener("start", () => {
      followedName = null;
    });

    // Bloom on the sun only — see SolarSystemBackground for why a
    // brightness threshold can't isolate it (the star shader's
    // brightest points are similarly bright); a dedicated render
    // layer excludes everything else structurally instead.
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    const bloomRenderPass = new RenderPass(scene, camera);
    bloomRenderPass.clearColor = new THREE.Color(0x000000);
    bloomRenderPass.clearAlpha = 1;
    bloomComposer.addPass(bloomRenderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.22, 0.1);
    bloomComposer.addPass(bloomPass);
    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }
        `,
      }),
      "baseTexture"
    );
    mixPass.needsSwap = true;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(mixPass);
    composer.addPass(new OutputPass());

    scene.add(new THREE.HemisphereLight("#8fa4d8", "#0a0e1a", 1.1));
    const sunLight = new THREE.PointLight("#fff6e0", 3.2, 0, 0.15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    scene.add(sunLight);

    const stars = buildBackgroundStars(isNarrow ? 1800 : 3600, pixelRatio);
    scene.add(stars);

    const milkyWay = buildMilkyWayBand();
    scene.add(milkyWay);

    const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: "#fff2c8" });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.layers.enable(BLOOM_LAYER);
    scene.add(sun);

    const sunGlowTexture = new THREE.CanvasTexture(makeGlowSprite("#fff2c8"));
    const sunGlowMaterial = new THREE.SpriteMaterial({
      map: sunGlowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#22d3ee"),
    });
    const sunGlow = new THREE.Sprite(sunGlowMaterial);
    // Decoupled from SUN_RADIUS so the glow still reads as prominent even
    // though the solid sphere itself is now much smaller.
    sunGlow.scale.setScalar(1.8);
    scene.add(sunGlow);

    const planetSegments = isNarrow ? 32 : 48;
    // A free-orbit camera can end up right on top of any planet here,
    // far closer than the passive scroll backdrop ever gets — doubled
    // on desktop so surface detail still holds up at that range; mobile
    // keeps the original resolution/cost.
    const textureScale = isNarrow ? 1 : 2;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const disposableTextures = [];
    const raycastTargets = [sun];
    sun.userData.factKey = "Sun";
    function sharpTexture(canvas, { srgb = false } = {}) {
      const texture = new THREE.CanvasTexture(canvas);
      if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      disposableTextures.push(texture);
      return texture;
    }

    const planetMeshes = PLANETS.map((planet, planetIndex) => {
      const geometry = new THREE.SphereGeometry(planet.radius, planetSegments, planetSegments);
      const recipe = SURFACE_RECIPES[planet.name];
      let material;
      let cloudMesh = null;

      if (planet.name === "Earth") {
        const colorMap = sharpTexture(makeEarthTexture(11, textureScale), { srgb: true });
        material = new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.75, metalness: 0.05 });

        const cloudTexture = sharpTexture(makeEarthCloudTexture(21, textureScale));
        const cloudGeometry = new THREE.SphereGeometry(planet.radius * 1.025, planetSegments, planetSegments);
        const cloudMaterial = new THREE.MeshStandardMaterial({ alphaMap: cloudTexture, transparent: true, depthWrite: false, roughness: 1 });
        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(cloudMesh);
      } else if (recipe?.kind === "rocky") {
        const colorMap = sharpTexture(makeRockyTexture({ ...recipe, seed: planetIndex + 1, scale: textureScale }), { srgb: true });
        const bumpMap = sharpTexture(makeBumpTexture({ craterCount: recipe.craterCount, seed: planetIndex + 1, scale: textureScale }));
        material = new THREE.MeshStandardMaterial({ map: colorMap, bumpMap, bumpScale: 0.01, roughness: 0.9, metalness: 0.05 });
      } else if (recipe?.kind === "banded") {
        const colorMap = sharpTexture(makeBandedTexture({ ...recipe, seed: planetIndex + 1, scale: textureScale }), { srgb: true });
        material = new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.7, metalness: 0 });
      } else {
        material = new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.85, metalness: 0.05 });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.factKey = planet.name;
      mesh.receiveShadow = planet.name === "Saturn";
      scene.add(mesh);
      raycastTargets.push(mesh);

      let ring = null;
      if (planet.ring) {
        const ringGeometry = new THREE.RingGeometry(planet.radius * 1.4, planet.radius * 2.3, 64);
        const pos = ringGeometry.attributes.position;
        const uv = ringGeometry.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const dist = v3.length() / (planet.radius * 2.3);
          uv.setXY(i, dist, 0.5);
        }
        const ringTexture = new THREE.CanvasTexture(makeRingTexture());
        disposableTextures.push(ringTexture);
        const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.3 });
        ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.4;
        // Casts a real shadow onto Saturn's surface (see
        // renderer.shadowMap above) — alphaTest on the ring material
        // makes the depth pass respect the ring's gap/fade alpha, so
        // the shadow reads as a ring shape, not a solid disc.
        ring.castShadow = true;
        ring.userData.factKey = planet.name;
        scene.add(ring);
        raycastTargets.push(ring);
      }

      let atmosphere = null;
      if (ATMOSPHERE_COLORS[planet.name]) {
        atmosphere = buildAtmosphere(planet.radius, ATMOSPHERE_COLORS[planet.name], planetSegments);
        scene.add(atmosphere);
      }

      const orbitPoints = buildOrbitPoints(planet, SCALE);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const orbitMaterial = new THREE.LineBasicMaterial({ color: "#6b7aa8", transparent: true, opacity: 0.28 });
      const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);

      return { planet, mesh, ring, material, cloudMesh, atmosphere };
    });

    const earthEntry = planetMeshes.find((p) => p.planet.name === "Earth");
    let moon = null;
    if (earthEntry) {
      const moonRadius = 0.05;
      const moonTexture = sharpTexture(
        makeRockyTexture({ base: "#aaa6a0", dark: "#77726c", light: "#c9c5be", craterCount: 90, patchCount: 3, poleShadow: 0.15, seed: 99, scale: textureScale }),
        { srgb: true }
      );
      const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.95 });
      const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(moonRadius, 20, 20), moonMaterial);
      scene.add(moonMesh);
      moon = { mesh: moonMesh, orbitRadius: 0.42, angle: Math.random() * Math.PI * 2 };
    }

    const belt = buildAsteroidBelt(isNarrow ? 900 : 2000);
    scene.add(belt.points);

    const shootingStars = buildShootingStars(3);
    for (const s of shootingStars) scene.add(s.line);

    function layoutPlanets(simDays) {
      for (const { planet, mesh, ring, cloudMesh, atmosphere } of planetMeshes) {
        const { x, y, z, r } = planetPosition(planet, simDays);
        const dr = displayRadius(r, SCALE) / r;
        mesh.position.set(x * dr, z * dr, -y * dr);
        if (ring) ring.position.copy(mesh.position);
        if (cloudMesh) cloudMesh.position.copy(mesh.position);
        if (atmosphere) atmosphere.position.copy(mesh.position);
      }
      if (moon && earthEntry) {
        moon.mesh.position.copy(earthEntry.mesh.position);
        moon.mesh.position.x += Math.cos(moon.angle) * moon.orbitRadius;
        moon.mesh.position.z += Math.sin(moon.angle) * moon.orbitRadius;
      }
      updateAsteroidBelt(belt, simDays);
    }
    layoutPlanets(0);

    function meshForFactKey(key) {
      if (key === "Sun") return sun;
      return planetMeshes.find((p) => p.planet.name === key)?.mesh ?? null;
    }
    recenterRef.current = (key) => {
      const mesh = meshForFactKey(key);
      if (!mesh) return;
      followedName = key;
    };

    // Click vs. drag: OrbitControls needs the same pointer events, so
    // rather than fight it for capture, just measure movement between
    // pointerdown and pointerup — a real click barely moves.
    let downX = 0, downY = 0, downT = 0;
    function onPointerDown(e) {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    }
    function onPointerUp(e) {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 6 || performance.now() - downT > 400) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        const key = hits[0].object.userData.factKey;
        setSelected(key);
        followedName = key;
        setShowHint(false);
      }
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let raf;
    const startTime = performance.now();
    let simDaysAccum = 0;
    let lastNow = startTime;

    function renderScene() {
      camera.layers.set(BLOOM_LAYER);
      bloomComposer.render();
      camera.layers.set(0);
      composer.render();
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(now - lastNow, 100);
      const dtSeconds = dt / 1000;
      lastNow = now;
      const elapsedSeconds = (now - startTime) / 1000;
      stars.material.uniforms.uTime.value = elapsedSeconds;

      if (stateRef.current.isPlaying) {
        simDaysAccum += dtSeconds * stateRef.current.speed;
        layoutPlanets(simDaysAccum);
        sun.rotation.y += dt * 0.00005;
        stars.rotation.y += dt * 0.000004;
        for (const { mesh, cloudMesh } of planetMeshes) {
          mesh.rotation.y += dt * 0.00012;
          if (cloudMesh) cloudMesh.rotation.y += dt * 0.00016;
        }
        if (moon) moon.angle += dtSeconds * stateRef.current.speed * ((Math.PI * 2) / 27.3);
        updateShootingStars(shootingStars, dtSeconds, elapsedSeconds);
      }

      if (followedName) {
        const mesh = meshForFactKey(followedName);
        if (mesh) controls.target.lerp(mesh.position, 0.08);
      }
      controls.update();
      renderScene();
    }
    raf = requestAnimationFrame(tick);

    function onResize() {
      width = container.clientWidth;
      height = container.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      bloomComposer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      composer.dispose();
      bloomComposer.dispose();
      sunGlowTexture.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      milkyWay.geometry.dispose();
      milkyWay.material.dispose();
      belt.points.geometry.dispose();
      belt.points.material.dispose();
      for (const s of shootingStars) {
        s.line.geometry.dispose();
        s.line.material.dispose();
      }
      sunGeometry.dispose();
      sunMaterial.dispose();
      sunGlowMaterial.dispose();
      for (const texture of disposableTextures) texture.dispose();
      for (const { mesh, ring, material, cloudMesh, atmosphere } of planetMeshes) {
        mesh.geometry.dispose();
        material.dispose();
        if (ring) {
          ring.geometry.dispose();
          ring.material.dispose();
        }
        if (cloudMesh) {
          cloudMesh.geometry.dispose();
          cloudMesh.material.dispose();
        }
        if (atmosphere) {
          atmosphere.geometry.dispose();
          atmosphere.material.dispose();
        }
      }
      if (moon) moon.mesh.geometry.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const factEntry = selected === "Sun" ? SUN_FACT : selected ? PLANET_FACTS[selected] : null;
  const orbitalEntry = selected && selected !== "Sun" ? PLANETS.find((p) => p.name === selected) : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#02050c]">
      {!failed && <div ref={mountRef} className="w-full h-full touch-none" />}
      {failed && (
        <div className="w-full h-full grid place-items-center px-6 text-center">
          <p className="text-[color:var(--ink-400)] max-w-sm">
            Your browser doesn't support the 3D view this page needs. Everything else on the site still works.
          </p>
        </div>
      )}

      {!failed && showHint && (
        <div className="pointer-events-none absolute top-20 inset-x-0 flex justify-center px-4">
          <p className="glass rounded-full px-4 py-2 font-mono text-[.68rem] text-[color:var(--ink-300)] text-center">
            Drag to look around · Scroll or pinch to zoom · Click a planet
          </p>
        </div>
      )}

      {!failed && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center px-4 z-20">
          <div className="glass rounded-full flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => setIsPlaying((v) => !v)}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-8 h-8 grid place-items-center rounded-full border border-white/10 text-cyan hover:border-cyan/40 transition-colors"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-28 accent-cyan"
              aria-label="Simulation speed"
            />
            <span className="font-mono text-[.62rem] text-[color:var(--ink-400)] w-12 tabular-nums">{speed}d/s</span>
          </div>
        </div>
      )}

      {!failed && factEntry && (
        <div className="absolute top-20 right-4 sm:right-6 z-20 w-[min(320px,calc(100vw-2rem))]">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-[color:var(--ink-50)]">{selected}</h3>
                <p className="text-[.72rem] text-[color:var(--ink-400)]">{factEntry.type}</p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  recenterRef.current(null);
                }}
                aria-label="Close"
                className="w-7 h-7 grid place-items-center rounded-lg border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
            {orbitalEntry && (
              <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-[.68rem]">
                <div>
                  <p className="text-[color:var(--ink-400)]">Distance from Sun</p>
                  <p className="text-[color:var(--ink-100)]">{formatDistance(orbitalEntry.a)}</p>
                </div>
                <div>
                  <p className="text-[color:var(--ink-400)]">Orbital period</p>
                  <p className="text-[color:var(--ink-100)]">{formatPeriod(orbitalEntry.period)}</p>
                </div>
                <div>
                  <p className="text-[color:var(--ink-400)]">Moons</p>
                  <p className="text-[color:var(--ink-100)]">{factEntry.moons}</p>
                </div>
              </div>
            )}
            <p className="text-[.82rem] text-[color:var(--ink-300)] leading-relaxed">{factEntry.fact}</p>
            <button
              onClick={() => recenterRef.current(selected)}
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[.66rem] uppercase tracking-wide text-cyan hover:text-cyan/80 transition-colors"
            >
              <Locate size={12} /> Re-center
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
