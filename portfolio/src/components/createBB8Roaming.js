const SAFE_MARGIN = 14;
const BOTTOM_MARGIN = 4;
const NAV_CLEARANCE = 76;
// True phone widths stay in the bottom lane. The compact companion has enough
// room to use side lanes on small tablets and narrow desktop panes.
const MOBILE_LANE_WIDTH = 480;
const BLOCKING_CONTENT = "h1,h2,h3,h4,p,li,dt,dd,main span,a,button,input,textarea,select,label,[role='button'],[contenteditable='true']";

// Pixels per second squared. Emet leans into a roll and brakes into a stop
// rather than starting and stopping at full speed, which is most of what
// makes the movement read as a droid instead of a sliding sprite.
const ACCELERATION = 560;
const BRAKING = 760;
// How far a trip bows away from the straight line, as a share of its length.
const ARC_RATIO = 0.14;
const ARC_MAX = 90;
// The little rock backwards and forwards on arriving, like a ball that has
// stopped itself a touch too eagerly.
const SETTLE_MS = 460;
const SETTLE_PX = 5;
// A parked droid does not stand perfectly still. Every so often it scoots a
// short distance and looks somewhere else.
const FIDGET_MIN_DELAY = 2600;
const FIDGET_MAX_DELAY = 6200;
const FIDGET_MIN_PX = 26;
const FIDGET_MAX_PX = 86;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function moveToward(current, target, amount) {
  if (Math.abs(target - current) <= amount) return target;
  return current + Math.sign(target - current) * amount;
}

/**
 * Speed for the next frame: accelerate towards the cruising speed, but never
 * faster than what can still be braked away in the distance that is left.
 */
export function travelVelocity(velocity, remaining, cruise, delta) {
  const arrivalCap = Math.sqrt(2 * BRAKING * Math.max(remaining, 0));
  const desired = Math.min(cruise, arrivalCap);
  const response = desired > velocity ? ACCELERATION : BRAKING;
  return Math.max(0, moveToward(velocity, desired, response * delta));
}

/**
 * A point `progress` of the way along a path that bows sideways by
 * `amplitude` at its middle and meets the straight line at both ends.
 */
export function arcPoint(origin, target, amplitude, progress) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  const x = origin.x + dx * progress;
  const y = origin.y + dy * progress;
  if (!length || !amplitude) return { x, y };
  const bow = Math.sin(Math.PI * progress) * amplitude;
  return { x: x + (-dy / length) * bow, y: y + (dx / length) * bow };
}

/** How far a trip is allowed to bow, given how far it travels. */
export function arcAmplitude(length, sign) {
  return Math.min(length * ARC_RATIO, ARC_MAX) * sign;
}

/** A damped rock along the direction of travel, in pixels, 0 once settled. */
export function settleOffset(progress) {
  if (progress >= 1 || progress < 0) return 0;
  return Math.sin(progress * Math.PI * 3) * SETTLE_PX * (1 - progress);
}

export function contentPenaltyFor(candidate, bounds, element, {
  documentRef = document,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
} = {}) {
  const footprint = {
    left: candidate.x + bounds.width * 0.08,
    right: candidate.x + bounds.width * 0.92,
    top: candidate.y + bounds.height * 0.02,
    bottom: candidate.y + bounds.height * 0.96,
  };
  let penalty = 0;
  documentRef.querySelectorAll(BLOCKING_CONTENT).forEach((node) => {
    if (element.contains(node)) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > viewportHeight) return;
    const overlaps = rect.right > footprint.left
      && rect.left < footprint.right
      && rect.bottom > footprint.top
      && rect.top < footprint.bottom;
    if (overlaps) penalty += node.matches("h1,h2,h3") ? 4 : 2;
  });

  documentRef.querySelectorAll("canvas").forEach((canvas) => {
    if (element.contains(canvas)) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < viewportWidth * 0.6 || rect.height < viewportHeight * 0.45) return;
    const protectedArea = {
      left: rect.left + rect.width * 0.12,
      right: rect.right - rect.width * 0.12,
      top: rect.top + rect.height * 0.18,
      bottom: rect.top + rect.height * 0.72,
    };
    const overlapWidth = Math.max(0, Math.min(footprint.right, protectedArea.right) - Math.max(footprint.left, protectedArea.left));
    const overlapHeight = Math.max(0, Math.min(footprint.bottom, protectedArea.bottom) - Math.max(footprint.top, protectedArea.top));
    const footprintArea = (footprint.right - footprint.left) * (footprint.bottom - footprint.top);
    penalty += Math.ceil((overlapWidth * overlapHeight / footprintArea) * 10);
  });

  const samples = [[0.5, 0.54], [0.32, 0.7], [0.68, 0.7], [0.5, 0.86]];
  return samples.reduce((score, [xRatio, yRatio]) => {
    const x = clamp(candidate.x + bounds.width * xRatio, 1, viewportWidth - 1);
    const y = clamp(candidate.y + bounds.height * yRatio, 1, viewportHeight - 1);
    const blocked = documentRef.elementsFromPoint(x, y).some((node) => (
      !element.contains(node)
      && (node.matches?.(BLOCKING_CONTENT) || node.closest?.(BLOCKING_CONTENT))
    ));
    return score + (blocked ? 1 : 0);
  }, penalty);
}

