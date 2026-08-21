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
import { MEDIUM_OBJECT, EASE_OUT } from "../lib/motion";

const EASE = EASE_OUT;

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
      <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.05] text-[color:var(--ink-50)] mb-4">
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
                <div className="space-y-5 text-[1.02rem] text-[color:var(--ink-300)] leading-relaxed max-w-lg">
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
function TiltCard({ children, className = "", perspective = 1000, strength = 12 }) {
  const outerRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = MEDIUM_OBJECT;
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [strength, -strength]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-strength, strength]), spring);

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
    <div ref={outerRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className={className} style={{ perspective: `${perspective}px` }}>
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
/* A stylized representation of RepTrack's UI — there's no production
   screenshot asset to work with, so this is a deliberate, meaningful
   HTML/CSS approximation of the real app rather than a generic
   gradient placeholder. */
function PhoneMockup() {
  const rows = [
    ["Bench press", "4×8 · 185lb"],
    ["Pull-ups", "3×10 · BW+25"],
    ["Squat", "5×5 · 225lb"],
  ];
  return (
    <div className="mx-auto w-full max-w-[270px] rounded-[2.1rem] border border-white/10 bg-black p-2 shadow-2xl shadow-black/50">
      <div className="rounded-[1.6rem] overflow-hidden bg-gradient-to-b from-[#0e1730] to-black">
        <div className="flex items-center justify-between px-5 pt-3.5 pb-2 font-mono text-[.58rem] text-slate-500">
          <span>9:41</span>
          <i className="w-4 h-2 rounded-[2px] bg-slate-600" />
        </div>
        <div className="px-5 pb-7">
          <p className="font-display text-slate-100 text-[1.05rem] font-semibold mb-1">This week</p>
          <p className="text-cyan text-[.66rem] font-mono mb-4">4 sessions logged</p>
          <div className="space-y-2">
            {rows.map(([name, meta]) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-white/[.05] px-3 py-2.5">
                <span className="text-slate-200 text-[.74rem] font-medium">{name}</span>
                <span className="font-mono text-[.58rem] text-slate-500">{meta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* RepTrack presented as an object being examined — a large, editorial
   composition rather than a card in a grid. The phone mockup and its
   two floating annotation chips sit at different translateZ depths
   inside one TiltCard, so they separate visibly as it tilts. */
function RepTrackShowcase({ project }) {
  return (
    <Reveal>
      <TiltCard perspective={1800} strength={5} className="rounded-2xl">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center py-2">
          <div className="relative order-2 lg:order-1" style={{ transform: "translateZ(30px)" }}>
            <PhoneMockup />
            <div
              className="glass absolute top-2 right-2 lg:right-0 px-3 py-1.5 rounded-lg font-mono text-[.64rem] text-cyan shadow-lg shadow-black/30"
              style={{ transform: "translateZ(70px)" }}
            >
              App Store · Live
            </div>
            <div
              className="glass absolute bottom-6 left-2 lg:left-0 px-3 py-1.5 rounded-lg font-mono text-[.64rem] text-amber shadow-lg shadow-black/30"
              style={{ transform: "translateZ(70px)" }}
            >
              SwiftUI + SwiftData
            </div>
          </div>
          <div className="order-1 lg:order-2" style={{ transform: "translateZ(15px)" }}>
            <span className="font-mono text-[.7rem] uppercase tracking-[.18em] text-amber">{project.kicker}</span>
            <h3 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] font-semibold leading-tight text-[color:var(--ink-50)]">
              {project.title}
            </h3>
            <p className="mt-5 text-[color:var(--ink-400)] leading-relaxed max-w-md">{project.body}</p>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
              {project.tags?.map((t) => (
                <span key={t} className="font-mono text-[.64rem] uppercase tracking-wide text-slate-500">
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
                className="mt-7 inline-flex items-center gap-1.5 text-amber font-medium hover:gap-2.5 transition-all w-fit"
              >
                {link.label} <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* Remaining projects as a quiet index list — an editorial line-up
   rather than a repeated grid of cards. */
function ProjectRow({ project, index }) {
  const link = project.links?.[0];
  const Wrapper = link ? "a" : "div";
  const linkProps = link
    ? { href: link.href, target: link.external ? "_blank" : undefined, rel: link.external ? "noopener noreferrer" : undefined }
    : {};
  return (
    <Reveal delay={index * 0.04}>
      <Wrapper
        {...linkProps}
        className="group grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_auto_1.5rem] items-center gap-4 sm:gap-6 py-5 border-b border-white/8 hover:border-cyan/30 transition-colors"
      >
        <span className="font-mono text-[.7rem] text-slate-600">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0">
          <h4 className="font-display font-semibold text-[color:var(--ink-100)] group-hover:text-cyan transition-colors truncate">
            {project.title}
          </h4>
          <p className="hidden sm:block text-[.82rem] text-[color:var(--ink-400)] mt-1 max-w-lg truncate">{project.body}</p>
        </div>
        <div className="hidden sm:flex gap-3 justify-end shrink-0">
          {project.tags?.slice(0, 3).map((t) => (
            <span key={t} className="font-mono text-[.6rem] uppercase tracking-wide text-slate-500">
              {t}
            </span>
          ))}
        </div>
        {link && (
          <ExternalLink
            size={15}
            className="text-slate-500 group-hover:text-cyan group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
          />
        )}
      </Wrapper>
    </Reveal>
  );
}

function WorkSection() {
  const [expanded, setExpanded] = useState(false);
  const featured = PROJECTS.find((p) => p.featured);
  const rest = PROJECTS.filter((p) => p !== featured && !p.collapsed);
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
        {featured && <div className="mb-20">{<RepTrackShowcase project={featured} />}</div>}
        <div>
          {rest.map((p, i) => (
            <ProjectRow key={p.title} project={p} index={i} />
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
                  <ProjectRow project={p} index={rest.length + i} />
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
            <h2 className="font-display text-[clamp(2.1rem,4.2vw,3.2rem)] font-semibold text-[color:var(--ink-50)] leading-[1.05] mb-4">
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
