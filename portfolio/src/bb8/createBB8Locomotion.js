import * as THREE from "three";

const BODY_RADIUS = 1.4;
const MAX_SPEED = 1.15;
const ACCELERATION = 3.4;
const BRAKING = 4.2;
const BOUNDS_X = 1.75;
const BOUNDS_Z = 1.15;
const CLICK_DRAG_THRESHOLD = 7;
const MOVEMENT_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);

function moveToward(current, target, amount) {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
}

function clampToArena(point) {
  const distance = Math.hypot(point.x / BOUNDS_X, point.z / BOUNDS_Z);
  if (distance <= 1) return point;
  point.x /= distance;
  point.z /= distance;
  return point;
}

export function createBB8Locomotion({ container, camera, droid, body, contactShadow }) {
  const velocity = new THREE.Vector3();
  const desiredVelocity = new THREE.Vector3();
  const displacement = new THREE.Vector3();
  const localDisplacement = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const rollAxis = new THREE.Vector3();
  const roll = new THREE.Quaternion();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(up, 0);
  const hit = new THREE.Vector3();
  const destination = new THREE.Vector3();
  const keys = new Set();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let hasDestination = false;
  let pointerStart = null;
  let travelYaw = null;

  const updateShadow = () => {
    contactShadow.position.x = droid.position.x;
    contactShadow.position.z = droid.position.z;
  };

  const setDestinationFromPointer = (event) => {
    const bounds = container.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    droid.updateMatrixWorld(true);
    if (raycaster.intersectObject(droid, true).length > 0) return;
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
    destination.set(hit.x, 0, hit.z);
    clampToArena(destination);
    hasDestination = destination.distanceToSquared(droid.position) > 0.01;
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    container.focus({ preventScroll: true });
  };

  const onPointerUp = (event) => {
    if (!pointerStart || event.button !== 0) return;
    const travel = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (travel <= CLICK_DRAG_THRESHOLD) setDestinationFromPointer(event);
  };

  const onPointerCancel = () => {
    pointerStart = null;
  };

  const onKeyDown = (event) => {
    if (!MOVEMENT_KEYS.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    hasDestination = false;
  };

  const onKeyUp = (event) => {
    keys.delete(event.code);
  };

  const onBlur = () => {
    keys.clear();
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerCancel);
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("keyup", onKeyUp);
  container.addEventListener("blur", onBlur);

  return {
    update(delta) {
      desiredVelocity.set(0, 0, 0);

      const horizontal = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
      const vertical = Number(keys.has("ArrowUp") || keys.has("KeyW")) - Number(keys.has("ArrowDown") || keys.has("KeyS"));

      if (horizontal || vertical) {
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();
        cameraRight.crossVectors(cameraForward, up).normalize();
        desiredVelocity.addScaledVector(cameraForward, vertical);
        desiredVelocity.addScaledVector(cameraRight, horizontal);
        desiredVelocity.normalize().multiplyScalar(MAX_SPEED);
      } else if (hasDestination) {
        direction.subVectors(destination, droid.position);
        direction.y = 0;
        const remaining = direction.length();
        if (remaining < 0.035) {
          hasDestination = false;
        } else {
          const arrivalSpeed = Math.min(MAX_SPEED, Math.sqrt(2 * BRAKING * remaining));
          desiredVelocity.copy(direction).multiplyScalar(arrivalSpeed / remaining);
        }
      }

      const changingDirection = desiredVelocity.lengthSq() > 0.0001;
      const response = changingDirection ? ACCELERATION : BRAKING;
      velocity.x = moveToward(velocity.x, desiredVelocity.x, response * delta);
      velocity.z = moveToward(velocity.z, desiredVelocity.z, response * delta);

      displacement.copy(velocity).multiplyScalar(delta);
      if (displacement.lengthSq() < 0.0000001) {
        travelYaw = null;
        return;
      }

      const previousX = droid.position.x;
      const previousZ = droid.position.z;
      droid.position.add(displacement);
      clampToArena(droid.position);
      displacement.set(droid.position.x - previousX, 0, droid.position.z - previousZ);
      updateShadow();

      const distance = displacement.length();
      if (distance < 0.00001) {
        travelYaw = null;
        return;
      }

      travelYaw = THREE.MathUtils.clamp(Math.atan2(displacement.x, displacement.z) - droid.rotation.y, -0.9, 0.9);
      if (motionQuery.matches) return;

      localDisplacement.copy(displacement).applyAxisAngle(up, -droid.rotation.y).normalize();
      rollAxis.crossVectors(up, localDisplacement).normalize();
      roll.setFromAxisAngle(rollAxis, distance / BODY_RADIUS);
      body.quaternion.premultiply(roll).normalize();
    },
    getHeadPose() {
      if (travelYaw === null || velocity.lengthSq() < 0.0025) return null;
      return {
        yaw: travelYaw,
        pitch: 0.035,
        roll: THREE.MathUtils.clamp(-travelYaw * 0.09, -0.065, 0.065),
      };
    },
    dispose() {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerCancel);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("keyup", onKeyUp);
      container.removeEventListener("blur", onBlur);
    },
  };
}
