import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "lucide-react";
import EmetSection from "./components/EmetSection";
import { Hero, ProjectsSection, SkillsTicker, ExperienceSection, AboutSection, ExperimentsSection, ContactSection } from "./components/Sections";
import ProjectPage from "./components/ProjectPage";
import { SECTION_LINKS } from "./data/content";
import SandboxStubs from "./components/SandboxStubs";
import CommandPalette from "./components/CommandPalette";
import { MatrixBackground } from "./components/RouteBackgrounds";
import CustomCursor from "./components/CustomCursor";
import IntroCurtain from "./components/IntroCurtain";
import { shouldPlayIntro } from "./lib/intro";
import { EASE_OUT } from "./lib/motion";

const SolarSystemExplorer = lazy(() => import("./components/SolarSystemExplorer"));
const DataLineageExplorer = lazy(() => import("./components/DataLineageExplorer"));
const DigitalDouble = lazy(() => import("./components/DigitalDouble"));

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
  if (h === "emet" || h === "explore" || h === "lineage-demo" || h === "digital-double") return h;
  if (h.startsWith("project/")) return h;
  return "main";
}

function readRoute() {
  if (typeof window === "undefined") return "main";
  return parseRoute(window.location.hash.replace(/^#/, ""));
}

const RouteContext = createContext(null);
export const useRoute = () => useContext(RouteContext);

// Shared with the hero's InfinityLoop so it can read scroll position
// off the same element Stage renders as <main> — set once, read every
// frame via a plain ref rather than React state so scrolling never
// triggers a re-render.
const ScrollContext = createContext(null);
export const useScrollContainer = () => useContext(ScrollContext);

function scrollToSection(id) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function RouteProvider({ children }) {
  const [route, setRoute] = useState(readRoute);
  const scrollContainerRef = useContext(ScrollContext);

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

  const navigate = (id) => {
    if (id === "deck") {
      if (window.location.hash) window.location.hash = "";
      scrollContainerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.hash = id;
  };

  const value = useMemo(() => ({ route, navigate }), [route]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/* ============================================================
   THEME — dark, always. A premium, space-lit backdrop is the whole
   point of the restructure, so there's no light variant to switch
   to; the context stays only because a few permanently-dark surfaces
   (the CRT chassis) key off document.documentElement.dataset.theme.
   ============================================================ */
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

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
const SandboxContext = createContext(null);
export const useSandbox = () => useContext(SandboxContext);

function SandboxProvider({ children }) {
  const [devMode, setDevMode] = useState(false);
  const value = useMemo(
    () => ({ devMode, toggleDevMode: () => setDevMode((v) => !v), setDevMode }),
    [devMode]
  );
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

// Deliberately no section links here (EMET / Current / Before /
// Projects / Contact) and no Contact CTA — that row was a plain-text
// shortcut around the deck's whole reason for existing: an actual
// 3D scene you navigate by clicking a card, not a menu bar. The one
// thing every view still needs is a way back to the top, so the logo
// doubles as a Home control once you've scrolled past the hero or
// stepped into EMET. ⌘K stays as the accessibility/power-user
// fallback — it's opt-in, not a visible competing menu.
function Nav() {
  const { route, navigate } = useRoute();

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  // On the main page the nav has no bar of its own: plain white type and
  // hairlines with mix-blend-mode: difference, so it reads dark over the
  // light hero and light over every dark block below without swapping
  // styles per section. The full-takeover routes (EMET, the explorers,
  // project pages) keep the original glass bar.
  const editorial = route === "main";

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-colors ${
        editorial ? "mix-blend-difference text-white" : "bg-ink/70 backdrop-blur-xl border-b border-white/8"
      }`}
    >
      <div className="mx-auto max-w-[1260px] flex items-center justify-between px-5 py-4">
        <button
          onClick={() => navigate("deck")}
          className="flex items-center gap-3 font-mono text-[.85rem] font-semibold text-left"
        >
          <span
            className={`w-8 h-8 grid place-items-center text-[.68rem] ${
              editorial ? "rounded-full border border-white" : "rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20 border border-white/10 text-cyan"
            }`}
          >
            MA
          </span>
          <span>
            mohamed.ansar
            <small
              className={`block text-[.6rem] font-normal tracking-[.16em] uppercase ${
                editorial ? "text-white/75" : "text-[color:var(--ink-400)]"
              }`}
            >
              solutions engineer
            </small>
          </span>
        </button>

        <div className="flex items-center gap-1">
          {route === "main" &&
            SECTION_LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={`${l.id === "projects" || l.id === "contact" ? "inline-flex" : "hidden md:inline-flex"} items-center px-3 py-2 rounded-lg ${
                  editorial ? "text-white hover:opacity-60 transition-opacity" : "text-[color:var(--ink-100)] hover:text-cyan transition-colors"
                } font-mono text-[.7rem] uppercase tracking-[.1em]`}
              >
                {l.label}
              </a>
            ))}
          {route !== "main" && (
            <button
              onClick={() => navigate("deck")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-cyan hover:border-cyan/40 transition-colors font-mono text-[.68rem] uppercase tracking-[.1em]"
            >
              ← Home
            </button>
          )}
          <button
            onClick={openPalette}
            className={`ml-1 flex items-center gap-1 px-2.5 py-2 rounded-lg font-mono text-[.65rem] ${
              editorial
                ? "border border-white/70 text-white hover:opacity-60 transition-opacity"
                : "border border-white/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/30 transition-colors"
            }`}
            aria-label="Open command palette"
          >
            <Command size={11} /> K
          </button>
        </div>
      </div>
    </nav>
  );
}

function MainDocument({ bootDone }) {
  const scrollContainerRef = useContext(ScrollContext);
  return (
    <>
      <Hero ready={bootDone} scrollContainerRef={scrollContainerRef} />
      <ProjectsSection scrollContainerRef={scrollContainerRef} />
      <SkillsTicker scrollContainerRef={scrollContainerRef} />
      <ExperienceSection />
      <AboutSection scrollContainerRef={scrollContainerRef} />
      <ExperimentsSection />
      <ContactSection />
    </>
  );
}

function Stage({ bootDone }) {
  const { route } = useRoute();
  const { devMode, toggleDevMode } = useSandbox();
  const scrollContainerRef = useContext(ScrollContext);

  useEffect(() => {
    if (route !== "main" && scrollContainerRef?.current) scrollContainerRef.current.scrollTop = 0;
  }, [route, scrollContainerRef]);

  return (
    <main ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto mono-scroll">
      <AnimatePresence mode="wait">
        {route === "emet" ? (
          <motion.div
            key="emet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
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
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<div className="h-full bg-[#02050c]" aria-hidden="true" />}>
              <SolarSystemExplorer />
            </Suspense>
          </motion.div>
        ) : route.startsWith("project/") ? (
          <motion.div
            key={route}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <ProjectPage slug={route.slice("project/".length)} />
          </motion.div>
        ) : route === "lineage-demo" ? (
          <motion.div
            key="lineage-demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<div className="h-full bg-[#050911]" aria-hidden="true" />}>
              <DataLineageExplorer />
            </Suspense>
          </motion.div>
        ) : route === "digital-double" ? (
          <motion.div
            key="digital-double"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="h-full"
          >
            <Suspense fallback={<div className="h-full bg-[#050506]" aria-hidden="true" />}>
              <DigitalDouble />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
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
  if (route === "explore" || route === "lineage-demo") {
    return <div className="fixed inset-0 z-0 bg-[#02050c]" aria-hidden="true" />;
  }
  if (route === "digital-double") {
    return <div className="fixed inset-0 z-0 bg-[#050506]" aria-hidden="true" />;
  }
  // Everything else sits on flat ink: sections paint their own full-bleed
  // color blocks, and the infinity loop lives in the hero's oval window.
  return <div className="fixed inset-0 z-0 bg-ink" aria-hidden="true" />;
}

function AppShell({ bootDone }) {
  const scrollContainerRef = useRef(null);
  return (
    <ScrollContext.Provider value={scrollContainerRef}>
      <RouteProvider>
        <div className="relative bg-ink text-slate-100 h-[100dvh] overflow-hidden">
          <Backdrop />
          <div className="relative z-10 h-full flex flex-col">
            <Nav />
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
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("Portfolio crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink text-slate-100 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-rose mb-3">
              something broke
            </p>
            <h1 className="font-display text-2xl font-semibold mb-3">This page hit an error</h1>
            <p className="text-slate-400 text-sm mb-6">
              Try reloading. If it keeps happening, the contact details still work.
            </p>
            <a
              href="mailto:mohamedansarkms@gmail.com"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink text-[.8rem] font-bold"
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
      <CustomCursor />
      <ThemeProvider>
        <SandboxProvider>
          <AppShell bootDone={bootDone} />
        </SandboxProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
