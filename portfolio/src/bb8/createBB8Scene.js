import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createBB8Animator } from "./createBB8Animator";
import { createBB8Behavior } from "./createBB8Behavior";
import { createBB8Locomotion } from "./createBB8Locomotion";
import { createBB8Sound } from "./createBB8Sound";

const COLORS = {
  porcelain: 0xf2f0e9,
  porcelainShade: 0xd9d8d2,
  orange: 0xe66b18,
  orangeDark: 0xa93b0b,
  silver: 0x6f7880,
  graphite: 0x17191b,
  lens: 0x07151d,
};

function standard(color, roughness = 0.45, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = cast;
  result.receiveShadow = receive;
  return result;
}

function addBodyPanel(parent, normal, scale, materials, rotation = 0) {
  const panel = new THREE.Group();
  const direction = new THREE.Vector3(...normal).normalize();
  panel.position.copy(direction.multiplyScalar(1.407));
  panel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  panel.rotateZ(rotation);

  const outer = mesh(new THREE.TorusGeometry(0.42 * scale, 0.064, 10, 42), materials.orange);
  const inner = mesh(new THREE.CylinderGeometry(0.305 * scale, 0.305 * scale, 0.025, 36), materials.porcelainShade);
  inner.rotation.x = Math.PI / 2;
  inner.position.z = -0.002;
  const hub = mesh(new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.035, 28), materials.silver);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.028;
  const inset = mesh(new THREE.CylinderGeometry(0.075 * scale, 0.075 * scale, 0.045, 24), materials.graphite);
  inset.rotation.x = Math.PI / 2;
  inset.position.z = 0.055;

  panel.add(outer, inner, hub, inset);
  for (let index = 0; index < 4; index += 1) {
    const tab = mesh(new THREE.BoxGeometry(0.1 * scale, 0.17 * scale, 0.04), materials.orangeDark);
    const angle = index * Math.PI / 2;
    tab.position.set(Math.cos(angle) * 0.28 * scale, Math.sin(angle) * 0.28 * scale, 0.025);
    tab.rotation.z = angle;
    panel.add(tab);
  }
  parent.add(panel);
}

function addPanelSeams(body, materials) {
  const seamGeometry = new THREE.TorusGeometry(1.405, 0.012, 8, 96);
  const rings = [
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
    [0, Math.PI / 2, 0],
  ];
  rings.forEach(([x, y, z]) => {
    const ring = mesh(seamGeometry, materials.seam, { cast: false });
    ring.rotation.set(x, y, z);
    body.add(ring);
  });

  [-0.55, 0.55].forEach((y) => {
    const latitudeRadius = Math.sqrt(1.405 ** 2 - y ** 2);
    const ring = mesh(new THREE.TorusGeometry(latitudeRadius, 0.014, 8, 80), materials.seam, { cast: false });
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    body.add(ring);
  });
}

function createBody(materials) {
  const body = new THREE.Group();
  body.name = "BB8_BODY_TRANSFORM";
  body.position.y = 1.45;

  const shell = mesh(new THREE.SphereGeometry(1.4, 64, 48), materials.porcelain);
  body.add(shell);
  addPanelSeams(body, materials);

  [
    { normal: [0.13, 0.12, 1], scale: 1.05, rotation: 0.15 },
    { normal: [0.9, 0.2, 0.42], scale: 0.9, rotation: -0.3 },
    { normal: [-0.86, 0.08, 0.5], scale: 0.88, rotation: 0.45 },
    { normal: [0.35, -0.8, 0.5], scale: 0.78, rotation: -0.2 },
    { normal: [0.2, 0.85, 0.45], scale: 0.7, rotation: 0.2 },
    { normal: [0, 0.05, -1], scale: 0.9, rotation: 0.1 },
  ].forEach(({ normal, scale, rotation }) => addBodyPanel(body, normal, scale, materials, rotation));

  return body;
}

function addLens(group, materials, position, radius, glow = false) {
  const mount = mesh(new THREE.CylinderGeometry(radius * 1.28, radius * 1.28, 0.09, 36), materials.graphite);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(...position);
  const glass = mesh(new THREE.SphereGeometry(radius, 30, 20, 0, Math.PI * 2, 0, Math.PI / 2), materials.lens);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(position[0], position[1], position[2] + 0.07);
  group.add(mount, glass);
  if (glow) {
    const glint = mesh(new THREE.SphereGeometry(radius * 0.19, 12, 8), materials.glint, { cast: false });
    glint.name = "BB8_LENS_GLINT";
    glint.position.set(position[0] - radius * 0.3, position[1] + radius * 0.3, position[2] + radius * 0.9);
    group.add(glint);
  }
}

