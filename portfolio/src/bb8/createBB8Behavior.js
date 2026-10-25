import * as THREE from "three";

const STARTLE_DURATION = 1050;
const ALERT_DURATION = 620;
const CURIOUS_MEMORY = 850;
const SCAN_DURATION = 2100;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function createBB8Behavior({ container, camera, droid }) {
  const pointer = new THREE.Vector2();
  const previousPointer = new THREE.Vector2();
  const droidScreen = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let previousPointerAt = performance.now();
  let curiousUntil = 0;
  let startleStartedAt = -Infinity;
  let alertStartedAt = -Infinity;
  let scanStartedAt = -Infinity;
  let nextScanAt = performance.now() + randomBetween(4800, 7600);
  let reactionDirection = 1;
  let pointerX = 0;

  const emitSound = (cue) => {
    container.dispatchEvent(new CustomEvent("bb8:sound", { detail: cue }));
  };

  const readPointer = (event) => {
    const bounds = container.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    pointerX = pointer.x;
    return bounds;
  };

  const hitsDroid = () => {
    droid.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(droid, true).length > 0;
  };

  const onPointerMove = (event) => {
    if (event.pointerType === "touch" || event.buttons !== 0) return;
    const now = performance.now();
    const bounds = readPointer(event);
    const elapsed = Math.max(now - previousPointerAt, 16);
    const distance = Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y);
    const speed = distance / elapsed * 1000;

    droid.getWorldPosition(droidScreen);
    droidScreen.project(camera);
    const screenX = bounds.left + (droidScreen.x + 1) * 0.5 * bounds.width;
    const screenY = bounds.top + (1 - droidScreen.y) * 0.5 * bounds.height;
    const nearDroid = Math.hypot(event.clientX - screenX, event.clientY - screenY) < Math.min(bounds.width, bounds.height) * 0.24;

    if (hitsDroid()) {
      if (now >= curiousUntil) emitSound("curious");
      curiousUntil = now + CURIOUS_MEMORY;
    }
    if (speed > 1050 && nearDroid && now - alertStartedAt > 1400) {
      alertStartedAt = now;
      reactionDirection = event.clientX < screenX ? 1 : -1;
      emitSound("alert");
    }

    previousPointer.set(event.clientX, event.clientY);
    previousPointerAt = now;
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    readPointer(event);
    if (!hitsDroid()) return;
    startleStartedAt = performance.now();
    reactionDirection = pointer.x < 0 ? 1 : -1;
    curiousUntil = 0;
    emitSound("startle");
  };

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerdown", onPointerDown);

  return {
    getPose(elapsed, now = performance.now()) {
      if (motionQuery.matches) return null;

      const startleProgress = (now - startleStartedAt) / STARTLE_DURATION;
      if (startleProgress >= 0 && startleProgress < 1) {
        const recoil = Math.sin(startleProgress * Math.PI);
        const settle = Math.sin(startleProgress * Math.PI * 3) * (1 - startleProgress);
        return {
          priority: 3,
          yaw: reactionDirection * (0.12 + recoil * 0.18),
          pitch: -recoil * 0.13,
          roll: reactionDirection * (recoil * 0.12 + settle * 0.035),
          lift: recoil * 0.075,
          glint: 1.55,
          antenna: reactionDirection * recoil * 0.085,
          speed: 8.5,
        };
      }

      const alertProgress = (now - alertStartedAt) / ALERT_DURATION;
      if (alertProgress >= 0 && alertProgress < 1) {
        const pulse = Math.sin(alertProgress * Math.PI);
        return {
          priority: 3,
          yaw: reactionDirection * pulse * 0.26,
          pitch: -pulse * 0.07,
          roll: reactionDirection * pulse * 0.08,
          lift: pulse * 0.035,
          glint: 1.35,
          antenna: reactionDirection * pulse * 0.055,
          speed: 7,
        };
      }

      if (now >= nextScanAt) {
        scanStartedAt = now;
        nextScanAt = now + SCAN_DURATION + randomBetween(5200, 9200);
        emitSound("scan");
      }
      const scanProgress = (now - scanStartedAt) / SCAN_DURATION;
      if (scanProgress >= 0 && scanProgress < 1) {
        const envelope = Math.sin(scanProgress * Math.PI);
        return {
          priority: 1,
          yaw: Math.sin(scanProgress * Math.PI * 2.4) * 0.42 * envelope,
          pitch: 0.045 + Math.sin(scanProgress * Math.PI * 1.2) * 0.035,
          roll: Math.sin(scanProgress * Math.PI * 2.4 + 0.8) * 0.045 * envelope,
          lift: Math.sin(scanProgress * Math.PI) * 0.012,
          glint: 1.18,
          antenna: Math.sin(elapsed * 5) * 0.012,
          speed: 3.8,
        };
      }

      if (now < curiousUntil) {
        return {
          priority: 1,
          yaw: THREE.MathUtils.clamp(pointerX * 0.42, -0.42, 0.42),
          pitch: 0.075,
          roll: THREE.MathUtils.clamp(-pointerX * 0.11, -0.09, 0.09),
          lift: 0.018,
          glint: 1.28,
          antenna: -pointerX * 0.025,
          speed: 4.7,
        };
      }

      return null;
    },
    dispose() {
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
    },
  };
}
