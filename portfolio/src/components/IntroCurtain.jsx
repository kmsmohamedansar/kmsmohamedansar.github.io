import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_REVEAL } from "../lib/motion";
import { INTRO_SESSION_KEY } from "../lib/intro";

const NAME = "Mohamed Ansar";
// A fast-in, fast-out curve for the curtain itself: it should feel like a
// shutter lifting, not drift.
const CURTAIN_EASE = [0.76, 0, 0.24, 1];

/* A short title card over the page on first load: the name rises letter
   by letter, a hairline draws across, then the curtain lifts. onReveal
   fires as it starts lifting (so the hero can animate in underneath it),
   onGone once it has cleared the screen. Click anywhere to skip. */
export default function IntroCurtain({ onReveal, onGone }) {
  const [lifting, setLifting] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      /* storage unavailable: shouldPlayIntro already handled that case */
    }
    const t = setTimeout(() => setLifting(true), 650);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lifting) onReveal();
  }, [lifting, onReveal]);

  return (
    <motion.div
      aria-hidden="true"
      onClick={() => setLifting(true)}
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={lifting ? { clipPath: "inset(0% 0% 100% 0%)" } : undefined}
      transition={{ duration: 0.42, ease: CURTAIN_EASE }}
      onAnimationComplete={() => lifting && onGone()}
      className="fixed inset-0 z-[400] grid place-items-center bg-ink px-5"
    >
      <div className="text-center">
        <motion.div
          className="overflow-hidden whitespace-nowrap font-condensed uppercase leading-[.95] text-ivory text-[clamp(2.35rem,11vw,11rem)]"
          initial="hidden"
          animate="shown"
          transition={{ staggerChildren: 0.012, delayChildren: 0.03 }}
        >
          {NAME.split("").map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={{ hidden: { y: "110%" }, shown: { y: "0%" } }}
              transition={{ duration: 0.35, ease: EASE_REVEAL }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </motion.div>
        <motion.div
          className="mx-auto mt-5 h-px origin-left bg-coral"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: EASE_REVEAL }}
        />
        <motion.p
          className="mt-4 font-mono text-xs uppercase tracking-[.3em] text-[color:var(--ink-300)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.25 }}
        >
          solutions engineer
        </motion.p>
      </div>
    </motion.div>
  );
}
