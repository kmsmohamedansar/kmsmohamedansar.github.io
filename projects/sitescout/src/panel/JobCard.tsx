import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { yahooFinanceQuote } from "../recipes/yahooFinanceQuote";
import { fmtNumber, fmtValue } from "../lib/format";
import { CountUp } from "./CountUp";
import type { Job } from "./types";

const parseOf = new Map(yahooFinanceQuote.fields.map((f) => [f.key, f.parse]));
const HEADLINE = new Set(["name", "price", "change", "changePct"]);

const statusText: Record<Job["status"], string> = {
  queued: "Queued",
  running: "Scouting",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
};

export function JobCard({ job, index }: { job: Job; index: number }) {
  const [showHow, setShowHow] = useState(false);
  const fields = job.result?.fields ?? [];
  const get = (k: string) => fields.find((f) => f.key === k)?.value ?? null;
  const price = get("price");
  const change = get("change");
  const pct = get("changePct");
  const up = typeof change === "number" ? change >= 0 : null;
  const stats = fields.filter((f) => !HEADLINE.has(f.key));

  return (
    <motion.article
      layout
      className={`card status-${job.status}`}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={
        job.status === "failed"
          ? { opacity: 1, y: 0, scale: 1, x: [0, -6, 6, -4, 4, 0] }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.04 }}
    >
      {job.status === "running" && <div className="scanline" aria-hidden />}

      <header className="card-head">
        <div>
          <div className="symbol">{job.symbol}</div>
          <div className="company">{(get("name") as string) ?? job.url.replace("https://", "")}</div>
        </div>
        <motion.span layout className={`pill pill-${job.status}`}>
          {job.status === "running" && <span className="pulse-dot" />}
          {statusText[job.status]}
        </motion.span>
      </header>

      <AnimatePresence mode="wait">
        {job.status === "running" && (
          <motion.div key="stage" className="stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.span key={job.stage} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {job.stage ?? "Starting"}
            </motion.span>
            <div className="skeleton-row"><span /><span /><span /></div>
          </motion.div>
        )}

        {job.status === "done" && typeof price === "number" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="price-row">
              <span className="price"><CountUp value={price} format={(n) => fmtNumber(n)} /></span>
              {up !== null && (
                <motion.span
                  className={`delta ${up ? "up" : "down"}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {up ? "▲" : "▼"} {fmtNumber(Math.abs(change as number))}
                  {typeof pct === "number" && ` (${fmtValue(pct, "percent")})`}
                </motion.span>
              )}
            </div>
            <motion.dl
              className="stats"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.3 } } }}
            >
              {stats.map((f) => (
                <motion.div
                  key={f.key}
                  className={`stat ${f.value === null ? "stat-missing" : ""}`}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  title={f.via ? `Found via ${f.via}` : "Not found on the page"}
                >
                  <dt>{f.label}</dt>
                  <dd>{fmtValue(f.value, parseOf.get(f.key) ?? "text")}</dd>
                </motion.div>
              ))}
            </motion.dl>
            <button className="link-btn" onClick={() => setShowHow((s) => !s)}>
              {showHow ? "Hide" : "Show"} how each value was found
            </button>
            <AnimatePresence>
              {showHow && (
                <motion.ul className="how" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  {fields.map((f) => (
                    <li key={f.key}><b>{f.label}</b> <code>{f.via ?? "not found"}</code></li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {job.status === "failed" && (
          <motion.div key="failed" className="failure" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <p className="failure-msg">{job.error}</p>
            {job.result && job.result.missing.length > 0 && (
              <p>Could not find: {job.result.missing.join(", ")}</p>
            )}
            {job.hint && <p className="hint">{job.hint}</p>}
          </motion.div>
        )}

        {job.status === "stopped" && (
          <motion.p key="stopped" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Not run. You stopped before this one.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
