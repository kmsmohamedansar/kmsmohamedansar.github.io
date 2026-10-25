import { useEffect, useRef, useState } from "react";
import { createBB8Scene } from "../bb8/createBB8Scene";
import "./BB8Companion.css";

const MAX_APPEARANCES = 5;
const ROUTINES = ["peek", "guide", "sleepy", "mischief"];
const ROUTINE_COPY = {
  peek: { message: "Bweep! Visitor detected." },
  guide: { message: "Psst… the AI experiments are this way.", href: "#ai" },
  sleepy: { message: "Power-saving mode…" },
  mischief: { message: "That panel was already loose." },
};

function readSessionNumber(key) {
  try {
    return Number.parseInt(window.sessionStorage.getItem(key) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

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

function randomDelay() {
  return 16000 + Math.random() * 14000;
}

export default function BB8Companion() {
  const viewportRef = useRef(null);
  const experienceRef = useRef(null);
  const firstAppearance = useRef(true);
  const [appearances, setAppearances] = useState(() => readSessionNumber("bb8-appearances"));
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [dismissed, setDismissed] = useState(() => readSessionFlag("bb8-dismissed"));
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState("waiting");
  const [routine, setRoutine] = useState("peek");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event) => setReducedMotion(event.matches);
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!started || dismissed || renderFailed || !viewportRef.current) return undefined;
    let experience;
    try {
      experience = createBB8Scene(viewportRef.current, { variant: "companion" });
    } catch (error) {
      console.warn("BB-8 companion could not start WebGL.", error);
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
    const updatePlayback = () => experienceRef.current?.setPaused(phase === "waiting" || document.hidden);
    updatePlayback();
    document.addEventListener("visibilitychange", updatePlayback);
    return () => document.removeEventListener("visibilitychange", updatePlayback);
  }, [phase]);

  useEffect(() => {
    if (dismissed || reducedMotion || phase !== "waiting" || appearances >= MAX_APPEARANCES) return undefined;

    let timer;
    const attemptAppearance = () => {
      if (document.hidden) {
        timer = window.setTimeout(attemptAppearance, 5000);
        return;
      }
      const nextRoutine = firstAppearance.current
        ? "peek"
        : ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
      firstAppearance.current = false;
      setRoutine(nextRoutine);
      setStarted(true);
      setPhase("peeking");
      setAppearances((current) => {
        const next = current + 1;
        writeSession("bb8-appearances", next);
        return next;
      });
    };

    timer = window.setTimeout(attemptAppearance, firstAppearance.current ? 1800 : randomDelay());
    return () => window.clearTimeout(timer);
  }, [appearances, dismissed, phase, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    let timer;
    if (phase === "peeking") {
      timer = window.setTimeout(
        () => setPhase(routine === "guide" || routine === "mischief" ? "observing" : "leaving"),
        routine === "guide" || routine === "mischief" ? 1500 : 5200,
      );
    } else if (phase === "observing") {
      timer = window.setTimeout(() => setPhase("leaving"), routine === "mischief" ? 5600 : 7200);
    } else if (phase === "leaving") {
      timer = window.setTimeout(() => setPhase("waiting"), 950);
    }
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, routine]);

  const toggleSound = async () => {
    const enabled = await experienceRef.current?.sound.setEnabled(!soundEnabled);
    setSoundEnabled(Boolean(enabled));
  };

  const dismiss = () => {
    experienceRef.current?.sound.setEnabled(false);
    writeSession("bb8-dismissed", true);
    setSoundEnabled(false);
    setDismissed(true);
  };

  const showReducedMotionCompanion = () => {
    setRoutine("peek");
    setStarted(true);
    setPhase("observing");
  };

  if (dismissed) return null;

  if (reducedMotion && !started) {
    return (
      <aside className="bb8-edge bb8-edge--reduced" aria-label="BB-8 companion">
        <button type="button" className="bb8-edge-show" onClick={showReducedMotionCompanion}>Show BB-8</button>
      </aside>
    );
  }

  if (!started) return null;

  if (renderFailed) {
    return (
      <aside className="bb8-edge bb8-edge--fallback" aria-label="BB-8 companion unavailable">
        <div className="bb8-edge-fallback-droid" aria-hidden="true"><i /><span /></div>
        <p>BB-8’s projector is offline.</p>
        <button type="button" onClick={dismiss}>Dismiss</button>
      </aside>
    );
  }

  const active = phase === "peeking" || phase === "observing";
  const copy = ROUTINE_COPY[routine];

  return (
    <aside className={`bb8-edge bb8-edge--${phase} bb8-edge--${routine}`} aria-label="BB-8 portfolio companion">
      <div className="bb8-edge-controls" aria-label="Companion controls">
        <button type="button" onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? "Mute" : "Sound"}</button>
        <button type="button" onClick={dismiss} aria-label="Dismiss BB-8 for this visit">×</button>
      </div>

      <div className="bb8-edge-bubble" role="status">
        {copy.href ? <a href={copy.href}>{copy.message}</a> : copy.message}
      </div>

      {routine === "sleepy" && (
        <div className="bb8-edge-zzzs" aria-hidden="true"><span>Z</span><span>Z</span><span>Z</span></div>
      )}

      <div className="bb8-edge-character">
        <div
          ref={viewportRef}
          className="bb8-edge-viewport"
          role="application"
          tabIndex={active ? 0 : -1}
          aria-hidden={!active}
          aria-label="Interactive BB-8 companion. Move the pointer nearby or click BB-8 for a reaction."
          onPointerEnter={() => {
            if (phase === "peeking" && routine === "peek") setPhase("observing");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            experienceRef.current?.react();
          }}
        />
      </div>
    </aside>
  );
}
