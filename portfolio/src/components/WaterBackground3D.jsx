import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { waterVertexShader, waterFragmentShader } from "../three/waterShaders";
import { WaterDropBackground as WaterDropBackground2D } from "./RouteBackgrounds";

const WAVES = 5;
const CYCLE_PERIOD = 7200;

/**
 * The homepage backdrop, in true 3D: a lit, displaced water plane
 * (see three/waterShaders.js) viewed through a top-down orthographic
 * camera, so ripples read as real raised geometry catching light
 * rather than drawn rings. Falls back to the flat Canvas 2D version
 * of the same effect when WebGL is unavailable or the visitor has
 * asked for reduced motion — same fallback pattern as NavCardDeck.
 */
export default function WaterBackground3D() {
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
    if (reduced || !supportsWebGL) {
      setFailed(true);
      return;
    }

    let width = container.clientWidth;
    let height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 2000);
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);

    const startOffsets = Array.from({ length: WAVES }, (_, i) => -(i * (CYCLE_PERIOD / WAVES)));
    const seeds = Array.from({ length: WAVES }, () => Math.random() * Math.PI * 2);

    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOrigin: { value: new THREE.Vector2(0, height * 0.04) },
        uMaxR: { value: Math.max(width, height) * 0.85 },
        uCyclePeriod: { value: CYCLE_PERIOD },
        uStartOffsets: { value: startOffsets },
        uSeeds: { value: seeds },
        uLightDir: { value: new THREE.Vector3(0.35, 0.5, 1.0) },
        uColorLow: { value: new THREE.Color("#eef8ff") },
        uColorHigh: { value: new THREE.Color("#bae6fd") },
      },
    });

    let plane;
    function buildPlane(w, h) {
      if (plane) {
        scene.remove(plane);
        plane.geometry.dispose();
      }
      const segX = Math.min(160, Math.max(48, Math.round(w / 9)));
      const segY = Math.min(160, Math.max(48, Math.round(h / 9)));
      const geometry = new THREE.PlaneGeometry(w, h, segX, segY);
      plane = new THREE.Mesh(geometry, material);
      scene.add(plane);
    }
    buildPlane(width, height);

    let raf;
    const startTime = performance.now();

    function renderFrame(now) {
      material.uniforms.uTime.value = now - startTime;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderFrame);
    }
    raf = requestAnimationFrame(renderFrame);

    function onResize() {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      material.uniforms.uOrigin.value.set(0, height * 0.04);
      material.uniforms.uMaxR.value = Math.max(width, height) * 0.85;
      buildPlane(width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (plane) plane.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (failed) return <WaterDropBackground2D />;

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
