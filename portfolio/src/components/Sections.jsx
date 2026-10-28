import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useInView } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, ExternalLink, Info, Mail } from "lucide-react";
import NameParticles from "./NameParticles";
import ProjectMotionPreview from "./ProjectMotionPreview";
import { ABOUT, CONTACT, HERO, RECEIPTS, ROLES } from "../data/content";
import { EARLIER_PROJECTS, EXPERIMENTS, FEATURED, FEATURED_GRID, LISTED_PROJECTS, MORE_PROJECTS, OPEN_SOURCE_GROUPS } from "../data/projects";
import { TOOL_INFO } from "../data/tools";
import { EASE_REVEAL } from "../lib/motion";
import { media } from "../lib/media";
import { cursorAction } from "../lib/projectMotion";
import { useStaticHero } from "../lib/staticHero";
import { useRoute } from "../appContexts";
import "../editorial.css";

const firstSentence = (text) => text.match(/[^.!?]+[.!?]+(?:\s|$)/)?.[0]?.trim() || text;
const revealImage = (event) => event.currentTarget.classList.add("is-loaded");

function Enter({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0, margin: "0px 0px 20% 0px" }} transition={{ duration: 0.3, delay: Math.min(delay, 0.06), ease: EASE_REVEAL }}>{children}</motion.div>;
}
function IndexLabel({ number, children }) {
  return <p className="ed-label"><span>{number}</span>{children}</p>;
}
function ArrowLink({ href, children, light = false }) {
  return <a className={`ed-link ${light ? "ed-link-light" : ""}`} href={href}>{children}<ArrowUpRight size={18} aria-hidden="true" /></a>;
}
const BUILT = [
  ["RepTrack", "Swift", "an iOS app"],
  ["Haloscript", "SwiftUI", "a writing app"],
  ["Sitescout", "TypeScript", "a Chrome extension"],
  ["Integration-in-a-box", "Keycloak", "a working integration"],
  ["My Take on Jev", "Python", "an AI study"],
  ["StoryEra", "Codex", "a skill for writers"],
  ["Site Recon", "Playwright", "a site inspector"],
  ["Exposure Audit", "Python", "a safe public-surface checker"],
  ["my digital double", "Claude Code", "a 3D head"],
  ["a catalogue checker", "embeddings", "a data quality check"],
  ["a weekly data delivery", "DuckDB", "a pipeline that stops itself"],
];
const PROJECT_STYLES = [
  "font-serif italic text-[#74200d]",
  "font-condensed uppercase tracking-[.02em] text-[#101010]",
  "font-display font-bold text-[#74200d]",
  "font-serif italic text-[#101010]",
];
const TOOL_STYLES = [
  "font-mono font-semibold text-[#74200d]",
  "font-condensed uppercase tracking-[.03em] text-[#101010]",
  "font-mono font-semibold text-[#74200d]",
];

/* "I built RepTrack with Swift." The project and tool swap every few
   seconds, each rising in from below in a new font and colour. */
function BuiltLine({ run }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run || reduced) return;
    const id = setInterval(() => setI((n) => (n + 1) % BUILT.length), 2600);
    return () => clearInterval(id);
  }, [run, reduced]);
  const [project, tool, what] = BUILT[i];
  const word = (text, cls, key) => (
    <span className="relative inline-grid overflow-hidden align-bottom px-1 -mx-1 pb-[.12em] -mb-[.12em]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          initial={reduced ? false : { y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduced ? undefined : { y: "-110%", opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE_REVEAL }}
          className={`inline-block whitespace-nowrap ${cls}`}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
  return (
    <div>
      <p className="font-display text-[clamp(1.25rem,2.4vw,2rem)] leading-snug text-[#101010]">
        I built {word(project, PROJECT_STYLES[i % PROJECT_STYLES.length], "p" + i)} with{" "}
        {word(tool, TOOL_STYLES[i % TOOL_STYLES.length], "t" + i)}
      </p>
      <p className="mt-2 font-mono text-xs uppercase tracking-[.18em] text-[#51463c]">
        <span className="sr-only">That's </span>
        {what} · {i + 1} of {BUILT.length}
      </p>
    </div>
  );
}


