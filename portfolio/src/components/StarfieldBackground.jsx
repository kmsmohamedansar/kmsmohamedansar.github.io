import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { starVertexShader, starFragmentShader } from "../three/starfieldShaders";

// Same accent language as the deck's five cards and the old per-route
// backdrops — the starfield borrows it instead of inventing a new
// palette, so the "living background" still reads as this site's own.
const SECTION_ACCENTS = {
  hero: "#22d3ee",
  source: "#8e7dff",
  lineage: "#fbbf24",
  build: "#34d399",
  commit: "#fb7185",
};

function randSpherePoint(radius) {
  // Uniform-in-volume sphere sample via rejection, not a naive
  // spherical-coordinate pick — the latter clumps points at the poles.
  let x, y, z;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    z = Math.random() * 2 - 1;
  } while (x * x + y * y + z * z > 1);
  return [x * radius, y * radius, z * radius];
}

function buildStarGeometry(count) {
  const spiralPosition = new Float32Array(count * 3);
  const scatterPosition = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const sizeScale = new Float32Array(count);
  const tint = new Float32Array(count);
  const dummy = new Float32Array(count * 3); // required "position" attribute (unused by the vertex shader, but three expects one)

  const arms = 3;
  const spiralTightness = 2.6;
  const maxRadius = 7.5;

  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    // Bias toward the center (t^1.6) so the spiral reads as a dense
    // core thinning toward the edge, like a real galaxy's brightness
    // falloff, rather than an evenly-filled disk.
    const t = Math.pow(Math.random(), 1.6);
    const radius = t * maxRadius;
    const armOffset = (arm / arms) * Math.PI * 2;
    const angle = t * spiralTightness * Math.PI * 2 + armOffset + (Math.random() - 0.5) * 0.5;
    const jitter = (1 - t) * 0.35 + 0.12;
    const sx = Math.cos(angle) * radius + (Math.random() - 0.5) * jitter;
    const sy = Math.sin(angle) * radius + (Math.random() - 0.5) * jitter;
    const sz = (Math.random() - 0.5) * (0.6 + t * 1.4);

    // The camera looks down -Z, so the spiral's two large-radius axes
    // (sx, sy) have to land on screen-facing X/Y — putting either of
    // them on Z instead means the disk is viewed edge-on (a thin
    // line) and, worse, some of its ~7-unit radius ends up behind or
    // right on top of the camera, which is what produced the blown-
    // out white streak this replaced. sz (the thin ~1-unit jitter)
    // is the one that belongs on depth.
    spiralPosition[i * 3] = sx;
    spiralPosition[i * 3 + 1] = sy;
    spiralPosition[i * 3 + 2] = sz;

    const [gx, gy, gz] = randSpherePoint(11 + Math.random() * 10);
    scatterPosition[i * 3] = gx;
    scatterPosition[i * 3 + 1] = gy;
    scatterPosition[i * 3 + 2] = gz;

    phase[i] = Math.random() * Math.PI * 2;
    // Brighter core stars are a touch larger, echoing a real galaxy's
    // concentrated light; scattered field stars stay modest and even.
    sizeScale[i] = (1 - t) * 2.2 + 0.9 + Math.random() * 0.6;
    tint[i] = Math.random() < 0.14 ? 0.55 + Math.random() * 0.45 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(dummy, 3));
  geometry.setAttribute("spiralPosition", new THREE.BufferAttribute(spiralPosition, 3));
  geometry.setAttribute("scatterPosition", new THREE.BufferAttribute(scatterPosition, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("sizeScale", new THREE.BufferAttribute(sizeScale, 1));
  geometry.setAttribute("tint", new THREE.BufferAttribute(tint, 1));
  return geometry;
}

/**
 * The persistent backdrop for the whole scrollable experience (deck
 * hero through Contact) — a galaxy that pulls apart into a calm,
 * scattered starfield as you scroll, camera dollying back to match.
 * Lives behind everything as one continuous environment instead of
 * five separate per-section canvases, the way the rest of the site
 * used to swap backgrounds per route. EMET keeps its own matrix-rain
 * takeover; this never renders there.
 */
export default function StarfieldBackground({ scrollContainerRef }) {
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
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isNarrow ? 1.5 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(new THREE.Color("#050911"), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 4.2);
    camera.lookAt(0, 0, 0);

    const starCount = isNarrow ? 1800 : 5200;
    const geometry = buildStarGeometry(starCount);
    const material = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMorph: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uColorWhite: { value: new THREE.Color("#eaf2ff") },
        uColorAccent: { value: new THREE.Color(SECTION_ACCENTS.hero) },
      },
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Section-accent tracking — whichever [data-star-accent] section
    // has the most visible area inside the scroll container currently
    // "owns" the tint, blended in slowly so it reads as ambient mood,
    // not a hard color switch.
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

    const pointerTarget = { x: 0, y: 0 };
    function onPointerMove(e) {
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    if (!reduced) window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf;
    const startTime = performance.now();
    let morphSmoothed = 0;
    let camZSmoothed = camera.position.z;
    let camXSmoothed = 0;
    let camYSmoothed = 0.6;

    function scrollProgress() {
      const el = scrollContainerRef?.current;
      if (!el) return 0;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, el.scrollTop / max));
    }

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      if (document.hidden) return;
      const elapsed = now - startTime;
      material.uniforms.uTime.value = elapsed * 0.001;

      const targetMorph = scrollProgress();
      morphSmoothed += (targetMorph - morphSmoothed) * 0.06;
      material.uniforms.uMorph.value = morphSmoothed;

      currentAccent.lerp(targetAccent, 0.02);
      material.uniforms.uColorAccent.value.copy(currentAccent);

      const targetZ = 4.2 + morphSmoothed * 9.5;
      camZSmoothed += (targetZ - camZSmoothed) * 0.05;
      const targetX = pointerTarget.x * 0.35;
      const targetY = 0.6 - pointerTarget.y * 0.22;
      camXSmoothed += (targetX - camXSmoothed) * 0.03;
      camYSmoothed += (targetY - camYSmoothed) * 0.03;
      camera.position.set(camXSmoothed, camYSmoothed, camZSmoothed);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    if (reduced) {
      // One motionless frame: no rotation, no twinkle animation, morph
      // fixed to wherever the page happened to be scrolled to.
      material.uniforms.uMorph.value = scrollProgress();
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
      observer?.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [scrollContainerRef]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050911]">
      {!failed && <div ref={mountRef} className="w-full h-full" />}
    </div>
  );
}
