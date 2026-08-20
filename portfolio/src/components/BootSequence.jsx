import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BOOT_LINES = [
  { text: "BOOT ROM v4.2.1", pad: 34, status: "OK" },
  { text: "Initializing mohamed.sys", pad: 34, status: "OK" },
  { text: "Mounting /now", pad: 34, status: "OK" },
  { text: "Mounting /before", pad: 34, status: "OK" },
  { text: "Mounting /build", pad: 34, status: "OK" },
  { text: "Compiling 6 years of experience", pad: 34, status: "OK" },
  { text: "Checking for a shipped iOS app", pad: 34, status: "FOUND" },
  { text: "Establishing uplink to emet", pad: 34, status: "OK" },
  { text: "Verifying signature: M. ANSAR", pad: 34, status: "OK" },
];

function BootLine({ line, onDone }) {
  const dots = ".".repeat(Math.max(2, line.pad - line.text.length));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onAnimationComplete={onDone}
      className="whitespace-pre"
    >
      <span className="text-cyan/70">{line.text}</span>
      <span className="opacity-30">{dots}</span>
      <span className={line.status === "FOUND" ? "text-amber" : "text-green"}>{line.status}</span>
    </motion.div>
  );
}

/**
 * A one-time "system boot" curtain shown before the real site mounts —
 * a fake POST log for mohamed.sys that doubles as a compressed pitch
 * (6 years, shipped iOS app) delivered in the site's own EMET/CRT
 * voice before the visitor sees a single pixel of the hero. Shown
 * once per tab (sessionStorage), skippable on any key/click/tap, and
 * skipped entirely for prefers-reduced-motion.
 */
export default function BootSequence({ onDone }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (prefersReducedMotion()) return false;
    try {
      return !sessionStorage.getItem("ma-booted");
    } catch {
      return false;
    }
  });
  const [lineIndex, setLineIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      sessionStorage.setItem("ma-booted", "1");
    } catch {
      // Non-fatal — boot sequence just replays next tab.
    }
    setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 420);
  }

  useEffect(() => {
    if (!visible) {
      onDone?.();
      return;
    }
    const interval = setInterval(() => {
      setLineIndex((i) => {
        if (i >= BOOT_LINES.length - 1) {
          clearInterval(interval);
          setTimeout(finish, 420);
        }
        return i + 1;
      });
    }, 95);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function skip() {
      finish();
    }
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!finishing ? (
        <motion.div
          key="boot"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] bg-black flex items-center justify-center px-6"
        >
          <div className="w-full max-w-lg font-mono text-[.78rem] leading-[1.9]">
            {BOOT_LINES.slice(0, lineIndex).map((line, i) => (
              <BootLine key={line.text} line={line} onDone={() => {}} />
            ))}
            {lineIndex >= BOOT_LINES.length && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mt-4 text-cyan text-glow-cyan font-bold tracking-[.08em]"
              >
                ALL SYSTEMS NOMINAL. WELCOME.
              </motion.p>
            )}
            <span className="inline-block w-[7px] h-[1em] bg-cyan align-text-bottom blink-cursor ml-0.5" />
          </div>
          <button
            onClick={finish}
            className="absolute bottom-6 right-6 font-mono text-[.62rem] uppercase tracking-[.14em] text-slate-500 hover:text-cyan transition-colors"
          >
            skip →
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="flash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[1000] bg-black pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
