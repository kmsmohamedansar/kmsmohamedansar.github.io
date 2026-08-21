import * as THREE from "three";

/**
 * Procedurally builds a rounded playing-card body: a front cap, a back
 * cap, and a side ribbon connecting them, each as its own geometry group
 * so three distinct materials (front/back/edge) can be assigned. Built
 * from sampled points around a rounded-rect outline rather than an
 * imported model — matches the Balatro-style card deck approach: pure
 * geometry math, no static assets.
 */
export function buildCardGeometry({ width = 1, height = 1.4, depth = 0.03, radius = 0.08, cornerSegments = 10 } = {}) {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);

  const corners = [
    { cx: hw - r, cy: hh - r, start: 0 }, // top-right
    { cx: -hw + r, cy: hh - r, start: Math.PI / 2 }, // top-left
    { cx: -hw + r, cy: -hh + r, start: Math.PI }, // bottom-left
    { cx: hw - r, cy: -hh + r, start: (3 * Math.PI) / 2 }, // bottom-right
  ];

  const outline = [];
  for (const { cx, cy, start } of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const t = start + (i / cornerSegments) * (Math.PI / 2);
      outline.push(new THREE.Vector2(cx + Math.cos(t) * r, cy + Math.sin(t) * r));
    }
  }

  const n = outline.length;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const groups = [];

  function pushVertex(x, y, z, nx, ny, nz, u, v) {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  }

  // Front cap: triangle fan from center (outline is convex, fan is valid).
  const frontStart = indices.length;
  const centerFront = pushVertex(0, 0, depth / 2, 0, 0, 1, 0.5, 0.5);
  const frontRing = outline.map((p) => pushVertex(p.x, p.y, depth / 2, 0, 0, 1, p.x / width + 0.5, p.y / height + 0.5));
  for (let i = 0; i < n; i++) {
    const a = frontRing[i];
    const b = frontRing[(i + 1) % n];
    indices.push(centerFront, a, b);
  }
  groups.push({ start: frontStart, count: indices.length - frontStart, materialIndex: 0 });

  // Back cap: mirrored winding so it faces -z.
  const backStart = indices.length;
  const centerBack = pushVertex(0, 0, -depth / 2, 0, 0, -1, 0.5, 0.5);
  const backRing = outline.map((p) => pushVertex(p.x, p.y, -depth / 2, 0, 0, -1, -p.x / width + 0.5, p.y / height + 0.5));
  for (let i = 0; i < n; i++) {
    const a = backRing[i];
    const b = backRing[(i + 1) % n];
    indices.push(centerBack, b, a);
  }
  groups.push({ start: backStart, count: indices.length - backStart, materialIndex: 1 });

  // Side ribbon: a quad per outline segment, normal pointing outward.
  const sideStart = indices.length;
  for (let i = 0; i < n; i++) {
    const p0 = outline[i];
    const p1 = outline[(i + 1) % n];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const u0 = i / n;
    const u1 = (i + 1) / n;

    const a = pushVertex(p0.x, p0.y, depth / 2, nx, ny, 0, u0, 1);
    const b = pushVertex(p1.x, p1.y, depth / 2, nx, ny, 0, u1, 1);
    const c = pushVertex(p1.x, p1.y, -depth / 2, nx, ny, 0, u1, 0);
    const d = pushVertex(p0.x, p0.y, -depth / 2, nx, ny, 0, u0, 0);
    indices.push(a, b, c, a, c, d);
  }
  groups.push({ start: sideStart, count: indices.length - sideStart, materialIndex: 2 });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  for (const g of groups) geometry.addGroup(g.start, g.count, g.materialIndex);
  geometry.computeBoundingSphere();

  return geometry;
}
