import { useEffect, useRef, useState } from "react";
import { useRoute } from "../App";
import { createBB8Scene } from "../bb8/createBB8Scene";
import { createBB8Roaming } from "./createBB8Roaming";
import "./BB8Companion.css";

const ROUTINES = ["peek", "guide", "sleepy", "mischief"];
const FIRST_APPEARANCE_DELAY = 1800;
const GUIDE_IDLE_TIMEOUT = 12000;
const ROUTINE_COPY = {
  peek: { message: "Bweep! Need a quick tour?" },
  guide: { message: "Psst… I know the interesting shortcuts." },
  sleepy: { message: "Power-saving mode…" },
  mischief: { message: "That panel was already loose." },
};

const GUIDE_LINKS = [
  { href: "#projects", eyebrow: "Start here", label: "Selected work", detail: "The projects I’m proudest of" },
  { href: "#ai", eyebrow: "Explore", label: "AI experiments", detail: "Interactive things to try" },
  { href: "#about", eyebrow: "Background", label: "About me", detail: "How I work and what I use" },
  { href: "#contact", eyebrow: "Connect", label: "Say hello", detail: "Email and profile links" },
];

// These takeover routes dedicate the full viewport to pointer-driven tools or
// a terminal with controls at the bottom edge. Keep the companion mounted so
// its personality/session state survives navigation, but do not let it cover
// or compete with those interfaces.
const HIDDEN_ROUTES = new Set(["emet", "explore", "lineage-demo", "infinity", "digital-double"]);

