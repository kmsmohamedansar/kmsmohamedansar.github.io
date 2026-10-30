import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Info, Lock } from "lucide-react";
import { ACCENTS, LISTED_PROJECTS, PROJECTS, getProject } from "../data/projects";
import { DEPTH } from "../data/depth";
import { CASE_SUMMARIES } from "../data/caseSummaries";
import { TOOL_INFO } from "../data/tools";
import { BEFORE_AFTER, STEP_TOOLS } from "../data/summaries";
import FlowDiagram, { FlourishTitle, Kicker, TagPill } from "./ui";
import ProjectMotionPreview from "./ProjectMotionPreview";
import { EASE_REVEAL } from "../lib/motion";
import { media } from "../lib/media";

// The accent is a CSS colour (the current palette's accent ink), so its
// translucent tints are mixed rather than built by appending hex alpha.
const tint = (color, alpha) => `color-mix(in srgb, ${color} ${Math.round(alpha / 2.55)}%, transparent)`;

/* Big headline numbers under a project's hook. */
function StatTiles({ stats, accent }) {
  const a = ACCENTS[accent];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, index) => (
        <div key={s.label} className={`project-stat-tile rounded-2xl border p-4 ${index === 0 ? "project-stat-primary" : ""}`} style={{ borderColor: `${tint(a.hex, 0x40)}`, background: `${tint(a.hex, 0x12)}` }}>
          <dt className="sr-only">{s.label}</dt>
          <dd className={`font-condensed text-[clamp(2rem,5vw,3rem)] leading-none ${a.text}`}>{s.value}</dd>
          <dd className="mt-2 text-sm leading-snug text-[color:var(--ink-200)]">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Sample tables mark right and wrong answers with a leading ✓ or ✗ when
   `marks` is set; older samples keep their score-column colouring. */
function sampleCellClass(sample, c, i) {
  if (sample.marks) {
    if (c.startsWith("✓")) return "text-green font-semibold";
    if (c.startsWith("✗")) return "text-rose font-semibold";
    return "text-[color:var(--ink-100)]";
  }
  if (i === 2) return c.includes("review") ? "text-rose font-semibold" : "text-green font-semibold";
  return "text-[color:var(--ink-100)]";
}

/* A prominent call to read a long-form write-up, with its links. */
function ReportCta({ cta, accent }) {
  const a = ACCENTS[accent];
  return (
    <section
      className="mt-6 rounded-3xl border p-6 sm:p-10"
      style={{ background: `radial-gradient(120% 120% at 100% 0%, ${tint(a.hex, 0x35)}, transparent 60%), rgba(16, 16, 16, 0.04)`, borderColor: `${tint(a.hex, 0x55)}` }}
    >
      <p className={`font-mono text-xs uppercase tracking-[.16em] ${a.text}`}>{cta.kicker}</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight text-[color:var(--ink-100)]">{cta.title}</h2>
      <p className="mt-3 max-w-2xl text-base sm:text-lg leading-relaxed text-[color:var(--ink-100)]">{cta.text}</p>
      {cta.contents && (
        <ol className="mt-5 grid gap-x-8 gap-y-1.5 text-sm text-[color:var(--ink-200)] sm:grid-cols-2">
          {cta.contents.map((c, n) => (
            <li key={c}>
              <span className={`mr-2 font-mono ${a.text}`}>{String(n + 1).padStart(2, "0")}</span>
              {c}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        {cta.links.map((l) => (
          <LinkButton key={l.label} link={l} accent={accent} />
        ))}
      </div>
    </section>
  );
}

/* Project stories share the editorial typography. Their surface comes from
   .ed-case-study, in the palette of the home page section they sit in. */
const TITLE_STYLES = ["condensed", "serif", "mono", "display"];

function pageTheme(project, index) {
  return {
    title: project.theme?.title ?? TITLE_STYLES[index % TITLE_STYLES.length],
  };
}

function PageTitle({ project }) {
  return <FlourishTitle text={project.title} accent={project.accent} />;
}

function SignatureArtwork({ project, reduced }) {
  const art = project.spotlightArt || project.cardArt;
  if (!art) return null;
  return (
    <motion.figure
      className={`project-signature-art project-signature-${project.slug}`}
      initial={reduced ? false : { opacity: 0, y: 18, scale: .985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: .18 }}
      transition={{ duration: .5, ease: EASE_REVEAL }}
    >
      <div className="project-signature-frame">
        <img src={media(art)} alt={`${project.title} conceptual artwork`} loading="eager" />
        <ProjectMotionPreview project={project} active expanded />
      </div>
      <figcaption>{project.slug === "site-recon" ? "A public page, separated into the evidence a browser can verify." : `${project.title} · project visual`}</figcaption>
    </motion.figure>
  );
}

/* A one-picture summary of the project, folded away by default so the
   page stays short: why it exists, each step of the flow with the tools
   used there, and what came out of it. */
const firstSentences = (text, n) => (text || "").match(/[^.!?]+[.!?]+(\s|$)/g)?.slice(0, n).join("").trim() || text || "";

function SummaryArrow() {
  return (
    <div aria-hidden="true" className="grid place-items-center text-[color:var(--ink-300)] py-1 md:py-0 md:px-1">
      <ArrowDown size={16} className="md:hidden" />
      <ArrowRight size={16} className="hidden md:block" />
    </div>
  );
}

function BeforeAfter({ data, accent }) {
  const a = ACCENTS[accent];
  const col = (title, items, on) => (
    <div
      className="flex-1 rounded-xl border p-4 text-sm leading-relaxed"
      style={on ? { borderColor: `${tint(a.hex, 0x55)}`, background: `${tint(a.hex, 0x14)}` } : { borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)" }}
    >
      <p className={`font-mono text-micro uppercase tracking-[.14em] ${on ? a.text : "text-[color:var(--ink-300)]"}`}>{title}</p>
      <ul className={`mt-2 space-y-1.5 ${on ? "text-[color:var(--ink-100)]" : "text-[color:var(--ink-300)]"}`}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="mt-6">
      <p className="mb-3 font-mono text-micro uppercase tracking-[.14em] text-[color:var(--ink-200)]">Before and after</p>
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        {col("Before", data.before, false)}
        <SummaryArrow />
        {col("After", data.after, true)}
      </div>
    </div>
  );
}

function SummaryChart({ project }) {
  const [open, setOpen] = useState(false);
  const a = ACCENTS[project.accent];
  if (!project.flow) return null;
  const tools = STEP_TOOLS[project.slug] || [];
  const why = firstSentences(project.story?.[0], 2);
  const result = BEFORE_AFTER[project.slug]?.change || (project.stats?.length
    ? `${project.stats[0].value} ${project.stats[0].short || project.stats[0].label}`
    : firstSentences(project.learned?.[0], 1));
  const box = "rounded-xl border p-4 text-sm leading-relaxed";
  return (
    <section className="mt-6 rounded-2xl border border-blue/12 bg-blue/[.04]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-7"
      >
        <span className={`font-mono text-xs font-semibold uppercase tracking-[.16em] ${a.text}`}>Summary</span>
        <span className="flex items-center gap-1.5 font-mono text-micro uppercase tracking-[.12em] text-[color:var(--ink-200)]">
          {open ? "Hide" : "Show"}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_REVEAL }}
            className="overflow-hidden"
          >
            <div className="flex flex-col px-5 pb-6 sm:px-7">
              <div className={box} style={{ borderColor: `${tint(a.hex, 0x55)}`, background: `${tint(a.hex, 0x14)}` }}>
                <p className={`font-mono text-micro uppercase tracking-[.14em] ${a.text}`}>Why</p>
                <p className="mt-2 text-[color:var(--ink-100)]">{why}</p>
              </div>
              <div aria-hidden="true" className="grid place-items-center py-1 text-[color:var(--ink-300)]">
                <ArrowDown size={16} />
              </div>
              <div className="flex flex-col md:flex-row md:items-stretch">
                {project.flow.columns.map((c, n) => (
                  <div key={c.label} className="contents">
                    {n > 0 && <SummaryArrow />}
                    <div className={`${box} border-blue/12 bg-blue/[.03] md:flex-1 md:min-w-0`}>
                      <p className="font-mono text-micro uppercase tracking-[.14em] text-[color:var(--ink-300)]">
                        {n + 1}. {c.label}
                      </p>
                      <ul className="mt-2 space-y-1 text-[color:var(--ink-100)]">
                        {c.nodes.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      {tools[n]?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {tools[n].map((t) => (
                            <span key={t} className="rounded-full border px-2 py-0.5 font-mono text-[.62rem] break-words" style={{ borderColor: `${tint(a.hex, 0x50)}`, color: a.hex }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {result && (
                <>
                  <div aria-hidden="true" className="grid place-items-center py-1 text-[color:var(--ink-300)]">
                    <ArrowDown size={16} />
                  </div>
                  <div className={box} style={{ borderColor: `${tint(a.hex, 0x55)}`, background: `${tint(a.hex, 0x14)}` }}>
                    <p className={`font-mono text-micro uppercase tracking-[.14em] ${a.text}`}>Result</p>
                    <p className="mt-2 text-[color:var(--ink-100)]">{result}</p>
                  </div>
                </>
              )}
              {BEFORE_AFTER[project.slug] && <BeforeAfter data={BEFORE_AFTER[project.slug]} accent={project.accent} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Block({ label, accent, children }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-4">
        <Kicker accent={accent}>{label}</Kicker>
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items, accent }) {
  const a = ACCENTS[accent];
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-base leading-relaxed text-[color:var(--ink-100)]">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.hex }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/* The tools a project uses. Hover, focus or tap one to see what it is and,
   where the project says, how it's used here. The explainer opens under the
   row rather than as a floating tooltip, so it never runs off a phone screen. */
function ToolList({ tools, usage = {}, accent }) {
  const [active, setActive] = useState(null);
  // A tap focuses the button and then clicks it. Remember when focus opened it,
  // so that same tap's click doesn't immediately close it again.
  const openedAt = useRef(0);
  const open = (t, timestamp) => {
    openedAt.current = timestamp;
    setActive(t);
  };
  const a = ACCENTS[accent];
  const what = active ? TOOL_INFO[active] : null;
  const here = active ? usage[active] : null;
  const explained = (t) => Boolean(TOOL_INFO[t] || usage[t]);
  const anyExplained = tools.some(explained);

  return (
    // Hover only counts for a real mouse: phones fire a fake hover on tap, which would open then instantly close it.
    <div onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
      <ul className="flex flex-wrap gap-2" aria-label="Tools used">
        {tools.map((t) => {
          if (!explained(t)) {
            return (
              <li key={t}>
                <TagPill>{t}</TagPill>
              </li>
            );
          }
          const on = active === t;
          return (
            <li key={t}>
              <button
                type="button"
                onPointerEnter={(e) => e.pointerType === "mouse" && open(t, e.timeStamp)}
                onFocus={(e) => open(t, e.timeStamp)}
                onClick={(e) => (on && e.timeStamp - openedAt.current > 400 ? setActive(null) : open(t, e.timeStamp))}
                aria-expanded={on}
                aria-controls="tool-explainer"
                className={`inline-flex min-h-11 items-center gap-1.5 font-mono text-micro uppercase tracking-wide px-3 py-2 rounded-full border transition-colors duration-200 ${
                  on ? `${a.border} ${a.text} ${a.soft}` : "border-blue/15 text-[color:var(--ink-200)] bg-blue/[.04] hover:border-blue/40"
                }`}
              >
                {t}
                <Info size={12} aria-hidden="true" className="opacity-70" />
              </button>
            </li>
          );
        })}
      </ul>
      <div id="tool-explainer" aria-live="polite" className="mt-3 min-h-[1.5rem]">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-blue/12 bg-blue/[.04] p-4"
              style={{ borderLeft: `3px solid ${a.hex}` }}
            >
              <p className={`font-mono text-micro uppercase tracking-[.14em] ${a.text}`}>{active}</p>
              {what && (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-100)]">
                  <span className="font-semibold text-[color:var(--ink-100)]">What it is: </span>
                  {what}
                </p>
              )}
              {here && (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-100)]">
                  <span className="font-semibold text-[color:var(--ink-100)]">In this project: </span>
                  {here}
                </p>
              )}
            </motion.div>
          ) : (
            anyExplained && (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-[color:var(--ink-300)]">
                Hover or tap a tool with the <Info size={12} className="inline -mt-0.5" aria-label="info" /> icon to see what it is and how it's used here.
              </motion.p>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LinkButton({ link, accent }) {
  const a = ACCENTS[accent];
  if (link.locked) {
    return (
      <a href={link.href} className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full border border-blue/20 text-[color:var(--ink-200)] text-sm transition-colors duration-200 hover:border-blue/50 hover:text-[color:var(--ink-100)] active:scale-[.97]">
        <Lock size={14} /> {link.label}
      </a>
    );
  }
  return (
    <a
      href={link.href}
      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={
        link.primary
          ? "inline-flex min-h-11 items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-aubergine transition-[filter] duration-200 hover:brightness-110 active:scale-[.97]"
          : "inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full border border-blue/25 text-[color:var(--ink-100)] text-sm transition-colors duration-200 hover:border-blue/60 hover:bg-white/10 active:scale-[.97]"
      }
      style={link.primary ? { background: a.hex } : undefined}
    >
      {link.label} <ArrowUpRight size={15} />
    </a>
  );
}

export default function ProjectPage({ slug }) {
  const reduced = useReducedMotion();
  const project = getProject(slug);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-32 pb-24">
        <div className="panel project-panel rounded-2xl p-8">
          <h1 className="font-display text-2xl font-semibold text-[color:var(--ink-100)]">I couldn't find that project</h1>
          <p className="mt-2 text-[color:var(--ink-200)]">It may have moved. The full list is on the home page.</p>
          <a href="#projects" className="mt-5 inline-flex items-center gap-2 text-cyan font-mono text-xs uppercase tracking-[.12em]">
            <ArrowLeft size={14} /> All projects
          </a>
        </div>
      </div>
    );
  }

  const a = ACCENTS[project.accent];
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  // Next project among the listed ones, so hidden pages never come up.
  const li = LISTED_PROJECTS.findIndex((p) => p.slug === slug);
  const next = LISTED_PROJECTS[(li + 1) % LISTED_PROJECTS.length];
  const theme = pageTheme(project, i);
  const depth = DEPTH[slug];
  const summary = CASE_SUMMARIES[slug];

  return (
    <div className="ed-case-study min-h-full">
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 18, clipPath: "inset(0 0 5% 0 round 24px)" }}
      animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 24px)" }}
      transition={{ duration: 0.48, ease: EASE_REVEAL }}
      className="mx-auto w-full max-w-4xl px-5 pt-28 pb-24"
    >
      <a href={LISTED_PROJECTS.some((p) => p.slug === slug) ? `#card-${slug}` : "#projects"} className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[.12em] text-[color:var(--ink-200)] transition-colors duration-200 hover:text-[color:var(--ink-100)]">
        <ArrowLeft size={14} /> All projects
      </a>

      <header
        className="mt-5 rounded-3xl border p-6 sm:p-10"
        style={{ background: `radial-gradient(130% 100% at 0% 0%, ${tint(a.hex, 0x30)}, transparent 62%), rgba(16, 16, 16, 0.04)`, borderColor: `${tint(a.hex, 0x40)}` }}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[.16em]">
          <span className={`font-semibold ${a.text}`}>{project.kind}</span>
          <span className="text-[color:var(--ink-300)]">{project.status}</span>
        </div>
        <h1 aria-label={project.title} className="mt-4 overflow-hidden text-[color:var(--ink-100)] leading-[.92] text-[clamp(3rem,8vw,6.5rem)]">
          <motion.span className="block" initial={reduced ? false : { y: "108%" }} animate={{ y: "0%" }} transition={{ duration: .52, delay: .06, ease: EASE_REVEAL }}>
            <PageTitle project={project} style={theme.title} />
          </motion.span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[color:var(--ink-100)]">{project.hook}</p>
        {project.stats && <StatTiles stats={project.stats} accent={project.accent} />}
        <p className="mt-3 text-sm text-[color:var(--ink-300)]">
          <span className={`font-mono text-micro uppercase tracking-[.14em] mr-2 ${a.text}`}>My role</span>
          {project.role}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(project.tags || []).map((t) => (
            <TagPill key={t} accent={project.accent}>
              {t}
            </TagPill>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {project.links.map((l) => (
            <LinkButton key={l.label} link={l} accent={project.accent} />
          ))}
        </div>
      </header>

      {summary && <section aria-labelledby="case-summary-title" className="mt-6 rounded-3xl border border-black/15 bg-white/50 p-6 sm:p-8">
        <h2 id="case-summary-title" className="font-display text-2xl font-semibold text-[color:var(--ink-100)]">At a glance</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {[["Problem", summary.problem], ["My role", project.role], ["Outcome", summary.outcome], ["Proof", summary.proof], ["Limits", summary.limits], ["Status", project.status]].map(([label, value]) => <div key={label}><dt className="font-mono text-xs uppercase tracking-wide text-[color:var(--ink-300)]">{label}</dt><dd className="mt-1 text-sm leading-relaxed text-[color:var(--ink-100)]">{value}</dd></div>)}
        </dl>
      </section>}

      <SignatureArtwork project={project} reduced={reduced} />

      <SummaryChart project={project} />

      {project.shots?.length > 0 && (
        <div className={`mt-6 grid gap-4 ${project.shots.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {project.shots.map((s, n) => (
            <figure key={s} className="overflow-hidden rounded-2xl border border-blue/12 bg-blue/[.04]">
              <figcaption className="flex items-center gap-1.5 border-b border-blue/10 px-3.5 py-2.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-micro text-[color:var(--ink-300)]">
                  {project.shots.length > 1 ? `Screenshot ${n + 1} of ${project.shots.length}` : "Screenshot"} · scroll inside to see it all
                </span>
              </figcaption>
              {/* Tall captures (full pages, notebooks) scroll inside the
                  frame; overscroll-contain keeps the page from moving
                  when you reach the end. */}
              <div tabIndex={0} aria-label={`${project.title} screenshot, scrollable`} className="max-h-[72vh] overflow-y-auto overscroll-contain">
                <img src={media(s)} alt={`${project.title} screenshot`} loading="lazy" onLoad={(event) => event.currentTarget.classList.add("is-loaded")} className="ed-lazy-media block w-full" />
              </div>
            </figure>
          ))}
        </div>
      )}

      <div className="panel project-panel rounded-2xl p-6 sm:p-9 mt-6">
        {depth && (
          <Block label="How I found the problem" accent={project.accent}>
            <p className="text-base sm:text-lg leading-[1.75] text-[color:var(--ink-100)]">{depth.found}</p>
          </Block>
        )}

        <Block label="The story" accent={project.accent}>
          <div className="space-y-4">
            {project.story.map((p) => (
              <p key={p.slice(0, 24)} className="text-base sm:text-lg leading-[1.75] text-[color:var(--ink-100)]">
                {p}
              </p>
            ))}
          </div>
        </Block>

        {project.sample && (
          <Block label={project.sample.label || "A look at the output"} accent={project.accent}>
            <div className="overflow-x-auto rounded-xl border border-blue/12">
              <table className="w-full text-left text-sm">
                <caption className="text-left px-4 pt-3 pb-2 font-mono text-micro uppercase tracking-[.1em] text-[color:var(--ink-300)]">
                  {project.sample.title}
                </caption>
                <thead>
                  <tr className="border-b border-blue/12 text-[color:var(--ink-300)] font-mono text-micro uppercase tracking-wide">
                    {project.sample.headers.map((h) => (
                      <th key={h} className="px-4 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.sample.rows.map((r) => (
                    <tr key={r[0]} className="border-b border-blue/8 last:border-0">
                      {r.map((c, i) => (
                        <td key={i} className={`px-4 py-2.5 align-top ${sampleCellClass(project.sample, c, i)}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        )}

        <Block label="How it works" accent={project.accent}>
          <FlowDiagram spec={project.flow} />
          <div className="mt-5">
            <Bullets items={project.how} accent={project.accent} />
          </div>
        </Block>

        {project.figures?.length > 0 && (
          <Block label="Diagrams" accent={project.accent}>
            <div className="space-y-6">
              {project.figures.map((f) => (
                <figure key={f.src}>
                  {/* Diagrams are drawn on white, so they sit on a light card. */}
                  <div
                    tabIndex={f.tall ? 0 : undefined}
                    aria-label={f.tall ? `${f.caption} Scrollable.` : undefined}
                    className={`overflow-x-auto rounded-xl bg-white p-3 sm:p-5 ${f.tall ? "max-h-[75vh] overflow-y-auto overscroll-contain" : ""}`}
                  >
                    <img src={media(f.src)} alt={f.alt ?? f.caption} loading="lazy" onLoad={(event) => event.currentTarget.classList.add("is-loaded")} className={`ed-lazy-media mx-auto block w-full ${f.narrow ? "max-w-sm" : ""} ${f.wide ? "min-w-[860px]" : ""}`} />
                  </div>
                  <figcaption className="mt-2 text-sm text-[color:var(--ink-300)]">
                    {f.caption}
                    {f.tall && " Scroll inside to see it all."}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Block>
        )}

        {project.results && (
          <Block label="Results" accent={project.accent}>
            {project.results.intro && <p className="mb-4 text-base leading-relaxed text-[color:var(--ink-100)]">{project.results.intro}</p>}
            <div className="overflow-x-auto rounded-xl border border-blue/12">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-blue/12 text-[color:var(--ink-300)] font-mono text-micro uppercase tracking-wide">
                    {project.results.headers.map((h) => (
                      <th key={h} className="px-4 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.results.rows.map((r) => (
                    <tr key={r[0]} className="border-b border-blue/8 last:border-0">
                      {r.map((c, i) => (
                        <td key={i} className="px-4 py-2.5 text-[color:var(--ink-100)]">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {project.results.note && <p className="mt-3 text-sm text-[color:var(--ink-300)]">{project.results.note}</p>}
          </Block>
        )}

        {project.reportCta && <ReportCta cta={project.reportCta} accent={project.accent} />}

        {depth && (
          <Block label="Trade-offs I made" accent={project.accent}>
            <ul className="space-y-3">
              {depth.tradeoffs.map((t) => (
                <li key={t.chose} className="rounded-xl border border-blue/12 p-4 text-[color:var(--ink-100)] leading-relaxed">
                  <span className={`font-semibold ${a.text}`}>{t.chose}</span>
                  <span className="text-[color:var(--ink-300)]"> over </span>
                  <span className="font-semibold text-[color:var(--ink-100)]">{t.over}</span>
                  <span className="block mt-1.5 text-[color:var(--ink-200)]">Because {t.because}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {depth?.ai && (
          <Block label={depth.ai.label} accent={project.accent}>
            <p className="text-base sm:text-lg leading-[1.75] text-[color:var(--ink-100)]">{depth.ai.text}</p>
          </Block>
        )}

        <Block label="What I took from it" accent={project.accent}>
          <Bullets items={project.learned} accent={project.accent} />
        </Block>

        <Block label="Built with" accent={project.accent}>
          <p className="mb-3 text-sm leading-relaxed text-[color:var(--ink-200)]">
            Tap or hover over a tool to see what it is and how I used it here.
          </p>
          <ToolList tools={project.stack} usage={project.stackUsage} accent={project.accent} />
        </Block>
      </div>

      <a
        href={`#project/${next.slug}`}
       
        className="group panel mt-6 rounded-2xl p-5 flex items-center justify-between gap-4 transition-[border-color,transform] duration-200 hover:border-blue/30 active:scale-[.99]"
      >
        <span>
          <span className="block font-mono text-micro uppercase tracking-[.14em] text-[color:var(--ink-300)]">Next project</span>
          <span className="block font-display text-xl font-semibold text-[color:var(--ink-100)] mt-1">{next.title}</span>
        </span>
        <ArrowRight className={`${ACCENTS[next.accent].text} transition-transform duration-200 group-hover:translate-x-1`} />
      </a>
    </motion.article>
    </div>
  );
}