export function pickWaypointFor(bounds, position, scoreCandidate, {
  random = Math.random,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
} = {}) {
  const candidates = [];
  const lowerY = bounds.maxY;
  const middleY = clamp(viewportHeight * 0.46 - bounds.height * 0.5, NAV_CLEARANCE, bounds.maxY);
  const lowerLaneOnly = viewportWidth <= MOBILE_LANE_WIDTH;
  candidates.push({ x: SAFE_MARGIN, y: lowerY }, { x: bounds.maxX, y: lowerY });
  if (!lowerLaneOnly) candidates.push({ x: SAFE_MARGIN, y: middleY }, { x: bounds.maxX, y: middleY });
  for (let index = 0; index < 16; index += 1) {
    candidates.push({
      x: SAFE_MARGIN + random() * Math.max(0, bounds.maxX - SAFE_MARGIN),
      y: lowerLaneOnly ? lowerY : NAV_CLEARANCE + random() * Math.max(0, bounds.maxY - NAV_CLEARANCE),
    });
  }

  const safeCandidates = [];
  let best = candidates[0];
  let bestPenalty = Infinity;
  for (const candidate of candidates) {
    const penalty = scoreCandidate(candidate);
    if (penalty === 0) safeCandidates.push(candidate);
    else if (penalty < bestPenalty) {
      best = candidate;
      bestPenalty = penalty;
    }
  }
  if (!safeCandidates.length) return best;
  const minimumTravel = Math.min(viewportWidth * 0.22, 240);
  const distant = safeCandidates.filter((candidate) => Math.hypot(candidate.x - position.x, candidate.y - position.y) >= minimumTravel);
  const pool = distant.length ? distant : safeCandidates;
  return pool[Math.floor(random() * pool.length)];
}

