import { Component, createRef, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import EmetSection from "./components/EmetSection";
import { Hero, ProjectsSection, ExperienceSection, AboutSection, ExperimentsSection, ContactSection } from "./components/Sections";
import ProjectPage from "./components/ProjectPage";
import ProjectWorkPage from "./components/ProjectWorkPage";
import SandboxStubs from "./components/SandboxStubs";
import CommandPalette from "./components/CommandPalette";
import { MatrixBackground } from "./components/RouteBackgrounds";
import IntroCurtain from "./components/IntroCurtain";
import PaletteSwatch from "./components/PaletteSwatch";
import { shouldPlayIntro } from "./lib/intro";
import { EASE_OUT } from "./lib/motion";
import { titleForRoute } from "./lib/routeTitle";
import { CONTACT } from "./data/content";
import { applyPalette, clearPalette, paletteForRoute, pickPalette } from "./lib/palettes";
import { OPEN_SOURCE_PROJECTS } from "./data/projects";
import { RouteContext, SandboxContext, ScrollContext, ThemeContext, useRoute, useSandbox } from "./appContexts";

const SolarSystemExplorer = lazy(() => import("./components/SolarSystemExplorer"));
const DataLineageExplorer = lazy(() => import("./components/DataLineageExplorer"));
const DigitalDouble = lazy(() => import("./components/DigitalDouble"));
const HaloscriptPage = lazy(() => import("./components/HaloscriptPage"));
const InfinityPage = lazy(() => import("./components/InfinityPage"));
const BB8Companion = lazy(() => import("./components/BB8Companion"));

/* ============================================================
   ROUTER: "emet", "explore", "lineage-demo", "digital-double" and "project/<slug>" are
   full takeover views (reached from cards, the nav or the command
   palette). "main" is everything else: a single scrolled page, the
   hero followed by Projects, Experience, About, Built with AI and
   Contact, so a nav link
   pointing at one of those doesn't swap a view, it smooth-scrolls to
   that section's id within the document. Hash-based so every existing
   <a href="#build"> (nav, emet's shortcuts, the command palette) keeps
   working completely unmodified — only the interpretation of a
   non-takeover hash changed, from "which view is active" to "which
   section to scroll to."
   ============================================================ */
function parseRoute(h) {
  if (h === "emet" || h === "explore" || h === "lineage-demo" || h === "digital-double" || h === "infinity" || h === "work") return h;
  if (h.startsWith("project/")) return h;
  return "main";
}

function readRoute() {
  if (typeof window === "undefined") return "main";
  return parseRoute(window.location.hash.replace(/^#/, ""));
}

// Shared with the hero's InfinityLoop so it can read scroll position
// off the same element Stage renders as <main> — set once, read every
// frame via a plain ref rather than React state so scrolling never
// triggers a re-render.
// Coming back from a project page, the main document only mounts once the
// page's exit animation finishes, so keep looking for the section for a
// moment instead of giving up after one frame.
function scrollToSection(id, tries = 60) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) {
      const archive = el.closest("details");
      if (archive) archive.open = true;
      const scroller = el.closest("main");
      const distance = scroller ? Math.abs(el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) : 0;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = reduced || (scroller && distance > scroller.clientHeight * 1.25) ? "auto" : "smooth";
      el.scrollIntoView({ behavior, block: id.startsWith("card-") ? "center" : "start", inline: "nearest" });
    }
    else if (tries > 0) scrollToSection(id, tries - 1);
  });
}

