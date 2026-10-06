import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plug, ListChecks, Search, LayoutDashboard, MessageSquare, Lock, ExternalLink, ArrowDown } from "lucide-react";
import { Reveal, SectionHead, TagPill, DetailToggle, ExpandablePanel } from "./ContentSections";
import {
  CURSOR_FILTERS,
  CURSOR_INTRO,
  AGENT_STACK_DIAGRAM,
  CASE_STUDIES,
  ADJACENT_WORK,
  DEMO_REPOS,
} from "../data/cursorWork";
import { EASE_OUT } from "../lib/motion";

const ICONS = {
  plug: Plug,
  check: ListChecks,
  search: Search,
  layout: LayoutDashboard,
  message: MessageSquare,
};

const TONES = {
  cyan: "border-cyan/40 text-cyan bg-cyan/5",
  violet: "border-violet/40 text-violet bg-violet/5",
  green: "border-green/40 text-green bg-green/5",
  amber: "border-amber/40 text-amber bg-amber/5",
};

const EDGE_COLOR = "rgba(194,206,226,0.45)";

/* Data-driven flow diagram. Columns read left to right on wide screens;
   edges are drawn as an SVG overlay between measured node positions.
   On narrow screens the columns stack and the overlay is dropped in
   favour of down-arrows, since a tangle of cross-column curves doesn't
   survive a phone width. All labels come from the spec, which is
   generic by design. */
