import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createBB8Animator } from "./createBB8Animator";
import { createBB8Behavior } from "./createBB8Behavior";
import { createBB8Locomotion } from "./createBB8Locomotion";
import { createBB8Sound } from "./createBB8Sound";

const COLORS = {
  // Match the portfolio's editorial palette. The material keys retain their
  // original names because they describe finishes, not literal paint colors.
  ceramic: 0xe6d5bd,
  ceramicLight: 0xf4ece0,
  copper: 0xd5360c,
  copperDark: 0x74200d,
  graphite: 0x101010,
  lens: 0x101010,
  accent: 0xd5360c,
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

function addFastener(parent, x, y, z, material, radius = 0.025) {
  const fastener = mesh(new THREE.CylinderGeometry(radius, radius, 0.018, 12), material, { cast: false });
  fastener.rotation.x = Math.PI / 2;
  fastener.position.set(x, y, z);
  parent.add(fastener);
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
    illuminated ? materials.accent : materials.copper,
    { cast: false },
  );
  inset.position.z = 0.065;
  panel.add(outer, inset);
  const fastenerX = size[0] * 0.36;
  const fastenerY = size[1] * 0.38;
  addFastener(panel, -fastenerX, -fastenerY, 0.105, materials.fastener, 0.018);
  addFastener(panel, fastenerX, -fastenerY, 0.105, materials.fastener, 0.018);
  addFastener(panel, -fastenerX, fastenerY, 0.105, materials.fastener, 0.018);
  addFastener(panel, fastenerX, fastenerY, 0.105, materials.fastener, 0.018);
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

  // Broken arcs feel like service rails rather than the continuous orange
  // circles associated with BB-8's body panels.
  const upperRail = mesh(new THREE.TorusGeometry(1.413, 0.032, 8, 72, Math.PI * 1.24), materials.copper, { cast: false });
  upperRail.rotation.set(Math.PI / 2, 0.2, 0.42);
  const lowerRail = mesh(new THREE.TorusGeometry(1.414, 0.022, 8, 56, Math.PI * 0.72), materials.copperDark, { cast: false });
  lowerRail.rotation.set(0.18, Math.PI / 2, -1.12);
  body.add(upperRail, lowerRail);
}

function createBody(materials) {
  const body = new THREE.Group();
  body.name = "EMET_BODY_TRANSFORM";
  body.position.y = 1.45;

  const shell = mesh(new THREE.SphereGeometry(1.4, 64, 48), materials.ceramic);
  body.add(shell);
  addPanelSeams(body, materials);

  addSurfaceModule(body, [0.18, 0.12, 1], [0.25, 0.74], materials, 0.04, true);
  addSurfaceModule(body, [0.92, 0.16, 0.35], [0.54, 0.28], materials, -0.28);
  addSurfaceModule(body, [-0.78, -0.18, 0.58], [0.31, 0.59], materials, 0.36);
  addSurfaceModule(body, [0.42, -0.74, 0.52], [0.38, 0.2], materials, -0.16);

  const sideHub = new THREE.Group();
  sideHub.position.set(-1.34, 0.05, 0.22);
  sideHub.rotation.z = Math.PI / 2;
  const hubOuter = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.09, 48), materials.graphite);
  const hubRing = mesh(new THREE.TorusGeometry(0.27, 0.038, 10, 48), materials.copper);
  hubRing.rotation.x = Math.PI / 2;
  hubRing.position.y = -0.055;
  const hubCore = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 24), materials.fastener);
  hubCore.position.y = -0.09;
  sideHub.add(hubOuter, hubRing, hubCore);
  body.add(sideHub);

  const serviceBadge = new THREE.Group();
  serviceBadge.position.set(0.57, 0.48, 1.18);
  serviceBadge.rotation.set(-0.35, 0.43, -0.18);
  const badgePlate = mesh(new RoundedBoxGeometry(0.36, 0.16, 0.045, 3, 0.04), materials.copperDark, { cast: false });
  const badgeLight = mesh(new RoundedBoxGeometry(0.18, 0.035, 0.03, 2, 0.012), materials.accent, { cast: false });
  badgeLight.position.z = 0.037;
  serviceBadge.add(badgePlate, badgeLight);
  body.add(serviceBadge);

  return body;
}

