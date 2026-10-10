import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { parseInput } from "../lib/input";
import { toCsv } from "../lib/csv";
import { yahooFinanceQuote } from "../recipes/yahooFinanceQuote";
import { RunError, scrapePage, sleep } from "../scrape/runner";
import { JobCard } from "./JobCard";
import { Logo } from "./Logo";
import { ProgressRing } from "./ProgressRing";
import type { Job } from "./types";

/** Pause between pages so we read at a human pace. */
const POLITE_DELAY_MS = 1500;

export default function App() {
  const [text, setText] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const parsed = useMemo(() => parseInput(text), [text]);
  const finished = jobs.filter((j) => j.status === "done" || j.status === "failed").length;
  const done = jobs.filter((j) => j.status === "done" && j.result);

  const patch = (id: string, p: Partial<Job>) =>
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));

  async function run() {
    if (!parsed.targets.length || running) return;
    const batch: Job[] = parsed.targets.map((t, i) => ({
      id: `${Date.now()}-${i}`,
      symbol: t.symbol,
      url: t.url,
      status: "queued",
    }));
    setJobs(batch);
    setRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    for (let i = 0; i < batch.length; i++) {
      const job = batch[i];
      if (ctrl.signal.aborted) break;
      patch(job.id, { status: "running", stage: "Opening page" });
      try {
        const result = await scrapePage(job.url, yahooFinanceQuote, {
          signal: ctrl.signal,
          onStage: (stage) => patch(job.id, { stage }),
        });
        patch(job.id, result.ok
          ? { status: "done", result }
          : { status: "failed", result, error: "Some required numbers were missing", hint: "Yahoo may have changed its page. The recipe needs a repair." });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          patch(job.id, { status: "stopped" });
          break;
        }
        patch(job.id, {
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
          hint: e instanceof RunError ? e.hint : undefined,
        });
      }
      if (i < batch.length - 1) {
        try { await sleep(POLITE_DELAY_MS, ctrl.signal); } catch { break; }
      }
    }

    // Anything never reached is marked stopped, so the list is honest.
    setJobs((js) => js.map((j) => (j.status === "queued" || j.status === "running" ? { ...j, status: "stopped" } : j)));
    setRunning(false);
    abortRef.current = null;
  }

  function exportCsv() {
    const csv = toCsv(done.map((j) => ({ symbol: j.symbol, result: j.result! })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitescout-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <div className="bg-orbs" aria-hidden><span /><span /><span /></div>

      <header className="top">
        <Logo active={running} />
        <div>
          <h1>Sitescout</h1>
          <p className="tagline">Paste a link or tickers. Get the numbers.</p>
        </div>
        {jobs.length > 0 && <ProgressRing done={finished} total={jobs.length} />}
      </header>

      <motion.section className="composer" layout>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
          placeholder={"AAPL, MSFT, NVDA\nor https://finance.yahoo.com/quote/TSLA/"}
          rows={3}
          disabled={running}
          spellCheck={false}
        />
        <div className="chips">
          <AnimatePresence>
            {parsed.targets.map((t) => (
              <motion.span key={t.symbol} className="chip" layout
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                {t.symbol}
              </motion.span>
            ))}
            {parsed.rejected.map((r) => (
              <motion.span key={`x-${r.input}`} className="chip chip-bad" title={r.reason} layout
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                {r.input.length > 18 ? r.input.slice(0, 18) + "…" : r.input} ✕
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="actions">
          <AnimatePresence mode="wait" initial={false}>
            {running ? (
              <motion.button key="stop" className="btn btn-stop" onClick={() => abortRef.current?.abort()}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} whileTap={{ scale: 0.96 }}>
                Stop and keep results
              </motion.button>
            ) : (
              <motion.button key="go" className="btn btn-go" onClick={run} disabled={!parsed.targets.length}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                Scout {parsed.targets.length > 0 ? `${parsed.targets.length} ${parsed.targets.length === 1 ? "page" : "pages"}` : ""}
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button className="btn btn-ghost" onClick={exportCsv} disabled={!done.length}
            whileTap={{ scale: 0.96 }} animate={{ opacity: done.length ? 1 : 0.5 }}>
            Export CSV
          </motion.button>
        </div>
      </motion.section>

      <section className="results">
        <AnimatePresence mode="popLayout">
          {jobs.length === 0 ? (
            <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p>Nothing scouted yet.</p>
              <p className="muted">Each page opens in a background tab, gets read, then closes.</p>
            </motion.div>
          ) : (
            jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} />)
          )}
        </AnimatePresence>
      </section>

      <footer className="foot">Personal demo. Not affiliated with Yahoo. Reads public pages, one at a time.</footer>
    </div>
  );
}
