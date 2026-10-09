import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { animate, cubicBezier, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Link2, Lock, Mail } from "lucide-react";
import { ABOUT, CONTACT, HERO, ROLES } from "../data/content";
import { ACCENTS, EXPERIMENTS, FEATURED, MORE_PROJECTS } from "../data/projects";
import { FlourishTitle, Reveal, ScrollShot, SectionHead, SpinBadge, TagPill } from "./ui";
import { useRoute } from "../App";
import { EASE_REVEAL } from "../lib/motion";

// Every section below the hero is a full-bleed color block of its own.
const BLOCK = "relative overflow-hidden scroll-mt-16 px-5 py-20 sm:py-28";
const INNER = "relative mx-auto w-full max-w-[1180px]";

/* A one-line flowchart preview: the column labels as coloured chips
   joined by arrows. The full diagram lives on the project page. */
function FlowMini({ spec, accent }) {
  const a = ACCENTS[accent];
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-hidden="true">
      {spec.columns.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span className={`font-mono text-micro uppercase tracking-wide px-2 py-1 rounded-md border ${a.border} ${a.text} ${a.soft}`}>
            {c.label}
          </span>
          {i < spec.columns.length - 1 && <ArrowRight size={12} className="text-[color:var(--ink-300)]" />}
        </span>
      ))}
    </div>
  );
}

/* Where a project's live link points, shown in the preview frame's
   address bar; falls back to the project title. */
function frameLabel(project) {
  const live = project.links?.find((l) => l.external && l.primary);
  try {
    return live ? new URL(live.href).host + new URL(live.href).pathname.replace(/\/$/, "") : project.title;
  } catch {
    return project.title;
  }
}

/* The project's visual, in order of preference: its first screenshot in
   a scrolling browser frame; its app icon (RepTrack) floating over the
   flow; or a typographic card (kind, flow chips, large initial). A
   screenshot that fails to load falls back to the typographic card. */
