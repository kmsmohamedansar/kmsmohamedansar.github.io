import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { EASE_REVEAL } from "../lib/motion";
import { ACCENTS } from "../data/projects";

export function Reveal({ children, className = "", delay = 0, y = 24 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: EASE_REVEAL }}
    >
      {children}
    </motion.div>
  );
}

/* The small "‹ LABEL ›" tag that opens every section. One size
   everywhere. */
export function Kicker({ children, accent = "cyan", className = "" }) {
  const a = ACCENTS[accent];
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[.18em] ${a.text} ${className}`}>
      <span aria-hidden="true">‹</span>
      {children}
      <span aria-hidden="true">›</span>
    </span>
  );
}

export function SectionHead({ kicker, title, lede, accent = "cyan", align = "left" }) {
  const center = align === "center";
  return (
    <Reveal className={`max-w-3xl mb-10 sm:mb-14 ${center ? "mx-auto text-center" : ""}`}>
      <Kicker accent={accent}>{kicker}</Kicker>
      <h2 className="mt-4 font-condensed uppercase text-white leading-[.92] text-[clamp(2.6rem,7vw,5.6rem)]">{title}</h2>
      {lede && <p className={`mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-[color:var(--ink-200)] ${center ? "mx-auto" : ""}`}>{lede}</p>}
    </Reveal>
  );
}

/* A project name set the editorial way: the first letter in the italic
   serif, in the project's accent, the rest in condensed caps. The
   heading that wraps it should carry aria-label={text}. */
export function FlourishTitle({ text, accent }) {
  const a = ACCENTS[accent];
  return (
    <span aria-hidden="true">
      <span className={`font-serif italic font-normal normal-case text-[1.12em] leading-none pr-[.04em] ${a.text}`}>{text[0]}</span>
      <span className="font-condensed uppercase">{text.slice(1)}</span>
    </span>
  );
}

export function TagPill({ children, accent }) {
  const a = accent ? ACCENTS[accent] : null;
  return (
    <span
      className={`font-mono text-micro uppercase tracking-wide px-2.5 py-1 rounded-full border ${
        a ? `${a.border} ${a.text} ${a.soft}` : "border-white/15 text-[color:var(--ink-200)] bg-white/[.04]"
      }`}
    >
      {children}
    </span>
  );
}

/* A circular badge with its label set around the rim; spins slowly while
   its parent .group is hovered or focused (paused for reduced motion). */
export function SpinBadge({ label, accent }) {
  const a = ACCENTS[accent];
  const id = `badge-${label.replace(/\W+/g, "-").toLowerCase()}-${accent}`;
  const ring = `${label} · ${label} · `.toUpperCase();
  return (
    <span className={`relative grid h-24 w-24 shrink-0 place-items-center ${a.text}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="badge-spin absolute inset-0 h-full w-full">
        <defs>
          <path id={id} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeOpacity=".35" />
        <text className="font-mono" fontSize="8.6" letterSpacing="2.2" fill="currentColor">
          <textPath href={`#${id}`}>{ring}</textPath>
        </text>
      </svg>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-current transition-transform duration-200 ease-out group-hover:scale-110 group-focus-visible:scale-110">
        <ArrowUpRight size={18} className="text-[#050911]" />
      </span>
    </span>
  );
}

const TONE_ORDER = ["cyan", "violet", "green", "amber"];
const TONE_CLASS = {
  cyan: "border-cyan/50 text-cyan bg-[#04222b]",
  violet: "border-[#b9a8ff]/50 text-[#d2c8ff] bg-[#1a1535]",
  green: "border-green/50 text-green bg-[#06261c]",
  amber: "border-amber/50 text-amber bg-[#2b2106]",
};

/* Flow diagram drawn from a plain description:
     { columns: [{ label, nodes: ["text" | { text, tone }] }], links?: ["0.0>1.1"] }
   With no `links`, every box connects to every box in the next column.
   Wide screens draw curved arrows between measured boxes; narrow ones
   stack the columns and drop the arrows for simple down chevrons. */
export default function FlowDiagram({ spec, compact = false }) {
  const wrapRef = useRef(null);
  const nodeRefs = useRef({});
  const [paths, setPaths] = useState([]);
  const [wide, setWide] = useState(true);

  const columns = spec.columns;
  const edges = useMemo(() => {
    if (spec.links) return spec.links.map((s) => s.split(">"));
    const out = [];
    for (let c = 0; c < columns.length - 1; c++) {
      columns[c].nodes.forEach((_, i) => columns[c + 1].nodes.forEach((__, j) => out.push([`${c}.${i}`, `${c + 1}.${j}`])));
    }
    return out;
  }, [spec, columns]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    function measure() {
      const isWide = wrap.clientWidth >= 620;
      setWide(isWide);
      if (!isWide) return setPaths([]);
      const base = wrap.getBoundingClientRect();
      const next = [];
      for (const [from, to] of edges) {
        const a = nodeRefs.current[from]?.getBoundingClientRect();
        const b = nodeRefs.current[to]?.getBoundingClientRect();
        if (!a || !b) continue;
        const backwards = b.left < a.right;
        const x1 = backwards ? a.left + a.width / 2 - base.left : a.right - base.left;
        const y1 = backwards ? a.top - base.top : a.top + a.height / 2 - base.top;
        const x2 = backwards ? b.left + b.width / 2 - base.left : b.left - base.left - 6;
        const y2 = backwards ? b.top - base.top : b.top + b.height / 2 - base.top;
        const mx = (x1 + x2) / 2;
        next.push(backwards ? `M${x1},${y1} C${x1},${y1 - 34} ${x2},${y2 - 34} ${x2},${y2}` : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      }
      setPaths(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [edges]);

  return (
    <figure className={compact ? "" : "my-2"}>
      <div ref={wrapRef} className="relative rounded-xl border border-white/12 bg-[#050911]/85 p-4 sm:p-5">
        {wide && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <defs>
              <marker id="flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="rgba(226,232,240,0.7)" />
              </marker>
            </defs>
            {paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(226,232,240,0.55)" strokeWidth="1.4" markerEnd="url(#flow-arrow)" />
            ))}
          </svg>
        )}
        <div className="relative flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-5">
          {columns.map((col, ci) => (
            <div key={col.label} className="flex flex-col gap-2.5 sm:flex-1 sm:justify-center">
              <span className="font-mono text-[.58rem] uppercase tracking-[.16em] text-[color:var(--ink-300)] text-center">{col.label}</span>
              {col.nodes.map((n, ni) => {
                const node = typeof n === "string" ? { text: n } : n;
                const tone = node.tone || TONE_ORDER[ci % TONE_ORDER.length];
                return (
                  <div
                    key={ni}
                    ref={(el) => {
                      nodeRefs.current[`${ci}.${ni}`] = el;
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-center text-[.78rem] leading-snug font-medium ${TONE_CLASS[tone]}`}
                  >
                    {node.text}
                  </div>
                );
              })}
              {!wide && ci < columns.length - 1 && (
                <ArrowDown size={16} className="self-center text-[color:var(--ink-300)]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
      {spec.caption && (
        <figcaption className="mt-2 font-mono text-[.64rem] uppercase tracking-[.1em] text-[color:var(--ink-300)]">{spec.caption}</figcaption>
      )}
    </figure>
  );
}
