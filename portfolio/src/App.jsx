import { Component, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, animate, useScroll, useSpring } from "framer-motion";
import { Sun, Moon, Command, Menu, X } from "lucide-react";
import HeroGrid from "./components/HeroGrid";
import ContentSections from "./components/ContentSections";
import SandboxStubs from "./components/SandboxStubs";
import CommandPalette from "./components/CommandPalette";
import AmbientField from "./components/AmbientField";
import LightAmbientField from "./components/LightAmbientField";
import BootSequence from "./components/BootSequence";
import CustomCursor from "./components/CustomCursor";
import MagneticButton from "./components/MagneticButton";
import { NAV_SECTIONS } from "./data/content";

/* ============================================================
   THEME PROVIDER — persisted dark/light toggle
   ============================================================ */
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      return localStorage.getItem("ma-theme") || "dark";
    } catch {
      // Storage can throw in private browsing / locked-down browsers —
      // fall back to dark rather than crashing the whole app before
      // React ever gets to mount anything.
      return "dark";
    }
  });
  const overlayRef = useRef(null);
  const flashRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("ma-theme", theme);
    } catch {
      // Non-fatal — theme just won't persist across visits.
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Theme flips get a CRT power-cycle instead of an instant swap: the
  // screen collapses to a line (old theme), the theme swaps hidden
  // behind full black, a bright scanline flashes ("power on"), then
  // it expands back out onto the new theme.
  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = overlayRef.current;
    if (reduced || !el) {
      setTheme(next);
      return;
    }
    await animate(el, { scaleY: [0, 1] }, { duration: 0.16, ease: [0.7, 0, 1, 1] }).finished;
    setTheme(next);
    const flash = flashRef.current;
    if (flash) {
      animate(flash, { opacity: [0, 1, 0] }, { duration: 0.24, times: [0, 0.3, 1] });
    }
    await animate(el, { scaleY: [1, 0] }, { duration: 0.24, ease: [0, 0, 0.3, 1] }).finished;
  }

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        style={{ transform: "scaleY(0)", transformOrigin: "center" }}
        className="fixed inset-0 z-[900] bg-black pointer-events-none"
      />
      <div
        ref={flashRef}
        aria-hidden
        style={{ opacity: 0 }}
        className="fixed inset-x-0 top-1/2 -translate-y-1/2 h-[2px] z-[901] pointer-events-none bg-cyan shadow-[0_0_24px_6px_rgba(34,211,238,0.8)]"
      />
    </ThemeContext.Provider>
  );
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

/* ============================================================
   VIEWPORT CONTROLLER — active-section tracking for the nav
   ============================================================ */
function useActiveSection() {
  const [active, setActive] = useState("source");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return active;
}

function Nav() {
  const { theme, toggleTheme } = useTheme();
  const active = useActiveSection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const light = theme === "light";

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-colors ${
        scrolled
          ? light
            ? "bg-slate-50/80 backdrop-blur-xl border-b border-slate-900/8"
            : "bg-ink/70 backdrop-blur-xl border-b border-white/8"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1260px] flex items-center justify-between px-5 py-4">
        <a href="#hero" className="flex items-center gap-3 font-mono text-[.85rem] font-semibold">
          <span
            className={`w-8 h-8 rounded-lg grid place-items-center bg-gradient-to-br from-cyan/20 to-violet/20 border text-cyan text-[.68rem] ${
              light ? "border-slate-900/10" : "border-white/10"
            }`}
          >
            MA
          </span>
          <span>
            mohamed.ansar
            <small className="block text-[.6rem] font-normal tracking-[.16em] uppercase text-slate-500">
              solutions engineer
            </small>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`font-mono text-[.72rem] tracking-[.12em] uppercase px-3 py-2 rounded-lg transition-colors ${
                active === s.id
                  ? "text-cyan"
                  : light
                    ? "text-slate-500 hover:text-slate-900 hover:bg-black/5"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              }`}
            >
              {s.label}
            </a>
          ))}
          <button
            onClick={openPalette}
            className={`ml-1 flex items-center gap-1 px-2.5 py-2 rounded-lg border text-slate-500 hover:text-cyan hover:border-cyan/30 transition-colors font-mono text-[.65rem] ${
              light ? "border-slate-900/10" : "border-white/10"
            }`}
            aria-label="Open command palette"
          >
            <Command size={11} /> K
          </button>
          <button
            onClick={toggleTheme}
            className={`ml-1 w-8 h-8 grid place-items-center rounded-lg border hover:text-cyan hover:border-cyan/30 transition-colors ${
              light ? "border-slate-900/10 text-slate-600" : "border-white/10 text-slate-400"
            }`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <MagneticButton
            href="#commit"
            strength={0.4}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="ml-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan to-[#9be9ff] text-ink font-mono text-[.72rem] font-bold tracking-[.08em] uppercase"
          >
            Contact →
          </MagneticButton>
        </div>

        <button
          className={`md:hidden w-10 h-10 grid place-items-center rounded-lg border ${
            light ? "border-slate-900/10 text-slate-700" : "border-white/10 text-slate-300"
          }`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="dark-surface md:hidden bg-ink/95 backdrop-blur-xl border-t border-white/8 px-5 py-6 flex flex-col gap-2">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setMobileOpen(false)}
              className="font-mono text-sm uppercase tracking-widest text-[color:var(--ink-300)] py-2"
            >
              {s.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 32, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[110] h-[3px] origin-left bg-gradient-to-r from-cyan via-[#9be9ff] to-amber"
      style={{ scaleX }}
    />
  );
}

function AppShell({ bootDone }) {
  const { theme } = useTheme();
  const { devMode, toggleDevMode } = useSandbox();

  return (
    <div className={`relative ${theme === "light" ? "bg-slate-50 text-slate-900 min-h-screen" : "bg-ink text-slate-100 min-h-screen"}`}>
      {theme === "dark" ? <AmbientField /> : <LightAmbientField />}
      <div className="relative z-10">
        <ScrollProgress />
        <Nav />
        {/* No page-level `perspective` here on purpose: setting it on an
            ancestor this high up turns it into the CSS containing block
            for every `position: fixed` descendant (modals, overlays)
            anywhere in the tree, breaking their viewport-relative
            positioning. Each 3D component (hero chassis, project
            cards) establishes its own local perspective instead. */}
        <main id="hero">
          <HeroGrid ready={bootDone} />
          <ContentSections />
          {devMode && <SandboxStubs onClose={toggleDevMode} />}
        </main>
        <footer className="border-t border-white/8 py-8 px-5">
          <div className="mx-auto max-w-[1180px] flex flex-wrap items-center justify-between gap-3 font-mono text-[.68rem] text-slate-500">
            <span>© {new Date().getFullYear()} Mohamed Ansar</span>
            <span>Built with React · Vite · Tailwind · Framer Motion</span>
          </div>
        </footer>
        <CommandPalette />
      </div>
    </div>
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