function ProjectVisual({ project, large = false }) {
  const a = ACCENTS[project.accent];
  const [broken, setBroken] = useState(false);
  const ratio = large ? "aspect-[16/11]" : "aspect-[16/9]";
  if (project.shots?.[0] && !broken) {
    return <ScrollShot src={project.shots[0]} label={frameLabel(project)} onError={() => setBroken(true)} ratio={ratio} />;
  }
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 ${large ? "sm:p-8" : ""} ${ratio}`}
      style={{ background: `radial-gradient(130% 100% at 0% 0%, ${a.hex}38, transparent 62%), rgba(5, 9, 17, 0.5)`, borderColor: `${a.hex}45` }}
    >
      {project.icon ? (
        <img
          src={project.icon}
          alt=""
          loading="lazy"
          className="float-y pointer-events-none absolute left-1/2 top-[38%] w-[28%] max-w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-[22%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[.18em] right-[.06em] font-serif italic leading-none transition-transform duration-500 ease-out group-hover:-translate-y-2"
          style={{ color: `${a.hex}2e`, fontSize: large ? "clamp(9rem,20vw,16rem)" : "8rem" }}
        >
          {project.title[0]}
        </span>
      )}
      <span className={`relative font-mono text-micro font-semibold uppercase tracking-[.16em] ${a.text}`}>{project.kind}</span>
      {project.flow && (
        <div className="relative">
          <FlowMini spec={project.flow} accent={project.accent} />
        </div>
      )}
    </div>
  );
}

/* Oversized, faint section word behind the content, drifting slower than
   the page scrolls. Decorative only. */
function Watermark({ text, targetRef, scrollContainerRef }) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: scrollContainerRef, target: targetRef, offset: ["start end", "end start"] });
  // Function form, for the same ScrollTimeline reason as HeroPhrase.
  const y = useTransform(scrollYProgress, (v) => `${(v - 0.5) * 60}vh`);
  return (
    <motion.div
      aria-hidden="true"
      style={reduced ? undefined : { y }}
      className="pointer-events-none absolute inset-x-0 top-[12vh] select-none text-center font-condensed uppercase leading-none tracking-[.12em] text-white/[.045] text-[clamp(6rem,24vw,22rem)]"
    >
      {text}
    </motion.div>
  );
}

/* ── HERO ───────────────────────────────────────────────────── */
const InfinityLoop = lazy(() => import("./InfinityLoop"));

const HERO_INK = "#0b1220";
// The lede's highlighted phrases (SQL, iOS app, AI), reused as the
// script overlays on the pinned headline, each in its own accent color
// and position. Positions are % of the headline box.
const OVERLAY_SPOTS = [
  { top: "4%", left: "56%", rotate: -7, range: [0.5, 0.6] },
  { top: "38%", left: "4%", rotate: -5, range: [0.6, 0.7] },
  { top: "70%", left: "50%", rotate: -8, range: [0.7, 0.8] },
];
const HERO_PHRASES = HERO.lede.filter((s) => s.cls);
const TITLE_WORDS = HERO.title.split(" ");
// Where the headline is fully built (the last phrase's range ends here).
const REVEAL_END = 0.8;
// How long a visitor can pause mid-headline before it finishes itself.
const IDLE_MS = 500;

const revealEase = cubicBezier(...EASE_REVEAL);
const eased = (v, from, to) => revealEase(Math.min(1, Math.max(0, (v - from) / (to - from))));

/* One word of the pinned headline: it rises out of its own mask (with a
   slight tilt that straightens as it lands) over its own slice of the
   scroll, so the sentence builds word by word as you scroll into it. */
function RiseWord({ word, index, progress, reduced }) {
  const from = 0.02 + index * 0.026;
  const k = useTransform(progress, (v) => eased(v, from, from + 0.12));
  const y = useTransform(k, (t) => `${(1 - t) * 108}%`);
  const rotate = useTransform(k, (t) => (1 - t) * 7);
  return (
    <span className="inline-block overflow-hidden align-bottom pb-[.04em] -mb-[.04em]">
      <motion.span className="inline-block origin-bottom-left" style={reduced ? undefined : { y, rotate }}>
        {word}
      </motion.span>
    </span>
  );
}

function HeroPhrase({ phrase, spot, progress, reduced }) {
  // Function-form transforms on purpose: framer hands a plain range-mapped
  // opacity to the browser's native ScrollTimeline, which tracks the
  // document scroller, not <main>, so the phrases faded on the wrong scroll.
  const [from, to] = spot.range;
  const opacity = useTransform(progress, (v) => eased(v, from, to));
  const y = useTransform(opacity, (k) => 28 * (1 - k));
  return (
    <motion.span
      aria-hidden="true"
      style={reduced ? { top: spot.top, left: spot.left, rotate: spot.rotate } : { top: spot.top, left: spot.left, rotate: spot.rotate, opacity, y }}
      className={`absolute whitespace-nowrap font-serif italic font-normal normal-case leading-none tracking-normal text-[clamp(2.2rem,5.6vw,5.4rem)] [text-shadow:0_0_2px_#050911,0_2px_18px_rgba(5,9,17,.85)] ${phrase.cls.replace("font-semibold", "")}`}
    >
      {phrase.text}
    </motion.span>
  );
}

