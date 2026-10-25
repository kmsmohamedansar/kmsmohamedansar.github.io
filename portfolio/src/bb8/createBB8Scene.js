import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createBB8Animator } from "./createBB8Animator";
import { createBB8Behavior } from "./createBB8Behavior";
import { createBB8Locomotion } from "./createBB8Locomotion";
import { createBB8Sound } from "./createBB8Sound";

const COLORS = {
  ceramic: 0xe8dfcf,
  copper: 0xad6a43,
  graphite: 0x11171b,
  lens: 0x041116,
  cyan: 0x42ddeb,
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

function addSurfaceModule(parent, normal, size, materials, rotation = 0, illuminated = false) {
  const panel = new THREE.Group();
  const direction = new THREE.Vector3(...normal).normalize();
  panel.position.copy(direction.multiplyScalar(1.398));
  panel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  panel.rotateZ(rotation);

  const outer = mesh(new RoundedBoxGeometry(size[0], size[1], 0.075, 4, 0.06), materials.graphite);
  outer.position.z = 0.01;
  const inset = mesh(
    new RoundedBoxGeometry(size[0] * 0.52, size[1] * 0.58, 0.085, 4, 0.045),
    illuminated ? materials.cyan : materials.copper,
    { cast: false },
  );
  inset.position.z = 0.065;
  panel.add(outer, inset);
  parent.add(panel);
}

function addPanelSeams(body, materials) {
  const seamGeometry = new THREE.TorusGeometry(1.405, 0.014, 8, 96);
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

  const copperBand = mesh(new THREE.TorusGeometry(1.412, 0.044, 10, 96), materials.copper, { cast: false });
  copperBand.rotation.set(Math.PI / 2, 0.18, -0.16);
  body.add(copperBand);
}

function createBody(materials) {
  const body = new THREE.Group();
  body.name = "EMET_BODY_TRANSFORM";
  body.position.y = 1.45;

  const shell = mesh(new THREE.SphereGeometry(1.4, 64, 48), materials.ceramic);
  body.add(shell);
  addPanelSeams(body, materials);

  addSurfaceModule(body, [0.18, 0.12, 1], [0.28, 0.72], materials, 0.04, true);
  addSurfaceModule(body, [0.92, 0.16, 0.35], [0.5, 0.3], materials, -0.28);
  addSurfaceModule(body, [-0.78, -0.18, 0.58], [0.34, 0.62], materials, 0.36);

  const sideHub = new THREE.Group();
  sideHub.position.set(-1.34, 0.05, 0.22);
  sideHub.rotation.z = Math.PI / 2;
  const hubOuter = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.09, 48), materials.graphite);
  const hubRing = mesh(new THREE.TorusGeometry(0.27, 0.045, 10, 48), materials.copper);
  hubRing.rotation.x = Math.PI / 2;
  hubRing.position.y = -0.055;
  sideHub.add(hubOuter, hubRing);
  body.add(sideHub);

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
    glint.name = "EMET_LENS_GLINT";
    glint.position.set(position[0] - radius * 0.3, position[1] + radius * 0.3, position[2] + radius * 0.9);
    group.add(glint);
  }
}

