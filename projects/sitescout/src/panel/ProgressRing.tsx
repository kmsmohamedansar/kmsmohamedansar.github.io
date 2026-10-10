import { motion } from "framer-motion";

export function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="ring" title={`${done} of ${total} done`}>
      <svg viewBox="0 0 36 36" width="44" height="44">
        <circle cx="18" cy="18" r={r} className="ring-track" />
        <motion.circle
          cx="18" cy="18" r={r} className="ring-fill"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </svg>
      <span className="ring-label">{done}/{total}</span>
    </div>
  );
}
