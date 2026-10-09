import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ExternalLink, Link2, Mail } from "lucide-react";
import { ABOUT, CONTACT, HERO, ROLES } from "../data/content";
import { ACCENTS, EXPERIMENTS, FEATURED, MORE_PROJECTS } from "../data/projects";
import { Rail, Reveal, SectionHead, TagPill } from "./ui";

const SECTION = "min-h-0 flex flex-col items-center px-5 py-14 scroll-mt-16";
const INNER = "w-full max-w-[1180px]";

/* A one-line flowchart preview: the column labels as coloured chips
   joined by arrows. The full diagram lives on the project page. */
function FlowMini({ spec, accent }) {
  const a = ACCENTS[accent];
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-hidden="true">
      {spec.columns.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span className={`font-mono text-[.62rem] uppercase tracking-wide px-2 py-1 rounded-md border ${a.border} ${a.text} ${a.soft}`}>
            {c.label}
          </span>
          {i < spec.columns.length - 1 && <ArrowRight size={12} className="text-[color:var(--ink-300)]" />}
        </span>
      ))}
    </div>
  );
}

function Thumb({ project, className }) {
  if (project.shots?.[0]) {
    return <img src={project.shots[0]} alt="" loading="lazy" className={`w-full object-cover object-top rounded-lg border border-white/10 ${className}`} />;
  }
  return null;
}