function createHead(materials) {
  const head = new THREE.Group();
  head.name = "BB8_HEAD_TRANSFORM";
  head.position.y = 2.77;
  head.rotation.y = -0.08;

  const neck = mesh(new THREE.CylinderGeometry(0.65, 0.69, 0.14, 48), materials.graphite);
  neck.position.y = 0.02;
  const lowerRing = mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.12, 64), materials.silver);
  lowerRing.position.y = 0.11;
  const orangeRing = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.105, 64), materials.orange);
  orangeRing.position.y = 0.19;
  const whiteRim = mesh(new THREE.CylinderGeometry(0.75, 0.77, 0.13, 64), materials.porcelain);
  whiteRim.position.y = 0.27;
  const dome = mesh(new THREE.SphereGeometry(0.75, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), materials.porcelain);
  dome.position.y = 0.28;
  head.add(neck, lowerRing, orangeRing, whiteRim, dome);

  const crownBand = mesh(new THREE.TorusGeometry(0.48, 0.055, 10, 56), materials.orange);
  crownBand.rotation.x = Math.PI / 2;
  crownBand.position.y = 0.84;
  head.add(crownBand);

  // Front equipment is slightly asymmetrical, which keeps the silhouette
  // recognizable even when viewed at an angle.
  addLens(head, materials, [-0.18, 0.69, 0.655], 0.19, true);
  addLens(head, materials, [0.28, 0.51, 0.685], 0.095);

  const sensorPanel = mesh(new THREE.BoxGeometry(0.22, 0.09, 0.035), materials.silver);
  sensorPanel.position.set(0.23, 0.76, 0.64);
  sensorPanel.rotation.x = -0.15;
  head.add(sensorPanel);
  [-0.06, 0, 0.06].forEach((x) => {
    const port = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), materials.graphite);
    port.rotation.x = Math.PI / 2;
    port.position.set(0.23 + x, 0.76, 0.67);
    head.add(port);
  });

  const sidePanel = mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 30), materials.orange);
  sidePanel.position.set(0.67, 0.6, 0.15);
  sidePanel.rotation.y = Math.PI / 2;
  head.add(sidePanel);

  const tallAntennaRig = new THREE.Group();
  tallAntennaRig.name = "BB8_ANTENNA_TALL";
  tallAntennaRig.position.set(0.16, 1, 0.02);
  tallAntennaRig.rotation.z = -0.025;
  const antennaTall = mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.75, 10), materials.porcelainShade);
  antennaTall.position.y = 0.38;
  const antennaTip = mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.13, 10), materials.graphite);
  antennaTip.position.set(0.01, 0.81, 0);
  tallAntennaRig.add(antennaTall, antennaTip);
  const shortAntennaRig = new THREE.Group();
  shortAntennaRig.name = "BB8_ANTENNA_SHORT";
  shortAntennaRig.position.set(-0.18, 1.02, -0.01);
  shortAntennaRig.rotation.z = 0.035;
  const antennaShort = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.46, 10), materials.graphite);
  antennaShort.position.y = 0.23;
  shortAntennaRig.add(antennaShort);
  head.add(tallAntennaRig, shortAntennaRig);

  return head;
}

function createMaterials() {
  return {
    porcelain: standard(COLORS.porcelain, 0.32, 0.03),
    porcelainShade: standard(COLORS.porcelainShade, 0.46, 0.05),
    orange: standard(COLORS.orange, 0.36, 0.08),
    orangeDark: standard(COLORS.orangeDark, 0.45, 0.08),
    silver: standard(COLORS.silver, 0.25, 0.72),
    seam: standard(0x555d62, 0.48, 0.42),
    graphite: standard(COLORS.graphite, 0.28, 0.55),
    lens: new THREE.MeshPhysicalMaterial({ color: COLORS.lens, roughness: 0.08, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    glint: new THREE.MeshBasicMaterial({ color: 0x9fddff }),
  };
}

export function createBB8Scene(container, { variant = "preview" } = {}) {
  const companion = variant === "companion";
  const scene = new THREE.Scene();
  if (!companion) scene.fog = new THREE.FogExp2(0x07090d, 0.055);

  const camera = new THREE.PerspectiveCamera(companion ? 39 : 34, 1, 0.1, 60);
  camera.position.set(companion ? 4 : 5.7, companion ? 3.25 : 3.85, companion ? 6.3 : 8.25);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, companion ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const materials = createMaterials();
  const droid = new THREE.Group();
  droid.name = "BB8_DROID";
  droid.rotation.y = -0.16;
  const body = createBody(materials);
  const head = createHead(materials);
  droid.add(body, head);
  scene.add(droid);

  const groundMaterial = companion
    ? new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.26 })
    : new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.86, metalness: 0.12 });
  const ground = mesh(new THREE.CircleGeometry(8, 96), groundMaterial, { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.035;
  scene.add(ground);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.045;
  contactShadow.scale.set(1, 0.42, 1);
  scene.add(contactShadow);

  const hemi = new THREE.HemisphereLight(0xbcd8f2, 0x24180f, 1.35);
  const key = new THREE.DirectionalLight(0xfff1d8, 5.8);
  key.position.set(4.5, 7, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0003;
  const rim = new THREE.DirectionalLight(0x6eb8ff, 3.4);
  rim.position.set(-5, 4, -3);
  const orangeFill = new THREE.PointLight(0xff7a24, 20, 9, 2);
  orangeFill.position.set(3.2, 1.3, -1.5);
  scene.add(hemi, key, rim, orangeFill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.85, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 5.5;
  controls.maxDistance = 12;
  controls.minPolarAngle = Math.PI * 0.23;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.enablePan = false;
  controls.enabled = !companion;

  const sound = createBB8Sound(container);
  const locomotion = createBB8Locomotion({ container, camera, droid, body, contactShadow, arenaScale: companion ? 0.36 : 1 });
  const behavior = createBB8Behavior({ container, camera, droid });
  const animator = createBB8Animator({ container, camera, droid, head, controls, locomotion, behavior });

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let frameId = 0;
  let elapsed = 0;
  let lastFrameAt = performance.now();
  const render = (now = performance.now()) => {
    const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
    elapsed += delta;
    lastFrameAt = now;
    controls.update();
    locomotion.update(delta);
    animator.update(elapsed, delta, now);
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  };
  render();

  return {
    body,
    head,
    sound,
    dispose() {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      locomotion.dispose();
      behavior.dispose();
      animator.dispose();
      sound.dispose();
      controls.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
      groundMaterial.dispose();
      contactShadow.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