export function Hero({ ready = true, scrollContainerRef }) {
  const reduced = useReducedMotion();
  const heroRef = useRef(null);
  const pinRef = useRef(null);
  // Starts while the headline section is still rising into view (its top
  // at 60% of the viewport), so the first words are already landing by
  // the time it pins.
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: pinRef,
    offset: ["start 0.6", "end end"],
  });
  // Camera dolly: as the hero scrolls away the card pulls back while the
  // oval pushes in toward the loop (which is dispersing at the same time).
  const { scrollYProgress: heroOut } = useScroll({
    container: scrollContainerRef,
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // If the visitor stops scrolling partway through the headline, it
  // finishes on its own after IDLE_MS: `auto` plays from where the scroll
  // left it up to REVEAL_END, and the words read whichever is further
  // along. Once that's happened it stays built (no un-revealing on the
  // way back up); before that, scroll scrubs it both ways as usual.
  const auto = useMotionValue(0);
  const revealed = useTransform([scrollYProgress, auto], ([s, a]) => Math.max(s, a));
  const finished = useRef(false);
  const idle = useRef(null);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    clearTimeout(idle.current);
    if (reduced || finished.current || v <= 0.001 || v >= REVEAL_END) return;
    idle.current = setTimeout(() => {
      finished.current = true;
      const from = Math.max(auto.get(), scrollYProgress.get());
      auto.set(from);
      animate(auto, REVEAL_END, { duration: 0.5 + 1.4 * (1 - from / REVEAL_END), ease: "linear" });
    }, IDLE_MS);
  });
  useEffect(() => () => clearTimeout(idle.current), []);

  const cardScale = useTransform(heroOut, (v) => 1 - 0.08 * v);
  const ovalScale = useTransform(heroOut, (v) => 1 + 0.4 * v);
  const chromeOpacity = useTransform(heroOut, (v) => 1 - Math.min(1, v * 2.2));
  // Entrance for the card's label and button: a left-to-right wipe.
  // (Opacity is left free for the scroll fade below.)
  const enter = (d) => ({
    initial: reduced ? false : { clipPath: "inset(0 100% 0 0)" },
    animate: ready ? { clipPath: "inset(0 0% 0 0)" } : { clipPath: "inset(0 100% 0 0)" },
    transition: { duration: 1.1, delay: d, ease: EASE_REVEAL },
  });
  // Long enough to overflow wide screens; two identical halves make the
  // ticker's -50% loop seamless.
  const ticker = Array.from({ length: 6 }, () => `— ${HERO.eyebrow} `).join("");

  function scrollPastHero() {
    const main = scrollContainerRef?.current;
    if (!main || !heroRef.current) return;
    main.scrollTo({ top: heroRef.current.offsetHeight, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <>
      {/* 1. The light frame: a white card with the loop in an oval window. */}
      <section
        ref={heroRef}
        id="hero"
        className="relative min-h-[100dvh] flex flex-col bg-[#eef6f7] px-3 sm:px-5 pt-[4.75rem] pb-4 sm:pb-5"
        style={{ color: HERO_INK }}
      >
        <motion.div
          style={reduced ? undefined : { scale: cardScale }}
          className="relative flex-1 min-h-[440px] origin-top rounded-2xl bg-white border border-[#0b1220]/10 overflow-hidden"
        >
          {/* Hairline crosshair through the card's center. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-[#0b1220]/[.07]" />
          <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-[#0b1220]/[.07]" />

          {/* Inset from the card's edges, so the oval scales with the card
              and keeps clear of the label (top) and button (bottom). */}
          <motion.div
            style={reduced ? undefined : { scale: ovalScale }}
            className="absolute inset-x-[5%] inset-y-[17%] sm:inset-x-[7%] sm:inset-y-[13%]"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.86, clipPath: "ellipse(10% 10% at 50% 50%)" }}
              animate={ready ? { opacity: 1, scale: 1, clipPath: "ellipse(50% 50% at 50% 50%)" } : undefined}
              transition={{ duration: 1.4, delay: 0.1, ease: EASE_REVEAL }}
              className="absolute inset-0 rounded-[50%] overflow-hidden bg-[#0b1426] shadow-[0_30px_60px_-30px_rgba(11,18,32,.45)] [isolation:isolate]"
            >
              <Suspense fallback={<div className="atmosphere-fallback absolute inset-0" aria-hidden="true" />}>
                <InfinityLoop scrollContainerRef={scrollContainerRef} />
              </Suspense>
            </motion.div>
          </motion.div>

          <motion.p
            {...enter(0.35)}
            style={reduced ? undefined : { opacity: chromeOpacity }}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 max-w-[calc(100%-2rem)] rounded-md border border-[#0b1220]/12 bg-white/85 px-3 py-2 font-mono text-xs font-medium uppercase tracking-[.16em]"
          >
            {HERO.eyebrow}
          </motion.p>

          <motion.button
            {...enter(0.55)}
            style={reduced ? undefined : { opacity: chromeOpacity }}
            type="button"
            onClick={scrollPastHero}
            className="group absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-3 rounded-full border border-[#0b1220]/12 bg-white/85 py-1.5 pl-4 pr-1.5 font-mono text-micro font-medium uppercase tracking-[.16em] transition-transform duration-200 active:scale-[.97]"
          >
            Scroll down to explore
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0b1220] text-white transition-transform duration-200 group-hover:translate-y-0.5">
              <ArrowDown size={15} />
            </span>
          </motion.button>
        </motion.div>

        {/* Ticker: the eyebrow on a slow loop beneath the card. */}
        <div aria-hidden="true" className="mt-3 overflow-hidden whitespace-nowrap font-mono text-xs font-medium uppercase tracking-[.22em] text-[#475569]">
          <div className="marquee-track inline-flex">
            <span className="pr-[.5em]">{ticker}</span>
            <span className="pr-[.5em]">{ticker}</span>
          </div>
        </div>
      </section>

      {/* 2. The headline, pinned while the lede's phrases write themselves in. */}
      <section ref={pinRef} aria-labelledby="hero-title" className={`relative bg-ink ${reduced ? "" : "h-[200vh]"}`}>
        <div className={`${reduced ? "py-24" : "sticky top-0 h-[100dvh]"} flex items-center justify-center overflow-hidden px-5`}>
          <div className="relative w-full max-w-[1200px]">
            <h1
              id="hero-title"
              className="font-condensed uppercase text-white text-center leading-[.94] tracking-[.005em] text-[clamp(3rem,8.6vw,8.5rem)]"
            >
              {TITLE_WORDS.map((w, i) => (
                <Fragment key={i}>
                  <RiseWord word={w} index={i} progress={revealed} reduced={reduced} />
                  {i < TITLE_WORDS.length - 1 && " "}
                </Fragment>
              ))}
            </h1>
            {HERO_PHRASES.map((phrase, i) => (
              <HeroPhrase key={phrase.text} phrase={phrase} spot={OVERLAY_SPOTS[i % OVERLAY_SPOTS.length]} progress={revealed} reduced={reduced} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. The lede in full, and the two ways forward. */}
      <section className="bg-ink px-5 pb-20 pt-4 sm:pb-28">
        <div className="mx-auto w-full max-w-[1180px]">
          <Reveal className="max-w-3xl">
            <p className="text-lg sm:text-xl leading-relaxed text-[color:var(--ink-200)]">
              {HERO.lede.map((s, i) => (
                <span key={i} className={s.cls}>
                  {s.text}
                </span>
              ))}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#projects"
                className="inline-flex min-h-11 items-center gap-2 px-5 py-3 rounded-full bg-white text-[#050911] font-bold text-sm transition-colors duration-200 hover:bg-[#a8f8ff] active:scale-[.97]"
              >
                See my projects <ArrowRight size={15} />
              </a>
              <a
                href="#contact"
                className="inline-flex min-h-11 items-center gap-2 px-5 py-3 rounded-full border border-white/30 text-white font-medium text-sm transition-colors duration-200 hover:bg-white/10 hover:border-white/60 active:scale-[.97]"
              >
                Say hello
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ── PROJECTS ───────────────────────────────────────────────── */
function FeaturedRow({ project, index }) {
  const a = ACCENTS[project.accent];
  const flip = index % 2 === 1;
  return (
    <Reveal>
      <a
        href={`#project/${project.slug}`}
        data-cursor="View"
        className="group grid items-center gap-6 rounded-3xl lg:gap-14 lg:grid-cols-[1.1fr_1fr] active:scale-[.995] transition-transform duration-200"
      >
        <div className={flip ? "lg:order-2" : ""}>
          <ProjectVisual project={project} large />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[.16em]">
            <span className={`font-semibold ${a.text}`}>{project.kind}</span>
            <span className="text-[color:var(--ink-300)]">{project.status}</span>
          </div>
          <h3 aria-label={project.title} className="mt-3 text-white leading-[.95] text-[clamp(2.6rem,6vw,4.8rem)]">
            <FlourishTitle text={project.title} accent={project.accent} />
          </h3>
          <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-[color:var(--ink-200)]">{project.hook}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {project.tags.slice(0, 3).map((t) => (
              <TagPill key={t} accent={project.accent}>
                {t}
              </TagPill>
            ))}
          </div>
          <div className="mt-7">
            <SpinBadge label="Read the story" accent={project.accent} />
          </div>
        </div>
      </a>
    </Reveal>
  );
}

