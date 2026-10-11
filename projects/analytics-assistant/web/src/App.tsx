import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Brain = "rules" | "ai";
type Call = { tool: string; args: unknown; ok: boolean; rows: number; ms: number; result: unknown };
type Chart = { title: string; kind: "bar" | "line" | "pair"; unit: string; rows: { key: string; value: number | null; value2?: number | null }[]; labels?: [string, string] };
type Answer = { question: string; brain: Brain; text: string; chart?: Chart; calls: Call[]; ms: number; model?: string; error?: string };
type Status = { ai: { reachable: boolean; model: string; pulled: boolean; url: string }; metrics: Record<string, { label: string; meaning: string }> };
type Run = {
  summary: { brain: Brain; label: string; model: string | null; ran_at: string; questions: number; correct: number; partial: number; wrong: number; median_ms: number; platform: string };
  results: { id: number; kind: string; question: string; answer: string; error?: string; verdict: "correct" | "partial" | "wrong"; missing: string[]; ms: number; tools: string[] }[];
};

const EXAMPLES = [
  "Which brand had the highest share of sales?",
  "Did Morningfield lose share after its price rise?",
  "Why did Sunny Spoon sales drop in the West?",
  "What changed between Q3 and Q4?",
  "What were the top 3 brands by units in Q3?",
  "What was Crunchwell's average price during its promotion?",
  "Show the weekly sales trend for hot cereal.",
  "What does promo lift mean?",
];

const money = (v: number) => "$" + v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 2 : 0 });
const show = (v: number | null | undefined, unit: string) => (v == null ? "–" : unit === "$" ? money(v) : unit === "%" ? `${v}%` : Math.round(v).toLocaleString("en-US"));

export default function App() {
  const [tab, setTab] = useState<"ask" | "results" | "data">("ask");
  const [brain, setBrain] = useState<Brain>("rules");
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">Fernhill Market · breakfast cereal · made-up data</p>
          <h1>Analytics assistant</h1>
        </div>
        <nav className="tabs" aria-label="Sections">
          {(["ask", "results", "data"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "ask" ? "Ask" : t === "results" ? "Test results" : "The data"}
            </button>
          ))}
        </nav>
      </header>
      {tab === "ask" && <Ask brain={brain} setBrain={setBrain} status={status} />}
      {tab === "results" && <Results />}
      {tab === "data" && <About status={status} />}
    </div>
  );
}

