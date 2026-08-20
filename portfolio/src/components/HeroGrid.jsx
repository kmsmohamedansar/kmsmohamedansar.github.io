import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { History, Briefcase, Mail, ArrowRight, Link2, ChevronDown } from "lucide-react";
import { EMET_SHORTCUTS, STACK_TAGS } from "../data/content";
import { useSandbox } from "../App";
import MagneticButton from "./MagneticButton";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASE = [0.16, 1, 0.3, 1];

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

/* ── Canvas particle-vortex "data gravity well" ────────────── */
function useParticleVortex(canvasRef, { label = "ANSAR" } = {}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // canvas blocked by a privacy extension / browser policy
    const reduced = prefersReducedMotion();

    let raf;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const PARTICLE_COUNT = 90;
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * 120;
      return {
        angle,
        radius,
        speed: 0.002 + Math.random() * 0.004,
        size: 0.8 + Math.random() * 1.8,
        hueMix: Math.random(),
        wobble: Math.random() * Math.PI * 2,
      };
    });

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // faint concentric rings — the "gravity well"
      for (let r = 40; r < Math.min(width, height) / 2; r += 34) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34,211,238,0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      particles.forEach((p) => {
        if (!reduced) p.angle += p.speed;
        const wob = Math.sin(t * 0.0006 + p.wobble) * 4;
        const r = p.radius + wob;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r * 0.62; // slight ellipse for depth
        const alpha = 0.25 + 0.5 * (1 - r / 170);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.hueMix > 0.85 ? `rgba(251,191,36,${alpha})` : `rgba(34,211,238,${alpha})`;
        ctx.fill();
      });

      // center label
      ctx.font = "700 15px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(34,211,238,0.5)";
      ctx.letterSpacing = "6px";
      ctx.fillText(label, cx, cy);

      raf = requestAnimationFrame(draw);
    }

    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, label]);
}

/* Cursor-reactive spotlight — a soft glow that follows the pointer
   across the chassis, brightening the scanlines near it. Pure CSS
   custom properties updated on mousemove, no re-renders. */
function CrtChassis({ children, className = "" }) {
  const ref = useRef(null);

  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spot-o", "1");
  }
  function onMouseLeave() {
    ref.current?.style.setProperty("--spot-o", "0");
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`crt-shell crt-spotlight rounded-[1.75rem] ${className}`}
    >
      {children}
    </div>
  );
}

function MonitorBar({ title, status, statusTone = "green" }) {
  const tone =
    statusTone === "cyan"
      ? "text-cyan border-cyan/30"
      : statusTone === "green"
        ? "text-green border-green/30"
        : "text-amber border-amber/30";
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 bg-black/20">
      <span className="flex gap-1.5">
        <i className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </span>
      <span className="flex-1 font-mono text-[.68rem] tracking-wide text-[color:var(--ink-400)]">
        {title}
      </span>
      <span className={`font-mono text-[.58rem] uppercase tracking-[.12em] border rounded px-2 py-0.5 ${tone}`}>
        {status}
      </span>
    </div>
  );
}

