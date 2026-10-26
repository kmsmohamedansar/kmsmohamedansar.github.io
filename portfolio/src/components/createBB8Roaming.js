const SAFE_MARGIN = 14;
const BOTTOM_MARGIN = 4;
const NAV_CLEARANCE = 76;
// Matches the companion's CSS breakpoint in BB8Companion.css.
const NARROW_VIEWPORT_WIDTH = 720;
const BLOCKING_CONTENT = "h1,h2,h3,p,a,button,input,textarea,select,label,[role='button'],[contenteditable='true']";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createBB8Roaming(element, { onWaypoint, onExit, onMotion, onRest, reducedMotion = false }) {
  // createBB8Locomotion moves the mesh through Three.js world space and maps
  // clicks through the scene camera. This controller deliberately operates in
  // viewport pixels: one compositor transform moves the whole companion UI.
  const position = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let bounds = readBounds();
  let frameId = 0;
  let lastFrameAt = 0;
  let mode = "idle";
  let speed = 220;
  let externallyPaused = false;

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
    element.classList.toggle("bb8-edge--ui-right", position.x < 270);
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
    const footprint = {
      left: candidate.x + bounds.width * 0.08,
      right: candidate.x + bounds.width * 0.92,
      top: candidate.y + bounds.height * 0.02,
      bottom: candidate.y + bounds.height * 0.96,
    };
    let penalty = 0;
    document.querySelectorAll(BLOCKING_CONTENT).forEach((node) => {
      if (element.contains(node)) return;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;
      const overlaps = rect.right > footprint.left
        && rect.left < footprint.right
        && rect.bottom > footprint.top
        && rect.top < footprint.bottom;
      if (overlaps) penalty += node.matches("h1,h2,h3") ? 4 : 2;
    });

    // The hero's visible headline is drawn into a large canvas while its
    // accessible H1 is intentionally only 1px. Reserve the visually busy
    // centre of any viewport-scale canvas, weighted by overlap, so a small
    // accessibility proxy cannot make the headline look like empty space.
    document.querySelectorAll("canvas").forEach((canvas) => {
      if (element.contains(canvas)) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.6 || rect.height < window.innerHeight * 0.45) return;
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

    const samples = [
      [0.5, 0.54],
      [0.32, 0.7],
      [0.68, 0.7],
      [0.5, 0.86],
    ];
    return samples.reduce((score, [xRatio, yRatio]) => {
      const x = clamp(candidate.x + bounds.width * xRatio, 1, window.innerWidth - 1);
      const y = clamp(candidate.y + bounds.height * yRatio, 1, window.innerHeight - 1);
      const blocked = document.elementsFromPoint(x, y).some((node) => (
        !element.contains(node)
        && (node.matches?.(BLOCKING_CONTENT) || node.closest?.(BLOCKING_CONTENT))
      ));
      return score + (blocked ? 1 : 0);
    }, penalty);
  }

  function pickWaypoint() {
    const candidates = [];
    const lowerY = bounds.maxY;
    const middleY = clamp(window.innerHeight * 0.46 - bounds.height * 0.5, NAV_CLEARANCE, bounds.maxY);
    // Narrow viewports have no room beside the copy. Desktop destinations can
    // use the side lanes as long as the overlap scoring considers them safe.
    const lowerLaneOnly = window.innerWidth <= NARROW_VIEWPORT_WIDTH;

    // Edges get first refusal because they feel like a character sharing the
    // page rather than a modal floating over its centre.
    candidates.push({ x: SAFE_MARGIN, y: lowerY }, { x: bounds.maxX, y: lowerY });
    if (!lowerLaneOnly) {
      candidates.push({ x: SAFE_MARGIN, y: middleY }, { x: bounds.maxX, y: middleY });
    }
    for (let index = 0; index < 16; index += 1) {
      candidates.push({
        x: SAFE_MARGIN + Math.random() * Math.max(0, bounds.maxX - SAFE_MARGIN),
        y: lowerLaneOnly
          ? lowerY
          : NAV_CLEARANCE + Math.random() * Math.max(0, bounds.maxY - NAV_CLEARANCE),
      });
    }

    const safeCandidates = [];
    let best = candidates[0];
    let bestPenalty = Infinity;
    for (const candidate of candidates) {
      const penalty = contentPenalty(candidate);
      if (penalty === 0) {
        safeCandidates.push(candidate);
        continue;
      }
      if (penalty < bestPenalty) {
        best = candidate;
        bestPenalty = penalty;
      }
    }
    // Choose among every safe option instead of always returning the first
    // left-edge candidate. Prefer a meaningful change of scenery so successive
    // stops read as curious roaming rather than positional jitter.
    if (safeCandidates.length) {
      const minimumTravel = Math.min(window.innerWidth * 0.22, 240);
      const distantCandidates = safeCandidates.filter((candidate) => (
        Math.hypot(candidate.x - position.x, candidate.y - position.y) >= minimumTravel
      ));
      const pool = distantCandidates.length ? distantCandidates : safeCandidates;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return best;
  }

  function startLoop() {
    if (frameId || externallyPaused || document.hidden || mode === "idle") return;
    lastFrameAt = performance.now();
    frameId = requestAnimationFrame(step);
  }

  function arrive() {
    const completedMode = mode;
    mode = "idle";
    frameId = 0;
    onRest?.();
    if (completedMode === "waypoint") onWaypoint?.();
    if (completedMode === "exit") onExit?.();
  }

  function step(now) {
    frameId = 0;
    if (externallyPaused || document.hidden || mode === "idle") return;
    const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.hypot(dx, dy);
    const travel = speed * delta;
    if (distance <= Math.max(travel, 0.75)) {
      const finalDx = target.x - position.x;
      const finalDy = target.y - position.y;
      setPosition(target);
      if (finalDx || finalDy) onMotion?.(finalDx, finalDy);
      arrive();
      return;
    }
    const moveX = (dx / distance) * travel;
    const moveY = (dy / distance) * travel;
    position.x += moveX;
    position.y += moveY;
    onMotion?.(moveX, moveY);
    updateElement();
    frameId = requestAnimationFrame(step);
  }

  function moveTo(next, nextMode, nextSpeed) {
    target.x = next.x;
    target.y = next.y;
    mode = nextMode;
    speed = nextSpeed;
    startLoop();
  }

  function peek() {
    bounds = readBounds();
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? SAFE_MARGIN : bounds.maxX;
    const y = Math.max(NAV_CLEARANCE, window.innerHeight - bounds.height * 0.46);
    setPosition({ x, y: window.innerHeight + 8 });
    moveTo({ x, y }, "peek", 520);
  }

  function travel() {
    bounds = readBounds();
    moveTo(pickWaypoint(), "waypoint", 165 + Math.random() * 70);
  }

  function hold() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    mode = "idle";
    onRest?.();
  }

  function leave() {
    bounds = readBounds();
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
    moveTo(exits[nearest], "exit", 460);
  }

  function showStatic() {
    bounds = readBounds();
    hold();
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
        onRest?.();
      } else if (!paused) {
        startLoop();
      }
    },
    dispose() {
      if (frameId) cancelAnimationFrame(frameId);
      onRest?.();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      element.style.removeProperty("transform");
      element.classList.remove("bb8-edge--ui-right");
    },
  };
}
