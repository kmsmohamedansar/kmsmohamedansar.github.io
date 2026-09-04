import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { waterVertexShader, waterFragmentShader } from "../three/waterShaders";
import { WaterDropBackground as WaterDropBackground2D } from "./RouteBackgrounds";

const WAVES = 5;
const CYCLE_PERIOD = 7200;

// Below this width there's no open water margin around the fanned
// deck for a topology to read in — it would just collide with the
// cards — and it's the width bracket where render budget matters
// most. The water surface alone still carries the view there.
const TOPOLOGY_MIN_WIDTH = 860;

// A soft round sprite for topology nodes/pulses — THREE.PointsMaterial
// draws hard-edged squares with no map, which reads as pixelated
// static rather than a suspended point of light.
function makeDotSprite() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * A quiet data-topology graph adrift under the deck: a sparse set of
 * nodes wired to their nearest neighbors, standing in for "systems,
 * pipelines, connected data" rather than a decorative particle field.
 * Lives in the same scene as the water plane, at a z just in front of
 * it, so it reads as a layer suspended a little above the surface.
 */
function buildTopology(width, height) {
  const count = Math.max(22, Math.min(40, Math.round((width * height) / 42000)));
  const nodes = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * width * 0.92,
    y: (Math.random() - 0.5) * height * 0.92,
    baseX: 0,
    baseY: 0,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.4,
    amp: 8 + Math.random() * 10,
  }));
  nodes.forEach((n) => {
    n.baseX = n.x;
    n.baseY = n.y;
  });

  // Each node wires to its 1-2 nearest neighbors within reach — a
  // sparse graph that reads as infrastructure, not a dense web.
  const maxReach = Math.max(width, height) * 0.16;
  const edgeSet = new Set();
  const edges = [];
  nodes.forEach((n, i) => {
    const distances = nodes
      .map((other, j) => (j === i ? null : { j, d: Math.hypot(other.x - n.x, other.y - n.y) }))
      .filter((e) => e && e.d < maxReach)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of distances) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([i, j]);
      }
    }
  });

  // A handful of edges carry a traveling pulse — the "signal moving
  // through the system" cue — cycling on a staggered, slow interval
  // rather than all firing in sync.
  const pulseCount = Math.min(6, edges.length);
  const pulses = Array.from({ length: pulseCount }, (_, i) => ({
    edge: edges[Math.floor((i / pulseCount) * edges.length)] || edges[0],
    offset: Math.random(),
    speed: 0.00009 + Math.random() * 0.00006,
  }));

  return { nodes, edges, pulses };
}

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

    // A faint suspended graph of nodes + wires just in front of the
    // water surface — see buildTopology above. Its own group so the
    // whole layer can shift together for the pointer-parallax below
    // without touching the water plane's own transform.
    const topologyGroup = new THREE.Group();
    topologyGroup.position.z = 6;
    scene.add(topologyGroup);
    const dotTexture = new THREE.CanvasTexture(makeDotSprite());
    let topologyState = null;
    let nodePositions, nodeGeometry, nodePoints, nodeMaterial;
    let linePositions, lineGeometry, lineSegments, lineMaterial;
    let pulsePositions, pulseGeometry, pulsePoints, pulseMaterial;

    function disposeTopology() {
      if (!topologyState) return;
      topologyGroup.remove(nodePoints, lineSegments, pulsePoints);
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      pulseGeometry.dispose();
      pulseMaterial.dispose();
      topologyState = null;
    }

    function buildTopologyLayer(w, h) {
      disposeTopology();
      if (w < TOPOLOGY_MIN_WIDTH) return;
      topologyState = buildTopology(w, h);
      const { nodes, edges, pulses } = topologyState;

      nodePositions = new Float32Array(nodes.length * 3);
      nodes.forEach((n, i) => {
        nodePositions[i * 3] = n.x;
        nodePositions[i * 3 + 1] = n.y;
        nodePositions[i * 3 + 2] = 0;
      });
      nodeGeometry = new THREE.BufferGeometry();
      nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
      nodeMaterial = new THREE.PointsMaterial({
        map: dotTexture,
        color: new THREE.Color("#0e7490"),
        size: 9,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
      topologyGroup.add(nodePoints);

      linePositions = new Float32Array(edges.length * 6);
      lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color("#0e7490"),
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      topologyGroup.add(lineSegments);

      pulsePositions = new Float32Array(pulses.length * 3);
      pulseGeometry = new THREE.BufferGeometry();
      pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
      pulseMaterial = new THREE.PointsMaterial({
        map: dotTexture,
        color: new THREE.Color("#22d3ee"),
        size: 12,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
      topologyGroup.add(pulsePoints);
    }
    buildTopologyLayer(width, height);

    // Pointer parallax — the whole topology group drifts a few pixels
    // opposite the cursor, a much smaller effect than the deck cards'
    // own tilt so it reads as environment, not another control.
    const pointerTarget = { x: 0, y: 0 };
    function onPointerMove(e) {
      pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    function updateTopology(now) {
      if (!topologyState) return;
      const { nodes, edges, pulses } = topologyState;

      topologyGroup.position.x += (-pointerTarget.x * 10 - topologyGroup.position.x) * 0.03;
      topologyGroup.position.y += (pointerTarget.y * 8 - topologyGroup.position.y) * 0.03;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x = n.baseX + Math.sin(now * 0.00006 * n.speed + n.phase) * n.amp;
        n.y = n.baseY + Math.cos(now * 0.00005 * n.speed + n.phase) * n.amp * 0.7;
        nodePositions[i * 3] = n.x;
        nodePositions[i * 3 + 1] = n.y;
      }
      nodeGeometry.attributes.position.needsUpdate = true;

      for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        linePositions[i * 6] = nodes[a].x;
        linePositions[i * 6 + 1] = nodes[a].y;
        linePositions[i * 6 + 3] = nodes[b].x;
        linePositions[i * 6 + 4] = nodes[b].y;
      }
      lineGeometry.attributes.position.needsUpdate = true;

      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        if (!p.edge) continue;
        const progress = (p.offset + now * p.speed) % 1;
        const a = nodes[p.edge[0]];
        const b = nodes[p.edge[1]];
        pulsePositions[i * 3] = a.x + (b.x - a.x) * progress;
        pulsePositions[i * 3 + 1] = a.y + (b.y - a.y) * progress;
      }
      pulseGeometry.attributes.position.needsUpdate = true;
    }

    let raf;
    const startTime = performance.now();

    function renderFrame(now) {
      raf = requestAnimationFrame(renderFrame);
      if (document.hidden) return;
      material.uniforms.uTime.value = now - startTime;
      updateTopology(now);
      renderer.render(scene, camera);
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
      buildTopologyLayer(width, height);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      if (plane) plane.geometry.dispose();
      disposeTopology();
      dotTexture.dispose();
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