function RouteProvider({ children }) {
  const [route, setRoute] = useState(readRoute);
  const scrollContainerRef = useContext(ScrollContext);
  // The first run is the initial render, where moving focus would steal it
  // from the top of the page the visitor just opened.
  const first = useRef(true);

  useEffect(() => {
    function onHashChange() {
      const h = window.location.hash.replace(/^#/, "");
      const next = parseRoute(h);
      setRoute(next);
      if (h && next === "main") scrollToSection(h);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Deep link on first load (e.g. a bookmark to #build) — no
  // hashchange event fires for the hash already present at mount.
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, "");
    if (h && parseRoute(h) === "main") scrollToSection(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A takeover view is a page as far as the browser and assistive tech are
  // concerned: give it its own title, and move focus to its heading so the
  // change is announced and the next Tab carries on from the new view
  // instead of restarting at the top of the document.
  useEffect(() => {
    document.title = titleForRoute(route);
    if (first.current) { first.current = false; return; }
    if (route === "main") return;
    // AnimatePresence keeps the outgoing view mounted until its exit
    // animation finishes, so both it and <main> still hold the old content
    // for a few hundred milliseconds. Focusing either one now would announce
    // the page being left. Wait for a heading that is a different node from
    // the one on screen at the moment the route changed.
    const outgoing = document.querySelector("main h1, main h2");
    let cancelled = false;
    let tries = 120;
    const focusIncoming = () => {
      if (cancelled) return;
      const heading = document.querySelector("main h1, main h2");
      if (heading && heading !== outgoing) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        return;
      }
      // Lazy routes mount their heading only once the chunk arrives.
      if (tries-- > 0) { requestAnimationFrame(focusIncoming); return; }
      // The wait expired, so a chunk is slow or has failed. Once the outgoing
      // heading is gone, <main> can no longer announce the page being left,
      // which makes it a safe fallback. If it is somehow still there, leave
      // focus alone rather than announce it.
      if (outgoing?.isConnected) return;
      // A chunk that fails outright is not reachable from here: the error
      // boundary sits above this provider and unmounts it, so the boundary
      // moves focus itself.
      const main = document.querySelector("main");
      if (!main) return;
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    };
    requestAnimationFrame(focusIncoming);
    return () => { cancelled = true; };
  }, [route]);

  const navigate = useCallback((id) => {
    if (id === "deck") {
      if (window.location.hash) window.location.hash = "";
      const scroller = scrollContainerRef?.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = reduced || (scroller && scroller.scrollTop > scroller.clientHeight * 1.25) ? "auto" : "smooth";
      scroller?.scrollTo({ top: 0, behavior });
      return;
    }
    window.location.hash = id;
  }, [scrollContainerRef]);

  const value = useMemo(() => ({ route, navigate }), [navigate, route]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/* ============================================================
   THEME — dark, always. A premium, space-lit backdrop is the whole
   point of the restructure, so there's no light variant to switch
   to; the context stays only because a few permanently-dark surfaces
   (the CRT chassis) key off document.documentElement.dataset.theme.
   ============================================================ */
function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  const value = useMemo(() => ({ theme: "dark" }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ============================================================
   SANDBOX STATE — dev_mode toggle, reachable from the EMET
   terminal input ("dev_mode") or the command palette.
   ============================================================ */
function SandboxProvider({ children }) {
  const [devMode, setDevMode] = useState(false);
  const value = useMemo(
    () => ({ devMode, toggleDevMode: () => setDevMode((v) => !v), setDevMode }),
    [devMode]
  );
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

// A consistent paper navigation anchors the alternating editorial sections.
function Nav() {
  const { route, navigate } = useRoute();
  const editorial = route === "main";
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }
  return <nav className="ed-nav" aria-label="Main navigation"><div className="ed-nav-inner">
    <button onClick={() => navigate("deck")} className="ed-wordmark" aria-label="Mohamed Ansar, home"><span className="ed-wordmark-symbol" aria-hidden="true">ma</span><span>mohamed ansar<small>Solutions engineer</small></span></button>
    <div className="ed-nav-links">{editorial ? <><a href="#projects">Work</a><a href="#about" className="ed-nav-wide">About</a><a href="#experience" className="ed-nav-wide">Experience</a>{CONTACT.resume && <a href={CONTACT.resume} className="ed-nav-wide" target="_blank" rel="noopener noreferrer">CV</a>}<a href="#contact" className="ed-nav-contact">Let's talk ↗</a></> : <button onClick={() => navigate("deck")}>← Home</button>}
      <button onClick={openPalette} className="ed-nav-command" aria-label="Open command palette">⌘ K</button>
    </div>
  </div></nav>;
}

function ScrollProgress() {
  const { route } = useRoute();
  const scrollContainerRef = useContext(ScrollContext);
  const barRef = useRef(null);

  useEffect(() => {
    const scroller = scrollContainerRef?.current;
    const bar = barRef.current;
    if (!scroller || !bar) return;
    let raf = null;
    const update = () => {
      raf = null;
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / distance)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [route, scrollContainerRef]);

  return <div className="ed-scroll-progress" aria-hidden="true"><span ref={barRef} /></div>;
}

function RouteLoader({ label = "Loading interactive" }) {
  return <div className="route-loader" role="status"><span aria-hidden="true" /><p>{label}</p></div>;
}

// Each section brings its own palette: whichever tagged section has most
// recently crossed the middle of the screen sets the page's colour tokens,
// and :root eases between them. Leaving the home page clears them, and
// useRoutePalette sets the palette for the page being opened.
function useSectionPalette(scrollContainerRef) {
  const { route } = useRoute();
  useEffect(() => {
    const scroller = scrollContainerRef?.current;
    // MainDocument stays mounted through its exit animation, so key off the
    // route rather than mount state to let go as soon as it changes.
    if (!scroller || route !== "main") return;
    const root = document.documentElement;
    let current = null;
    let raf = null;
    const update = () => {
      raf = null;
      const box = scroller.getBoundingClientRect();
      const name = pickPalette(scroller.querySelectorAll("[data-palette]"), box.top + scroller.clientHeight * 0.5);
      if (name === current) return;
      current = name;
      applyPalette(root, name);
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
      clearPalette(root);
    };
  }, [route, scrollContainerRef]);
}

const OPEN_SOURCE_SLUGS = new Set(OPEN_SOURCE_PROJECTS.map((p) => p.slug));
function useRoutePalette(route) {
  useEffect(() => {
    const name = paletteForRoute(route, OPEN_SOURCE_SLUGS);
    if (!name) return;
    const root = document.documentElement;
    applyPalette(root, name);
    return () => clearPalette(root);
  }, [route]);
}

function MainDocument({ bootDone }) {
  const scrollContainerRef = useContext(ScrollContext);
  useSectionPalette(scrollContainerRef);
  return (
    <>
      <Hero ready={bootDone} scrollContainerRef={scrollContainerRef} />
      <ProjectsSection scrollContainerRef={scrollContainerRef} />
      <ExperimentsSection />
      <AboutSection scrollContainerRef={scrollContainerRef} />
      <ExperienceSection />
      <ContactSection />
    </>
  );
}

function Stage({ bootDone }) {
  const { route } = useRoute();
  useRoutePalette(route);
  const { devMode, toggleDevMode } = useSandbox();
  const scrollContainerRef = useContext(ScrollContext);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (route !== "main" && scrollContainerRef?.current) scrollContainerRef.current.scrollTop = 0;
  }, [route, scrollContainerRef]);

  return (
    <main id="main-content" tabIndex={-1} ref={scrollContainerRef} className="relative flex-1 min-h-0 overflow-y-auto mono-scroll">
      <div className="ed-paper-grain" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {route === "emet" ? (
          <motion.div
            key="emet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="h-full"
          >
            <EmetSection />
          </motion.div>
        ) : route === "explore" ? (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<RouteLoader label="Loading solar system" />}>
              <SolarSystemExplorer />
            </Suspense>
          </motion.div>
        ) : route === "work" ? (
          <motion.div
            key="work"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: EASE_OUT }}
          >
            <ProjectWorkPage />
          </motion.div>
        ) : route.startsWith("project/") ? (
          <motion.div
            key={route}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE_OUT }}
          >
            {route === "project/digital-double" ? (
              <Suspense fallback={<RouteLoader label="Loading 3D project" />}>
                <DigitalDouble />
              </Suspense>
            ) : route === "project/haloscript" ? (
              <Suspense fallback={<RouteLoader label="Loading project" />}>
                <HaloscriptPage />
              </Suspense>
            ) : (
              <ProjectPage slug={route.slice("project/".length)} />
            )}
          </motion.div>
        ) : route === "lineage-demo" ? (
          <motion.div
            key="lineage-demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<RouteLoader label="Loading data explorer" />}>
              <DataLineageExplorer />
            </Suspense>
          </motion.div>
        ) : route === "infinity" ? (
          <motion.div
            key="infinity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<RouteLoader label="Loading particle scene" />}>
              <InfinityPage />
            </Suspense>
          </motion.div>
        ) : route === "digital-double" ? (
          <motion.div
            key="digital-double"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<RouteLoader label="Loading 3D project" />}>
              <DigitalDouble />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
          >
            <MainDocument bootDone={bootDone} />
          </motion.div>
        )}
      </AnimatePresence>
      {devMode && <SandboxStubs onClose={toggleDevMode} />}
    </main>
  );
}

// The explorer is content (like EMET), not backdrop — it needs to
// capture drag/scroll/pinch itself for orbit controls, which a fixed
// z-0 layer sitting *behind* Stage's scrollable <main> can't reliably
// do. So on that route the backdrop is just a plain matching fill;
// SolarSystemExplorer renders its own full 3D scene inside Stage
// instead.
function Backdrop() {
  const { route } = useRoute();
  if (route === "emet") {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-[#04120a]" aria-hidden="true" />}>
        <MatrixBackground />
      </Suspense>
    );
  }
  if (route === "explore" || route === "lineage-demo" || route === "infinity") {
    return <div className="fixed inset-0 z-0 bg-[#02050c]" aria-hidden="true" />;
  }
  if (route === "digital-double") {
    return <div className="fixed inset-0 z-0 bg-[#050506]" aria-hidden="true" />;
  }
  // Everything else sits on flat ink: sections paint their own full-bleed
  // color blocks, and the infinity loop has its own page (#infinity).
  return <div className="fixed inset-0 z-0 bg-ink" aria-hidden="true" />;
}

// BB-8 brings three.js with it, the heaviest chunk on the page. Waiting for
// the browser to go idle after the intro keeps it out of the first paint.
// The companion pulls in three.js, the heaviest thing on the page. Waiting
// for the visitor's first scroll, tap or key (then an idle moment) keeps it
// off the first load, and off quick bounces entirely. It only appears a few
// seconds in anyway, so nobody sees the difference.
const FIRST_INPUT_EVENTS = ["pointerdown", "pointermove", "wheel", "touchstart", "keydown", "scroll"];
function useIdleAfterFirstInput(ready) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!ready) return undefined;
    let idleId = 0;
    let timer = 0;
    const listen = { passive: true, capture: true };
    const start = () => {
      FIRST_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, start, listen));
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      else timer = setTimeout(() => setIdle(true), 600);
    };
    FIRST_INPUT_EVENTS.forEach((name) => window.addEventListener(name, start, listen));
    return () => {
      FIRST_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, start, listen));
      if (idleId) window.cancelIdleCallback(idleId);
      clearTimeout(timer);
    };
  }, [ready]);
  return idle;
}

