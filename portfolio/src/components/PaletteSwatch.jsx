import { useEffect, useRef, useState } from "react";
import { useRoute } from "../appContexts";
import { currentPalette, PALETTE_EVENT, PALETTE_LABELS, PALETTES, readableOn } from "../lib/palettes";

const KEYS = ["paper", "ink", "accent"];

/* The palette on screen, shown the way the reels show theirs: three chips
   and a name in the corner, opening into each colour's name and hex. It
   follows the palette events rather than scroll, so it never disagrees
   with the page. */
export default function PaletteSwatch() {
  const { route } = useRoute();
  const [name, setName] = useState(currentPalette);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const onChange = (event) => setName(event.detail);
    root.addEventListener(PALETTE_EVENT, onChange);
    return () => root.removeEventListener(PALETTE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!(route === "main" || route === "work" || route.startsWith("project/"))) return null;
  const palette = PALETTES[name];
  const label = PALETTE_LABELS[name];

  return (
    <div ref={ref} className="ed-swatch">
      {open && (
        <ul id="ed-swatch-panel" className="ed-swatch-panel">
          {KEYS.map((key) => (
            <li key={key} style={{ background: palette[key], color: readableOn(palette[key], [palette.ink, palette.paper]) }}>
              <span>{label[key]}</span>
              <i aria-hidden="true" />
              <span>{palette[key].toUpperCase()}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="ed-swatch-toggle" aria-expanded={open} aria-controls="ed-swatch-panel" aria-label={`Colour palette: ${label.title}. ${open ? "Hide" : "Show"} its colours`} onClick={() => setOpen((v) => !v)}>
        <span className="ed-swatch-chips" aria-hidden="true">{KEYS.map((key) => <b key={key} style={{ background: palette[key] }} />)}</span>
        <span className="ed-swatch-name">{label.title}</span>
      </button>
    </div>
  );
}