/* One project in the side-scrolling rail, with everything the old grid
   card had and more: visual, kind and status, the full hook (no clamp),
   my role, every tag, and its own primary link. The card's title is a
   stretched link to the project page; the primary link sits above it so
   both stay clickable (no nested <a>). */
function RailCard({ project }) {
  const a = ACCENTS[project.accent];
  const link = project.links?.find((l) => l.primary) || project.links?.[0];
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5 transition-[border-color,background-color] duration-200 hover:border-white/25 hover:bg-white/[.06]">
      <ProjectVisual project={project} />
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-micro uppercase tracking-[.14em]">
        <span className={`font-semibold ${a.text}`}>{project.kind}</span>
        <span className="text-[color:var(--ink-300)]">{project.status}</span>
      </div>
      <h4 className="mt-2 font-display text-xl font-semibold leading-snug text-white">
        <a
          href={`#project/${project.slug}`}
          data-cursor="View"
          className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-current"
        >
          {project.title}
        </a>
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-200)]">{project.hook}</p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--ink-300)]">
        <span className={`mr-2 font-mono text-micro uppercase tracking-[.14em] ${a.text}`}>My role</span>
        {project.role}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.tags.map((t) => (
          <TagPill key={t} accent={project.accent}>
            {t}
          </TagPill>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <span className={`inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[.12em] ${a.text}`}>
          Read the story <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
        </span>
        {link && (
          <a
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="relative z-10 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-left text-xs text-[color:var(--ink-200)] transition-colors duration-200 hover:border-white/50 hover:text-white active:scale-[.97]"
          >
            {link.locked ? <Lock size={12} className="shrink-0" /> : <ArrowUpRight size={13} className="shrink-0" />}
            <span>{link.label}</span>
          </a>
        )}
      </div>
    </article>
  );
}