export function Hero({ ready = true }) {
  const reduced = useReducedMotion();
  const staticHero = useStaticHero();
  const heroRef = useRef(null);
  const visible = useInView(heroRef, { margin: "50px" });
  const [settled, setSettled] = useState(false);
  const onSettled = useCallback(() => setSettled(true), []);
  return <>
    <section ref={heroRef} id="hero" aria-labelledby="hero-name" className="ed-hero ed-light">
      <div className="ed-hero-meta"><span>Mohamed Ansar / Selected work</span><span>Solutions engineer · Canada</span></div>
      <h1 id="hero-name" className="sr-only">Hi, I'm Mohamed Ansar</h1>
      <div className="ed-hero-canvas"><NameParticles ready={ready} onSettled={onSettled} /></div>
      {/* Shown only when the canvas stays static, so it never doubles the
          statement the animated hero morphs into. */}
      {staticHero && <p className={reduced ? "ed-static-statement" : "ed-mobile-statement"}>{HERO.title}</p>}
      <div className="ed-hero-bottom">
        <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={settled || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.28 }}><BuiltLine run={(settled || reduced) && visible} /></motion.div>
        <a href="#projects" className="ed-scroll-link">Explore the work <ArrowDown size={20} aria-hidden="true" /></a>
      </div>
      <div className="ed-hero-edge" aria-hidden="true"><span>DATA / APPS / EXPERIMENTS</span><span>A little curiosity goes a long way.</span></div>
    </section>
    <section className="ed-intro ed-light" aria-label="What I build">
      <div className="ed-wrap">
        <Enter className="ed-intro-grid">
          <IndexLabel number="01">A bit of context</IndexLabel>
          <div><p className="ed-intro-copy">I work with retail data.<br />Then I <em>keep building.</em></p>
            <blockquote className="ed-intro-quote">Bad data rarely shows up as an error. It shows up two teams later as a <em>wrong decision.</em></blockquote>
            <p className="ed-copy">{HERO.lede.map((part) => part.text).join("")}</p>
            <ArrowLink href="#about">More about me</ArrowLink>
          </div>
        </Enter>
        <dl className="ed-receipts">{RECEIPTS.map((item) => <div key={item.label}><dt>{item.value === "PROJECTS" ? `${LISTED_PROJECTS.length}+` : item.value}</dt><dd>{item.label}</dd></div>)}</dl>
      </div>
    </section>
  </>;
}

