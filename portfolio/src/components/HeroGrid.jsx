import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Link2, ChevronDown } from "lucide-react";
import { EMET_SHORTCUTS, STACK_TAGS } from "../data/content";
import { useSandbox } from "../App";
import MagneticButton from "./MagneticButton";
import { HEAVY_OBJECT, EASE_OUT } from "../lib/motion";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASE = EASE_OUT;

/* ── Typewriter automation queue ──────────────────────────────
   Each segment types character-by-character at its own speed (ms/char),
   then pauses before the next segment starts. Reduced-motion users get
   the full text immediately instead of an animated queue. */
const SCRIPT = [
  { text: "emet\n", cls: "text-glow-cyan font-bold", speed: 12 },
  { text: "──────────────────\n\n", cls: "opacity-40", speed: 5 },
  { text: "Hi. I'm emet.\n\n", cls: "", speed: 20 },
  { text: "I keep the record on ", cls: "", speed: 18 },
  { text: "Mohamed Ansar", cls: "text-glow-cyan font-bold", speed: 18 },
  { text: ".\n\n", cls: "", speed: 18 },
  {
    text:
      "He's a Solutions Engineer with 6 years building data systems, pipelines, and analytics at scale. One iOS app shipped to the App Store.\n\n",
    cls: "",
    speed: 15,
  },
  { text: "What would you like to know?\n", cls: "opacity-40", speed: 22 },
];

function useTypewriter(script, startDelay = 500) {
  const [progress, setProgress] = useState({ seg: 0, char: 0 });
  const [done, setDone] = useState(prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    let timeoutId;

    function tick(segIdx, charIdx) {
      if (cancelled) return;
      if (segIdx >= script.length) {
        setDone(true);
        return;
      }
      const seg = script[segIdx];
      const nextChar = charIdx + 1;
      setProgress({ seg: segIdx, char: nextChar });
      if (nextChar >= seg.text.length) {
        timeoutId = setTimeout(() => tick(segIdx + 1, 0), Math.max(seg.speed * 4, 60));
      } else {
        timeoutId = setTimeout(() => tick(segIdx, nextChar), seg.speed);
      }
    }

    timeoutId = setTimeout(() => tick(0, 0), startDelay);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDelay]);

  const segments = useMemo(() => {
    if (done) return script;
    return script.map((seg, i) => {
      if (i < progress.seg) return seg;
      if (i === progress.seg) return { ...seg, text: seg.text.slice(0, progress.char) };
      return { ...seg, text: "" };
    });
  }, [script, progress, done]);

  return { segments, done };
}

/* Cursor-reactive spotlight + physics-dampened 3D tilt — this single
   panel pivots on rotateX/rotateY as the cursor glides near it
   (spring-smoothed, not raw 1:1 tracking), while a soft glow follows
   the pointer via CSS custom properties (no re-renders for that
   half). Tilt is skipped under reduced motion.

   The hit-test rect is measured on a STATIC outer wrapper, not on the
   element being rotated — measuring on the rotating element itself
   creates a feedback loop (tilting shifts its own bounding rect,
   which can push the cursor "outside" mid-gesture and cancel the
   tilt), which is why the tilt and the mouse handlers live on
   different elements here. */