/* The other projects in one horizontal rail: native scroll (swipe,
   trackpad, shift-wheel, arrow keys once focused), snap points, arrow
   buttons, a position counter and a progress bar, plus click-drag for
   mouse users. Dragging suppresses the click that would otherwise
   follow it, so letting go over a card doesn't open it. */
function ProjectRail({ projects }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const drag = useRef(null);
  const [view, setView] = useState({ index: 0, progress: 0, visible: 1, atStart: true, atEnd: false });
  const [dragging, setDragging] = useState(false);

  function step() {
    const el = ref.current;
    const first = el?.firstElementChild;
    if (!el || !first) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }
  function update() {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setView({
      index: Math.min(projects.length - 1, Math.round(el.scrollLeft / step())),
      progress: max > 0 ? el.scrollLeft / max : 0,
      visible: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
      atStart: el.scrollLeft < 4,
      atEnd: el.scrollLeft > max - 4,
    });
  }
  useEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nudge(dir) {
    const el = ref.current;
    const perPage = Math.max(1, Math.floor(el.clientWidth / step()));
    el.scrollBy({ left: dir * perPage * step(), behavior: reduced ? "auto" : "smooth" });
  }

  function onPointerDown(e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      ref.current.setPointerCapture(e.pointerId);
    }
    if (d.moved) ref.current.scrollLeft = d.left - dx;
  }
  function endDrag() {
    if (drag.current?.moved) setDragging(false);
    // Keep the flag for the click that fires right after pointerup.
    setTimeout(() => {
      drag.current = null;
    }, 0);
  }

  const arrow =
    "grid h-11 w-11 place-items-center rounded-full border border-white/25 text-white transition-[opacity,background-color,border-color] duration-200 hover:border-white/60 hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30";
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.16em] text-[color:var(--ink-300)]">More projects</p>
          <p className="mt-1 font-condensed text-3xl leading-none text-white tabular-nums" aria-live="polite">
            {String(view.index + 1).padStart(2, "0")}
            <span className="text-white/35"> / {String(projects.length).padStart(2, "0")}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => nudge(-1)} disabled={view.atStart} aria-label="Previous projects" className={arrow}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => nudge(1)} disabled={view.atEnd} aria-label="Next projects" className={arrow}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        role="region"
        aria-label={`More projects, ${projects.length} cards, scroll sideways`}
        tabIndex={0}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // Links and images are natively draggable; that HTML drag would
        // cancel the pointer stream before click-drag scrolling starts.
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`-mx-5 flex gap-5 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory"
        }`}
      >
        {projects.map((p) => (
          <div key={p.slug} className="w-[min(84vw,380px)] shrink-0 snap-start">
            <RailCard project={p} />
          </div>
        ))}
      </div>
      <div className="relative mt-4 h-px overflow-hidden bg-white/15" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 bg-white"
          style={{ width: `${view.visible * 100}%`, transform: `translateX(${(view.progress * (1 - view.visible)) / Math.max(view.visible, 0.0001) * 100}%)` }}
        />
      </div>
    </div>
  );
}

