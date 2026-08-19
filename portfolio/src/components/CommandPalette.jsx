import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X } from "lucide-react";
import { COMMAND_ITEMS } from "../data/content";
import { useSandbox } from "../App";

/**
 * Global ⌘K / Ctrl+K command palette.
 * Owns its own open/close + query state; the parent only needs to
 * mount it once — the keyboard listener is global for the app's life.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const { toggleDevMode } = useSandbox();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = q
      ? COMMAND_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
      : COMMAND_ITEMS;
    return items;
  }, [query]);

  // Global shortcut listener — meta+k / ctrl+k toggles, Escape closes.
  useEffect(() => {
    function onKeyDown(e) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runItem(item) {
    if (!item) return;
    if (item.action === "toggle-sandbox") {
      toggleDevMode();
    } else if (item.go) {
      const el = document.querySelector(item.go);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (item.href) {
      window.open(item.href, item.href.startsWith("mailto:") ? "_self" : "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  }

  function onKeyDownList(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(results[activeIndex]);
    }
  }

  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((item, i) => {
      const key = item.group || "Other";
      groups[key] = groups[key] || [];
      groups[key].push({ ...item, _index: i });
    });
    return groups;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="glass w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
              <Search size={16} className="text-cyan shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDownList}
                placeholder="Jump to a section or link…"
                className="flex-1 bg-transparent outline-none text-sm font-mono text-slate-100 placeholder:text-slate-500"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close command palette"
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto mono-scroll py-2">
              {results.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-500 font-mono">No matches.</p>
              )}
              {Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName} className="mb-1">
                  <p className="px-4 pt-2 pb-1 text-[.62rem] tracking-[.14em] uppercase text-slate-500 font-mono">
                    {groupName}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.label}
                      onMouseEnter={() => setActiveIndex(item._index)}
                      onClick={() => runItem(item)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        item._index === activeIndex
                          ? "bg-cyan/10 text-cyan"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="font-mono">{item.label}</span>
                      {item._index === activeIndex && <CornerDownLeft size={13} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/8 text-[.62rem] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <ArrowUp size={11} />
                <ArrowDown size={11} /> navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft size={11} /> select
              </span>
              <span className="ml-auto">esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