// The title starts below its own mask, so the mask (not the clipped title)
// has to be what we watch - otherwise it never counts as in view and the
// reveal never runs.
function PunchTitle({ text }) {
  const reduced = useReducedMotion();
  const maskRef = useRef(null);
  // "some" rather than a share of the box: a long title in the narrow rail
  // never shows 72% of itself, and would stay hidden for good.
  const inView = useInView(maskRef, { once: true, margin: "0px 0px 20% 0px" });
  return <span className="ed-title-mask" ref={maskRef} aria-hidden="true"><motion.span
    className="ed-punch-title"
    initial={reduced ? false : { y: "112%" }}
    animate={reduced ? undefined : { y: inView ? "0%" : "112%" }}
    transition={{ duration: 0.48, ease: EASE_REVEAL }}
  ><i>{text[0]}</i><span>{text.slice(1)}</span></motion.span></span>;
}
function ProjectPlate({ project, compact = false }) {
  const [broken, setBroken] = useState(false);
  const [artBroken, setArtBroken] = useState(false);
  // Spotlight covers sit on the large spreads and set their own proportion;
  // card covers ride the tile's, so they only differ by which class shapes
  // the plate. The artwork carries no copy, and the card already names the
  // project, so it is decorative. If it fails, fall through to the plate this
  // project had before it got one, rather than leaving an empty frame behind
  // the caption. Tracked apart from `broken` so a failed cover still gets the
  // screenshot.
  const coverArt = project.spotlightArt || project.cardArt;
  if (coverArt && !artBroken) return <div className={`ed-project-plate ${project.spotlightArt ? "ed-spotlight-cover" : "ed-card-cover"} ${compact ? "ed-plate-compact" : ""}`} aria-hidden="true">
    <img className="ed-spotlight-art ed-lazy-media" src={media(coverArt)} alt="" loading="lazy" onLoad={revealImage} onError={() => setArtBroken(true)} />
    <ProjectMotionPreview project={project} />
    <span className="ed-poster-cross">✳</span>
    {/* Compact cards print the kind beside the plate already. */}
    {!compact && <span className="ed-plate-caption">{project.kind}</span>}
  </div>;
  const screenshot = project.cardShot || project.shots?.[0];
  const study = project.slug === "decision-models" || project.slug === "rea-study";
  if (study) return <div className={`ed-project-plate ed-study-cover ${project.slug === "rea-study" ? "ed-cover-rea" : "ed-cover-jev"}`} aria-hidden="true">
    <div className="ed-cover-grid" />
    <div className="ed-cover-orbit" />
    <p className="ed-cover-label">{project.kind}</p>
    <span className="ed-cover-type">{project.slug === "rea-study" ? "REA" : "JEV"}</span>
    <img className="ed-cover-icon ed-lazy-media" src={media(project.icon)} alt="" loading="lazy" onLoad={revealImage} />
    <span className="ed-cover-stamp">{project.slug === "rea-study" ? "TESTED, NOT ASSUMED" : "SMALL MODELS. REAL TESTS."}</span>
    <div className="ed-cover-flow">{project.flow?.columns.map((column, i) => <span key={column.label}>{column.label}{i < project.flow.columns.length - 1 && <b>↗</b>}</span>)}</div>
    <ProjectMotionPreview project={project} />
  </div>;
  return <div className={`ed-project-plate ed-poster-plate ed-poster-${project.slug} ${compact ? "ed-plate-compact" : ""} ${!screenshot && project.icon ? "ed-plate-icon" : ""} ${project.slug === "haloscript" ? "ed-plate-app" : ""}`}>
    <span className="ed-poster-word" aria-hidden="true">{project.title}</span><span className="ed-poster-cross" aria-hidden="true">✳</span>
    {screenshot && !broken ? <img className="ed-project-image ed-lazy-media" src={media(screenshot)} alt={`${project.title} interface`} loading="lazy" onLoad={revealImage} onError={() => setBroken(true)} /> : project.icon ? <><span className="ed-app-watermark" aria-hidden="true">{project.title}</span><img className="ed-project-icon ed-lazy-media" src={media(project.icon)} alt="" loading="lazy" onLoad={revealImage} /></> : <div className="ed-type-plate" aria-hidden="true"><span>{project.kind}</span><strong>{project.title}</strong><ArrowUpRight size={56} /></div>}
    <span className="ed-plate-caption">{project.kind}</span>
  </div>;
}
function FeaturedSpread({ project, index }) {
  return <Enter className={`ed-feature ${index % 2 ? "ed-feature-reverse" : ""}`}>
    <a href={`#project/${project.slug}`} id={`card-${project.slug}`} aria-label={`Read ${project.title}${project.stats?.[0] ? `. ${project.stats[0].value} ${project.stats[0].label}` : ""}`} data-cursor={cursorAction(project)} className="ed-feature-image"><ProjectPlate project={project} /></a>
    <div className="ed-feature-body"><p className="ed-label"><span>0{index + 1}</span>{project.kind}</p>
      <h3><a href={`#project/${project.slug}`} aria-label={project.title}><PunchTitle text={project.title} /></a></h3>
      <p className="ed-copy">{project.hook}</p>
      <p className="ed-project-status">{project.status}</p>
      {project.stats && <dl className="ed-project-stats">{project.stats.map((stat) => <div key={stat.label}><dt>{stat.value}</dt><dd>{stat.short || stat.label}</dd></div>)}</dl>}
      <ArrowLink href={`#project/${project.slug}`}>Read the story</ArrowLink>
    </div>
  </Enter>;
}

function OpenSourceProject({ project }) {
  return <article className="ed-open-source-project" aria-labelledby={`open-source-title-${project.slug}`}>
    <a id={`card-${project.slug}`} href={`#project/${project.slug}`} aria-label={`Read ${project.title}`} className="ed-feature-image" data-cursor={cursorAction(project)}><ProjectPlate project={project} compact /></a>
    <div className="ed-feature-body">
      <p className="ed-label">{project.cardTitle ? project.title : project.kind}</p>
      <h4 id={`open-source-title-${project.slug}`}><a href={`#project/${project.slug}`}>{project.cardTitle || project.title}</a></h4>
      <p className="ed-copy">{project.cardTitle ? firstSentence(project.hook.slice(firstSentence(project.hook).length).trim()) : firstSentence(project.hook)}</p>
      <p className="ed-project-status">{project.status}</p>
      <div className="ed-open-source-links"><ArrowLink href={`#project/${project.slug}`}>Read the story</ArrowLink>{project.spotlightLink && <ArrowLink href={project.spotlightLink.href}>{project.spotlightLink.label}</ArrowLink>}</div>
    </div>
  </article>;
}