function AppShell({ bootDone }) {
  const scrollContainerRef = useRef(null);
  const companionReady = useIdleAfterFirstInput(bootDone);
  return (
    <ScrollContext.Provider value={scrollContainerRef}>
      <RouteProvider>
        <div className="relative bg-ink text-slate-100 h-[100dvh] overflow-hidden">
          <Backdrop />
          <div className="relative z-10 h-full flex flex-col">
            <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to main content</a>
            <Nav />
            <ScrollProgress />
            <PaletteSwatch />
            {companionReady && <Suspense fallback={null}><BB8Companion /></Suspense>}
            {/* No page-level `perspective` here on purpose: setting it on an
                ancestor this high up turns it into the CSS containing block
                for every `position: fixed` descendant (modals, overlays)
                anywhere in the tree, breaking their viewport-relative
                positioning. Each 3D component (deck cards, emet's chassis,
                project cards) establishes its own local perspective instead. */}
            <Stage bootDone={bootDone} />
            <CommandPalette />
          </div>
        </div>
      </RouteProvider>
    </ScrollContext.Provider>
  );
}

/* ============================================================
   ERROR BOUNDARY — a visible fallback instead of a blank screen if
   anything in the tree throws during render.
   ============================================================ */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.headingRef = createRef();
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("Portfolio crashed:", error);
    // This replaces the whole shell, router included, so nothing else is left
    // to move focus. Without this the message is never announced.
    requestAnimationFrame(() => {
      const heading = this.headingRef.current;
      if (!heading) return;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink text-slate-100 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-rose mb-3">
              something broke
            </p>
            <h1 ref={this.headingRef} className="font-display text-2xl font-semibold mb-3">This page hit an error</h1>
            <p className="text-slate-400 text-sm mb-6">
              Try reloading. If it keeps happening, the contact details still work.
            </p>
            <a
              href="mailto:mohamedansarkms@gmail.com"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-coral to-[#f7b598] text-aubergine text-[.8rem] font-bold"
            >
              mohamedansarkms@gmail.com
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // The hero's entrance (the oval opening, the label wiping in) waits for
  // this, so on a first visit it plays as the intro curtain lifts rather
  // than unseen underneath it.
  const [intro, setIntro] = useState(shouldPlayIntro);
  const [bootDone, setBootDone] = useState(() => !intro);
  const reveal = useCallback(() => setBootDone(true), []);
  const gone = useCallback(() => setIntro(false), []);
  return (
    <ErrorBoundary>
      {intro && <IntroCurtain onReveal={reveal} onGone={gone} />}
      <ThemeProvider>
        <SandboxProvider>
          <AppShell bootDone={bootDone} />
        </SandboxProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
