import { useEffect, useRef, useState } from "react";

// A-Starry-Sky (https://github.com/Dante83/A-Starry-Sky, MIT) is an
// A-Frame + WASM atmospheric sky simulator — real star positions, a
// real moon, physically-based Rayleigh/Mie scattering. It was never
// built to be a scroll-reactive backdrop behind arbitrary DOM content:
// it owns its own <a-scene>/camera and its config is fixed once the
// scene boots, so unlike the previous SolarSystemBackground this does
// NOT dolly the camera or retint on scroll — it's mounted once, as a
// static night sky, and left alone. Vendored locally (see public/
// vendor/a-starry-sky and public/assets) since this sandbox has no
// internet access to pull it from a CDN at runtime.
const VENDOR_BASE = "/vendor/a-starry-sky";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// A clear, moonless night with the sky's own default location/atmosphere
// swapped out just enough to guarantee a starfield rather than daylight —
// nothing here is scroll- or section-driven, per the note above.
const SCENE_HTML = `
  <a-scene
    embedded
    vr-mode-ui="enabled: false"
    device-orientation-permission-ui="enabled: false"
    loading-screen="enabled: false"
    renderer="colorManagement: true; physicallyCorrectLights: true"
    style="width:100%;height:100%;"
  >
    <a-starry-sky web-worker-src="${VENDOR_BASE}/wasm/starry-sky-web-worker.js">
      <sky-location>
        <sky-latitude>34.05</sky-latitude>
        <sky-longitude>-118.24</sky-longitude>
      </sky-location>
      <sky-time>
        <sky-date>2026-01-01 02:00:00</sky-date>
        <sky-utc-offset>-8</sky-utc-offset>
        <sky-speed>40</sky-speed>
      </sky-time>
    </a-starry-sky>
    <a-camera position="0 1.6 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
  </a-scene>
`;

export default function AStarrySkyBackground() {
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        if (!window.AFRAME) await import("aframe");
        // The main thread (not just the web worker) reaches into a
        // global `Module` for the interpolation-engine WASM instance,
        // so that script has to be loaded before a-starry-sky itself.
        if (!window.Module) await loadScript(`${VENDOR_BASE}/wasm/interpolation-engine.js`);
        if (!window.StarrySky) await loadScript(`${VENDOR_BASE}/a-starry-sky.v1.2.0.js`);
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = SCENE_HTML;
    }

    boot();

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {!failed && <div ref={containerRef} className="w-full h-full" />}
    </div>
  );
}