function CrtChassis({ children, className = "" }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const reduced = prefersReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = HEAVY_OBJECT;
  const springX = useSpring(px, spring);
  const springY = useSpring(py, spring);
  const rotateX = useTransform(springY, [0, 1], [9, -9]);
  const rotateY = useTransform(springX, [0, 1], [-12, 12]);

  function onMouseMove(e) {
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    innerRef.current?.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    innerRef.current?.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    innerRef.current?.style.setProperty("--spot-o", "1");
    if (reduced) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }
  function onMouseLeave() {
    innerRef.current?.style.setProperty("--spot-o", "0");
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <div ref={outerRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} style={{ perspective: "1400px" }}>
      <motion.div
        ref={innerRef}
        style={{
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`crt-shell crt-spotlight rounded-2xl will-change-transform ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function MonitorBar({ title, status, statusTone = "cyan" }) {
  const tone =
    statusTone === "cyan"
      ? "text-cyan border-cyan/30"
      : statusTone === "green"
        ? "text-green border-green/30"
        : "text-amber border-amber/30";
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-black/20">
      <span className="flex gap-1.5">
        <i className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <i className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <i className="w-2 h-2 rounded-full bg-[#28c840]" />
      </span>
      <span className="flex-1 font-mono text-[.64rem] tracking-wide text-[color:var(--ink-400)]">{title}</span>
      <span className={`font-mono text-[.56rem] uppercase tracking-[.12em] border rounded px-1.5 py-0.5 ${tone}`}>
        {status}
      </span>
    </div>
  );
}

/**
 * Hero as an editorial scene rather than a pair of equal boxed panels:
 * the name is the dominant visual gesture (large, open, unboxed), and
 * "emet" is one smaller floating object placed asymmetrically beside
 * it — a physical thing in the scene, not 50% of the viewport in a
 * rounded rectangle.
 */
export default function HeroGrid({ ready = true }) {
  const { segments, done } = useTypewriter(SCRIPT);
  const { toggleDevMode } = useSandbox();

  return (
    <header className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden pt-32 pb-20">
      <div
        aria-hidden
        className="ambient-drift pointer-events-none absolute -inset-[10%] z-0"
        style={{
          background:
            "radial-gradient(38% 42% at 22% 38%, rgba(34,211,238,.12), transparent 70%), radial-gradient(34% 38% at 82% 62%, rgba(251,191,36,.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-16 lg:gap-10 items-start">
          {/* ── Identity statement — the large gesture, no box ── */}
          <motion.div
            initial="hidden"
            animate={ready ? "show" : "hidden"}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
            }}
          >
            <motion.span
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              className="font-mono text-[.72rem] tracking-[.22em] uppercase text-cyan/70"
            >
              solutions engineer — data · systems · delivery
            </motion.span>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 28, rotateX: 10 },
                show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.9, ease: EASE } },
              }}
              style={{ transformPerspective: 1200 }}
              className="mt-5 text-[clamp(3.4rem,8.6vw,7.6rem)] leading-[.9] font-display font-semibold text-[color:var(--ink-50)]"
            >
              Mohamed
              <br />
              <em className="glow-pulse italic text-cyan text-glow-cyan" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Ansar
              </em>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-[color:var(--ink-400)]"
            >
              Six years building data systems, pipelines, and analytics at scale. One iOS app shipped to the App
              Store.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="mt-8 flex flex-wrap items-center gap-5"
            >
              <MagneticButton
                href="#build"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink text-[.82rem] font-bold font-mono tracking-wide"
              >
                Selected work <ArrowRight size={13} />
              </MagneticButton>
              <MagneticButton
                href="https://www.linkedin.com/in/kmsmohamedansar/"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 text-[.82rem] font-mono tracking-wide text-[color:var(--ink-300)] hover:text-cyan transition-colors"
              >
                <Link2 size={13} /> LinkedIn
              </MagneticButton>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8, delay: 0.1 } } }}
              className="mt-14 flex gap-7 font-mono text-[.65rem] uppercase tracking-[.14em] text-slate-500"
            >
              <a href="#lineage" className="hover:text-cyan transition-colors">Before</a>
              <a href="#build" className="hover:text-cyan transition-colors">Work</a>
              <a href="#commit" className="hover:text-cyan transition-colors">Contact</a>
            </motion.div>
          </motion.div>

          {/* ── emet — one floating object, asymmetrically placed ── */}
          <motion.div
            initial="hidden"
            animate={ready ? "show" : "hidden"}
            variants={{
              hidden: { opacity: 0, y: 30, rotateY: -16 },
              show: { opacity: 1, y: 0, rotateY: 0, transition: { duration: 1, ease: EASE, delay: 0.35 } },
            }}
            style={{ transformPerspective: 1200 }}
            className="lg:mt-20"
          >
            <CrtChassis className="bg-black">
              <MonitorBar title="emet · portfolio assistant" status={done ? "READY" : "BOOTING"} statusTone={done ? "cyan" : "amber"} />
              <div className="p-5 min-h-[300px] flex flex-col font-mono text-[.8rem] leading-[1.8] text-cyan/85">
                <pre className="whitespace-pre-wrap break-words flex-1 mb-3">
                  {segments.map((seg, i) => (
                    <span key={i} className={seg.cls}>
                      {seg.text}
                    </span>
                  ))}
                  {!done && <span className="inline-block w-[6px] h-[1em] bg-cyan align-text-bottom blink-cursor ml-0.5" />}
                </pre>

                {done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="flex flex-col gap-1.5 mb-3"
                  >
                    {EMET_SHORTCUTS.map((item) => (
                      <a
                        key={item.n}
                        href={item.go}
                        className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-cyan/15 bg-cyan/[.02] text-cyan/75 hover:text-cyan hover:border-cyan/45 hover:bg-cyan/5 transition-colors"
                      >
                        <span className="w-[18px] h-[18px] grid place-items-center rounded border border-cyan/25 text-[.64rem] text-cyan/60 group-hover:text-cyan group-hover:border-cyan/50 transition-colors">
                          {item.n}
                        </span>
                        <span className="text-[.7rem]">{item.label}</span>
                      </a>
                    ))}
                  </motion.div>
                )}

                {done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="flex items-center gap-2 border-t border-cyan/15 pt-3 mt-auto"
                  >
                    <span className="text-cyan text-lg leading-none">›</span>
                    <input
                      type="text"
                      placeholder="type 1, 2, 3 or 4…"
                      className="flex-1 bg-transparent outline-none text-[.75rem] text-cyan placeholder:text-cyan/35 caret-cyan"
                      autoComplete="off"
                      spellCheck={false}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const raw = e.currentTarget.value.trim();
                        if (raw.toLowerCase() === "dev_mode") {
                          toggleDevMode();
                          e.currentTarget.value = "";
                          return;
                        }
                        const target = EMET_SHORTCUTS.find((s) => String(s.n) === raw);
                        if (target) document.querySelector(target.go)?.scrollIntoView({ behavior: "smooth" });
                        e.currentTarget.value = "";
                      }}
                    />
                  </motion.div>
                )}
              </div>
            </CrtChassis>
          </motion.div>
        </div>

        <motion.a
          href="#source"
          aria-label="Scroll to explore"
          className="float-y relative z-10 mt-16 mx-auto w-9 h-9 grid place-items-center rounded-full border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
        >
          <ChevronDown size={16} />
        </motion.a>
      </div>

      {/* infinite stack ticker */}
      <div className="relative z-10 mt-14 overflow-hidden border-y border-white/6 py-3.5">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 font-mono text-[.72rem] tracking-[.08em] text-slate-500 uppercase">
          {[...STACK_TAGS, ...STACK_TAGS].map((tag, i) => (
            <span key={i} className="flex items-center gap-10 shrink-0">
              {tag} <i className="w-1 h-1 rounded-full bg-cyan/50" />
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee { to { transform: translateX(-50%); } }
      `}</style>
    </header>
  );
}
