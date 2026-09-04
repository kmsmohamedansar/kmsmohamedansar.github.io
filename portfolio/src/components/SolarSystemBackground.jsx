import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
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

const SCALE = 1.6; // AU -> scene units, after the sqrt compression in orbitalMechanics.js
const SUN_RADIUS = 1.5;
// Page content (headings, stats, the card deck) is a centered column,
// but camera.lookAt(0,0,0) would put the sun — sitting at the world
// origin — dead center behind it every time. Aiming the camera at a
// point offset from the origin instead pushes the sun and its orbits
// toward screen-right, into the gutter the centered column leaves
// open, without moving any of the actual scene geometry.
const LOOK_TARGET_X = -8;
// A fictional clock: this many simulated days pass per real second,
// fast enough that Mercury visibly moves within seconds and Neptune
// (60,182-day period) still completes recognizable motion across a
// long visit, without either looking frozen or blurring past.
const DAYS_PER_SECOND = 6;

const SECTION_ACCENTS = {
  hero: "#22d3ee",
  source: "#8e7dff",
  lineage: "#fbbf24",
  build: "#34d399",
  commit: "#fb7185",
};

/**
 * The persistent backdrop for the whole scrollable experience — a
 * real solar system (see three/orbitalMechanics.js: actual JPL
 * orbital elements, Kepler's equation solved per frame, not a
 * simulated wobble) sitting inside a background starfield. The
 * camera starts close among the inner planets at the hero and pulls
 * back to frame the outer planets as you scroll, the way the
 * previous galaxy backdrop morphed from a tight spiral to a
 * dispersed field. EMET keeps its own matrix-rain takeover; this
 * never renders there.
 */
