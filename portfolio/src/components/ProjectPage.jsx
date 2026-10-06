import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { ACCENTS, PROJECTS, getProject } from "../data/projects";
import FlowDiagram, { TagPill } from "./ui";
import { EASE_OUT } from "../lib/motion";

function Block({ label, accent, children }) {
  const a = ACCENTS[accent];
  return (
    <section className="mt-9">
      <h2 className={`font-mono text-[.74rem] uppercase tracking-[.16em] font-semibold ${a.text} mb-3`}>{label}</h2>
      {children}
    </section>
  );
}

function Bullets({ items, accent }) {
  const a = ACCENTS[accent];
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[1rem] leading-relaxed text-[color:var(--ink-100)]">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.hex }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function LinkButton({ link, accent }) {
  const a = ACCENTS[accent];
  if (link.locked) {
    return (
      <a href={link.href} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-[color:var(--ink-200)] text-[.88rem] hover:border-cyan hover:text-cyan transition-colors">
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
          ? "inline-flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-[.9rem] text-[#050911] hover:brightness-110 transition-[filter]"
          : "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/25 text-white text-[.88rem] hover:border-cyan hover:text-cyan transition-colors"
      }
      style={link.primary ? { background: a.hex } : undefined}
    >
      {link.label} <ArrowUpRight size={15} />
    </a>
  );
}

export default function ProjectPage({ slug }) {
  const project = getProject(slug);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-32 pb-24">
        <div className="panel rounded-2xl p-8">
          <h1 className="font-display text-2xl font-semibold text-white">I couldn't find that project</h1>
          <p className="mt-2 text-[color:var(--ink-200)]">It may have moved. The full list is on the home page.</p>
          <a href="#projects" className="mt-5 inline-flex items-center gap-2 text-cyan font-mono text-[.8rem] uppercase tracking-[.12em]">
            <ArrowLeft size={14} /> All projects
          </a>
        </div>
      </div>
    );
  }

  const a = ACCENTS[project.accent];
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  const next = PROJECTS[(i + 1) % PROJECTS.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mx-auto w-full max-w-4xl px-5 pt-28 pb-24"
    >
      <a href="#projects" className="inline-flex items-center gap-2 font-mono text-[.76rem] uppercase tracking-[.12em] text-[color:var(--ink-200)] hover:text-cyan transition-colors">
        <ArrowLeft size={14} /> All projects
      </a>

      <header className="panel rounded-2xl p-6 sm:p-9 mt-5" style={{ borderTop: `4px solid ${a.hex}` }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={`font-mono text-[.74rem] uppercase tracking-[.16em] font-semibold ${a.text}`}>{project.kind}</span>
          <span className="font-mono text-[.68rem] uppercase tracking-wide text-[color:var(--ink-300)]">{project.status}</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,4.6vw,3.2rem)] font-semibold text-white leading-[1.08] mt-3">{project.title}</h1>
        <p className="mt-4 text-[1.12rem] leading-relaxed text-[color:var(--ink-100)]">{project.hook}</p>
        <p className="mt-3 text-[.92rem] text-[color:var(--ink-300)]">
          <span className={`font-mono text-[.66rem] uppercase tracking-[.14em] mr-2 ${a.text}`}>My role</span>
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

      {project.shots?.length > 0 && (
        <div className={`mt-6 grid gap-4 ${project.shots.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {project.shots.map((s) => (
            <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="block">
              <img src={s} alt={`${project.title} screenshot`} loading="lazy" className="w-full rounded-xl border border-white/15" />
            </a>
          ))}
        </div>
      )}

      <div className="panel rounded-2xl p-6 sm:p-9 mt-6">
        <Block label="The story" accent={project.accent}>
          <div className="space-y-4">
            {project.story.map((p) => (
              <p key={p.slice(0, 24)} className="text-[1.04rem] leading-[1.75] text-[color:var(--ink-100)]">
                {p}
              </p>
            ))}
          </div>
        </Block>

        {project.sample && (
          <Block label="A look at the output" accent={project.accent}>
            <div className="overflow-x-auto rounded-xl border border-white/12">
              <table className="w-full text-left text-[.9rem]">
                <caption className="text-left px-4 pt-3 pb-2 font-mono text-[.64rem] uppercase tracking-[.1em] text-[color:var(--ink-300)]">
                  {project.sample.title}
                </caption>
                <thead>
                  <tr className="border-b border-white/12 text-[color:var(--ink-300)] font-mono text-[.66rem] uppercase tracking-wide">
                    {project.sample.headers.map((h) => (
                      <th key={h} className="px-4 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.sample.rows.map((r) => (
                    <tr key={r[0]} className="border-b border-white/8 last:border-0">
                      {r.map((c, i) => (
                        <td key={i} className={`px-4 py-2.5 ${i === 2 ? (c.includes("review") ? "text-rose font-semibold" : "text-green font-semibold") : "text-[color:var(--ink-100)]"}`}>
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

        <Block label="What I took from it" accent={project.accent}>
          <Bullets items={project.learned} accent={project.accent} />
        </Block>

        <Block label="Built with" accent={project.accent}>
          <div className="flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <TagPill key={s}>{s}</TagPill>
            ))}
          </div>
        </Block>
      </div>

      <a
        href={`#project/${next.slug}`}
        className="group panel mt-6 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-cyan/50 transition-colors"
      >
        <span>
          <span className="block font-mono text-[.66rem] uppercase tracking-[.14em] text-[color:var(--ink-300)]">Next project</span>
          <span className="block font-display text-[1.2rem] font-semibold text-white mt-1">{next.title}</span>
        </span>
        <ArrowRight className="text-cyan transition-transform group-hover:translate-x-1" />
      </a>
    </motion.article>
  );
}
