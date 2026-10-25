import * as THREE from "three";

const BASE_HEAD_Y = 2.77;
const BASE_HEAD_YAW = -0.08;
const CURSOR_MEMORY_MS = 1800;

function ease(current, target, speed, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function createBB8Animator({ container, camera, droid, head, controls, locomotion, behavior }) {
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const headWorld = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const cursorWorld = new THREE.Vector3();
  const cursorLocal = new THREE.Vector3();
  const lookDirection = new THREE.Vector3();
  const attentionPlane = new THREE.Plane();
  const glint = head.getObjectByName("EMET_LENS_GLINT");
  const tallAntenna = head.getObjectByName("EMET_ANTENNA_TALL");
  const shortAntenna = head.getObjectByName("EMET_ANTENNA_SHORT");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let reducedMotion = motionQuery.matches;
  let pointerPresent = false;
  let lastPointerAt = -Infinity;
  let interactionBlockedUntil = 0;
  let nextIndependentGlanceAt = performance.now() + randomBetween(1400, 2600);
  let independentGlanceEndsAt = 0;
  let glanceYaw = BASE_HEAD_YAW;
  let glancePitch = 0;
  let glanceRoll = 0;

  head.rotation.order = "YXZ";

  const onMotionPreference = (event) => {
    reducedMotion = event.matches;
    if (!reducedMotion) return;
    head.position.y = BASE_HEAD_Y;
    head.rotation.set(0, BASE_HEAD_YAW, 0);
  };

  const onPointerMove = (event) => {
    if (event.pointerType === "touch" || event.buttons !== 0) return;
    const bounds = container.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    pointerPresent = true;
    lastPointerAt = performance.now();
  };

  const onPointerLeave = () => {
    pointerPresent = false;
  };

  const onControlsStart = () => {
    pointerPresent = false;
    interactionBlockedUntil = Infinity;
  };

  const onControlsEnd = () => {
    interactionBlockedUntil = performance.now() + 550;
  };

  const chooseIndependentGlance = (now) => {
    glanceYaw = BASE_HEAD_YAW + randomBetween(-0.34, 0.4);
    glancePitch = randomBetween(-0.1, 0.12);
    glanceRoll = randomBetween(-0.065, 0.065) - (glanceYaw - BASE_HEAD_YAW) * 0.12;
    independentGlanceEndsAt = now + randomBetween(700, 1350);
    nextIndependentGlanceAt = independentGlanceEndsAt + randomBetween(2400, 5000);
  };

  const cursorPose = () => {
    head.getWorldPosition(headWorld);
    camera.getWorldDirection(cameraDirection);
    attentionPlane.setFromNormalAndCoplanarPoint(cameraDirection, headWorld);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(attentionPlane, cursorWorld)) return null;

    cursorLocal.copy(cursorWorld);
    droid.worldToLocal(cursorLocal);
    lookDirection.subVectors(cursorLocal, head.position);
    return {
      yaw: THREE.MathUtils.clamp(Math.atan2(lookDirection.x, lookDirection.z), -0.5, 0.5),
      pitch: THREE.MathUtils.clamp(-Math.atan2(lookDirection.y, Math.hypot(lookDirection.x, lookDirection.z)), -0.17, 0.16),
    };
  };

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });
  controls.addEventListener("start", onControlsStart);
  controls.addEventListener("end", onControlsEnd);
  motionQuery.addEventListener("change", onMotionPreference);

  return {
    update(elapsed, delta, now = performance.now()) {
      if (reducedMotion) return;

      if (now >= nextIndependentGlanceAt) chooseIndependentGlance(now);
      const independent = now < independentGlanceEndsAt;
      const cursorIsRecent = pointerPresent && now - lastPointerAt < CURSOR_MEMORY_MS && now >= interactionBlockedUntil;
      const cursor = !independent && cursorIsRecent ? cursorPose() : null;
      const travel = locomotion.getHeadPose();
      const reaction = behavior.getPose(elapsed, now);

      let targetYaw = BASE_HEAD_YAW;
      let targetPitch = Math.sin(elapsed * 0.7) * 0.018;
      let targetRoll = Math.sin(elapsed * 0.43) * 0.012;
      let targetLift = 0;
      let targetAntenna = 0;
      let glintBoost = 1;
      let responseSpeed = 2.4;

      if (reaction?.priority === 3) {
        targetYaw = reaction.yaw;
        targetPitch = reaction.pitch;
        targetRoll = reaction.roll;
        targetLift = reaction.lift;
        targetAntenna = reaction.antenna;
        glintBoost = reaction.glint;
        responseSpeed = reaction.speed;
      } else if (travel) {
        targetYaw = travel.yaw;
        targetPitch = travel.pitch;
        targetRoll = travel.roll;
        responseSpeed = 4.1;
      } else if (reaction) {
        targetYaw = reaction.yaw;
        targetPitch = reaction.pitch;
        targetRoll = reaction.roll;
        targetLift = reaction.lift;
        targetAntenna = reaction.antenna;
        glintBoost = reaction.glint;
        responseSpeed = reaction.speed;
      } else if (independent) {
        targetYaw = glanceYaw;
        targetPitch = glancePitch;
        targetRoll = glanceRoll;
        responseSpeed = 3.1;
      } else if (cursor) {
        targetYaw = cursor.yaw;
        targetPitch = cursor.pitch;
        targetRoll = THREE.MathUtils.clamp(-(cursor.yaw - BASE_HEAD_YAW) * 0.17, -0.075, 0.075);
        responseSpeed = 4.6;
      }

      head.rotation.y = ease(head.rotation.y, targetYaw, responseSpeed, delta);
      head.rotation.x = ease(head.rotation.x, targetPitch, responseSpeed * 0.92, delta);
      head.rotation.z = ease(head.rotation.z, targetRoll, responseSpeed * 0.8, delta);
      head.position.y = ease(head.position.y, BASE_HEAD_Y + targetLift + Math.sin(elapsed * 1.35) * 0.008, responseSpeed, delta);

      if (tallAntenna) tallAntenna.rotation.z = ease(tallAntenna.rotation.z, -0.025 + targetAntenna, 6, delta);
      if (shortAntenna) shortAntenna.rotation.z = ease(shortAntenna.rotation.z, 0.035 - targetAntenna * 0.7, 6, delta);

      if (glint) {
        const pulse = (0.92 + Math.sin(elapsed * 2.2) * 0.08) * glintBoost;
        glint.scale.setScalar(pulse);
      }
    },
    dispose() {
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      motionQuery.removeEventListener("change", onMotionPreference);
    },
  };
}