// Keep every project story discoverable while the two collections stay compact.
function OpenSourceSpotlight({ number }) {
  return <Enter className="ed-open-source" >
    <div className="ed-open-source-heading">
      <div><p className="ed-label"><span>{number}</span>Open source & experiments</p><h3>Test the claim.<br /><em>Share the method.</em></h3></div>
      <p>Independent studies and reusable agent tools.<br />The evidence, code and limits stay public.</p>
    </div>
    <div className="ed-open-source-grid">
      {OPEN_SOURCE_GROUPS.map((group) => <section key={group.id} className={`ed-open-source-group ed-open-source-group-${group.id}`} aria-labelledby={`open-source-group-${group.id}`}>
        <header className="ed-open-source-group-heading">
          <p className="ed-label">{group.label}</p>
          <h3 id={`open-source-group-${group.id}`}>{group.title}</h3>
          <p>{group.description}</p>
        </header>
        <div className="ed-open-source-items">{group.projects.map((project) => <OpenSourceProject key={project.slug} project={project} />)}</div>
      </section>)}
    </div>
  </Enter>;
}
function ProjectTile({ project, index }) {
  return <Enter delay={(index % 2) * 0.08} className="ed-project-tile">
    <a id={`card-${project.slug}`} href={`#project/${project.slug}`} data-cursor={cursorAction(project)}><ProjectPlate project={project} compact /><div className="ed-tile-heading"><h3 aria-label={project.title}><PunchTitle text={project.title} /></h3><ArrowUpRight size={26} aria-hidden="true" /></div><p className="ed-copy">{firstSentence(project.hook)}</p><p className="ed-tile-tags">{project.tags.slice(0, 3).join(" / ")}</p></a>
  </Enter>;
}
// Hiring managers look for the data work first, so it leads; RepTrack, the
// app that is live on the App Store, opens the larger spreads.
const GRID_ORDER = ["data-delivery", "integration", "analytics-assistant", "catalogue-checker", "sitescout"];
const DATA_FIRST = GRID_ORDER.map((slug) => FEATURED_GRID.find((p) => p.slug === slug)).filter(Boolean)
  .concat(FEATURED_GRID.filter((p) => !GRID_ORDER.includes(p.slug) && p.slug !== "reptrack"));
const SPREADS = [...FEATURED_GRID.filter((p) => p.slug === "reptrack"), ...FEATURED];
export function ProjectsSection() {
  return <section id="projects" className="ed-projects ed-light ed-section">
    <div className="ed-section-watermark" aria-hidden="true">PROJECTS</div>
    <div className="ed-wrap"><Enter className="ed-section-heading"><div><IndexLabel number="02">Selected projects</IndexLabel><h2>Things I’ve <em>built.</em></h2></div><div className="ed-heading-aside"><p>Apps, data systems, and questions I wanted to test for myself.</p><ArrowLink href="#work">The full project index</ArrowLink></div></Enter>
      <div className="ed-grid-heading"><h3>Data work, built to hold up.</h3></div>
      <div className="ed-project-grid">{DATA_FIRST.map((project, i) => <ProjectTile key={project.slug} project={project} index={i} />)}</div>
      <div className="ed-feature-list">{SPREADS.map((project, i) => <FeaturedSpread key={project.slug} project={project} index={i} />)}<OpenSourceSpotlight number={String(SPREADS.length + 1).padStart(2, "0")} /></div>
      <div className="ed-work-list"><IndexLabel number="↳">Behind the scenes</IndexLabel><p className="ed-copy">Professional work is described without client names or private data. Public practice versions use unrelated public or sample data.</p>
        {MORE_PROJECTS.map((project, i) => <a key={project.slug} id={`card-${project.slug}`} href={`#project/${project.slug}`} data-cursor={cursorAction(project)} className="ed-work-row"><span className="ed-row-number">{String(i + 1).padStart(2, "0")}</span><div><h3>{project.title}</h3><p>{project.kind}</p></div><ArrowUpRight size={22} aria-hidden="true" /></a>)}
        <details className="ed-archive"><summary>Earlier work <span>{EARLIER_PROJECTS.length} projects</span></summary><ul>{EARLIER_PROJECTS.map((project) => <li key={project.slug}><a id={`card-${project.slug}`} href={`#project/${project.slug}`}>{project.title}<ArrowUpRight size={16} /></a></li>)}</ul></details>
      </div>
    </div>
  </section>;
}

