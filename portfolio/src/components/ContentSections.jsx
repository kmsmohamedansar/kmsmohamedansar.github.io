import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Database,
  Compass,
  Smartphone,
  ExternalLink,
  ChevronDown,
  Mail,
  Link2,
  ArrowRight,
} from "lucide-react";
import { PRINCIPLES, ROLES, PROJECTS, STORY_BEATS, CONTACT } from "../data/content";

const EASE = [0.16, 1, 0.3, 1];

function Reveal({ children, className = "", delay = 0, y = 28 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ step, kicker, title, lede }) {
  return (
    <Reveal className="max-w-2xl mb-14">
      <span className="inline-flex items-center gap-2 font-mono text-[.72rem] tracking-[.14em] uppercase text-slate-400 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
        stage {step} · {kicker}
      </span>
      <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight text-slate-50 mb-4">
        {title}
      </h2>
      {lede && <p className="text-slate-400 text-[1.02rem] leading-relaxed">{lede}</p>}
    </Reveal>
  );
}

/* ── NOW ─────────────────────────────────────────────────── */
function NowSection() {
  const icons = [Database, Compass, Smartphone];
  return (
    <section id="source" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHead
          step="01"
          kicker="now"
          title={
            <>
              Technical builder at the intersection of{" "}
              <span className="text-cyan">data systems</span> and{" "}
              <span className="text-amber">delivery</span>
            </>
          }
          lede="Correct, explainable, operable. Whether the interface is SQL, a dashboard, or TestFlight."
        />
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8">
          <Reveal delay={0.05}>
            <div className="glass rounded-2xl p-8 space-y-4 text-slate-300 leading-relaxed">
              <p>
                Most of my work sits where <b className="text-slate-100">data meets decision-making</b>:
                retail pricing-scale datasets, recurring pipelines, and analytics that teams run week
                after week. Not one-off charts.
              </p>
              <p>
                At <span className="text-cyan">Datasembly</span>, that translates to deep SQL and
                Snowflake work, careful validation, stakeholder-ready reporting, and clean handoffs when
                scope moves.
              </p>
              <p>
                I apply the same standard to <span className="text-amber">software and applied AI</span>:
                end-to-end ownership when the right answer is a product, not only a query.
              </p>
            </div>
          </Reveal>
          <div className="flex flex-col gap-4">
            {PRINCIPLES.map((p, i) => {
              const Icon = icons[i];
              return (
                <Reveal key={p.title} delay={0.1 + i * 0.08}>
                  <div className="glass rounded-xl p-5 flex gap-4">
                    <span className="w-9 h-9 shrink-0 grid place-items-center rounded-lg border border-white/10 text-cyan">
                      <Icon size={17} />
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-100 mb-1">{p.title}</h4>
                      <p className="text-[.88rem] text-slate-400 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── BEFORE ──────────────────────────────────────────────── */
function BeforeSection() {
  return (
    <section id="lineage" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHead
          step="02"
          kicker="before"
          title="Where I've been"
          lede="Solutions engineering and analytics operations. Progressively more technical ownership, from content operations at Amazon through pre-sales solution design at Datasembly."
        />
        <div className="relative max-w-3xl">
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/10" aria-hidden />
          <div className="flex flex-col gap-8">
            {ROLES.map((role, i) => (
              <Reveal key={role.company + role.title} delay={i * 0.06} y={20}>
                <div className="relative pl-10">
                  <span
                    className={`absolute left-0 top-1.5 w-[27px] h-[27px] rounded-full border-2 grid place-items-center ${
                      role.current ? "border-cyan bg-cyan/15" : "border-white/15 bg-ink"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${role.current ? "bg-cyan" : "bg-slate-600"}`} />
                  </span>
                  <div className="glass rounded-xl p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-100">
                          {role.title} <span className="text-slate-500 font-normal">· {role.company}</span>
                        </h3>
                        <span className="font-mono text-[.7rem] text-slate-500">{role.when}</span>
                      </div>
                      <span className="w-9 h-9 rounded-lg border border-white/10 grid place-items-center text-[.65rem] font-mono text-slate-400">
                        {role.company
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {role.bullets.map((b) => (
                        <li key={b} className="text-[.88rem] text-slate-400 leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-0 before:text-cyan">
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      {role.tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[.62rem] tracking-wide uppercase px-2.5 py-1 rounded-full border border-white/10 text-slate-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Subtle pointer-tracked 3D tilt — perspective rotation follows the
   cursor within the card bounds, spring-smoothed back to flat on
   leave. Skipped on touch devices via the (hover: hover) media check
   already applied by only firing on mousemove (touch never does). */
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 300, damping: 28, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), spring);

  function onMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── WORK ────────────────────────────────────────────────── */
function ProjectCard({ project, delay }) {
  return (
    <Reveal delay={delay} className={project.featured ? "md:col-span-2" : ""}>
      <TiltCard
        className={`glass rounded-xl p-6 h-full flex flex-col will-change-transform ${
          project.warm ? "border-amber/25" : ""
        }`}
      >
        {project.kicker && (
          <span
            className={`self-start font-mono text-[.6rem] uppercase tracking-[.12em] px-2.5 py-1 rounded-full border mb-4 ${
              project.warm ? "text-amber border-amber/30" : "text-cyan border-cyan/30"
            }`}
          >
            {project.kicker}
          </span>
        )}
        <h3 className="font-display font-semibold text-slate-100 text-[1.1rem] mb-2">{project.title}</h3>
        <p className="text-[.88rem] text-slate-400 leading-relaxed mb-4 flex-1">{project.body}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags?.map((t) => (
            <span key={t} className="font-mono text-[.6rem] uppercase tracking-wide px-2 py-1 rounded-full border border-white/10 text-slate-500">
              {t}
            </span>
          ))}
        </div>
        {project.links?.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className={`inline-flex items-center gap-1.5 text-[.82rem] font-medium ${
              link.warm ? "text-amber" : "text-cyan"
            } hover:gap-2.5 transition-all w-fit`}
          >
            {link.label} <ExternalLink size={12} />
          </a>
        ))}
      </TiltCard>
    </Reveal>
  );
}

function WorkSection() {
  const [expanded, setExpanded] = useState(false);
  const visible = PROJECTS.filter((p) => !p.collapsed);
  const hidden = PROJECTS.filter((p) => p.collapsed);

  return (
    <section id="build" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHead
          step="03"
          kicker="work"
          title="What I've built"
          lede="SQL tools, pipelines, ML, retrieval, automation, and one native iOS app shipped to the App Store. End to end, several with live demos."
        />
        <div className="grid md:grid-cols-2 gap-5">
          {visible.map((p, i) => (
            <ProjectCard key={p.title} project={p} delay={i * 0.06} />
          ))}
          <AnimatePresence>
            {expanded &&
              hidden.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <ProjectCard project={p} delay={i * 0.04} />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
        {hidden.length > 0 && (
          <motion.button
            onClick={() => setExpanded((v) => !v)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-8 w-full md:w-auto mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white/10 font-mono text-[.7rem] uppercase tracking-[.14em] text-slate-400 hover:text-cyan hover:border-cyan/40 transition-colors"
          >
            {expanded ? "Show fewer projects" : `Show ${hidden.length} more projects`}
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </motion.button>
        )}
      </div>
    </section>
  );
}

/* ── WHY / STORY ─────────────────────────────────────────── */
function StorySection() {
  return (
    <section id="story" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHead step="03b" kicker="the short version" title="Why I do this work" lede="Not a resume. The throughline behind it." />
        <div className="grid md:grid-cols-2 gap-px rounded-2xl overflow-hidden border border-white/8 max-w-3xl">
          {STORY_BEATS.map((beat, i) => (
            <Reveal key={beat.n} delay={i * 0.07} y={16}>
              <div className="bg-white/[.015] p-6 h-full hover:bg-cyan/[.03] transition-colors">
                <span className="font-mono text-[.65rem] text-cyan tracking-widest">{beat.n}</span>
                <h4 className="font-semibold text-slate-100 mt-2 mb-2">{beat.title}</h4>
                <p className="text-[.85rem] text-slate-400 leading-relaxed">{beat.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <p className="mt-8 max-w-3xl italic text-slate-400 border-l-2 border-cyan pl-4">
            The projects above are what that looks like in practice.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── CONTACT ─────────────────────────────────────────────── */
function ContactSection() {
  return (
    <section id="commit" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <div className="glass rounded-3xl p-10 md:p-14 text-center max-w-3xl mx-auto">
            <p className="font-mono text-[.7rem] md:text-[.8rem] text-slate-500 mb-6 break-words">
              <span className="text-rose">INSERT INTO</span> your_team (engineer){" "}
              <span className="text-rose">VALUES</span> (<span className="text-green">'mohamed_ansar'</span>);{" "}
              <span className="text-rose">COMMIT</span>;
            </p>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-slate-50 leading-tight mb-4">
              The pipeline ends where
              <br />a conversation <span className="text-cyan">starts</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Whether it's a data problem that needs untangling, a pipeline that needs to hold, or a
              product that needs to ship, I'd be glad to talk.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <motion.a
                href={`mailto:${CONTACT.email}`}
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink font-bold text-[.85rem]"
              >
                <Mail size={15} /> Email me <ArrowRight size={14} />
              </motion.a>
              <motion.a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/12 text-slate-200 font-medium text-[.85rem] hover:border-cyan/40 hover:text-cyan transition-colors"
              >
                <Link2 size={15} /> LinkedIn
              </motion.a>
            </div>
            <p className="font-mono text-[.75rem] text-slate-500">
              direct:{" "}
              <a href={`mailto:${CONTACT.email}`} className="text-cyan hover:underline">
                {CONTACT.email}
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function ContentSections() {
  return (
    <>
      <NowSection />
      <BeforeSection />
      <WorkSection />
      <StorySection />
      <ContactSection />
    </>
  );
}