export function ProjectsSection({ scrollContainerRef }) {
  const ref = useRef(null);
  return (
    <section ref={ref} id="projects" className={`${BLOCK} bg-block-green`}>
      <Watermark text="Projects" targetRef={ref} scrollContainerRef={scrollContainerRef} />
      <div className={INNER}>
        <SectionHead
          accent="green"
          kicker="Projects"
          title="Things I've built"
          lede="Three I'd start with, then the rest. Click any card for the story, a diagram of how it works, and a link to try it or read the code."
        />
        <div className="space-y-16 sm:space-y-24">
          {FEATURED.map((p, i) => (
            <FeaturedRow key={p.slug} project={p} index={i} />
          ))}
        </div>
        <div className="mt-20 sm:mt-28">
          <ProjectRail projects={MORE_PROJECTS} />
        </div>
      </div>
    </section>
  );
}

/* ── SKILLS TICKER ──────────────────────────────────────────── */
/* The About section's skills on a giant loop between sections. It runs
   on its own, and scrolling bends it: the scroll velocity, smoothed by
   a spring, skews the type and pushes it along faster, then lets it
   settle back when you stop. Decorative; the skills are listed in About. */
const SKILL_ITEMS = ABOUT.groups.flatMap((g) => g.items.map((item) => ({ item, accent: g.accent })));

