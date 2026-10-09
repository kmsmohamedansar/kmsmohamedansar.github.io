import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ArrowLeft } from "lucide-react";

const MODEL_URL = `${import.meta.env.BASE_URL}models/digital_double.glb`;
const CASE_STUDY_URL = "https://github.com/kmsmohamedansar/ai-digital-double";

// How far the gaze target can move. Kept modest: past ~25 degrees the
// eyeballs show too much white and stop reading as "looking at you".
const GAZE_X = 0.3;
const GAZE_Y = 0.2;
const GAZE_Z = 0.6;

/* A 3D model of me, built by directing Claude Code to drive Blender.
   The head turns slightly toward the cursor and the eyeballs (separate
   meshes in the GLB) aim at it, so it looks back at whoever is reading. */
export default function DigitalDouble() {
  const mountRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);
    const camera = new THREE.PerspectiveCamera(22, mount.clientWidth / mount.clientHeight, 0.01, 10);
    camera.position.set(0, 0, 0.85);

    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a120c, 0.6));
    const key = new THREE.DirectionalLight(0xfff1e0, 2.4);
    key.position.set(-0.6, 0.5, 0.8);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7);
    fill.position.set(0.8, 0, 0.6);
    const rim = new THREE.DirectionalLight(0xcfe0ff, 1.6);
    rim.position.set(0.4, 0.6, -0.8);
    scene.add(key, fill, rim);

    const rig = new THREE.Group();
    scene.add(rig);
    const eyes = [];
    const pointer = new THREE.Vector2();
    const smooth = new THREE.Vector2();
    const gaze = new THREE.Vector3();

    let disposed = false;
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
        model.traverse((o) => {
          if (!o.isMesh) return;
          if (o.name.startsWith("Web_Hair")) {
            o.material.alphaTest = 0.35;
            o.material.side = THREE.DoubleSide;
          }
          if (o.name.startsWith("Web_Eye")) eyes.push(o);
        });
        rig.add(model);
        setLoaded(true);
      },
      undefined,
      () => setFailed(true),
    );

    const onMove = (e) => {
      const r = mount.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);

    renderer.setAnimationLoop(() => {
      smooth.lerp(pointer, reduceMotion ? 1 : 0.12);
      rig.rotation.y = smooth.x * 0.25;
      rig.rotation.x = -smooth.y * 0.12;
      gaze.set(smooth.x * GAZE_X, smooth.y * GAZE_Y, GAZE_Z);
      for (const eye of eyes) eye.lookAt(gaze);
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        for (const m of [].concat(o.material)) {
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative h-full min-h-[100svh] bg-[#050506]">
      <div ref={mountRef} className="absolute inset-0" />
      {!loaded && !failed && (
        <div className="absolute inset-0 grid place-items-center font-mono text-xs text-[color:var(--ink-200)]">
          Loading the model…
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center text-sm text-[color:var(--ink-200)]">
          The 3D model couldn't load. Try a refresh.
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <div className="pointer-events-auto max-w-md">
          <a href="#ai" className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[.12em] text-rose">
            <ArrowLeft size={13} /> Back
          </a>
          <h1 className="mt-3 font-display text-2xl font-semibold text-white">A 3D model of me, made with AI</h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-200)]">
            Move your cursor and it looks back at you. I directed Claude Code to build this in Blender from phone photos and a
            13-second video, with only free tools.{" "}
            <a href={CASE_STUDY_URL} className="text-rose underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              Every step, including what failed
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
