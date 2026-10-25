import { useEffect, useRef, useState } from "react";
import { createBB8Scene } from "../bb8/createBB8Scene";
import "./BB8Companion.css";

export default function BB8Companion() {
  const viewportRef = useRef(null);
  const experienceRef = useRef(null);
  const [open, setOpen] = useState(() => !window.matchMedia("(max-width: 720px)").matches);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!open || !viewport) return undefined;

    const experience = createBB8Scene(viewport, { variant: "companion" });
    experienceRef.current = experience;
    return () => {
      experienceRef.current = null;
      experience.dispose();
    };
  }, [open]);

  const close = () => {
    setSoundEnabled(false);
    setOpen(false);
  };

  const toggleSound = async () => {
    const enabled = await experienceRef.current?.sound.setEnabled(!soundEnabled);
    setSoundEnabled(Boolean(enabled));
  };

  if (!open) {
    return (
      <aside className="bb8-companion bb8-companion--closed" aria-label="BB-8 companion">
        <button className="bb8-companion-launcher" type="button" onClick={() => setOpen(true)} aria-expanded="false">
          <span aria-hidden="true"><i /></span>
          Wake BB-8
        </button>
      </aside>
    );
  }

  return (
    <aside className="bb8-companion bb8-companion--open" aria-label="BB-8 companion">
      <div className="bb8-companion-bar">
        <span className="bb8-companion-label"><i /> Companion online</span>
        <div>
          <button type="button" className="bb8-companion-sound" onClick={toggleSound} aria-pressed={soundEnabled}>
            Sound {soundEnabled ? "on" : "off"}
          </button>
          <button type="button" className="bb8-companion-close" onClick={close} aria-label="Hide BB-8 companion">×</button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="bb8-companion-viewport"
        role="application"
        tabIndex="0"
        aria-label="Interactive BB-8 companion. Click BB-8 for a reaction or click the floor to roll."
      />
      <p className="bb8-companion-hint">Click BB-8 · Click floor to roll</p>
    </aside>
  );
}
