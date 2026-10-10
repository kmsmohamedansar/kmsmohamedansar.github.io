import { motion } from "framer-motion";

/** Radar mark. The sweep spins faster while a run is going. */
export function Logo({ active }: { active: boolean }) {
  return (
    <div className="logo" aria-hidden>
      <svg viewBox="0 0 40 40" width="36" height="36">
        <defs>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" className="logo-ring" />
        <circle cx="20" cy="20" r="10" className="logo-ring faint" />
        <motion.path
          d="M20 20 L20 3 A17 17 0 0 1 34.7 11.5 Z"
          fill="url(#sweep)"
          style={{ transformBox: "view-box", transformOrigin: "20px 20px" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: "linear", duration: active ? 1.2 : 4 }}
        />
        <motion.circle
          cx="27" cy="13" r="2" className="logo-blip"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
