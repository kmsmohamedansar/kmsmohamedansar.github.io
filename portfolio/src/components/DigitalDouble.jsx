import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ArrowLeft, ArrowDown, ArrowUpRight } from "lucide-react";

const MODEL_URL = `${import.meta.env.BASE_URL}models/digital_double.glb`;
const CASE_STUDY_URL = "https://github.com/kmsmohamedansar/ai-digital-double";

// How far the gaze target can move. Kept modest: past ~25 degrees the
// eyeballs show too much white and stop reading as "looking at you".
const GAZE_X = 0.3;
const GAZE_Y = 0.2;
const GAZE_Z = 0.6;

const IMG = (name) => `${import.meta.env.BASE_URL}shots/digital-double/${name}`;

const STATS = [
  ["12", "stages, from first mesh to the version above"],
  ["~6 h", "of work, including 4 rounds of my review"],
  ["$0", "in tools: Blender, FaceBuilder, Brush, three.js"],
  ["160k", "hair strands, grown and filtered by code"],
];

// One entry per stage worth showing. Verdicts are honest: most attempts failed.
const STAGES = [
  { img: "s01.jpg", n: 1, title: "A head built from pure code", verdict: "dead end", tone: "text-rose",
    note: "Two photo outlines give a silhouette, not a face." },
  { img: "s02.jpg", n: 2, title: "FaceBuilder from 3 photos", verdict: "partial", tone: "text-amber",
    note: "Real 3D form, but still close to an average head." },
  { img: "s03.jpg", n: 3, title: "Particle hair", verdict: "dead end", tone: "text-rose",
    note: "Six tries. It looked like a knitted cap." },
  { img: "s04.jpg", n: 4, title: "FaceBuilder from 8 video frames", verdict: "kept", tone: "text-green",
    note: "Became the base of the final model." },
  { img: "s05.jpg", n: 5, title: "On-device photogrammetry", verdict: "measurement", tone: "text-[#b9a8ff]",
    note: "Hair came out like a beret, but its volume was right." },
  { img: "s08.jpg", n: 8, title: "Gaussian splat on my laptop GPU", verdict: "wrong format", tone: "text-cyan",
    note: "Best likeness by far, but a splat can't move its eyes." },
  { img: "s09.jpg", n: 9, title: "Real eyeballs", verdict: "kept", tone: "text-green",
    note: "Nine iterations to keep the whites inside the lids." },
  { img: "temple_after.jpg", n: 12, title: "Hair rebuilt around ears and temples", verdict: "shipped", tone: "text-green",
    note: "Ears traced from the mesh; no strand within 2.5 mm." },
];

const TOOLS = [
  { img: "t_facebuilder.jpg", cap: "KeenTools FaceBuilder: 8 video frames solved, a camera placed for each" },
  { img: "t_scan.jpg", cap: "Apple Object Capture scan, built from 128 video frames" },
  { img: "t_brush.jpg", cap: "Brush training a Gaussian splat on the M4 GPU" },
  { img: "t_topology.jpg", cap: "The head mesh: 18k vertices of clean, animatable topology" },
  { img: "t_eyeshader.jpg", cap: "The eye shader the agent built node by node" },
  { img: "t_ears.jpg", cap: "Each ear's outline traced (red) to keep hair out" },
  { img: "t_texture.jpg", cap: "The face texture, every repair painted in by code" },
];

