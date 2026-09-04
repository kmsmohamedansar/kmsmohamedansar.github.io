import * as THREE from "three";
import { starVertexShader, starFragmentShader } from "./starShaders";

// Shared between SolarSystemBackground (the scroll backdrop) and
// SolarSystemExplorer (the interactive view) so the starfield always
// looks identical regardless of which one is mounted.

export function makeGlowSprite(color) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, `${color}dd`);
  grad.addColorStop(0.45, `${color}44`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function buildBackgroundStars(count, pixelRatio) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const brightness = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Uniform-in-volume sphere sample (rejection method) well outside
    // Neptune's orbit, so the solar system reads as sitting inside a
    // real starfield rather than floating in front of a backdrop.
    let x, y, z;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    const r = 40 + Math.random() * 60;
    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;

    // Most stars stay small and dim; a minority read as brighter
    // "named" stars with a larger point size — real skies aren't
    // uniform, and that variety is most of what makes a starfield
    // read as sharp rather than as a wash of identical dots.
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
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
  });
  return new THREE.Points(geometry, material);
}
