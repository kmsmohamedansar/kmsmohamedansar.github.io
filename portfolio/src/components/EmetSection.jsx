import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { EMET_SHORTCUTS } from "../data/content";
import { useSandbox } from "../App";
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
  { text: "emet\n", cls: "text-glow-green font-bold", speed: 12 },
  { text: "──────────────────\n\n", cls: "opacity-40", speed: 5 },
  { text: "Hi. I'm emet.\n\n", cls: "", speed: 20 },
  { text: "I keep the record on ", cls: "", speed: 18 },
  { text: "Mohamed Ansar", cls: "text-glow-green font-bold", speed: 18 },
  { text: ".\n\n", cls: "", speed: 18 },
  {
    text:
      "He's a Solutions Engineer with 6 years building data systems, pipelines, and analytics at scale. One iOS app shipped to the App Store.\n\n",
    cls: "",
    speed: 15,
  },
  { text: "What would you like to know?\n", cls: "opacity-40", speed: 22 },
];

function useTypewriter(script, startDelay = 350) {
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
 * emet's dedicated view — reached from the deck's EMET card, the top
 * nav, or the command palette. A full view of its own rather than
 * something boxed into the landing deck.
 */
export default function EmetSection() {
  const { segments, done } = useTypewriter(SCRIPT);
  const { toggleDevMode } = useSandbox();
  const reduced = prefersReducedMotion();

  return (
    // dark-surface: emet stays a dark green terminal in every theme,
    // same "permanently dark" exception the CRT chassis already makes
    // — it re-declares the shared --ink-* tokens back to their
    // light-on-dark values, so the heading/paragraph below don't need
    // their own color overrides to stay readable over the matrix rain.
    <section className="dark-surface min-h-full flex items-center px-5 py-14">
      <div className="mx-auto max-w-[1180px] grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-center">
        <div>
          <span className="font-mono text-[.7rem] tracking-[.2em] uppercase text-green/70">assistant</span>
          <h2 className="mt-4 font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.05] text-[color:var(--ink-50)]">
            Ask <span className="italic text-green" style={{ fontFamily: "'Instrument Serif', serif" }}>emet</span>
          </h2>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-[color:var(--ink-400)]">
            A small terminal that keeps the record straight — what he does now, where he's worked, what he's
            built. Type a number, or just read along.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -16 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{ transformPerspective: 1200 }}
          className="relative"
        >
          {/* An old-monitor power-on beat before the terminal starts
              typing — a bright flash that clears fast, then a single
              scanline sweeping down once the tube's caught up. This
              is emet's one signature entrance, not a color swap. */}
          {!reduced && (
            <>
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-white pointer-events-none z-30 rounded-2xl"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-x-3 h-20 pointer-events-none z-20 rounded-full"
                style={{ background: "linear-gradient(180deg, transparent, rgba(52,211,153,0.4), transparent)" }}
                initial={{ top: "-8%", opacity: 0 }}
                animate={{ top: ["-8%", "104%"], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1, delay: 0.25, ease: "easeInOut" }}
              />
            </>
          )}
          <CrtChassis className="bg-black">
            <MonitorBar title="emet · portfolio assistant" status={done ? "READY" : "BOOTING"} statusTone={done ? "green" : "amber"} />
            <div className="p-5 min-h-[300px] flex flex-col font-mono text-[.8rem] leading-[1.8] text-green/85">
              <pre className="whitespace-pre-wrap break-words flex-1 mb-3">
                {segments.map((seg, i) => (
                  <span key={i} className={seg.cls}>
                    {seg.text}
                  </span>
                ))}
                {/* A fat block cursor, not a thin I-beam — closer to the
                    solid-block cursor on an early IBM terminal than to
                    a modern text-editor caret. */}
                {!done && <span className="inline-block w-[10px] h-[1.15em] bg-green align-text-bottom blink-cursor ml-0.5" />}
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
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-green/15 bg-green/[.02] text-green/75 hover:text-green hover:border-green/45 hover:bg-green/5 transition-colors"
                    >
                      <span className="w-[18px] h-[18px] grid place-items-center rounded border border-green/25 text-[.64rem] text-green/60 group-hover:text-green group-hover:border-green/50 transition-colors">
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
                  className="flex items-center gap-2 border-t border-green/15 pt-3 mt-auto"
                >
                  <span className="text-green text-lg leading-none">›</span>
                  <input
                    type="text"
                    placeholder="type 1, 2, 3 or 4…"
                    className="flex-1 bg-transparent outline-none text-[.75rem] text-green placeholder:text-green/35 caret-green"
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
                      if (target) window.location.hash = target.go.replace(/^#/, "");
                      e.currentTarget.value = "";
                    }}
                  />
                </motion.div>
              )}
            </div>
          </CrtChassis>
        </motion.div>
      </div>
    </section>
  );
}