function addLens(group, materials, position, radius, glow = false) {
  const mount = mesh(new THREE.CylinderGeometry(radius * 1.38, radius * 1.38, 0.11, 36), materials.graphite);
  mount.rotation.x = Math.PI / 2;
  mount.position.set(...position);
  const glass = mesh(new THREE.SphereGeometry(radius, 30, 20, 0, Math.PI * 2, 0, Math.PI / 2), materials.lens);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(position[0], position[1], position[2] + 0.07);
  const outerRing = mesh(new THREE.TorusGeometry(radius * 1.16, radius * 0.11, 10, 48), materials.copper, { cast: false });
  outerRing.position.set(position[0], position[1], position[2] + 0.12);
  const iris = mesh(new THREE.TorusGeometry(radius * 0.58, radius * 0.075, 10, 40), materials.accent, { cast: false });
  iris.position.set(position[0], position[1], position[2] + radius * 0.95);
  const pupil = mesh(new THREE.CircleGeometry(radius * 0.34, 30), materials.graphite, { cast: false });
  pupil.position.set(position[0], position[1], position[2] + radius * 1.02);
  group.add(mount, glass, outerRing, iris, pupil);
  if (glow) {
    const glint = mesh(new THREE.SphereGeometry(radius * 0.15, 12, 8), materials.glint, { cast: false });
    glint.name = "EMET_LENS_GLINT";
    glint.position.set(position[0] - radius * 0.25, position[1] + radius * 0.27, position[2] + radius * 1.08);
    group.add(glint);
  }
}

function createHead(materials) {
  const head = new THREE.Group();
  head.name = "EMET_HEAD_TRANSFORM";
  head.position.y = 2.77;
  head.rotation.y = -0.08;

  const neck = mesh(new THREE.CylinderGeometry(0.3, 0.43, 0.24, 36), materials.graphite);
  neck.position.y = 0.08;
  const neckRing = mesh(new THREE.TorusGeometry(0.37, 0.035, 10, 48), materials.copper);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.12;
  const neckBearing = mesh(new THREE.CylinderGeometry(0.23, 0.29, 0.13, 24), materials.fastener);
  neckBearing.position.y = 0.23;
  const shell = mesh(new RoundedBoxGeometry(1.94, 0.8, 1.16, 6, 0.22), materials.graphite);
  shell.position.y = 0.57;
  shell.rotation.z = -0.035;
  const rearArmor = mesh(new RoundedBoxGeometry(0.7, 0.59, 1.18, 5, 0.16), materials.ceramic);
  rearArmor.position.set(-0.61, 0.57, -0.01);
  rearArmor.rotation.z = -0.035;
  const crown = mesh(new RoundedBoxGeometry(1.37, 0.22, 1.17, 4, 0.09), materials.ceramicLight);
  crown.position.set(0.15, 0.91, -0.01);
  crown.rotation.z = -0.035;
  const face = mesh(new RoundedBoxGeometry(1.18, 0.48, 0.075, 5, 0.12), materials.lens);
  face.position.set(0.3, 0.57, 0.595);
  const brow = mesh(new RoundedBoxGeometry(1.1, 0.075, 0.07, 3, 0.025), materials.copperDark);
  brow.position.set(0.26, 0.84, 0.61);
  brow.rotation.z = -0.025;
  const chinRail = mesh(new RoundedBoxGeometry(0.92, 0.055, 0.065, 3, 0.02), materials.copper);
  chinRail.position.set(0.33, 0.31, 0.61);
  head.add(neck, neckRing, neckBearing, shell, rearArmor, crown, face, brow, chinRail);

  addLens(head, materials, [0.43, 0.59, 0.64], 0.245, true);
  const statusRail = mesh(new RoundedBoxGeometry(0.08, 0.3, 0.045, 4, 0.025), materials.copperDark, { cast: false });
  statusRail.position.set(-0.28, 0.57, 0.65);
  head.add(statusRail);
  [-0.095, 0, 0.095].forEach((offset, index) => {
    const light = mesh(new THREE.CircleGeometry(index === 1 ? 0.026 : 0.019, 16), index === 2 ? materials.copper : materials.accent, { cast: false });
    light.position.set(-0.28, 0.57 + offset, 0.682);
    head.add(light);
  });

  const sensorCluster = new THREE.Group();
  sensorCluster.position.set(-0.02, 0.57, 0.66);
  [0.055, 0, -0.055].forEach((offset, index) => {
    const sensor = mesh(new THREE.CircleGeometry(index === 0 ? 0.027 : 0.02, 16), index === 0 ? materials.lens : materials.fastener, { cast: false });
    sensor.position.set(offset, index === 2 ? -0.05 : 0.04, index * 0.004);
    sensorCluster.add(sensor);
  });
  head.add(sensorCluster);

  const sidePanel = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 32), materials.copperDark);
  sidePanel.position.set(0.95, 0.55, 0.02);
  sidePanel.rotation.z = Math.PI / 2;
  const sidePanelInset = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.095, 24), materials.copper);
  sidePanelInset.position.copy(sidePanel.position);
  sidePanelInset.rotation.z = Math.PI / 2;
  head.add(sidePanel, sidePanelInset);

  const ventGroup = new THREE.Group();
  ventGroup.position.set(-0.64, 0.57, 0.59);
  for (let index = -2; index <= 2; index += 1) {
    const vent = mesh(new RoundedBoxGeometry(0.035, 0.22, 0.025, 2, 0.012), materials.graphite, { cast: false });
    vent.position.x = index * 0.065;
    ventGroup.add(vent);
  }
  head.add(ventGroup);

  const tallAntennaRig = new THREE.Group();
  tallAntennaRig.name = "EMET_ANTENNA_TALL";
  tallAntennaRig.position.set(-0.38, 1.0, -0.13);
  tallAntennaRig.rotation.z = -0.025;
  const antennaTall = mesh(new THREE.CylinderGeometry(0.027, 0.055, 0.7, 10), materials.graphite);
  antennaTall.position.y = 0.32;
  const antennaTip = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.11, 10), materials.copper);
  antennaTip.position.y = 0.69;
  tallAntennaRig.add(antennaTall, antennaTip);
  const shortAntennaRig = new THREE.Group();
  shortAntennaRig.name = "EMET_ANTENNA_SHORT";
  shortAntennaRig.position.set(-0.7, 0.94, -0.12);
  shortAntennaRig.rotation.z = 0.035;
  const antennaShort = mesh(new THREE.CylinderGeometry(0.024, 0.048, 0.47, 10), materials.graphite);
  antennaShort.position.y = 0.21;
  const shortTip = mesh(new THREE.SphereGeometry(0.052, 12, 8), materials.accent, { cast: false });
  shortTip.position.y = 0.47;
  shortAntennaRig.add(antennaShort, shortTip);
  head.add(tallAntennaRig, shortAntennaRig);

  return head;
}