// Keep the real screenshot as a fallback if a decorative cover cannot load.
function ExperimentImage({ experiment }) {
  const [artBroken, setArtBroken] = useState(false);
  return <img className="ed-lazy-media" src={media(!artBroken && experiment.cardArt ? experiment.cardArt : experiment.shot)} alt="" width={1200} height={900} loading="lazy" onLoad={revealImage} onError={() => setArtBroken(true)} />;
}

export function ExperimentsSection() {
  return <section id="ai" className="ed-experiments ed-section"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="03">The curiosity department</IndexLabel><h2>What if<br /><em>I tried this?</em></h2></div><p className="ed-heading-aside">Small experiments, made with AI as a coding partner. Open one and have a play.</p></Enter>
    <div className="ed-experiment-grid">{EXPERIMENTS.map((experiment, i) => <Enter key={experiment.id} delay={i * 0.07}><a href={experiment.href} data-cursor="Play" className="ed-experiment"><div className="ed-experiment-image"><ExperimentImage experiment={experiment} /><span>0{i + 1} / Interactive</span></div><div className="ed-experiment-title"><h3>{experiment.title}</h3><ArrowUpRight size={22} /></div><p>{experiment.hook}</p><span className="ed-experiment-cta">{experiment.cta}<ArrowRight size={16} /></span></a></Enter>)}</div>
  </div></section>;
}

function SkillGroup({ group }) {
  const [active, setActive] = useState(null);
  const id = `ed-skill-${group.title.toLowerCase().replace(/\W+/g, "-")}`;
  return <div className="ed-skill-group"><h3>{group.title}</h3><div className="ed-skills">{group.items.map((item) => <button key={item} type="button" aria-expanded={active === item} aria-controls={id} onClick={() => setActive((value) => value === item ? null : item)}>{item}{TOOL_INFO[item] && <Info size={12} aria-hidden="true" />}</button>)}</div><div id={id} aria-live="polite">{active && TOOL_INFO[active] && <p className="ed-skill-definition"><strong>{active}.</strong> {TOOL_INFO[active]}</p>}</div></div>;
}
export function AboutSection() {
  return <section id="about" className="ed-about ed-light ed-section"><div className="ed-wrap ed-about-grid">
    <Enter><IndexLabel number="04">The person behind the projects</IndexLabel><h2>Always<br /><em>learning.</em><br />Usually<br />building.</h2><div className="ed-about-mark" aria-hidden="true">ma<span>✳</span></div></Enter>
    <div><Enter className="ed-about-story">{ABOUT.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</Enter><div className="ed-skill-groups">{ABOUT.groups.map((group) => <SkillGroup key={group.title} group={group} />)}</div></div>
  </div></section>;
}
export function ExperienceSection() {
  return <section id="experience" className="ed-experience ed-section"><div className="ed-wrap"><Enter className="ed-section-heading"><div><IndexLabel number="05">Experience</IndexLabel><h2>The path<br /><em>so far.</em></h2></div><p className="ed-heading-aside">From checking content catalogues to working with retail pricing data. More responsibility. More things to figure out.</p></Enter>
    <div className="ed-timeline">{ROLES.map((role) => <Enter key={role.company + role.title} className={`ed-role ${role.compact ? "ed-role-compact" : ""}`}><div className="ed-role-when"><span>{role.when}</span>{role.current && <b>Currently here</b>}</div><div><p className="ed-role-company">{role.company}</p><h3>{role.title}</h3>{!role.compact && <><p className="ed-role-summary">{role.summary}</p><ul>{role.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></>}</div><span className="ed-role-arrow" aria-hidden="true">↗</span></Enter>)}</div>
  </div></section>;
}
export function ContactSection() {
  const { navigate } = useRoute();
  return <section id="contact" className="ed-contact ed-light"><div className="ed-wrap"><IndexLabel number="06">Something in mind?</IndexLabel><h2>Let's make<br /><em>something work.</em></h2><div className="ed-contact-bottom"><a href={`mailto:${CONTACT.email}`} className="ed-contact-email" data-cursor="Email">Say hello<ArrowUpRight aria-hidden="true" /></a><div><p>Questions about a project, or want to talk data?<br />I read every message.</p><div className="ed-socials"><a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<ExternalLink size={14} /></a><a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={14} /></a><a href={`mailto:${CONTACT.email}`}><Mail size={14} />Email</a></div></div></div><footer className="ed-footer"><span>Mohamed Ansar © {new Date().getFullYear()}</span><span>Made with curiosity. And a lot of testing.</span><button onClick={() => navigate("deck")} aria-label="Back to top">Back to top ↑</button></footer></div></section>;
}