function readSessionFlag(key) {
  try {
    return window.sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeSession(key, value) {
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

function quietDelay() {
  return 26000 + Math.random() * 22000;
}

function isEditableTarget(target) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export default function BB8Companion() {
  const { route, navigate } = useRoute();
  const routeHidden = HIDDEN_ROUTES.has(route);
  const edgeRef = useRef(null);
  const viewportRef = useRef(null);
  const guideTriggerRef = useRef(null);
  const guideRef = useRef(null);
  const experienceRef = useRef(null);
  const roamingRef = useRef(null);
  const firstAppearance = useRef(true);
  const waypointsRemainingRef = useRef(0);
  const visitorBusyUntilRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [dismissed, setDismissed] = useState(() => readSessionFlag("emet-companion-dismissed"));
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState("waiting");
  const [routine, setRoutine] = useState("peek");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event) => setReducedMotion(event.matches);
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const markBusy = (duration) => {
      visitorBusyUntilRef.current = Math.max(visitorBusyUntilRef.current, performance.now() + duration);
    };
    const onScroll = () => markBusy(1400);
    const onPointerDown = () => markBusy(900);
    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) markBusy(1800);
    };
    const onInput = (event) => {
      if (isEditableTarget(event.target)) markBusy(2600);
    };
    const onKeyDown = (event) => {
      if (isEditableTarget(event.target)) markBusy(2600);
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("input", onInput);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const visitorIsBusy = () => {
    return document.hidden
      || performance.now() < visitorBusyUntilRef.current
      || isEditableTarget(document.activeElement);
  };

  useEffect(() => {
    if (!started || dismissed || renderFailed || !viewportRef.current) return undefined;
    let experience;
    try {
      experience = createBB8Scene(viewportRef.current, { variant: "companion" });
    } catch (error) {
      console.warn("Emet companion could not start WebGL.", error);
      setRenderFailed(true);
      return undefined;
    }

    const onContextLost = (event) => {
      event.preventDefault();
      setRenderFailed(true);
    };
    experience.canvas.addEventListener("webglcontextlost", onContextLost);
    experienceRef.current = experience;
    experience.setPaused(phase === "waiting" || document.hidden);
    return () => {
      experienceRef.current = null;
      experience.canvas.removeEventListener("webglcontextlost", onContextLost);
      experience.dispose();
    };
    // The Three.js scene should survive routine and phase changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, dismissed, renderFailed]);

  useEffect(() => {
    if (!started || dismissed || renderFailed || !edgeRef.current) return undefined;
    const roaming = createBB8Roaming(edgeRef.current, {
      reducedMotion,
      onWaypoint: () => setPhase((current) => current === "traveling" ? "observing" : current),
      onExit: () => setPhase((current) => current === "leaving" ? "waiting" : current),
      onMotion: (dx, dy) => experienceRef.current?.setScreenMotion(dx, dy),
      onRest: () => experienceRef.current?.stopScreenMotion(),
    });
    roamingRef.current = roaming;
    return () => {
      roamingRef.current = null;
      roaming.dispose();
    };
  }, [dismissed, reducedMotion, renderFailed, started]);

  useEffect(() => {
    const roaming = roamingRef.current;
    if (!roaming) return;
    roaming.setPaused(routeHidden);
    if (routeHidden) return;
    if (reducedMotion) roaming.showStatic();
    else if (phase === "peeking") roaming.peek();
    else if (phase === "traveling") roaming.travel();
    else if (phase === "observing") roaming.hold();
    else if (phase === "leaving") roaming.leave();
  }, [phase, reducedMotion, routeHidden]);

  useEffect(() => {
    const updatePlayback = () => experienceRef.current?.setPaused(phase === "waiting" || routeHidden || document.hidden);
    updatePlayback();
    document.addEventListener("visibilitychange", updatePlayback);
    return () => document.removeEventListener("visibilitychange", updatePlayback);
  }, [phase, routeHidden]);

  useEffect(() => {
    if (dismissed || reducedMotion || routeHidden || phase !== "waiting") return undefined;

    let timer;
    const attemptAppearance = () => {
      if (visitorIsBusy()) {
        timer = window.setTimeout(attemptAppearance, 1800);
        return;
      }
      const nextRoutine = firstAppearance.current
        ? "peek"
        : ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
      firstAppearance.current = false;
      // Each appearance is a short active stretch of two to four waypoints,
      // followed by a substantially longer quiet period.
      waypointsRemainingRef.current = 1 + Math.floor(Math.random() * 3);
      setRoutine(nextRoutine);
      setStarted(true);
      setPhase("peeking");
    };

    timer = window.setTimeout(attemptAppearance, firstAppearance.current ? FIRST_APPEARANCE_DELAY : quietDelay());
    return () => window.clearTimeout(timer);
  }, [dismissed, phase, reducedMotion, routeHidden]);

  useEffect(() => {
    if (reducedMotion || routeHidden) return undefined;
    if (guideOpen) return undefined;
    let timer;
    const advanceWhenCalm = (advance) => {
      if (visitorIsBusy()) {
        timer = window.setTimeout(() => advanceWhenCalm(advance), 1200);
        return;
      }
      advance();
    };
    if (phase === "peeking") {
      timer = window.setTimeout(() => advanceWhenCalm(() => setPhase("traveling")), 2800);
    } else if (phase === "observing") {
      timer = window.setTimeout(() => advanceWhenCalm(() => {
        if (waypointsRemainingRef.current > 0) {
          waypointsRemainingRef.current -= 1;
          setRoutine(ROUTINES[Math.floor(Math.random() * ROUTINES.length)]);
          setPhase("traveling");
        } else {
          setPhase("leaving");
        }
      }), routine === "mischief" ? 5600 : 7200);
    }
    return () => window.clearTimeout(timer);
  }, [guideOpen, phase, reducedMotion, routeHidden, routine]);

  useEffect(() => {
    if (!guideOpen) return undefined;
    window.requestAnimationFrame(() => guideRef.current?.querySelector("button")?.focus({ preventScroll: true }));
    const idleTimer = window.setTimeout(() => {
      if (guideRef.current?.contains(document.activeElement)) document.activeElement.blur();
      setGuideOpen(false);
      if (reducedMotion) {
        setPhase("waiting");
        setStarted(false);
      } else {
        setPhase("leaving");
      }
    }, GUIDE_IDLE_TIMEOUT);
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setGuideOpen(false);
      window.requestAnimationFrame(() => guideTriggerRef.current?.focus({ preventScroll: true }));
    };
    const trapFocus = (event) => {
      if (event.key !== "Tab" || !guideRef.current) return;
      const focusable = [...guideRef.current.querySelectorAll("a[href], button:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("keydown", trapFocus);
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("keydown", trapFocus);
    };
  }, [guideOpen, reducedMotion]);

  useEffect(() => {
    if (phase !== "waiting" && phase !== "leaving" && !routeHidden) return;
    if (edgeRef.current?.contains(document.activeElement)) document.activeElement.blur();
  }, [phase, routeHidden]);

  const toggleSound = async () => {
    const enabled = await experienceRef.current?.sound.setEnabled(!soundEnabled);
    setSoundEnabled(Boolean(enabled));
  };

  const dismiss = () => {
    experienceRef.current?.sound.setEnabled(false);
    writeSession("emet-companion-dismissed", true);
    setSoundEnabled(false);
    setGuideOpen(false);
    setDismissed(true);
  };

  const openGuide = () => {
    setPhase("observing");
    setGuideOpen(true);
  };

  const followGuideLink = () => {
    setGuideOpen(false);
    if (reducedMotion) {
      setPhase("waiting");
      setStarted(false);
    } else {
      setPhase("leaving");
    }
  };

  const showReducedMotionCompanion = () => {
    setRoutine("peek");
    setStarted(true);
    setPhase("observing");
  };

  if (dismissed) return null;

  if (reducedMotion && !started) {
    return (
      <aside className="bb8-edge bb8-edge--reduced" aria-label="Emet companion">
        <button type="button" className="bb8-edge-show" onClick={showReducedMotionCompanion}>Show Emet</button>
      </aside>
    );
  }

  if (!started) return null;

  if (renderFailed) {
    return (
      <aside className="bb8-edge bb8-edge--fallback" aria-label="Emet companion unavailable">
        <div className="bb8-edge-fallback-droid" aria-hidden="true"><i /><span /></div>
        <p>Emet’s projector is offline.</p>
        <button type="button" onClick={dismiss}>Dismiss</button>
      </aside>
    );
  }

  const active = phase === "peeking" || phase === "traveling" || phase === "observing";
  const copy = ROUTINE_COPY[routine];

  return (
    <aside
      ref={edgeRef}
      className={`bb8-edge bb8-edge--${phase} bb8-edge--${routine}${guideOpen ? " bb8-edge--guide-open" : ""}${routeHidden ? " bb8-edge--route-hidden" : ""}`}
      aria-label="Emet portfolio companion"
      aria-hidden={routeHidden || undefined}
    >
      <div className="bb8-edge-controls" aria-label="Companion controls">
        <button type="button" onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? "Mute" : "Sound"}</button>
        <button type="button" onClick={dismiss} aria-label="Dismiss Emet for this visit">×</button>
      </div>

      <div className="bb8-edge-bubble">
        <span role="status">{copy.message}</span>
        <button ref={guideTriggerRef} type="button" tabIndex={guideOpen ? -1 : 0} onClick={openGuide}>Show me</button>
      </div>

      {guideOpen && (
        <div
          ref={guideRef}
          id="bb8-portfolio-guide"
          className="bb8-edge-guide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bb8-guide-title"
        >
          <div className="bb8-edge-guide-heading">
            <div><span>Emet recommends</span><strong id="bb8-guide-title">Where should we go?</strong></div>
            <button
              type="button"
              onClick={() => {
                setGuideOpen(false);
                window.requestAnimationFrame(() => guideTriggerRef.current?.focus({ preventScroll: true }));
              }}
              aria-label="Close portfolio guide"
            >×</button>
          </div>
          <nav className="bb8-edge-guide-links" aria-label="Portfolio destinations">
            {GUIDE_LINKS.map((item) => (
              <a
                key={item.href}
                href={route === "main" ? item.href : `${window.location.pathname}${item.href}`}
                onClick={(event) => {
                  event.preventDefault();
                  followGuideLink();
                  navigate(item.href.slice(1));
                }}
              >
                <span>{item.eyebrow}</span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </a>
            ))}
          </nav>
        </div>
      )}

      {routine === "sleepy" && (
        <div className="bb8-edge-zzzs" aria-hidden="true"><span>Z</span><span>Z</span><span>Z</span></div>
      )}

      <div className="bb8-edge-character">
        <div
          ref={viewportRef}
          className="bb8-edge-viewport"
          onPointerEnter={() => {
            if (phase === "peeking" && routine === "peek") setPhase("observing");
          }}
        >
          <button
            type="button"
            className="bb8-edge-hit-target"
            tabIndex={active ? 0 : -1}
            aria-hidden={!active}
            aria-label="Open Emet portfolio guide"
            aria-expanded={guideOpen}
            aria-controls={guideOpen ? "bb8-portfolio-guide" : undefined}
            onClick={openGuide}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              experienceRef.current?.react();
            }}
          />
        </div>
      </div>
    </aside>
  );
}