function createMaterials() {
  return {
    ceramic: new THREE.MeshPhysicalMaterial({ color: COLORS.ceramic, roughness: 0.46, metalness: 0.025, clearcoat: 0.22, clearcoatRoughness: 0.42 }),
    ceramicLight: new THREE.MeshPhysicalMaterial({ color: COLORS.ceramicLight, roughness: 0.4, metalness: 0.02, clearcoat: 0.3, clearcoatRoughness: 0.34 }),
    copper: standard(COLORS.copper, 0.34, 0.66),
    copperDark: standard(COLORS.copperDark, 0.4, 0.52),
    seam: standard(0x332820, 0.52, 0.36),
    fastener: standard(0x51463c, 0.32, 0.72),
    graphite: standard(COLORS.graphite, 0.34, 0.58),
    lens: new THREE.MeshPhysicalMaterial({ color: COLORS.lens, roughness: 0.055, metalness: 0.16, clearcoat: 1, clearcoatRoughness: 0.045 }),
    accent: new THREE.MeshStandardMaterial({ color: COLORS.accent, emissive: COLORS.accent, emissiveIntensity: 1.8, roughness: 0.25, toneMapped: false }),
    glint: new THREE.MeshBasicMaterial({ color: 0xf4ece0 }),
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
  renderer.toneMappingExposure = 1.08;
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
    new THREE.CircleGeometry(1.28, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.27, depthWrite: false }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.045;
  contactShadow.scale.set(1, 0.42, 1);
  scene.add(contactShadow);

  const hemi = new THREE.HemisphereLight(0xf4ece0, 0x332820, 1.5);
  const key = new THREE.DirectionalLight(0xfff3df, 4.9);
  key.position.set(4.5, 7, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(companion ? 1024 : 1536, companion ? 1024 : 1536);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 3;
  const rim = new THREE.DirectionalLight(0xe6d5bd, 2.75);
  rim.position.set(-5, 4, -3);
  const copperFill = new THREE.PointLight(0xd5360c, 9, 8, 2);
  copperFill.position.set(3.2, 1.3, -1.5);
  const accentFill = new THREE.PointLight(0x74200d, 4.2, 5, 2);
  accentFill.position.set(-1.4, 3.2, 3.2);
  scene.add(hemi, key, rim, copperFill, accentFill);

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
    watchPoint: behavior.watchPoint,
    forgetPointer: behavior.forgetPointer,
    noticeScroll: behavior.noticeScroll,
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
