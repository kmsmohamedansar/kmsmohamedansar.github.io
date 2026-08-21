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
      initial={{ opacity: 0, y: 24 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-full w-full flex items-center justify-center px-4"
    >
      <Suspense fallback={<div className="w-full h-full" aria-hidden="true" />}>
        <NavCardDeck />
      </Suspense>
      <footer className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 sm:px-8 py-4 sm:py-5 font-mono text-[.68rem] text-slate-500">
        <div>
          <p className="mb-1.5 text-[.62rem] uppercase tracking-[.14em] text-slate-400">Personal Portfolio</p>
          <div className="flex items-center gap-4">
            <a href={CONTACT.github} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">
              GitHub
            </a>
            <a href={CONTACT.linkedin} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">
              LinkedIn
            </a>
            <a href={`mailto:${CONTACT.email}`} className="hover:text-slate-900 transition-colors">
              Email
            </a>
          </div>
        </div>
        <p className="hidden sm:block text-slate-400">Solutions Engineer · Remote, Canada</p>
      </footer>
    </motion.div>
  );
}