/* ── HERO ───────────────────────────────────────────────────── */
export function Hero({ ready = true }) {
  const up = (d) => ({
    initial: { opacity: 0, y: 14 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.6, delay: d },
  });
  return (
    <section id="hero" data-star-accent="hero" className="min-h-[72dvh] flex flex-col justify-center px-5 pt-28 pb-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="max-w-3xl rounded-2xl border border-white/10 bg-[#050911]/60 backdrop-blur-md p-6 sm:p-9">
          <motion.p {...up(0)} className="font-mono text-[.72rem] uppercase tracking-[.2em] text-cyan mb-4">
            {HERO.eyebrow}
          </motion.p>
          <motion.h1 {...up(0.06)} className="font-display text-[clamp(1.9rem,4.4vw,3.3rem)] font-semibold leading-[1.1] text-white">
            {HERO.title}
          </motion.h1>
          <motion.p {...up(0.12)} className="mt-5 text-[1.08rem] leading-relaxed text-[color:var(--ink-200)]">
            {HERO.lede.map((s, i) => (
              <span key={i} className={s.cls}>
                {s.text}
              </span>
            ))}
          </motion.p>
          <motion.div {...up(0.2)} className="mt-7 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[#a8f8ff] to-cyan text-[#050911] font-bold text-[.88rem] [text-shadow:none] hover:brightness-110 transition-[filter]"
            >
              See my projects <ArrowRight size={15} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/25 text-white font-medium text-[.88rem] hover:border-cyan hover:text-cyan transition-colors"
            >
              Say hello
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── PROJECTS ───────────────────────────────────────────────── */
function FeaturedCard({ project, index }) {
  const a = ACCENTS[project.accent];
  return (
    <Reveal delay={index * 0.08} className="h-full">
      <a
        href={`#project/${project.slug}`}
        className="group panel h-full rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1"
        style={{ boxShadow: `0 0 0 1px ${a.hex}33, 0 22px 44px -24px ${a.glow}` }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={`font-mono text-[.68rem] uppercase tracking-[.14em] font-semibold ${a.text}`}>{project.kind}</span>
          <span className="font-mono text-[.62rem] uppercase tracking-wide text-[color:var(--ink-300)]">{project.status}</span>
        </div>
        <h3 className="font-display text-[1.7rem] font-semibold text-white mt-3 leading-tight group-hover:underline decoration-2 underline-offset-4" style={{ textDecorationColor: a.hex }}>
          {project.title}
        </h3>
        <p className="mt-3 text-[.98rem] leading-relaxed text-[color:var(--ink-200)]">{project.hook}</p>
        <div className="mt-5">
          <Thumb project={project} className="h-36" />
          {!project.shots?.[0] && <FlowMini spec={project.flow} accent={project.accent} />}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {project.tags.slice(0, 3).map((t) => (
            <TagPill key={t} accent={project.accent}>
              {t}
            </TagPill>
          ))}
        </div>
        <span className={`mt-auto pt-6 inline-flex items-center gap-1.5 font-mono text-[.76rem] uppercase tracking-[.12em] font-semibold ${a.text}`}>
          Read the story <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
      </a>
    </Reveal>
  );
}

function MiniCard({ project }) {
  const a = ACCENTS[project.accent];
  return (
    <a
      href={`#project/${project.slug}`}
      className="group panel snap-start shrink-0 w-[280px] sm:w-[310px] rounded-xl p-5 flex flex-col hover:-translate-y-0.5 transition-transform"
      style={{ borderTop: `3px solid ${a.hex}` }}
    >
      <span className={`font-mono text-[.64rem] uppercase tracking-[.14em] font-semibold ${a.text}`}>{project.kind}</span>
      <h4 className="font-display text-[1.15rem] font-semibold text-white mt-1.5 leading-snug group-hover:underline underline-offset-4" style={{ textDecorationColor: a.hex }}>
        {project.title}
      </h4>
      <p className="mt-2 text-[.86rem] leading-relaxed text-[color:var(--ink-200)] line-clamp-3">{project.hook}</p>
      <div className="mt-4">
        <Thumb project={project} className="h-24" />
        {!project.shots?.[0] && <FlowMini spec={project.flow} accent={project.accent} />}
      </div>
      <span className={`mt-auto pt-4 inline-flex items-center gap-1 font-mono text-[.68rem] uppercase tracking-[.12em] ${a.text}`}>
        Open <ArrowUpRight size={13} />
      </span>
    </a>
  );
}

export function ProjectsSection() {
  return (
    <section id="projects" data-star-accent="build" className={SECTION}>
      <div className={INNER}>
        <SectionHead
          accent="green"
          kicker="Projects"
          title="Things I've built"
          lede="Three I'd start with, then the rest. Click any card for the story, a diagram of how it works, and a link to try it or read the code."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {FEATURED.map((p, i) => (
            <FeaturedCard key={p.slug} project={p} index={i} />
          ))}
        </div>
        <div className="mt-10">
          <Rail label={`More projects (${MORE_PROJECTS.length}), scroll sideways`}>
            {MORE_PROJECTS.map((p) => (
              <MiniCard key={p.slug} project={p} />
            ))}
          </Rail>
        </div>
      </div>
    </section>
  );
}

/* ── EXPERIENCE ─────────────────────────────────────────────── */
function RoleCard({ role }) {
  const a = ACCENTS[role.accent];
  return (
    <div className="panel snap-start shrink-0 w-[min(86vw,360px)] rounded-xl p-6 flex flex-col" style={{ borderTop: `3px solid ${a.hex}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-mono text-[.68rem] uppercase tracking-[.12em] font-semibold ${a.text}`}>{role.company}</span>
        {role.current && (
          <span className="font-mono text-[.58rem] uppercase tracking-wide px-2 py-0.5 rounded-full border border-green/50 text-green bg-green/10">Now</span>
        )}
      </div>
      <h4 className="font-display text-[1.25rem] font-semibold text-white mt-2 leading-snug">{role.title}</h4>
      <p className="font-mono text-[.66rem] text-[color:var(--ink-300)] mt-1">{role.when}</p>
      <p className="mt-3 text-[.92rem] leading-relaxed text-[color:var(--ink-100)] italic">{role.summary}</p>
      <ul className="mt-3 space-y-2 text-[.86rem] leading-relaxed text-[color:var(--ink-200)]">
        {role.bullets.map((b) => (
          <li key={b} className="flex gap-2.5">
            <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: a.hex }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
        {role.tags.map((t) => (
          <TagPill key={t} accent={role.accent}>
            {t}
          </TagPill>
        ))}
      </div>
    </div>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" data-star-accent="lineage" className={SECTION}>
      <div className={INNER}>
        <SectionHead
          accent="amber"
          kicker="Experience"
          title="Where I've worked"
          lede="From auditing content catalogues to writing SQL on retail pricing data. Each stop gave me a bit more technical ownership."
        />
        <Rail label="Newest first, scroll sideways">
          {ROLES.map((r) => (
            <RoleCard key={r.company + r.title} role={r} />
          ))}
        </Rail>
      </div>
    </section>
  );
}

/* ── ABOUT ──────────────────────────────────────────────────── */
export function AboutSection() {
  return (
    <section id="about" data-star-accent="source" className={SECTION}>
      <div className={INNER}>
        <SectionHead accent="violet" kicker="About" title={ABOUT.title} />
        <Reveal>
          <div className="panel rounded-2xl p-6 md:p-9 grid lg:grid-cols-[1.2fr_1fr] gap-8">
            <div className="space-y-4 text-[1.02rem] leading-relaxed text-[color:var(--ink-100)]">
              {ABOUT.story.map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </div>
            <div className="space-y-5">
              {ABOUT.groups.map((g) => {
                const a = ACCENTS[g.accent];
                return (
                  <div key={g.title}>
                    <h4 className={`font-mono text-[.7rem] uppercase tracking-[.14em] font-semibold mb-2 ${a.text}`}>{g.title}</h4>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((it) => (
                        <TagPill key={it} accent={g.accent}>
                          {it}
                        </TagPill>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── BUILT WITH AI ──────────────────────────────────────────── */
export function ExperimentsSection() {
  return (
    <section id="ai" data-star-accent="source" className={SECTION}>
      <div className={INNER}>
        <SectionHead
          accent="rose"
          kicker="Built with AI"
          title="Experiments with an AI pair programmer"
          lede="These aren't my day job. They're what happens when I ask an AI for help, look at the result, and keep pushing. Some of this very page is one of them."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {EXPERIMENTS.map((x, i) => {
            const a = ACCENTS[x.accent];
            const Body = x.href ? "a" : "div";
            return (
              <Reveal key={x.id} delay={i * 0.07} className="h-full">
                <Body
                  {...(x.href ? { href: x.href } : {})}
                  className={`panel h-full rounded-xl p-5 flex flex-col ${x.href ? "group hover:-translate-y-0.5 transition-transform" : ""}`}
                  style={{ borderTop: `3px solid ${a.hex}` }}
                >
                  <h4 className="font-display text-[1.15rem] font-semibold text-white leading-snug">{x.title}</h4>
                  <p className={`mt-2 text-[.9rem] leading-relaxed ${a.text}`}>{x.hook}</p>
                  <p className="mt-2 text-[.86rem] leading-relaxed text-[color:var(--ink-200)]">{x.body}</p>
                  {x.cta && (
                    <span className={`mt-auto pt-4 inline-flex items-center gap-1.5 font-mono text-[.72rem] uppercase tracking-[.12em] font-semibold ${a.text}`}>
                      {x.cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Body>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── CONTACT ────────────────────────────────────────────────── */
export function ContactSection() {
  return (
    <section id="contact" data-star-accent="commit" className={`${SECTION} pb-24`}>
      <div className={INNER}>
        <Reveal>
          <div className="panel rounded-2xl p-8 md:p-12 text-center max-w-3xl mx-auto">
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-white leading-tight">
              If something here caught your eye, <span className="text-cyan">let's talk</span>.
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-[color:var(--ink-200)] max-w-xl mx-auto">
              A data problem that needs untangling, a pipeline that has to hold, or a tool that needs building. I read every message.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[#a8f8ff] to-cyan text-[#050911] font-bold text-[.88rem] [text-shadow:none] hover:brightness-110 transition-[filter]"
              >
                <Mail size={15} /> Email me
              </a>
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/25 text-white font-medium text-[.88rem] hover:border-cyan hover:text-cyan transition-colors"
              >
                <Link2 size={15} /> LinkedIn
              </a>
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/25 text-white font-medium text-[.88rem] hover:border-cyan hover:text-cyan transition-colors"
              >
                <ExternalLink size={15} /> GitHub
              </a>
            </div>
            <p className="mt-5 font-mono text-[.74rem] text-[color:var(--ink-300)]">{CONTACT.email}</p>
          </div>
        </Reveal>
        <p className="mt-8 text-center font-mono text-[.64rem] text-[color:var(--ink-300)]">
          © {new Date().getFullYear()} Mohamed Ansar · Built with React, Vite and Tailwind
        </p>
      </div>
    </section>
  );
}

