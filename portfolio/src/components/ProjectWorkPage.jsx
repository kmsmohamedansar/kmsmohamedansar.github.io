import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ACCENTS, EARLIER_PROJECTS, FEATURED, FEATURED_GRID, MORE_PROJECTS, OPEN_SOURCE_PROJECTS } from "../data/projects";
import { EASE_OUT } from "../lib/motion";

// Every listed project on one page, as a plain index. Each row opens the
// project's own page at #project/<slug>. Hidden projects stay out, same as
// on the main page.
const GROUPS = [
  { label: "Studies, skills & plugins", projects: OPEN_SOURCE_PROJECTS },
  { label: "Featured", projects: [...FEATURED, ...FEATURED_GRID] },
  { label: "More projects", projects: MORE_PROJECTS },
  { label: "Earlier work", projects: EARLIER_PROJECTS },
];

export default function ProjectWorkPage() {
  const searchInput = useRef(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All work");
  const reduced = useReducedMotion();
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const groups = GROUPS.filter((group) => category === "All work" || group.label === category)
    .map((group) => ({ ...group, projects: group.projects.filter((project) => {
      const text = [project.title, project.kind, project.hook, ...(project.tags || []), ...(project.stack || [])].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    }) })).filter((group) => group.projects.length);
  const count = groups.reduce((n, group) => n + group.projects.length, 0);
  function resetFilters() { setQuery(""); setCategory("All work"); searchInput.current?.focus(); }
  const total = GROUPS.reduce((n, g) => n + g.projects.length, 0);
  return (
    <div className="ed-case-study mx-auto min-h-full max-w-none px-5 pb-28 pt-28 sm:px-[max(24px,calc((100vw-1060px)/2))] sm:pt-32">
      <p className="font-mono text-xs uppercase tracking-[.16em] text-[color:var(--ink-400)]">{total} projects</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[color:var(--ink-100)] sm:text-5xl">Project Work</h1>
      <p className="mt-4 max-w-xl text-[color:var(--ink-200)]">Find a shipped app, explore a data system, or inspect an AI experiment. Every project includes the story behind it.</p>

      <div className="ed-work-controls">
        <label htmlFor="project-search">Search the work</label>
        <input ref={searchInput} id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Python, Swift, or data pipelines" aria-controls="project-results" />
        <div className="ed-work-filters" role="group" aria-label="Project categories">
          {["All work", ...GROUPS.map((group) => group.label)].map((label) => (
            <button key={label} type="button" aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</button>
          ))}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true">{count} of {total} projects{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
      </div>
      <div id="project-results">
      {count === 0 && <div className="ed-work-empty"><h2>No projects found.</h2><p>Try a broader term or choose another category.</p><button type="button" onClick={resetFilters}>Show all projects ↗</button></div>}
      {groups.map((g) => (
        <section key={g.label} className="mt-14">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-[color:var(--ink-200)]">{g.label}</h2>
          <ul className="mt-4 border-t border-blue/10">
            {g.projects.map((p, i) => {
              const a = ACCENTS[p.accent] || ACCENTS.cyan;
              return (
                <motion.li
                  key={p.slug}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: EASE_OUT }}
                  className="border-b border-blue/10"
                >
                  <a href={`#project/${p.slug}`} className="ed-work-row group">
                    <span>
                      <span className="block text-lg font-medium text-[color:var(--ink-100)] transition-colors group-hover:text-[color:var(--a)]" style={{ "--a": a.hex }}>
                        {p.title}
                      </span>
                      <span className={`mt-1 block font-mono text-[.68rem] uppercase tracking-[.1em] ${a.text}`}>{p.kind}</span>
                    </span>
                    <span className="ed-work-summary text-sm text-[color:var(--ink-200)]">{p.hook}</span>
                    <ArrowUpRight size={18} className="text-[color:var(--ink-400)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[color:var(--ink-100)]" />
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </section>
      ))}
      </div>
    </div>
  );
}
