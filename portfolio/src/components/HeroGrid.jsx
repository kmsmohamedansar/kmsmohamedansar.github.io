import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Link2, ChevronDown } from "lucide-react";
import { STACK_TAGS } from "../data/content";
import { EASE_OUT } from "../lib/motion";

const NavCardDeck = lazy(() => import("./NavCardDeck"));

const EASE = EASE_OUT;

/**
 * Hero as an editorial scene: the name is the dominant opening
 * gesture, and the five-card deck beneath it — EMET, Now, Before,
 * Work, Contact — IS the navigation, not a decoration next to it.
 * Click a card, land on that part of the record.
 */
export default function HeroGrid({ ready = true }) {
  return (
    <header className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden pt-24 pb-10">
      <div
        aria-hidden
        className="ambient-drift pointer-events-none absolute -inset-[10%] z-0"
        style={{
          background:
            "radial-gradient(38% 42% at 22% 38%, rgba(34,211,238,.12), transparent 70%), radial-gradient(34% 38% at 82% 62%, rgba(251,191,36,.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-6 lg:px-14">
        <motion.div
          initial="hidden"
          animate={ready ? "show" : "hidden"}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
          }}
          className="max-w-2xl"
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
            className="mt-4 text-[clamp(2.8rem,6.6vw,5.4rem)] leading-[.92] font-display font-semibold text-[color:var(--ink-50)]"
          >
            Mohamed
            <br />
            <em className="glow-pulse italic text-cyan text-glow-cyan" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Ansar
            </em>
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
            className="mt-4 max-w-md text-[1rem] leading-relaxed text-[color:var(--ink-400)]"
          >
            Six years building data systems, pipelines, and analytics at scale. One iOS app shipped to the App
            Store.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
            className="mt-4"
          >
            <a
              href="https://www.linkedin.com/in/kmsmohamedansar/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[.82rem] font-mono tracking-wide text-[color:var(--ink-300)] hover:text-cyan transition-colors"
            >
              <Link2 size={13} /> LinkedIn
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 34 }}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
          className="mt-8 md:mt-10"
        >
          <Suspense fallback={<div className="h-[380px] md:h-[460px]" aria-hidden="true" />}>
            <NavCardDeck />
          </Suspense>
        </motion.div>

        <motion.a
          href="#emet"
          aria-label="Scroll to explore"
          className="float-y relative z-10 mt-6 mx-auto w-9 h-9 grid place-items-center rounded-full border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
        >
          <ChevronDown size={16} />
        </motion.a>
      </div>

      {/* infinite stack ticker */}
      <div className="relative z-10 mt-8 overflow-hidden border-y border-white/6 py-3.5">
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