export function SkillsTicker({ scrollContainerRef }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 40, stiffness: 300 });
  const skewX = useTransform(smooth, (v) => Math.max(-12, Math.min(12, v / -120)));
  const x = useTransform(smooth, (v) => `${Math.max(-6, Math.min(6, v / -600))}vw`);
  const row = (
    <span className="inline-flex items-center pr-[.4em]">
      {SKILL_ITEMS.map(({ item, accent }, i) => (
        <span key={item} className="inline-flex items-center">
          <span className={i % 3 === 1 ? `font-serif italic normal-case ${ACCENTS[accent].text}` : "font-condensed uppercase text-white"}>{item}</span>
          <span className="mx-[.45em] text-[.4em] text-white/40">✻</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden="true" className="relative overflow-hidden border-y border-white/10 bg-ink py-6 sm:py-8">
      <motion.div style={reduced ? undefined : { skewX, x }} className="whitespace-nowrap text-[clamp(2.4rem,6.5vw,5.5rem)] leading-none">
        <div className="marquee-track inline-flex [animation-duration:60s]">
          {row}
          {row}
        </div>
      </motion.div>
    </div>
  );
}

/* ── EXPERIENCE ─────────────────────────────────────────────── */
function RoleRow({ role }) {
  const a = ACCENTS[role.accent];
  return (
    <Reveal>
      <article className="grid gap-4 border-t border-white/15 py-8 sm:py-10 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-xs font-semibold uppercase tracking-[.14em] ${a.text}`}>{role.company}</span>
            {role.current && (
              <span className="rounded-full border border-green/50 bg-green/10 px-2 py-0.5 font-mono text-micro uppercase tracking-wide text-green">Now</span>
            )}
          </div>
          <p className="mt-2 font-mono text-micro text-[color:var(--ink-300)]">{role.when}</p>
        </div>
        <div>
          <h3 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-white">{role.title}</h3>
          <p className="mt-3 font-serif italic text-xl sm:text-2xl leading-snug text-[color:var(--ink-100)]">{role.summary}</p>
          <ul className="mt-4 space-y-2 text-base leading-relaxed text-[color:var(--ink-200)]">
            {role.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-[.7em] h-1 w-1 shrink-0 rounded-full" style={{ background: a.hex }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {role.tags.map((t) => (
              <TagPill key={t} accent={role.accent}>
                {t}
              </TagPill>
            ))}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" className={`${BLOCK} bg-block-amber`}>
      <div className={INNER}>
        <SectionHead
          accent="amber"
          kicker="Experience"
          title="Where I've worked"
          lede="From auditing content catalogues to writing SQL on retail pricing data. Each stop gave me a bit more technical ownership."
        />
        <p className="mb-2 font-mono text-xs uppercase tracking-[.16em] text-[color:var(--ink-300)]">Newest first</p>
        <div className="border-b border-white/15">
          {ROLES.map((r) => (
            <RoleRow key={r.company + r.title} role={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── ABOUT ──────────────────────────────────────────────────── */
export function AboutSection({ scrollContainerRef }) {
  const reduced = useReducedMotion();
  const storyRef = useRef(null);
  // Word-by-word reveal off a single scroll value: the container carries
  // --p (0-1 progress) and --n (word count), each word its own --i, and
  // CSS (.word-reveal) turns that into an opacity. One style write per
  // scroll frame, no per-word observers or motion values.
  const { scrollYProgress } = useScroll({ container: scrollContainerRef, target: storyRef, offset: ["start 0.85", "end 0.55"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!reduced) storyRef.current?.style.setProperty("--p", v.toFixed(4));
  });
  useEffect(() => {
    storyRef.current?.style.setProperty("--p", reduced ? "1" : scrollYProgress.get().toFixed(4));
  }, [reduced, scrollYProgress]);

  let wordIndex = 0;
  const paragraphs = ABOUT.story.map((para) => para.split(" ").map((w) => ({ w, i: wordIndex++ })));

  return (
    <section id="about" className={`${BLOCK} bg-block-violet`}>
      <div className={INNER}>
        <SectionHead accent="violet" kicker="About" title={ABOUT.title} align="center" />
        <div
          ref={storyRef}
          style={{ "--n": wordIndex, "--p": reduced ? 1 : 0 }}
          className="mx-auto max-w-3xl space-y-7 font-serif italic text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.38] text-white"
        >
          {paragraphs.map((words) => (
            <p key={words[0].i}>
              {words.map(({ w, i }) => (
                <span key={i} className="word-reveal" style={{ "--i": i }}>
                  {w}{" "}
                </span>
              ))}
            </p>
          ))}
        </div>
        <Reveal className="mx-auto mt-16 grid max-w-3xl gap-8 sm:grid-cols-2">
          {ABOUT.groups.map((g) => {
            const a = ACCENTS[g.accent];
            return (
              <div key={g.title}>
                <h3 className={`mb-3 font-mono text-xs font-semibold uppercase tracking-[.16em] ${a.text}`}>{g.title}</h3>
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
        </Reveal>
      </div>
    </section>
  );
}

/* ── BUILT WITH AI ──────────────────────────────────────────── */
export function ExperimentsSection() {
  return (
    <section id="ai" className={`${BLOCK} bg-ink`}>
      <div className={INNER}>
        <SectionHead
          accent="rose"
          kicker="Built with AI"
          title="Experiments with an AI pair programmer"
          lede="These aren't my day job. They're what happens when I ask an AI for help, look at the result, and keep pushing. Some of this very page is one of them."
        />
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {EXPERIMENTS.map((x, i) => {
            const a = ACCENTS[x.accent];
            const Body = x.href ? "a" : "div";
            return (
              <Reveal key={x.id} delay={i * 0.07} className="h-full">
                <Body
                  {...(x.href ? { href: x.href, "data-cursor": "Open" } : {})}
                  className={`flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6 ${
                    x.href
                      ? "group transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-white/25 hover:bg-white/[.06] focus-visible:-translate-y-1 active:translate-y-0 active:scale-[.99]"
                      : ""
                  }`}
                  style={{ borderTop: `3px solid ${a.hex}` }}
                >
                  {x.shot && (
                    <div className="-mx-5 -mt-5 mb-5 overflow-hidden rounded-t-[14px] border-b border-white/10 sm:-mx-6 sm:-mt-6 aspect-[16/9]">
                      <img
                        src={x.shot}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    </div>
                  )}
                  <h3 className="font-display text-xl font-semibold leading-snug text-white">{x.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${a.text}`}>{x.hook}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-200)]">{x.body}</p>
                  {x.cta && (
                    <span className={`mt-auto pt-5 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[.12em] ${a.text}`}>
                      {x.cta} <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
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
function MarqueeUnit() {
  return (
    <span className="inline-flex items-center">
      <span className="relative inline-block">
        <span className="font-condensed uppercase text-white">Say hello</span>
        <span className="absolute left-[22%] top-[34%] -rotate-6 whitespace-nowrap font-serif italic normal-case text-rose text-[.42em] [text-shadow:0_0_2px_#23091a,0_2px_16px_rgba(35,9,26,.9)]">
          let's talk
        </span>
      </span>
      <span className="mx-[.3em] grid h-[.72em] w-[.72em] place-items-center rounded-full bg-rose text-[#23091a]">
        <Mail className="h-[.32em] w-[.32em]" />
      </span>
    </span>
  );
}

export function ContactSection() {
  const { navigate } = useRoute();
  return (
    <section id="contact" className="relative overflow-hidden scroll-mt-16 bg-block-rose">
      {/* The whole strip is the email link; the moving text is decoration. */}
      <a
        href={`mailto:${CONTACT.email}`}
        aria-label={`Email me at ${CONTACT.email}`}
        data-cursor="Email"
        className="group block overflow-hidden whitespace-nowrap border-b border-white/12 pt-20 pb-8 sm:pt-28 sm:pb-10 text-[clamp(4rem,13vw,11rem)] leading-none"
      >
        <div aria-hidden="true" className="marquee-track inline-flex [animation-duration:22s] group-hover:[animation-play-state:paused]">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <MarqueeUnit key={k} />
          ))}
        </div>
      </a>

      <div className="px-5 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-tight text-white">
            If something here caught your eye, <span className="font-serif italic font-normal text-rose">let's talk</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-[color:var(--ink-200)]">
            A data problem that needs untangling, a pipeline that has to hold, or a tool that needs building. I read every message.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={`mailto:${CONTACT.email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#23091a] transition-colors duration-200 hover:bg-[#ffd3dc] active:scale-[.97]"
            >
              <Mail size={15} /> Email me
            </a>
            <a
              href={CONTACT.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/60 hover:bg-white/10 active:scale-[.97]"
            >
              <Link2 size={15} /> LinkedIn
            </a>
            <a
              href={CONTACT.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/60 hover:bg-white/10 active:scale-[.97]"
            >
              <ExternalLink size={15} /> GitHub
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-[color:var(--ink-300)]">{CONTACT.email}</p>
        </Reveal>
      </div>

      <footer className="border-t border-white/12 px-5 py-6">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="font-mono text-micro uppercase tracking-[.12em] text-[color:var(--ink-300)]">
            <p>
              Designed and built by Mohamed Ansar · © {new Date().getFullYear()}
            </p>
            <p className="mt-1">Built with React, Vite and Tailwind</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("deck")}
            aria-label="Back to top"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#23091a] transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
}
