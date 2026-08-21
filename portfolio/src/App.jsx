import { Component, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "lucide-react";
import DeckView from "./components/DeckView";
import EmetSection from "./components/EmetSection";
import { NowSection, BeforeSection, WorkSection, StorySection, ContactSection } from "./components/ContentSections";
import SandboxStubs from "./components/SandboxStubs";
import CommandPalette from "./components/CommandPalette";
import LightAmbientField from "./components/LightAmbientField";
import {
  MatrixBackground,
  DataFlowBackground,
  StudioBackground,
  StatsBackground,
  PingBackground,
  WaterDropBackground,
} from "./components/RouteBackgrounds";
import BootSequence from "./components/BootSequence";
import CustomCursor from "./components/CustomCursor";
import { ROUTE_THEME } from "./data/content";
import { EASE_OUT } from "./lib/motion";

/* ============================================================
   ROUTER — the whole site is one screen at a time, swapped by
   URL hash. No document scroll between "sections": click a card
   or a nav link, the current view is replaced by the next one.
   Hash-based so plain <a href="#build"> links everywhere (nav,
   command palette, emet's shortcuts) keep working unmodified —
   the browser's native hash change is all the trigger this needs.
   ============================================================ */
const VIEWS = { hero: "deck", "": "deck", emet: "emet", source: "source", lineage: "lineage", build: "build", story: "story", commit: "commit" };

function readRoute() {
  if (typeof window === "undefined") return "deck";
  const h = window.location.hash.replace(/^#/, "");
  return VIEWS[h] || "deck";
}

const RouteContext = createContext(null);
export const useRoute = () => useContext(RouteContext);

function RouteProvider({ children }) {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    function onHashChange() {
      setRoute(readRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (id) => {
    window.location.hash = id === "deck" ? "" : id;
  };

  const value = useMemo(() => ({ route, navigate }), [route]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/* ============================================================
   THEME — one theme, light, always. Still a context (not a bare
   constant) because the CSS variable system keyed off
   document.documentElement.dataset.theme, and every component that
   reads useTheme().theme, both assume it exists.
   ============================================================ */
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);

  const value = useMemo(() => ({ theme: "light" }), []);
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
// thing every view still needs is a way back, so the logo doubles as
// a Home control, made explicit with a label once you're not already
// on the deck. ⌘K stays as the accessibility/power-user fallback —
// it's opt-in, not a visible competing menu.
function Nav() {
  const { route, navigate } = useRoute();
  const onDeck = route === "deck";

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-colors ${
        onDeck ? "border-b border-transparent" : "bg-slate-50/80 backdrop-blur-xl border-b border-slate-900/8"
      }`}
    >
      <div className="mx-auto max-w-[1260px] flex items-center justify-between px-5 py-4">
        <a href="#hero" className="flex items-center gap-3 font-mono text-[.85rem] font-semibold">
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-to-br from-cyan/20 to-violet/20 border border-slate-900/10 text-cyan text-[.68rem]">
            MA
          </span>
          <span>
            mohamed.ansar
            <small className="block text-[.6rem] font-normal tracking-[.16em] uppercase text-slate-500">
              solutions engineer
            </small>
          </span>
        </a>

        <div className="flex items-center gap-1">
          {onDeck && (
            <a
              href="#commit"
              className="mr-1 hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors font-mono text-[.68rem] uppercase tracking-[.1em]"
            >
              Get in touch
            </a>
          )}
          {!onDeck && (
            <button
              onClick={() => navigate("deck")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-900/10 text-cyan hover:border-cyan/40 transition-colors font-mono text-[.68rem] uppercase tracking-[.1em]"
            >
              ← Home
            </button>
          )}
          <button
            onClick={openPalette}
            className="ml-1 flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-900/10 text-slate-500 hover:text-cyan hover:border-cyan/30 transition-colors font-mono text-[.65rem]"
            aria-label="Open command palette"
          >
            <Command size={11} /> K
          </button>
        </div>
      </div>
    </nav>
  );
}

const VIEW_COMPONENTS = {
  deck: DeckView,
  emet: EmetSection,
  source: NowSection,
  lineage: BeforeSection,
  build: WorkSection,
  story: StorySection,
  commit: ContactSection,
};

function Stage({ bootDone }) {
  const { route } = useRoute();
  const { devMode, toggleDevMode } = useSandbox();
  const mainRef = useRef(null);
  const ActiveView = VIEW_COMPONENTS[route];

  // Every view swap starts scrolled to its own top — this is a fresh
  // "page," not a continuation of wherever the last one left off.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [route]);

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto mono-scroll">
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="h-full"
        >
          {route === "deck" ? <ActiveView ready={bootDone} /> : <ActiveView />}
        </motion.div>
      </AnimatePresence>
      {devMode && <SandboxStubs onClose={toggleDevMode} />}
    </main>
  );
}

// Each of the five deck destinations gets its own bespoke animated
// backdrop instead of a shared particle field recolored per route —
// emet's terminal rain, Current's data flow, Before's studio
// spotlights, Projects' stats board, Contact's signal pings, and the
// deck itself a bright water surface. Only "story" (reachable from
// the command palette, not one of the five deck destinations) still
// falls back to the general-purpose aurora.
const ROUTE_BACKGROUNDS = {
  deck: WaterDropBackground,
  emet: MatrixBackground,
  source: DataFlowBackground,
  lineage: StudioBackground,
  build: StatsBackground,
  commit: PingBackground,
};

function Backdrop() {
  const { route } = useRoute();
  const RouteBackground = ROUTE_BACKGROUNDS[route];
  if (RouteBackground) return <RouteBackground key={route} />;
  const routeTheme = ROUTE_THEME[route] || ROUTE_THEME.deck;
  return <LightAmbientField key={route} theme={routeTheme} />;
}

function AppShell({ bootDone }) {
  return (
    <RouteProvider>
      <div className="relative bg-slate-50 text-slate-900 h-[100dvh] overflow-hidden">
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
              Try reloading — if it keeps happening, the contact details still work.
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
  // The hero's 3D entrance tilt waits for this instead of firing the
  // instant it mounts — on a first visit it would otherwise animate
  // entirely behind the opaque boot sequence, unseen; on a repeat
  // visit it'd fire too fast (before the page has painted) to notice.
  const [bootDone, setBootDone] = useState(false);
  return (
    <ErrorBoundary>
      <CustomCursor />
      <BootSequence onDone={() => setBootDone(true)} />
      <ThemeProvider>
        <SandboxProvider>
          <AppShell bootDone={bootDone} />
        </SandboxProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
