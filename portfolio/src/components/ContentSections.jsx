import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Database,
  Compass,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Mail,
  Link2,
  ArrowRight,
  X,
} from "lucide-react";
import { PRINCIPLES, ROLES, PROJECTS, STORY_BEATS, CONTACT } from "../data/content";
import MagneticButton from "./MagneticButton";

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
      <span className="inline-flex items-center gap-2 font-mono text-[.72rem] tracking-[.14em] uppercase text-[color:var(--ink-400)] mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
        stage {step} · {kicker}
      </span>
      <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight text-[color:var(--ink-50)] mb-4">
        {title}
      </h2>
      {lede && <p className="text-[color:var(--ink-400)] text-[1.02rem] leading-relaxed">{lede}</p>}
    </Reveal>
  );
}

/* Small window-chrome bar — a lighter echo of the hero's MonitorBar,
   used to frame a section as a "live dashboard" rather than a plain
   content block. */
function DashboardBar({ title, status = "ONLINE" }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 bg-black/10">
      <span className="flex gap-1.5">
        <i className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </span>
      <span className="flex-1 font-mono text-[.68rem] tracking-wide text-[color:var(--ink-400)]">{title}</span>
      <span className="font-mono text-[.58rem] uppercase tracking-[.12em] border rounded px-2 py-0.5 text-cyan border-cyan/30">
        {status}
      </span>
    </div>
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
        <Reveal delay={0.02}>
          <div className="glass rounded-2xl overflow-hidden">
            <DashboardBar title="now.dashboard · live" />
            <div className="p-6 md:p-8 grid lg:grid-cols-[1.15fr_1fr] gap-8">
              <Reveal delay={0.05}>
                <div className="glass rounded-2xl p-8 space-y-4 text-[color:var(--ink-300)] leading-relaxed">
                  <p>
                    Most of my work sits where <b className="text-[color:var(--ink-100)]">data meets decision-making</b>:
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
                          <h4 className="font-semibold text-[color:var(--ink-100)] mb-1">{p.title}</h4>
                          <p className="text-[.88rem] text-[color:var(--ink-400)] leading-relaxed">{p.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
                <Reveal delay={0.1 + PRINCIPLES.length * 0.08}>
                  <MagneticButton
                    href="#build"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-1 inline-flex items-center gap-1.5 self-start px-4 py-2.5 rounded-lg border border-cyan/25 text-cyan text-[.78rem] font-mono tracking-wide hover:border-cyan/50 hover:bg-cyan/5 transition-colors"
                  >
                    See what shipped <ArrowRight size={13} />
                  </MagneticButton>
                </Reveal>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── BEFORE ──────────────────────────────────────────────── */
/* Bento grid of role tiles. Clicking one triggers a shared-layout
   morph (Framer Motion layoutId) from its grid position into a
   centered detail panel — same technique as Linear/Vercel-style card
   expansions — while the tile itself unmounts so the grid reflows
   to fill the gap ("shifting adjacent modules out of the way"). */
function BeforeSection() {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const expandedRole = expandedIdx !== null ? ROLES[expandedIdx] : null;

  return (
    <section id="lineage" className="py-28 px-5 scroll-mt-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHead
          step="02"
          kicker="before"
          title="Where I've been"
          lede="Solutions engineering and analytics operations. Progressively more technical ownership, from content operations at Amazon through pre-sales solution design at Datasembly."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 grid-flow-row-dense gap-5 auto-rows-[minmax(160px,auto)]">
          {ROLES.map((role, i) => {
            if (expandedIdx === i) return null;
            const big = i === 0;
            return (
              <Reveal
                key={role.company + role.title}
                delay={i * 0.05}
                className={big ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}
              >
                <motion.button
                  layout
                  layoutId={`role-tile-${i}`}
                  onClick={() => setExpandedIdx(i)}
                  whileHover={{ y: -3 }}
                  className={`glass rounded-xl p-5 h-full w-full text-left flex flex-col ${big ? "justify-between" : ""}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${role.current ? "bg-cyan" : "bg-slate-600"}`} />
                      <ChevronRight size={14} className="text-[color:var(--ink-400)] shrink-0" />
                    </div>
                    <h3 className={`font-semibold text-[color:var(--ink-100)] ${big ? "text-lg" : ""}`}>{role.title}</h3>
                    <p className="text-slate-500 text-[.8rem] mb-2">{role.company}</p>
                    <p className="font-mono text-[.65rem] text-slate-500">{role.when}</p>
                  </div>
                  {big && (
                    <p className="text-[.85rem] text-[color:var(--ink-400)] leading-relaxed mt-4 line-clamp-3">
                      {role.bullets[0]}
                    </p>
                  )}
                </motion.button>
              </Reveal>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {expandedRole && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedIdx(null)}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`role-tile-${expandedIdx}`}
              className="dark-surface glass fixed inset-x-4 top-[8vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-[301] rounded-2xl p-8 max-h-[80vh] overflow-y-auto mono-scroll"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[color:var(--ink-100)]">{expandedRole.title}</h3>
                  <p className="text-slate-500 text-[.85rem]">
                    {expandedRole.company} · {expandedRole.when}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedIdx(null)}
                  className="w-8 h-8 grid place-items-center rounded-lg border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <ul className="space-y-2 mb-5">
                  {expandedRole.bullets.map((b) => (
                    <li
                      key={b}
                      className="text-[.9rem] text-[color:var(--ink-300)] leading-relaxed pl-4 relative before:content-['·'] before:absolute before:left-0 before:text-cyan"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {expandedRole.tags.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[.62rem] tracking-wide uppercase px-2.5 py-1 rounded-full border border-white/10 text-[color:var(--ink-400)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

/* Pointer-tracked 3D tilt with a real 3D containing block — the card
   itself rotates (spring-smoothed) toward the cursor, and because
   transform-style is preserve-3d, any translateZ'd children inside
   naturally separate into depth layers as the rotation happens,
   instead of moving as one flat plane. Skipped on touch devices via
   the (hover: hover) media check already applied by only firing on
   mousemove (touch never does).

   The hit-test rect is measured on a static outer wrapper, not on
   the element being rotated — measuring on the rotating element
   itself creates a feedback loop (tilting shifts its own bounding
   rect, which can push the cursor "outside" mid-gesture and cancel
   the tilt). */
function TiltCard({ children, className = "" }) {
  const outerRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 300, damping: 28, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), spring);

  function onMouseMove(e) {
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div ref={outerRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={className} style={{ perspective: "1000px" }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-full will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── WORK ────────────────────────────────────────────────── */
/* Three depth layers riding the same TiltCard rotation:
   A (translateZ -40) — decorative dot-mesh, deepest, barely moves
   B (translateZ  28) — the "device frame" window holding the copy
   C (translateZ  76) — telemetry tag chips, floating past the card's
                         own edge so they visually hover in front */
function ProjectCard({ project, delay }) {
  return (
    <Reveal delay={delay} className={project.featured ? "md:col-span-2" : ""}>
      <TiltCard className="h-full rounded-xl">
        <div
          aria-hidden
          className="absolute inset-0 rounded-xl opacity-40 pointer-events-none"
          style={{
            transform: "translateZ(-40px) scale(1.06)",
            backgroundImage:
              "radial-gradient(circle, rgba(34,211,238,0.5) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div
          className={`glass relative rounded-xl p-6 h-full flex flex-col ${
            project.warm ? "border-amber/25" : ""
          }`}
          style={{ transform: "translateZ(28px)" }}
        >
          <span className="flex gap-1.5 mb-4" aria-hidden>
            <i className="w-2 h-2 rounded-full bg-[#ff5f57]/70" />
            <i className="w-2 h-2 rounded-full bg-[#febc2e]/70" />
            <i className="w-2 h-2 rounded-full bg-[#28c840]/70" />
          </span>
          {project.kicker && (
            <span
              className={`self-start font-mono text-[.6rem] uppercase tracking-[.12em] px-2.5 py-1 rounded-full border mb-4 ${
                project.warm ? "text-amber border-amber/30" : "text-cyan border-cyan/30"
              }`}
            >
              {project.kicker}
            </span>
          )}
          <h3 className="font-display font-semibold text-[color:var(--ink-100)] text-[1.1rem] mb-2">{project.title}</h3>
          <p className="text-[.88rem] text-[color:var(--ink-400)] leading-relaxed mb-4 flex-1">{project.body}</p>
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
        </div>

        {project.tags && (
          <div
            className="absolute -bottom-3 right-4 flex flex-wrap gap-1.5 justify-end max-w-[85%] pointer-events-none"
            style={{ transform: "translateZ(76px)" }}
          >
            {project.tags.map((t) => (
              <span
                key={t}
                className="glass font-mono text-[.58rem] uppercase tracking-wide px-2 py-1 rounded-full text-[color:var(--ink-300)] shadow-lg shadow-black/20"
              >
                {t}
              </span>
            ))}
          </div>
        )}
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
            className="mt-8 w-full md:w-auto mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white/10 font-mono text-[.7rem] uppercase tracking-[.14em] text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors"
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
                <h4 className="font-semibold text-[color:var(--ink-100)] mt-2 mb-2">{beat.title}</h4>
                <p className="text-[.85rem] text-[color:var(--ink-400)] leading-relaxed">{beat.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <p className="mt-8 max-w-3xl italic text-[color:var(--ink-400)] border-l-2 border-cyan pl-4">
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
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-[color:var(--ink-50)] leading-tight mb-4">
              The pipeline ends where
              <br />a conversation <span className="text-cyan">starts</span>
            </h2>
            <p className="text-[color:var(--ink-400)] mb-8 max-w-xl mx-auto">
              Whether it's a data problem that needs untangling, a pipeline that needs to hold, or a
              product that needs to ship, I'd be glad to talk.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <MagneticButton
                href={`mailto:${CONTACT.email}`}
                whileHover={{ scale: 1.045 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink font-bold text-[.85rem]"
              >
                <Mail size={15} /> Email me <ArrowRight size={14} />
              </MagneticButton>
              <MagneticButton
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.045 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/12 text-[color:var(--ink-200)] font-medium text-[.85rem] hover:border-cyan/40 hover:text-cyan transition-colors"
              >
                <Link2 size={15} /> LinkedIn
              </MagneticButton>
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