const LESSONS = [
  ["Capture beats cleverness.", "Most failures traced back to the input: a compressed video, or me turning instead of the camera."],
  ["Choose the format for the goal.", "The splat looked most like me but can't be animated. A mesh with separate eyes can."],
  ["Eyes are where likeness lives.", "Painted-on eyes made every version look dead. Real eyeballs changed it most."],
  ["AI is the operator, I'm the art director.", "The agent installed tools, wrote Python and Swift, and fixed bugs fast. Judging whether it looked like me stayed my job."],
];

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
        // Centre on the head, not the whole bust, so the shirt doesn't push the face off-screen.
        const head = model.getObjectByName("Web_Head") || model;
        const centre = new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3());
        centre.y -= 0.03;
        model.position.sub(centre);
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

    let lastInput = -1e9;
    const onMove = (e) => {
      lastInput = performance.now();
      const r = mount.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    // On tall phone screens, pull the camera back and raise the head so the caption doesn't cover the face.
    const frame = () => {
      const aspect = mount.clientWidth / mount.clientHeight;
      camera.aspect = aspect;
      const tall = aspect < 0.8;
      camera.position.set(0, tall ? -0.07 : 0, tall ? 1.25 : 0.95);
      camera.updateProjectionMatrix();
    };
    frame();
    const onResize = () => {
      frame();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    window.addEventListener("resize", onResize);

    renderer.setAnimationLoop((t) => {
      // With no input for a few seconds (always the case on a phone at rest), let the gaze wander slowly.
      if (!reduceMotion && t - lastInput > 3000) {
        pointer.set(Math.sin(t * 0.00035) * 0.6, Math.sin(t * 0.00023) * 0.3);
      }
      smooth.lerp(pointer, reduceMotion ? 1 : 0.06);
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
      window.removeEventListener("pointerdown", onMove);
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
    <div className="bg-[#050506]">
      <section className="relative h-[100svh]">
        <div ref={mountRef} className="absolute inset-0" style={{ touchAction: "pan-y" }} />
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
              Move your cursor, or drag on a phone, and it looks back at you. I directed Claude Code to build this in Blender from phone photos and a
              13-second video, with only free tools.
            </p>
            <a href="#dd-how" onClick={(e) => { e.preventDefault(); document.getElementById("dd-how")?.scrollIntoView({ behavior: "smooth" }); }}
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[.12em] text-white/80 hover:text-white">
              How it was made <ArrowDown size={13} />
            </a>
          </div>
        </div>
      </section>

      <article id="dd-how" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24 text-[color:var(--ink-200)]">
        <p className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-rose">How it was made</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          One person, a phone, a laptop and an AI agent. Is that enough for a 3D double?
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed">
          Mostly, yes. I never touched a Blender menu for the modelling: I described what I saw, and Claude Code wrote and ran the
          Python, Swift and shader work live in Blender through MCP, then showed me renders. Here's the whole loop, failures included.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={big} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <dt className="font-display text-3xl font-semibold text-white">{big}</dt>
              <dd className="mt-1 text-xs leading-snug">{small}</dd>
            </div>
          ))}
        </dl>

        <figure className="mt-12 overflow-hidden rounded-2xl border border-white/10">
          <img src={IMG("pipeline.svg")} alt="Pipeline: phone capture, then FaceBuilder, photogrammetry and a Gaussian splat, then Blender driven by Claude Code, then a GLB on this page. A review loop sends my notes back to the agent." className="w-full" loading="lazy" />
        </figure>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[["final_front.jpg", "Final, front"], ["final_profile.jpg", "Final, profile"]].map(([img, cap]) => (
            <figure key={img} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img src={IMG(img)} alt={cap} className="w-full" loading="lazy" />
              <figcaption className="px-4 py-3 text-xs">{cap}, rendered in Cycles</figcaption>
            </figure>
          ))}
        </div>

        <h3 className="mt-20 font-display text-2xl font-semibold text-white">The journey: 12 stages, most of them failures</h3>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((st) => (
            <li key={st.n} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
              <img src={IMG(st.img)} alt={st.title} className="aspect-[4/5] w-full bg-black object-cover" loading="lazy" />
              <div className="p-4">
                <p className="font-mono text-[11px] uppercase tracking-[.12em]">
                  Stage {st.n} · <span className={st.tone}>{st.verdict}</span>
                </p>
                <p className="mt-1 font-semibold leading-snug text-white">{st.title}</p>
                <p className="mt-1 text-sm leading-snug">{st.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-20 font-display text-2xl font-semibold text-white">The temples, before and after one round of review</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[["temple_before.jpg", "Before: long strands like comb teeth, skin showing through"], ["temple_after.jpg", "After: short, flat hair with a soft, graduated hairline"]].map(([img, cap]) => (
            <figure key={img} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img src={IMG(img)} alt={cap} className="w-full" loading="lazy" />
              <figcaption className="px-4 py-3 text-xs">{cap}</figcaption>
            </figure>
          ))}
        </div>

        <h3 className="mt-20 font-display text-2xl font-semibold text-white">Inside the tools</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <figure key={t.img} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img src={IMG(t.img)} alt={t.cap} className="aspect-video w-full object-contain" loading="lazy" />
              <figcaption className="px-4 py-3 text-xs">{t.cap}</figcaption>
            </figure>
          ))}
        </div>

        <h3 className="mt-20 font-display text-2xl font-semibold text-white">What I learned</h3>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {LESSONS.map(([head, body]) => (
            <li key={head} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="font-semibold text-white">{head}</p>
              <p className="mt-1 text-sm leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <a href={CASE_STUDY_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-rose px-5 py-3 text-sm font-semibold text-[#23091a] transition-transform hover:-translate-y-0.5">
            Read the full write-up on GitHub <ArrowUpRight size={15} />
          </a>
          <a href="#ai" className="text-sm text-white/70 hover:text-white">Back to Built with AI</a>
        </div>
      </article>
    </div>
  );
}