export default function HeroGrid() {
  const { segments, done } = useTypewriter(SCRIPT);
  const canvasRef = useRef(null);
  useParticleVortex(canvasRef, { label: "ANSAR" });
  const { toggleDevMode } = useSandbox();

  return (
    <header className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden pt-28 pb-16">
      {/* ambient background glow */}
      <div
        aria-hidden
        className="ambient-drift pointer-events-none absolute -inset-[10%] z-0"
        style={{
          background:
            "radial-gradient(38% 42% at 22% 38%, rgba(34,211,238,.12), transparent 70%), radial-gradient(34% 38% at 82% 62%, rgba(251,191,36,.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-6 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.05 } } }}
        >
          <CrtChassis className="grid grid-cols-1 md:grid-cols-[7fr_3fr] md:divide-x md:divide-white/10">
            {/* LEFT HALF — EMET terminal, black-CRT chassis in the site's own cyan */}
            <motion.div
              variants={{ hidden: { opacity: 0, x: -36 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="flex flex-col border-b border-white/10 md:border-b-0 bg-black"
            >
              <MonitorBar title="emet · portfolio assistant" status={done ? "READY" : "BOOTING"} statusTone={done ? "cyan" : "amber"} />
              <div className="p-6 min-h-[380px] flex flex-col font-mono text-[.92rem] leading-[1.85] text-cyan/85">
                <pre className="whitespace-pre-wrap break-words flex-1 mb-4">
                  {segments.map((seg, i) => (
                    <span key={i} className={seg.cls}>
                      {seg.text}
                    </span>
                  ))}
                  {!done && <span className="inline-block w-[7px] h-[1em] bg-cyan align-text-bottom blink-cursor ml-0.5" />}
                </pre>

                {done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="flex flex-col gap-1.5 mb-4"
                  >
                    {EMET_SHORTCUTS.map((item) => (
                      <a
                        key={item.n}
                        href={item.go}
                        className="group flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg border border-cyan/15 bg-cyan/[.02] text-cyan/75 hover:text-cyan hover:border-cyan/45 hover:bg-cyan/5 transition-colors"
                      >
                        <span className="w-[22px] h-[22px] grid place-items-center rounded border border-cyan/25 text-[.7rem] text-cyan/60 group-hover:text-cyan group-hover:border-cyan/50 transition-colors">
                          {item.n}
                        </span>
                        <span className="text-[.76rem]">{item.label}</span>
                      </a>
                    ))}
                  </motion.div>
                )}

                {done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="flex items-center gap-2.5 border-t border-cyan/15 pt-3.5 mt-auto"
                  >
                    <span className="text-cyan text-lg leading-none">›</span>
                    <input
                      type="text"
                      placeholder="type 1, 2, 3 or 4…"
                      className="flex-1 bg-transparent outline-none text-[.8rem] text-cyan placeholder:text-cyan/35 caret-cyan"
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
            </motion.div>

            {/* RIGHT HALF — Identity & generative loop */}
            <motion.div
              variants={{ hidden: { opacity: 0, x: 36 }, show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
              className="flex flex-col"
            >
              <MonitorBar title="mohamed.sys · identity" status="ONLINE" statusTone="green" />
              <div className="relative p-7 min-h-[380px] flex flex-col overflow-hidden">
                <canvas
                  ref={canvasRef}
                  aria-hidden
                  className="absolute inset-0 w-full h-full opacity-70 pointer-events-none"
                />

                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  <h1
                    className="text-[clamp(2.6rem,5.2vw,4.4rem)] leading-[.96] mb-4"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    Mohamed
                    <br />
                    <em className="glow-pulse italic text-cyan text-glow-cyan">Ansar</em>
                  </h1>
                  <p className="font-display text-cyan text-[.95rem] mb-6">
                    Data · Engineering · Shipped iOS
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <MagneticButton
                      href="#build"
                      whileHover={{ scale: 1.045 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink text-[.78rem] font-bold font-mono tracking-wide"
                    >
                      Selected work <ArrowRight size={13} />
                    </MagneticButton>
                    <MagneticButton
                      href="https://www.linkedin.com/in/kmsmohamedansar/"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.045 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/12 text-[color:var(--ink-200)] text-[.78rem] font-mono tracking-wide hover:border-cyan/40 hover:text-cyan transition-colors"
                    >
                      <Link2 size={13} /> LinkedIn
                    </MagneticButton>
                  </div>
                </div>

                {/* bottom dock */}
                <div className="relative z-10 flex gap-2 border-t border-white/8 pt-4 mt-5">
                  {[
                    { icon: History, label: "Before", href: "#lineage" },
                    { icon: Briefcase, label: "Work", href: "#build" },
                    { icon: Mail, label: "Contact", href: "#commit" },
                  ].map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="group flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg text-slate-500 hover:text-cyan transition-colors font-mono text-[.6rem] uppercase tracking-[.1em]"
                    >
                      <span className="w-[34px] h-[34px] grid place-items-center rounded-lg border border-white/10 text-[color:var(--ink-300)] group-hover:border-cyan/45 group-hover:text-cyan group-hover:-translate-y-0.5 transition-all">
                        <Icon size={15} />
                      </span>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </CrtChassis>
        </motion.div>

        <motion.a
          href="#source"
          aria-label="Scroll to explore"
          className="float-y relative z-10 mt-8 mx-auto w-9 h-9 grid place-items-center rounded-full border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors"
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