export function createBB8Roaming(element, {
  onWaypoint,
  onExit,
  onMotion,
  onRest,
  onUiSideChange,
  reducedMotion = false,
}) {
  // createBB8Locomotion moves the mesh through Three.js world space and maps
  // clicks through the scene camera. This controller deliberately operates in
  // viewport pixels: one compositor transform moves the whole companion UI.
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const origin = { x: 0, y: 0 };
  let bounds = readBounds();
  let frameId = 0;
  let lastFrameAt = 0;
  let mode = "idle";
  let speed = 220;
  let externallyPaused = false;
  let uiOnRight = null;
  // Set per trip: how long the path is, how far it bows, and how much of it
  // has been covered so far.
  let pathLength = 0;
  let pathArc = 0;
  let travelled = 0;
  let velocity = 0;
  let settleStartedAt = 0;
  let fidgetTimer = 0;
  let fidgetingAllowed = false;
  let settleAllowed = true;
  let completedMode = "idle";

  function readBounds() {
    const width = Math.max(element.offsetWidth, 1);
    const height = Math.max(element.offsetHeight, 1);
    return {
      width,
      height,
      maxX: Math.max(SAFE_MARGIN, window.innerWidth - width - SAFE_MARGIN),
      maxY: Math.max(NAV_CLEARANCE, window.innerHeight - height - BOTTOM_MARGIN),
    };
  }

  function updateElement() {
    element.style.transform = `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0)`;
    // The guide normally opens to the droid's left. Near the left edge it
    // flips to the right, and the smaller speech bubble mirrors with it.
    const nextUiOnRight = position.x < 270;
    element.classList.toggle("bb8-edge--ui-right", nextUiOnRight);
    if (nextUiOnRight !== uiOnRight) {
      uiOnRight = nextUiOnRight;
      onUiSideChange?.(nextUiOnRight);
    }
  }

  function setPosition(next) {
    position.x = next.x;
    position.y = next.y;
    updateElement();
  }

  function contentPenalty(candidate) {
    // Check both the semantic boxes under the droid's footprint and the full
    // hit-test stack at a few body points. The portfolio's particle canvas can
    // sit above the hero copy, so inspecting only elementFromPoint's first
    // result would incorrectly treat that headline as empty space.
    return contentPenaltyFor(candidate, bounds, element);
  }

  function pickWaypoint() {
    return pickWaypointFor(bounds, position, contentPenalty);
  }

  function startLoop() {
    if (frameId || externallyPaused || document.hidden || mode === "idle") return;
    lastFrameAt = performance.now();
    frameId = requestAnimationFrame(step);
  }

  function arrive() {
    const finished = completedMode;
    mode = "idle";
    completedMode = "idle";
    frameId = 0;
    velocity = 0;
    onRest?.();
    if (finished === "fidget") {
      scheduleFidget();
      return;
    }
    if (finished === "waypoint") onWaypoint?.();
    if (finished === "exit") onExit?.();
  }

  function moveBy(nextX, nextY) {
    const moveX = nextX - position.x;
    const moveY = nextY - position.y;
    position.x = nextX;
    position.y = nextY;
    if (moveX || moveY) onMotion?.(moveX, moveY);
    updateElement();
  }

  function step(now) {
    frameId = 0;
    if (externallyPaused || document.hidden || mode === "idle") return;
    const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;

    // The rock on arrival. It runs after the path is finished, so the droid
    // is already where it was sent and only the look of it is still moving.
    if (mode === "settling") {
      const progress = (now - settleStartedAt) / SETTLE_MS;
      const offset = settleOffset(progress);
      const length = Math.hypot(target.x - origin.x, target.y - origin.y) || 1;
      moveBy(
        target.x + ((target.x - origin.x) / length) * offset,
        target.y + ((target.y - origin.y) / length) * offset,
      );
      if (progress >= 1) {
        moveBy(target.x, target.y);
        arrive();
        return;
      }
      frameId = requestAnimationFrame(step);
      return;
    }

    velocity = travelVelocity(velocity, pathLength - travelled, speed, delta);
    travelled = Math.min(pathLength, travelled + velocity * delta);
    const progress = pathLength ? travelled / pathLength : 1;
    const point = arcPoint(origin, target, pathArc, progress);
    moveBy(point.x, point.y);

    if (progress >= 1) {
      // An exit is on its way off screen, so there is nothing to settle into.
      if (mode === "exit" || !settleAllowed) {
        arrive();
        return;
      }
      settleStartedAt = now;
      mode = "settling";
    }
    frameId = requestAnimationFrame(step);
  }

  function moveTo(next, nextMode, nextSpeed, { arc = 0, settle = true } = {}) {
    origin.x = position.x;
    origin.y = position.y;
    target.x = next.x;
    target.y = next.y;
    pathLength = Math.hypot(target.x - origin.x, target.y - origin.y);
    pathArc = arc;
    travelled = 0;
    velocity = 0;
    settleAllowed = settle;
    mode = nextMode;
    completedMode = nextMode;
    speed = nextSpeed;
    startLoop();
  }

  // Three ways in. Rolling up from the bottom is the original; the two side
  // entries have Emet lean out from behind the edge of the screen, which is
  // the move everyone remembers the droid for.
  function peek() {
    bounds = readBounds();
    stopFidgeting();
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? SAFE_MARGIN : bounds.maxX;
    const y = Math.max(NAV_CLEARANCE, window.innerHeight - bounds.height * 0.46);
    const fromSide = Math.random() < 0.6;
    if (fromSide) {
      setPosition({ x: fromLeft ? -bounds.width * 0.82 : window.innerWidth + bounds.width * 0.82, y });
      moveTo({ x, y }, "peek", 430);
      return;
    }
    setPosition({ x, y: window.innerHeight + 8 });
    moveTo({ x, y }, "peek", 520);
  }

  function travel() {
    bounds = readBounds();
    stopFidgeting();
    const next = pickWaypoint();
    const length = Math.hypot(next.x - position.x, next.y - position.y);
    moveTo(next, "waypoint", 190 + Math.random() * 110, {
      arc: arcAmplitude(length, Math.random() < 0.5 ? -1 : 1),
    });
  }

  function stopFidgeting() {
    fidgetingAllowed = false;
    if (fidgetTimer) window.clearTimeout(fidgetTimer);
    fidgetTimer = 0;
  }

  // A short scoot while parked, kept inside the lane the droid is already in
  // and only taken if it lands somewhere as clear as where it is standing.
  function fidget() {
    fidgetTimer = 0;
    if (!fidgetingAllowed || externallyPaused || document.hidden || mode !== "idle") return;
    bounds = readBounds();
    const reach = FIDGET_MIN_PX + Math.random() * (FIDGET_MAX_PX - FIDGET_MIN_PX);
    const angle = Math.random() * Math.PI * 2;
    const next = {
      x: clamp(position.x + Math.cos(angle) * reach, SAFE_MARGIN, bounds.maxX),
      y: clamp(position.y + Math.sin(angle) * reach * 0.45, NAV_CLEARANCE, bounds.maxY),
    };
    if (Math.hypot(next.x - position.x, next.y - position.y) < 8) {
      scheduleFidget();
      return;
    }
    if (contentPenalty(next) > contentPenalty(position)) {
      scheduleFidget();
      return;
    }
    const length = Math.hypot(next.x - position.x, next.y - position.y);
    moveTo(next, "fidget", 90 + Math.random() * 70, {
      arc: arcAmplitude(length, Math.random() < 0.5 ? -1 : 1),
    });
  }

  function scheduleFidget() {
    if (!fidgetingAllowed || fidgetTimer) return;
    fidgetTimer = window.setTimeout(fidget, FIDGET_MIN_DELAY + Math.random() * (FIDGET_MAX_DELAY - FIDGET_MIN_DELAY));
  }

  function hold() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    mode = "idle";
    completedMode = "idle";
    velocity = 0;
    onRest?.();
    fidgetingAllowed = true;
    scheduleFidget();
  }

  function leave() {
    bounds = readBounds();
    stopFidgeting();
    const distances = [
      { edge: "left", value: position.x },
      { edge: "right", value: window.innerWidth - (position.x + bounds.width) },
      { edge: "bottom", value: window.innerHeight - (position.y + bounds.height) },
    ];
    const nearest = distances.sort((a, b) => a.value - b.value)[0].edge;
    const exits = {
      left: { x: -bounds.width - 20, y: position.y },
      right: { x: window.innerWidth + 20, y: position.y },
      bottom: { x: position.x, y: window.innerHeight + 20 },
    };
    moveTo(exits[nearest], "exit", 460, { settle: false });
  }

  function showStatic() {
    bounds = readBounds();
    stopFidgeting();
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    mode = "idle";
    completedMode = "idle";
    onRest?.();
    setPosition({ x: bounds.maxX, y: bounds.maxY });
  }

  function onResize() {
    bounds = readBounds();
    position.x = clamp(position.x, -bounds.width - 20, window.innerWidth + 20);
    position.y = clamp(position.y, NAV_CLEARANCE, window.innerHeight + 20);
    target.x = clamp(target.x, -bounds.width - 20, window.innerWidth + 20);
    target.y = clamp(target.y, NAV_CLEARANCE, window.innerHeight + 20);
    updateElement();
  }

  function onVisibilityChange() {
    if (!document.hidden) startLoop();
  }

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (reducedMotion) showStatic();
  else peek();

  return {
    peek,
    travel,
    hold,
    leave,
    showStatic,
    setPaused(paused) {
      externallyPaused = paused;
      if (paused) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        if (fidgetTimer) window.clearTimeout(fidgetTimer);
        fidgetTimer = 0;
        onRest?.();
      } else {
        startLoop();
        scheduleFidget();
      }
    },
    dispose() {
      if (frameId) cancelAnimationFrame(frameId);
      stopFidgeting();
      onRest?.();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      element.style.removeProperty("transform");
      element.classList.remove("bb8-edge--ui-right");
    },
  };
}
