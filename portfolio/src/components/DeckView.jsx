import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { CONTACT } from "../data/content";

const NavCardDeck = lazy(() => import("./NavCardDeck"));

/**
 * The landing view: nothing but the five-card deck, filling the
 * screen. No name, no paragraph — identity lives in the nav bar and
 * in the EMET card itself. This is the whole first impression; click
 * a card to go somewhere, there's nothing to scroll past to get here.
 * A quiet footer row (the same place a personal site usually keeps
 * its social links) is the one other thing on the page.
 */
export default function DeckView({ ready = true }) {
  return (
    <motion.div
      id="hero"
      data-star-accent="hero"
      initial={{ opacity: 0, y: 24 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      // A definite height, not min-height: NavCardDeck's canvas mount
      // resolves its own height as a percentage of this element, and
      // percentage heights only resolve against an ancestor with a
      // definite (not min/auto) height — min-h-[100dvh] here silently
      // collapsed that canvas to 0px tall. The deck's actual content
      // never exceeds one screen anyway (the pitch text and footer
      // below are absolutely positioned, so they don't add to flow
      // height), so a fixed 100dvh costs nothing.
      className="relative h-[100dvh] w-full flex items-center justify-center px-4"
    >
      <Suspense fallback={<div className="w-full h-full" aria-hidden="true" />}>
        <NavCardDeck />
      </Suspense>
      {/* The deck itself carries no text, so without this a visitor who
          never hovers or clicks a card sees five images and nothing
          else — no name is memorable, but "what does this person
          actually do" should never require a click. Sits in the dead
          space between the card fan and the footer, which is otherwise
          empty on every viewport this was checked against; pointer-events
          stays off so it never competes with the cards for clicks. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        className="pointer-events-none absolute inset-x-0 bottom-16 sm:bottom-16 z-10 flex flex-col items-center gap-1.5 px-6 text-center"
      >
        <p className="font-display text-sm sm:text-lg font-semibold text-white max-w-xs sm:max-w-xl leading-snug">
          <span className="text-cyan">SQL</span> + <span className="text-violet">Snowflake</span> in
          production — one iOS app <span className="text-amber-deep">shipped solo</span>.
        </p>
        <div className="flex items-center gap-4 sm:gap-7 font-mono text-[.64rem] sm:text-[.68rem] text-[color:var(--ink-400)]">
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
        </div>
      </motion.div>
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
    </motion.div>
  );
}