function FlowDiagram({ spec }) {
  const wrapRef = useRef(null);
  const nodeRefs = useRef({});
  const [paths, setPaths] = useState([]);
  const [wide, setWide] = useState(true);

  const edges = useMemo(() => spec.edges, [spec]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    function measure() {
      const isWide = wrap.clientWidth >= 640;
      setWide(isWide);
      if (!isWide) {
        setPaths([]);
        return;
      }
      const base = wrap.getBoundingClientRect();
      const next = [];
      for (const [from, to] of edges) {
        const a = nodeRefs.current[from]?.getBoundingClientRect();
        const b = nodeRefs.current[to]?.getBoundingClientRect();
        if (!a || !b) continue;
        const x1 = a.right - base.left;
        const y1 = a.top + a.height / 2 - base.top;
        const x2 = b.left - base.left;
        const y2 = b.top + b.height / 2 - base.top;
        const mx = (x1 + x2) / 2;
        next.push(`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}`);
      }
      setPaths(next);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [edges]);

  return (
    <figure className="my-6">
      <div ref={wrapRef} className="relative rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
        {wide && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <defs>
              <marker id="flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill={EDGE_COLOR} />
              </marker>
            </defs>
            {paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={EDGE_COLOR} strokeWidth="1.3" markerEnd="url(#flow-arrow)" />
            ))}
          </svg>
        )}
        <div className="relative flex flex-col sm:flex-row sm:justify-between gap-5 sm:gap-6">
          {spec.columns.map((col, ci) => (
            <div key={col.label} className="flex flex-col gap-2.5 sm:flex-1 sm:justify-center">
              <span className="font-mono text-[.58rem] uppercase tracking-[.16em] text-[color:var(--ink-400)] text-center">
                {col.label}
              </span>
              {col.nodes.map((n) => (
                <div
                  key={n.id}
                  ref={(el) => {
                    nodeRefs.current[n.id] = el;
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-center font-mono text-[.7rem] leading-snug ${TONES[n.tone] || TONES.cyan}`}
                >
                  {n.text}
                </div>
              ))}
              {!wide && ci < spec.columns.length - 1 && (
                <ArrowDown size={16} className="self-center text-[color:var(--ink-400)]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
      {spec.caption && (
        <figcaption className="mt-2 font-mono text-[.62rem] uppercase tracking-[.1em] text-[color:var(--ink-400)]">
          {spec.caption}
        </figcaption>
      )}
    </figure>
  );
}

function Block({ label, children }) {
  return (
    <div className="mb-6">
      <h5 className="font-mono text-[.66rem] uppercase tracking-[.14em] text-cyan mb-2">{label}</h5>
      {children}
    </div>
  );
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[.92rem] leading-relaxed text-[color:var(--ink-300)]">
          <span className="mt-2 w-1 h-1 rounded-full bg-cyan/70 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function CaseStudyCard({ study, open, onToggle }) {
  const Icon = ICONS[study.icon] || Plug;
  return (
    <Reveal>
      <article
        id={`cs-${study.id}`}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 scroll-mt-24"
      >
        <header className="flex items-start gap-4">
          <span className="grid place-items-center w-10 h-10 rounded-lg border border-white/10 text-cyan shrink-0">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-green">{study.status}</span>
            <h3 className="font-display text-[1.35rem] sm:text-[1.6rem] font-semibold text-[color:var(--ink-50)] leading-tight mt-1">
              {study.title}
            </h3>
          </div>
        </header>
        <p className="mt-4 text-[.98rem] leading-relaxed text-[color:var(--ink-300)]">{study.hook}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {study.tags.map((t) => (
            <TagPill key={t}>{t}</TagPill>
          ))}
        </div>
        <div className="mt-5">
          <DetailToggle expanded={open} onToggle={onToggle} labelShow="Read case study" labelHide="Hide case study" />
        </div>
        <ExpandablePanel expanded={open}>
          <div className="pt-7">
            <Block label="Problem">
              <p className="text-[.92rem] leading-relaxed text-[color:var(--ink-300)]">{study.problem}</p>
            </Block>
            <Block label="Approach">
              <Bullets items={study.approach} />
            </Block>
            <FlowDiagram spec={study.diagram} />
            <Block label="Outcome">
              <p className="text-[.92rem] leading-relaxed text-[color:var(--ink-300)]">{study.outcome}</p>
            </Block>
            {study.module && (
              <Block label={study.module.title}>
                <p className="text-[.92rem] leading-relaxed text-[color:var(--ink-300)]">{study.module.body}</p>
              </Block>
            )}
            <Block label="Built with Cursor">
              <Bullets items={study.builtWithCursor} />
            </Block>
            <Block label="Stack">
              <div className="flex flex-wrap gap-2">
                {study.stack.map((t) => (
                  <TagPill key={t}>{t}</TagPill>
                ))}
              </div>
            </Block>
            <p className="flex items-center gap-2 font-mono text-[.68rem] uppercase tracking-[.1em] text-[color:var(--ink-400)]">
              <Lock size={12} /> {study.link.label}
            </p>
          </div>
        </ExpandablePanel>
      </article>
    </Reveal>
  );
}

export function CursorWorkSection() {
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [intro, setIntro] = useState(true);

  const visible = CASE_STUDIES.filter((s) => filter === "All" || s.tags.includes(filter));
  const primary = visible.filter((s) => s.primary);
  const secondary = visible.filter((s) => !s.primary);

  return (
    <section id="cursor" data-star-accent="build" className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-14">
      <div className="w-full max-w-[1180px]">
        <SectionHead
          step="03b"
          kicker={CURSOR_INTRO.kicker}
          title={CURSOR_INTRO.title}
          lede={CURSOR_INTRO.lede}
        />

        <Reveal>
          <DetailToggle
            expanded={intro}
            onToggle={() => setIntro((v) => !v)}
            labelShow="How I work with agents"
            labelHide="Hide how I work with agents"
          />
        </Reveal>
        <ExpandablePanel expanded={intro}>
          <div className="pt-6 max-w-3xl">
            {CURSOR_INTRO.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mb-4 text-[.98rem] leading-relaxed text-[color:var(--ink-300)]">
                {p}
              </p>
            ))}
          </div>
          <FlowDiagram spec={AGENT_STACK_DIAGRAM} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {CURSOR_INTRO.integrations.map((i) => (
              <div key={i.name} className="rounded-lg border border-white/10 p-4">
                <h4 className="font-display font-semibold text-[color:var(--ink-100)] text-[.95rem]">{i.name}</h4>
                <p className="mt-1 text-[.82rem] leading-relaxed text-[color:var(--ink-400)]">{i.note}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-5 mb-2">
            {CURSOR_INTRO.skills.map((s) => (
              <TagPill key={s}>{s}</TagPill>
            ))}
          </div>
        </ExpandablePanel>

        <div className="mt-12 mb-8 flex flex-wrap gap-2.5" role="group" aria-label="Filter case studies">
          {CURSOR_FILTERS.map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.96 }}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3.5 py-1.5 rounded-full border font-mono text-[.68rem] uppercase tracking-[.12em] transition-colors ${
                filter === f
                  ? "border-cyan/60 text-cyan bg-cyan/10"
                  : "border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40"
              }`}
            >
              {f}
            </motion.button>
          ))}
        </div>

        <div className="grid gap-6">
          {primary.map((s) => (
            <CaseStudyCard
              key={s.id}
              study={s}
              open={openId === s.id}
              onToggle={() => setOpenId((cur) => (cur === s.id ? null : s.id))}
            />
          ))}
          {secondary.map((s) => (
            <CaseStudyCard
              key={s.id}
              study={s}
              open={openId === s.id}
              onToggle={() => setOpenId((cur) => (cur === s.id ? null : s.id))}
            />
          ))}
          {visible.length === 0 && (
            <p className="font-mono text-[.8rem] text-[color:var(--ink-400)]">Nothing under this filter yet.</p>
          )}
        </div>

        <Reveal className="mt-16">
          <h3 className="font-display text-[1.4rem] font-semibold text-[color:var(--ink-50)] mb-2">Public demo repos</h3>
          <p className="text-[.92rem] text-[color:var(--ink-400)] mb-5 max-w-2xl">
            Small, synthetic-data versions of the patterns above, so there is something you can actually read and run.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {DEMO_REPOS.map((r) => (
              <a
                key={r.name}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-white/10 p-5 hover:border-cyan/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-mono text-[.9rem] text-[color:var(--ink-100)] group-hover:text-cyan transition-colors">
                    {r.name}
                  </h4>
                  <ExternalLink size={14} className="text-[color:var(--ink-400)] group-hover:text-cyan" />
                </div>
                <p className="mt-2 text-[.85rem] leading-relaxed text-[color:var(--ink-400)]">{r.blurb}</p>
                <div className="flex gap-2 mt-3">
                  {r.tags.map((t) => (
                    <TagPill key={t}>{t}</TagPill>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-16">
          <h3 className="font-display text-[1.4rem] font-semibold text-[color:var(--ink-50)] mb-2">
            Adjacent platform work (private repos)
          </h3>
          <p className="text-[.92rem] text-[color:var(--ink-400)] mb-4 max-w-2xl">
            Shorter notes on team projects I've worked in. Nothing here links to private code.
          </p>
          <div>
            {ADJACENT_WORK.map((w, i) => (
              <motion.div
                key={w.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: EASE_OUT }}
                className="py-4 border-b border-white/8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-display font-semibold text-[color:var(--ink-100)]">{w.title}</h4>
                  <span className="font-mono text-[.6rem] uppercase tracking-wide text-[color:var(--ink-400)]">
                    {w.tags.join(" · ")}
                  </span>
                </div>
                <p className="mt-1 text-[.86rem] leading-relaxed text-[color:var(--ink-400)]">
                  {w.problem} {w.role}
                </p>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
