import { useEffect, useRef, useState } from "react";
import { createBB8Scene } from "./createBB8Scene";

export default function BB8Experience() {
  const viewportRef = useRef(null);
  const experienceRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const experience = createBB8Scene(viewport);
    experienceRef.current = experience;
    setReady(true);
    return () => {
      experienceRef.current = null;
      experience.dispose();
    };
  }, []);

  const toggleSound = async () => {
    const enabled = await experienceRef.current?.sound.setEnabled(!soundEnabled);
    setSoundEnabled(Boolean(enabled));
  };

  return (
    <main className="bb8-page">
      <div className="bb8-ambient" aria-hidden="true" />
      <header className="bb8-header">
        <div className="bb8-kicker"><span /> Droid study 001</div>
        <div className="bb8-header-actions">
          <button className="bb8-sound" type="button" aria-pressed={soundEnabled} onClick={toggleSound} disabled={!ready}>
            Sound <b>{soundEnabled ? "on" : "off"}</b>
          </button>
          <div className="bb8-status"><i className={ready ? "is-ready" : ""} /> {ready ? "Scene online" : "Initializing"}</div>
        </div>
      </header>

      <section className="bb8-copy" aria-labelledby="bb8-title">
        <p className="bb8-eyebrow">Procedural Three.js prototype</p>
        <h1 id="bb8-title">Meet <em>BB-8.</em></h1>
        <p className="bb8-lede">A small companion built from geometry, light, and a little resistance-era optimism.</p>
      </section>

      <div
        ref={viewportRef}
        className="bb8-viewport"
        role="application"
        tabIndex="0"
        aria-label="Interactive three-dimensional fan-art model of BB-8. Click the droid for a reaction, click the floor to roll, use WASD or arrow keys to steer, drag to orbit, and scroll to zoom."
      />

      <footer className="bb8-footer">
        <div className="bb8-controls" aria-label="Scene controls">
          <span><b>01</b> Drag to orbit</span>
          <span><b>02</b> Click floor to roll</span>
          <span><b>03</b> Click BB-8 to react</span>
          <span><b>04</b> WASD to steer</span>
        </div>
        <p>Fan-art prototype · Built without external 3D models</p>
      </footer>
    </main>
  );
}