export default function SolarSystemBackground({ scrollContainerRef }) {
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
    // Uncapped (up to a sane ceiling) rather than the old flat 2x: a 4K
    // desktop monitor is commonly devicePixelRatio 1 already (native
    // resolution, not "retina" scaled) and was rendering at full
    // sharpness before — the real loss was on HiDPI laptops/phones
    // (dPR 2-3), which this now renders at their true density too.
    // Mobile keeps a lower ceiling; a phone's GPU pays for every extra
    // fragment at a much higher relative cost than a desktop's.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isNarrow ? 2 : 3);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES filmic tone mapping — the same curve real rendered space
    // imagery uses for its highlight rolloff, so the sun and bright
    // stars read as properly exposed light sources instead of flat
    // clipped-white circles.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(new THREE.Color("#02050c"), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 500);

    // Bloom on the sun only — the soft light-source glow real rendered
    // space imagery has, versus a flat clipped-white circle. A plain
    // brightness threshold can't isolate "just the sun": the star
    // shader already draws its brightest stars at similar or higher
    // raw luminance than the sun's mid-tones (that's what makes them
    // read as sharp named stars), so thresholding either blooms every
    // bright star into a soft blob too, or excludes the sun. Selective
    // bloom via a render layer sidesteps that — only objects flagged
    // BLOOM_LAYER are visible to the isolated bloom pass, so stars and
    // planets are structurally excluded regardless of their pixel
    // brightness, not just dimmed below some threshold.
    const BLOOM_LAYER = 1;
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    const bloomRenderPass = new RenderPass(scene, camera);
    // Force a pure black clear for this pass specifically — otherwise
    // it inherits the renderer's navy background clear color, which
    // (dim as it is) still blooms into a faint full-frame wash once
    // blurred and boosted across the bloom pass's multiple mip levels.
    bloomRenderPass.clearColor = new THREE.Color(0x000000);
    bloomRenderPass.clearAlpha = 1;
    bloomComposer.addPass(bloomRenderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.22, 0.1);
    bloomComposer.addPass(bloomPass);

    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
          }
        `,
      }),
      "baseTexture"
    );
    mixPass.needsSwap = true;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(mixPass);
    composer.addPass(new OutputPass());

    // A planet's night side would otherwise read as a pure black
    // silhouette whenever it happens to sit between the camera and
    // the sun — a soft hemisphere fill keeps it dimly visible instead.
    scene.add(new THREE.HemisphereLight("#8fa4d8", "#0a0e1a", 1.1));
    const sunLight = new THREE.PointLight("#fff6e0", 3.2, 0, 0.15);
    scene.add(sunLight);

    const stars = buildBackgroundStars(isNarrow ? 1400 : 3200, pixelRatio);
    scene.add(stars);

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
      color: new THREE.Color(SECTION_ACCENTS.hero),
    });
    const sunGlow = new THREE.Sprite(sunGlowMaterial);
    // Tuned against the camera's closest approach (~13 units, at the
    // hero): a scale comparable to camera distance itself would read
    // as a huge blob filling most of the frame rather than a corona.
    sunGlow.scale.setScalar(SUN_RADIUS * 3);
    scene.add(sunGlow);

    // Higher segment count than a flat-color sphere would need — worth
    // it now that surface textures and specular highlights actually
    // have geometry detail to sit on; still cheap for 8 spheres.
    const planetSegments = isNarrow ? 32 : 48;
    const disposableTextures = [];

    const planetMeshes = PLANETS.map((planet, planetIndex) => {
      const geometry = new THREE.SphereGeometry(planet.radius, planetSegments, planetSegments);
      const recipe = SURFACE_RECIPES[planet.name];
      let material;
      let cloudMesh = null;

      if (planet.name === "Earth") {
        const colorMap = new THREE.CanvasTexture(makeEarthTexture());
        colorMap.colorSpace = THREE.SRGBColorSpace;
        disposableTextures.push(colorMap);
        material = new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.75, metalness: 0.05 });

        const cloudTexture = new THREE.CanvasTexture(makeEarthCloudTexture());
        disposableTextures.push(cloudTexture);
        const cloudGeometry = new THREE.SphereGeometry(planet.radius * 1.025, planetSegments, planetSegments);
        const cloudMaterial = new THREE.MeshStandardMaterial({
          alphaMap: cloudTexture,
          transparent: true,
          depthWrite: false,
          roughness: 1,
        });
        cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(cloudMesh);
      } else if (recipe?.kind === "rocky") {
        const colorMap = new THREE.CanvasTexture(
          makeRockyTexture({ ...recipe, seed: planetIndex + 1 })
        );
        colorMap.colorSpace = THREE.SRGBColorSpace;
        const bumpMap = new THREE.CanvasTexture(makeBumpTexture({ craterCount: recipe.craterCount, seed: planetIndex + 1 }));
        disposableTextures.push(colorMap, bumpMap);
        material = new THREE.MeshStandardMaterial({
          map: colorMap,
          bumpMap,
          bumpScale: 0.01,
          roughness: 0.9,
          metalness: 0.05,
        });
      } else if (recipe?.kind === "banded") {
        const colorMap = new THREE.CanvasTexture(makeBandedTexture({ ...recipe, seed: planetIndex + 1 }));
        colorMap.colorSpace = THREE.SRGBColorSpace;
        disposableTextures.push(colorMap);
        // Gas/ice giants: no bump map — their "surface" is atmosphere,
        // which scatters light softly with no hard terrain relief.
        material = new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.7, metalness: 0 });
      } else {
        material = new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.85, metalness: 0.05 });
      }

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      let ring = null;
      if (planet.ring) {
        const ringGeometry = new THREE.RingGeometry(planet.radius * 1.4, planet.radius * 2.3, 64);
        // RingGeometry's UVs run radially, not angularly — remap so
        // a single radial gradient (opacity fading toward the edges)
        // reads as a ring instead of a bowtie.
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
        const ringMaterial = new THREE.MeshBasicMaterial({
          map: ringTexture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.4;
        scene.add(ring);
      }

      const orbitPoints = buildOrbitPoints(planet, SCALE);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      );
      const orbitMaterial = new THREE.LineBasicMaterial({ color: "#6b7aa8", transparent: true, opacity: 0.28 });
      const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);

      return { planet, mesh, ring, material, cloudMesh };
    });

    // Pointer parallax — same restrained pattern as the deck and the
    // previous starfield: a few pixels of drift, not a drag-to-orbit
    // control (this sits behind interactive foreground content, so a
    // real orbit control would fight page scrolling/clicks).
    const pointerTarget = { x: 0, y: 0 };
    function onPointerMove(e) {
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    if (!reduced) window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Section-accent tracking — identical mechanism to the previous
    // starfield: whichever [data-star-accent] section is most visible
    // slowly pulls the sun's glow toward that section's accent color.
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

    function scrollProgress() {
      const el = scrollContainerRef?.current;
      if (!el) return 0;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, el.scrollTop / max));
    }

    let raf;
    const startTime = performance.now();
    let progressSmoothed = 0;
    let camXSmoothed = 0;
    // A steep, elevated diagonal view throughout — not just for the
    // classic "orbital diagram" look, but because it keeps outer
    // planets from ever passing directly between the camera and the
    // sun the way a near-edge-on view would let them. The distance
    // floor matters more than the angle, though: even Neptune's own
    // orbit (~14 scene units out) needs real clearance from the
    // camera's closest approach to it, or its worst-case distance to
    // the camera gets small enough for it to loom the way any body
    // does at close range, lit side or not.
    let camYSmoothed = 10;
    let camZSmoothed = 9;
    let simDaysAccum = 0;
    let lastNow = startTime;

    function layoutPlanets(simDays) {
      for (const { planet, mesh, ring, cloudMesh } of planetMeshes) {
        const { x, y, z, r } = planetPosition(planet, simDays);
        const dr = displayRadius(r, SCALE) / r;
        mesh.position.set(x * dr, z * dr, -y * dr);
        if (ring) ring.position.copy(mesh.position);
        if (cloudMesh) cloudMesh.position.copy(mesh.position);
      }
    }
    layoutPlanets(0);

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      if (document.hidden) return;
      const dt = Math.min(now - lastNow, 100);
      lastNow = now;
      stars.material.uniforms.uTime.value = (now - startTime) * 0.001;

      if (!reduced) {
        simDaysAccum += (dt / 1000) * DAYS_PER_SECOND;
        layoutPlanets(simDaysAccum);
        sun.rotation.y += dt * 0.00005;
        stars.rotation.y += dt * 0.000004;
        for (const { mesh, cloudMesh } of planetMeshes) {
          mesh.rotation.y += dt * 0.00012;
          if (cloudMesh) cloudMesh.rotation.y += dt * 0.00016;
        }
      }

      currentAccent.lerp(targetAccent, 0.02);
      sunGlowMaterial.color.copy(currentAccent);

      const targetProgress = scrollProgress();
      progressSmoothed += (targetProgress - progressSmoothed) * 0.06;

      // Camera pulls back from framing just the inner rocky planets
      // (close) to the full system out past Neptune (far) as the
      // visitor scrolls from the hero down to Contact.
      const targetY = 10 + progressSmoothed * 22;
      const targetZ = 9 + progressSmoothed * 20;
      const targetX = pointerTarget.x * 0.6;
      camXSmoothed += (targetX - camXSmoothed) * 0.03;
      camYSmoothed += (targetY + pointerTarget.y * 0.4 - camYSmoothed) * 0.05;
      camZSmoothed += (targetZ - camZSmoothed) * 0.05;
      camera.position.set(camXSmoothed, camYSmoothed, camZSmoothed);
      camera.lookAt(LOOK_TARGET_X, 0, 0);

      renderScene();
    }

    // Bloom-layer-only pass first (produces just the sun's glow, since
    // everything else is invisible to a camera masked to BLOOM_LAYER),
    // then the normal full-scene pass with that bloom texture added on
    // top by mixPass.
    function renderScene() {
      camera.layers.set(BLOOM_LAYER);
      bloomComposer.render();
      camera.layers.set(0);
      composer.render();
    }

    if (reduced) {
      camera.position.set(0, 11, 10);
      camera.lookAt(LOOK_TARGET_X, 0, 0);
      layoutPlanets(0);
      renderScene();
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
      composer.setSize(width, height);
      bloomComposer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      composer.dispose();
      bloomComposer.dispose();
      observer?.disconnect();
      sunGlowTexture.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      sunGeometry.dispose();
      sunMaterial.dispose();
      sunGlowMaterial.dispose();
      for (const texture of disposableTextures) texture.dispose();
      for (const { mesh, ring, material, cloudMesh } of planetMeshes) {
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
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [scrollContainerRef]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02050c]">
      {!failed && <div ref={mountRef} className="w-full h-full" />}
    </div>
  );
}
