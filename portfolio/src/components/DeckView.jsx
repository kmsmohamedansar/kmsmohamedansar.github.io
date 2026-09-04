import { motion } from "framer-motion";
import { ArrowRight, Orbit, Terminal } from "lucide-react";
import { CONTACT } from "../data/content";
import { EASE_OUT } from "../lib/motion";

const EASE = EASE_OUT;

// What the five-card deck used to stand in for — one line per
// destination, now a plain link list instead of a clickable object.
// EMET keeps top billing (it's the one thing that isn't also reachable
// by just scrolling down) and its own accent/icon treatment; the rest
// are quieter, text-only rows.
const QUICK_LINKS = [
  { go: "#source", label: "Current work", detail: "Solutions Engineer, Datasembly" },
  { go: "#lineage", label: "Before", detail: "Amazon · Spongelii · Datasembly" },
  { go: "#build", label: "Projects", detail: "RepTrack + 9 more shipped" },
  { go: "#commit", label: "Contact", detail: "Say hello" },
];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  };
}

/**
 * The landing view: a plain-text hero, no 3D card deck. Identity and
 * a one-line pitch up top, then a short set of links into the same
 * sections a visitor would reach by scrolling anyway — this is a
 * shortcut down the page, not a separate destination. EMET is the one
 * exception (its terminal is a distinct view, not a scroll target),
 * so it gets its own line with a small icon instead of blending into
 * the plain list.
 */
export default function DeckView({ ready = true }) {
  return (
    <section
      id="hero"
      data-star-accent="hero"
      className="relative min-h-[100dvh] w-full flex flex-col justify-center px-5 py-28"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <motion.p
          {...fadeUp(0)}
          animate={ready ? fadeUp(0).animate : fadeUp(0).initial}
          className="font-mono text-[.72rem] uppercase tracking-[.2em] text-cyan mb-5"
        >
          Personal portfolio · Solutions Engineer, Remote Canada
        </motion.p>

        <motion.h1
          {...fadeUp(0.08)}
          animate={ready ? fadeUp(0.08).animate : fadeUp(0.08).initial}
          className="font-display text-[clamp(2.6rem,6.4vw,5rem)] font-semibold leading-[1.02] text-[color:var(--ink-50)] max-w-3xl"
        >
          Mohamed Ansar builds the data systems behind the decision.
        </motion.h1>

        <motion.p
          {...fadeUp(0.16)}
          animate={ready ? fadeUp(0.16).animate : fadeUp(0.16).initial}
          className="mt-6 max-w-xl text-[1.05rem] text-[color:var(--ink-400)] leading-relaxed"
        >
          <span className="text-cyan">SQL</span> + <span className="text-violet">Snowflake</span> in
          production — one iOS app <span className="text-amber-deep">shipped solo</span>.
        </motion.p>

        <motion.div
          {...fadeUp(0.24)}
          animate={ready ? fadeUp(0.24).animate : fadeUp(0.24).initial}
          className="mt-8 flex items-center gap-4 sm:gap-7 font-mono text-[.68rem] text-[color:var(--ink-400)]"
        >
          <span>
            <b className="text-white text-sm">6+</b> yrs exp
          </span>
          <span className="w-1 h-1 rounded-full bg-white/25" aria-hidden="true" />
          <span>
            <b className="text-white text-sm">10+</b> shipped
          </span>
          <span className="w-1 h-1 rounded-full bg-white/25" aria-hidden="true" />
          <span>
            <b className="text-white text-sm">1</b> App Store launch
          </span>
        </motion.div>

        <motion.div
          {...fadeUp(0.32)}
          animate={ready ? fadeUp(0.32).animate : fadeUp(0.32).initial}
          className="mt-12 flex flex-wrap items-center gap-3"
        >
          <a
            href="#emet"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink font-bold text-[.85rem] hover:brightness-110 transition-[filter]"
          >
            <Terminal size={15} /> Ask EMET <ArrowRight size={14} />
          </a>
          <a
            href="#build"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/12 text-[color:var(--ink-200)] font-medium text-[.85rem] hover:border-cyan/40 hover:text-cyan transition-colors"
          >
            See what I've built
          </a>
          <a
            href="#explore"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/12 text-[color:var(--ink-200)] font-medium text-[.85rem] hover:border-cyan/40 hover:text-cyan transition-colors"
          >
            <Orbit size={15} /> Explore the solar system
          </a>
        </motion.div>

        <motion.div
          {...fadeUp(0.4)}
          animate={ready ? fadeUp(0.4).animate : fadeUp(0.4).initial}
          className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-white/8 max-w-3xl"
        >
          {QUICK_LINKS.map((link) => (
            <a
              key={link.go}
              href={link.go}
              className="group bg-white/[.02] hover:bg-cyan/[.05] p-5 flex flex-col justify-between transition-colors"
            >
              <span className="font-semibold text-[color:var(--ink-100)] group-hover:text-cyan transition-colors">
                {link.label}
              </span>
              <span className="mt-2 text-[.76rem] text-[color:var(--ink-400)]">{link.detail}</span>
            </a>
          ))}
        </motion.div>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 sm:px-8 py-4 sm:py-5 font-mono text-[.68rem] text-[color:var(--ink-400)]">
        <div>
          <p className="mb-1.5 text-[.62rem] uppercase tracking-[.14em] text-[color:var(--ink-400)]/70">Personal Portfolio</p>
          <div className="flex items-center gap-4">
            <a href={CONTACT.github} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href={CONTACT.linkedin} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              LinkedIn
            </a>
            <a href={`mailto:${CONTACT.email}`} className="hover:text-white transition-colors">
              Email
            </a>
          </div>
        </div>
        <p className="hidden sm:block text-[color:var(--ink-400)]/70">Solutions Engineer · Remote, Canada</p>
      </footer>
    </section>
  );
}
