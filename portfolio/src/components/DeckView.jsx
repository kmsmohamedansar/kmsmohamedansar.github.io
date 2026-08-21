import { lazy, Suspense } from "react";
import { motion } from "framer-motion";

const NavCardDeck = lazy(() => import("./NavCardDeck"));

/**
 * The landing view: nothing but the five-card deck, filling the
 * screen. No name, no paragraph — identity lives in the nav bar and
 * in the EMET card itself. This is the whole first impression; click
 * a card to go somewhere, there's nothing to scroll past to get here.
 */
export default function DeckView({ ready = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="h-full w-full flex items-center justify-center px-4"
    >
      <Suspense fallback={<div className="w-full h-full" aria-hidden="true" />}>
        <NavCardDeck />
      </Suspense>
    </motion.div>
  );
}