function BrainSwitch({ brain, setBrain, status }: { brain: Brain; setBrain: (b: Brain) => void; status: Status | null }) {
  const ai = status?.ai;
  const aiNote = !ai ? "checking…" : !ai.reachable ? "Ollama not running" : !ai.pulled ? `run: ollama pull ${ai.model}` : ai.model;
  return (
    <div className="switch" role="radiogroup" aria-label="Which brain answers">
      {(["rules", "ai"] as const).map((b) => (
        <button key={b} role="radio" aria-checked={brain === b} className={brain === b ? "on" : ""} onClick={() => setBrain(b)}>
          {brain === b && <motion.span layoutId="pill" className="pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="label">{b === "rules" ? "Brain A · Rules" : "Brain B · Local AI"}</span>
          <span className="sub">
            {b === "rules" ? "fixed rules, no model" : <><i className={`dot ${ai?.reachable && ai.pulled ? "ok" : "off"}`} />{aiNote}</>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Ask({ brain, setBrain, status }: { brain: Brain; setBrain: (b: Brain) => void; status: Status | null }) {
  const [q, setQ] = useState(EXAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  async function ask(question = q) {
    setQ(question);
    setBusy(true);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, brain }) });
      setAnswer(await r.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ask">
      <BrainSwitch brain={brain} setBrain={setBrain} status={status} />
      <form className="qbox" onSubmit={(e) => (e.preventDefault(), ask())}>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Your question" placeholder="Ask about sales, share, prices or promotions" />
        <button disabled={busy}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      <div className="chips">
        {EXAMPLES.map((x) => (
          <button key={x} onClick={() => ask(x)} disabled={busy}>{x}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {answer && (
          <motion.section key={answer.question + answer.brain + answer.ms} className="answer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="meta">
              <span className={`badge ${answer.brain}`}>{answer.brain === "rules" ? "Brain A · Rules" : `Brain B · ${answer.model}`}</span>
              <span>{answer.calls.length} tool call{answer.calls.length === 1 ? "" : "s"}</span>
              <span>{answer.ms.toLocaleString()} ms</span>
            </div>
            {answer.error ? <p className="error">{answer.error}</p> : <p className="text">{answer.text}</p>}
            {answer.chart && <ChartView chart={answer.chart} />}
            <ToolLog calls={answer.calls} />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

function ChartView({ chart }: { chart: Chart }) {
  if (chart.kind === "line") {
    const vals = chart.rows.map((r) => r.value ?? 0);
    const max = Math.max(...vals), min = Math.min(...vals);
    const W = 640, H = 160, pad = 8;
    const pts = vals.map((v, i) => `${pad + (i / Math.max(1, vals.length - 1)) * (W - 2 * pad)},${H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad)}`);
    return (
      <figure className="chart">
        <figcaption>{chart.title} · weeks {chart.rows[0].key}–{chart.rows.at(-1)!.key}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title}>
          <motion.polyline points={pts.join(" ")} fill="none" stroke="var(--cyan)" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
        </svg>
        <div className="axis"><span>{show(min, chart.unit)}</span><span>{show(max, chart.unit)}</span></div>
      </figure>
    );
  }
  const max = Math.max(...chart.rows.flatMap((r) => [Math.abs(r.value ?? 0), Math.abs(r.value2 ?? 0)]), 1);
  return (
    <figure className="chart">
      <figcaption>
        {chart.title}
        {chart.labels && (
          <span className="legend"><i className="a" />{chart.labels[0]} <i className="b" />{chart.labels[1]}</span>
        )}
      </figcaption>
      {chart.rows.map((r, i) => (
        <div className="bar-row" key={r.key}>
          <span className="k">{r.key}</span>
          <div className="bars">
            <motion.div className="bar a" initial={{ width: 0 }} animate={{ width: `${(100 * Math.abs(r.value ?? 0)) / max}%` }} transition={{ delay: i * 0.04, duration: 0.6 }} />
            {chart.kind === "pair" && <motion.div className="bar b" initial={{ width: 0 }} animate={{ width: `${(100 * Math.abs(r.value2 ?? 0)) / max}%` }} transition={{ delay: i * 0.04 + 0.1, duration: 0.6 }} />}
          </div>
          <span className="v">{show(r.value, chart.unit)}{chart.kind === "pair" && <> → {show(r.value2, chart.unit)}</>}</span>
        </div>
      ))}
    </figure>
  );
}

function ToolLog({ calls }: { calls: Call[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!calls.length) return null;
  return (
    <div className="calls">
      <h3>What ran behind this answer</h3>
      <ol>
        {calls.map((c, i) => (
          <li key={i} className={c.ok ? "" : "bad"}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <code className="tool">{c.tool}</code>
              <code className="args">{JSON.stringify(c.args)}</code>
              <span className="n">{c.ok ? `${c.rows} row${c.rows === 1 ? "" : "s"}` : "error"} · {c.ms} ms</span>
            </button>
            {open === i && <pre>{JSON.stringify(c.result, null, 2)}</pre>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Results() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [holdout, setHoldout] = useState<Run[]>([]);
  useEffect(() => {
    fetch("/api/results").then((r) => r.json()).then((d) => (setRuns(d.runs), setHoldout(d.holdout ?? []))).catch(() => {});
  }, []);
  if (!runs.length) return <main className="results"><p>No test runs yet. Run <code>npm run eval -- rules</code>.</p></main>;
  const qs = runs[0].results;
  const name = (r: Run) => `${r.summary.brain === "rules" ? "Brain A" : "Brain B"} ${r.summary.label.replace(/^qwen2\.5-7b-?/, "") || "v1"}${r.summary.model ? ` · ${r.summary.model}` : ""}`;
  const card = (r: Run) => (
    <div className={`score ${r.summary.brain}`} key={name(r)}>
      <h3>{name(r)}</h3>
      <div className="stack" aria-label={`${r.summary.correct} correct, ${r.summary.partial} partly, ${r.summary.wrong} wrong`}>
        <span className="c" style={{ flex: r.summary.correct }} />
        <span className="p" style={{ flex: r.summary.partial }} />
        <span className="w" style={{ flex: r.summary.wrong }} />
      </div>
      <p><b>{r.summary.correct}</b> correct · <b>{r.summary.partial}</b> partly · <b>{r.summary.wrong}</b> wrong</p>
      <p className="small">median {r.summary.median_ms < 1000 ? `${r.summary.median_ms} ms` : `${(r.summary.median_ms / 1000).toFixed(1)} s`} per question · {r.summary.platform}</p>
    </div>
  );
  return (
    <main className="results">
      <p className="lead">The same 30 questions, each with a known answer, put to each brain. Every number here comes from a saved test run in <code>eval/results</code>.</p>
      <div className="scores">{runs.map(card)}</div>
      {holdout.length > 0 && (
        <>
          <h2>Held-out check</h2>
          <p className="lead">Ten more questions, written after the fixes, in new wording. They show whether the fixes were general or tuned to the 30.</p>
          <div className="scores">{holdout.map(card)}</div>
        </>
      )}
      <h2>Question by question</h2>
      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr><th>#</th><th>Question</th>{runs.map((r) => <th key={name(r)}>{name(r)}</th>)}</tr>
          </thead>
          <tbody>
            {qs.map((q) => (
              <tr key={q.id}>
                <td>{q.id}</td>
                <td>{q.question}</td>
                {runs.map((r) => {
                  const x = r.results.find((y) => y.id === q.id);
                  return <td key={name(r)} className={x?.verdict} title={x?.error ?? x?.answer}>{x ? { correct: "✔", partial: "~", wrong: "✘" }[x.verdict] : ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function About({ status }: { status: Status | null }) {
  const [planted, setPlanted] = useState<string[] | null>(null);
  return (
    <main className="about">
      <p className="lead">One year (52 weeks of 2025) of weekly breakfast cereal sales for Fernhill Market, a made-up grocer, across four regions. Six brands, sixteen products, all invented. The numbers are generated by code with a fixed seed, so every run gets the same data.</p>
      <h2>Each number, defined once</h2>
      <dl className="metrics">
        {status && Object.entries(status.metrics).map(([k, m]) => (
          <div key={k}><dt>{m.label}</dt><dd>{m.meaning}</dd></div>
        ))}
      </dl>
      <h2>The planted surprises</h2>
      <p>Five things were put into the data on purpose, so the tests know the true answers.</p>
      {planted ? (
        <ul className="planted">{planted.map((p) => <li key={p}>{p}</li>)}</ul>
      ) : (
        <button className="reveal" onClick={() => fetch("/api/about").then((r) => r.json()).then((d) => setPlanted(d.planted))}>Show them (spoilers)</button>
      )}
    </main>
  );
}