function createHead(materials) {
  const head = new THREE.Group();
  head.name = "EMET_HEAD_TRANSFORM";
  head.position.y = 2.77;
  head.rotation.y = -0.08;

  const neck = mesh(new THREE.CylinderGeometry(0.31, 0.43, 0.24, 36), materials.graphite);
  neck.position.y = 0.08;
  const neckRing = mesh(new THREE.TorusGeometry(0.37, 0.045, 10, 48), materials.copper);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.12;
  const shell = mesh(new RoundedBoxGeometry(1.82, 0.76, 1.12, 6, 0.2), materials.graphite);
  shell.position.y = 0.55;
  shell.rotation.z = -0.035;
  const rearArmor = mesh(new RoundedBoxGeometry(0.66, 0.56, 1.14, 5, 0.16), materials.ceramic);
  rearArmor.position.set(-0.58, 0.55, -0.01);
  rearArmor.rotation.z = -0.035;
  const face = mesh(new RoundedBoxGeometry(1.12, 0.48, 0.08, 5, 0.12), materials.lens);
  face.position.set(0.28, 0.56, 0.57);
  head.add(neck, neckRing, shell, rearArmor, face);

  addLens(head, materials, [0.42, 0.58, 0.63], 0.25, true);
  const cyanRing = mesh(new THREE.TorusGeometry(0.285, 0.035, 10, 48), materials.cyan, { cast: false });
  cyanRing.position.set(0.42, 0.58, 0.69);
  head.add(cyanRing);
  const statusSlot = mesh(new RoundedBoxGeometry(0.075, 0.3, 0.045, 4, 0.025), materials.cyan, { cast: false });
  statusSlot.position.set(-0.26, 0.56, 0.64);
  head.add(statusSlot);

  const sidePanel = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 32), materials.copper);
  sidePanel.position.set(0.88, 0.53, 0.02);
  sidePanel.rotation.z = Math.PI / 2;
  head.add(sidePanel);

  const tallAntennaRig = new THREE.Group();
  tallAntennaRig.name = "EMET_ANTENNA_TALL";
  tallAntennaRig.position.set(-0.38, 0.96, -0.13);
  tallAntennaRig.rotation.z = -0.025;
  const antennaTall = mesh(new THREE.ConeGeometry(0.13, 0.72, 4), materials.graphite);
  antennaTall.position.y = 0.31;
  antennaTall.scale.z = 0.32;
  const antennaInset = mesh(new THREE.BoxGeometry(0.035, 0.34, 0.025), materials.copper);
  antennaInset.position.set(0, 0.3, 0.045);
  tallAntennaRig.add(antennaTall, antennaInset);
  const shortAntennaRig = new THREE.Group();
  shortAntennaRig.name = "EMET_ANTENNA_SHORT";
  shortAntennaRig.position.set(-0.7, 0.9, -0.12);
  shortAntennaRig.rotation.z = 0.035;
  const antennaShort = mesh(new THREE.ConeGeometry(0.11, 0.55, 4), materials.graphite);
  antennaShort.position.y = 0.23;
  antennaShort.scale.z = 0.32;
  shortAntennaRig.add(antennaShort);
  head.add(tallAntennaRig, shortAntennaRig);

  return head;
}

function createMaterials() {
  return {
    ceramic: standard(COLORS.ceramic, 0.38, 0.04),
    copper: standard(COLORS.copper, 0.28, 0.62),
    seam: standard(0x555d62, 0.48, 0.42),
    graphite: standard(COLORS.graphite, 0.28, 0.55),
    lens: new THREE.MeshPhysicalMaterial({ color: COLORS.lens, roughness: 0.08, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    cyan: new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 2.2, roughness: 0.22 }),
    glint: new THREE.MeshBasicMaterial({ color: 0xc8faff }),
  };
}

export function createBB8Scene(container, { variant = "preview" } = {}) {
  const companion = variant === "companion";
  const constrainedDevice = companion && (
    (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || window.matchMedia("(max-width: 720px)").matches
  );
  const scene = new THREE.Scene();
  if (!companion) scene.fog = new THREE.FogExp2(0x07090d, 0.055);

  const camera = new THREE.PerspectiveCamera(companion ? 39 : 34, 1, 0.1, 60);
  camera.position.set(companion ? 4 : 5.7, companion ? 3.25 : 3.85, companion ? 6.3 : 8.25);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, companion ? (constrainedDevice ? 1 : 1.35) : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const materials = createMaterials();
  const droid = new THREE.Group();
  droid.name = "EMET_DROID";
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
  key.shadow.mapSize.set(companion ? 1024 : 1536, companion ? 1024 : 1536);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0003;
  const rim = new THREE.DirectionalLight(0x6eb8ff, 3.4);
  rim.position.set(-5, 4, -3);
  const copperFill = new THREE.PointLight(0xc7794b, 16, 9, 2);
  copperFill.position.set(3.2, 1.3, -1.5);
  const cyanFill = new THREE.PointLight(0x42ddeb, 7, 5, 2);
  cyanFill.position.set(-1.4, 3.2, 3.2);
  scene.add(hemi, key, rim, copperFill, cyanFill);

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
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  if (observer) observer.observe(container);
  else window.addEventListener("resize", resize, { passive: true });
  resize();

  let frameId = 0;
  let elapsed = 0;
  let lastFrameAt = performance.now();
  let running = true;
  const render = (now = performance.now()) => {
    const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
    elapsed += delta;
    lastFrameAt = now;
    controls.update();
    locomotion.update(delta);
    animator.update(elapsed, delta, now);
    renderer.render(scene, camera);
    if (running) frameId = requestAnimationFrame(render);
  };
  render();

  return {
    body,
    head,
    sound,
    react: behavior.react,
    canvas: renderer.domElement,
    setScreenMotion: locomotion.applyScreenDisplacement,
    stopScreenMotion: locomotion.stopScreenMotion,
    setPaused(paused) {
      if (paused && running) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!paused && !running) {
        running = true;
        lastFrameAt = performance.now();
        frameId = requestAnimationFrame(render);
      }
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", resize);
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
