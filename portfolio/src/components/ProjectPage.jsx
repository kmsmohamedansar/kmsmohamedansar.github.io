import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { ACCENTS, PROJECTS, getProject } from "../data/projects";
import FlowDiagram, { FlourishTitle, Kicker, TagPill } from "./ui";
import { EASE_REVEAL } from "../lib/motion";

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

function LinkButton({ link, accent }) {
  const a = ACCENTS[accent];
  if (link.locked) {
    return (
      <a href={link.href} className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 text-[color:var(--ink-200)] text-sm transition-colors duration-200 hover:border-white/50 hover:text-white active:scale-[.97]">
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
          ? "inline-flex min-h-11 items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-[#050911] transition-[filter] duration-200 hover:brightness-110 active:scale-[.97]"
          : "inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full border border-white/25 text-white text-sm transition-colors duration-200 hover:border-white/60 hover:bg-white/10 active:scale-[.97]"
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
          <a href="#projects" className="mt-5 inline-flex items-center gap-2 text-cyan font-mono text-xs uppercase tracking-[.12em]">
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
      transition={{ duration: 0.8, ease: EASE_REVEAL }}
      className="mx-auto w-full max-w-4xl px-5 pt-28 pb-24"
    >
      <a href="#projects" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[.12em] text-[color:var(--ink-200)] transition-colors duration-200 hover:text-white">
        <ArrowLeft size={14} /> All projects
      </a>

      <header
        className="mt-5 rounded-3xl border p-6 sm:p-10"
        style={{ background: `radial-gradient(130% 100% at 0% 0%, ${a.hex}30, transparent 62%), rgba(5, 9, 17, 0.5)`, borderColor: `${a.hex}40` }}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[.16em]">
          <span className={`font-semibold ${a.text}`}>{project.kind}</span>
          <span className="text-[color:var(--ink-300)]">{project.status}</span>
        </div>
        <h1 aria-label={project.title} className="mt-4 text-white leading-[.92] text-[clamp(3rem,8vw,6.5rem)]">
          <FlourishTitle text={project.title} accent={project.accent} />
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[color:var(--ink-100)]">{project.hook}</p>
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
              <p key={p.slice(0, 24)} className="text-base sm:text-lg leading-[1.75] text-[color:var(--ink-100)]">
                {p}
              </p>
            ))}
          </div>
        </Block>

        {project.sample && (
          <Block label="A look at the output" accent={project.accent}>
            <div className="overflow-x-auto rounded-xl border border-white/12">
              <table className="w-full text-left text-sm">
                <caption className="text-left px-4 pt-3 pb-2 font-mono text-micro uppercase tracking-[.1em] text-[color:var(--ink-300)]">
                  {project.sample.title}
                </caption>
                <thead>
                  <tr className="border-b border-white/12 text-[color:var(--ink-300)] font-mono text-micro uppercase tracking-wide">
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
        className="group panel mt-6 rounded-2xl p-5 flex items-center justify-between gap-4 transition-[border-color,transform] duration-200 hover:border-white/30 active:scale-[.99]"
      >
        <span>
          <span className="block font-mono text-micro uppercase tracking-[.14em] text-[color:var(--ink-300)]">Next project</span>
          <span className="block font-display text-xl font-semibold text-white mt-1">{next.title}</span>
        </span>
        <ArrowRight className={`${ACCENTS[next.accent].text} transition-transform duration-200 group-hover:translate-x-1`} />
      </a>
    </motion.article>
  );
}
