import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Boxes, Workflow, X } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];

/* Small tile-grid preview for the "day in the life" RPG concept.
   Not a game loop — a wireframe you can click around, matching what's
   actually shipped: the real Phaser build is disabled, not deleted. */
function RpgPreview() {
  const COLS = 10;
  const ROWS = 6;
  const [hovered, setHovered] = useState(null);
  const desks = new Set(["2,2", "3,2", "6,2", "7,2", "2,4", "3,4", "6,4", "7,4"]);

  return (
    <div
      className="grid gap-[2px] bg-black/30 p-2 rounded-lg"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
    >
      {Array.from({ length: COLS * ROWS }).map((_, i) => {
        const x = i % COLS;
        const y = Math.floor(i / COLS);
        const key = `${x},${y}`;
        const isDesk = desks.has(key);
        const isHover = hovered === key;
        return (
          <button
            key={key}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            className={`aspect-square rounded-[2px] transition-colors ${
              isDesk
                ? isHover
                  ? "bg-amber/60"
                  : "bg-amber/25"
                : isHover
                ? "bg-cyan/25"
                : "bg-white/[.03]"
            }`}
            aria-label={isDesk ? "Desk tile" : "Floor tile"}
          />
        );
      })}
    </div>
  );
}

/* Slow-rotating isometric block grid — a stand-in for the full 3D
   voxel data-warehouse walkthrough. */
function VoxelPreview() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf;
    let angle = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: rect.width, h: rect.height };
    }
    let { w, h } = resize();
    window.addEventListener("resize", () => {
      ({ w, h } = resize());
    });

    const blocks = [];
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ x, z, y: (Math.abs(x) + Math.abs(z)) % 2 === 0 ? 0 : 1 });
      }
    }

    function project(x, y, z, cx, cy, a) {
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      const iso = { x: (rx - rz) * 24, y: (rx + rz) * 12 - y * 20 };
      return { x: cx + iso.x, y: cy + iso.y };
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + 10;
      blocks
        .slice()
        .sort((a, b) => a.x + a.z - (b.x + b.z))
        .forEach((b) => {
          const p = project(b.x, b.y, b.z, cx, cy, angle);
          const alpha = 0.18 + b.y * 0.14;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 10);
          ctx.lineTo(p.x + 14, p.y - 3);
          ctx.lineTo(p.x, p.y + 4);
          ctx.lineTo(p.x - 14, p.y - 3);
          ctx.closePath();
          ctx.fillStyle = `rgba(34,211,238,${alpha + 0.2})`;
          ctx.fill();
          ctx.strokeStyle = "rgba(34,211,238,0.25)";
          ctx.stroke();
        });
      if (!reduced) angle += 0.006;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-40 rounded-lg bg-black/30" />;
}

/* Small schema diagram — four channels feeding one standard, matching
   the site's own #source/#lineage/#build/#commit structure. */
function SchemaPreview() {
  const nodes = [
    { id: "source", label: "source" },
    { id: "lineage", label: "lineage" },
    { id: "build", label: "build" },
    { id: "commit", label: "commit" },
  ];
  const [active, setActive] = useState(null);
  return (
    <div className="flex items-center justify-center gap-3 py-6 flex-wrap">
      {nodes.map((n, i) => (
        <div key={n.id} className="flex items-center gap-3">
          <button
            onMouseEnter={() => setActive(n.id)}
            onMouseLeave={() => setActive(null)}
            className={`px-3 py-2 rounded-lg border font-mono text-[.68rem] transition-colors ${
              active === n.id ? "border-cyan/50 text-cyan bg-cyan/10" : "border-slate-900/10 text-[color:var(--ink-400)]"
            }`}
          >
            {n.label}
          </button>
          {i < nodes.length - 1 && <span className="text-slate-600">→</span>}
        </div>
      ))}
    </div>
  );
}

const STUBS = [
  {
    id: "rpg",
    title: "A day in the life of an SE",
    icon: Gamepad2,
    body: "A tile-based office you'd walk through to fix a broken pricing feed before the 4pm standup. Built once in Phaser 3, currently dormant — the wireframe below is what's still live under the hood.",
    render: RpgPreview,
  },
  {
    id: "voxel",
    title: "Walk the data warehouse",
    icon: Boxes,
    body: "A small voxel world representing a warehouse you could once explore and build on. Simplified isometric preview shown here; the full canvas walkthrough is disabled, not deleted.",
    render: VoxelPreview,
  },
  {
    id: "schema",
    title: "Four channels, one standard",
    icon: Workflow,
    body: "The same source → lineage → build → commit structure that shapes this site's own navigation, shown as the schema it was modeled after.",
    render: SchemaPreview,
  },
];

/**
 * Developer sandbox — off by default. Toggle with `dev_mode` from the
 * EMET terminal input or the command palette to reveal the dormant
 * experiments this portfolio was built around.
 */
export default function SandboxStubs({ onClose }) {
  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="overflow-hidden border-y border-cyan/15 bg-cyan/[.03]"
    >
      <div className="mx-auto max-w-[1180px] px-5 py-16">
        <div className="flex items-start justify-between mb-10">
          <div>
            <span className="font-mono text-[.68rem] uppercase tracking-[.14em] text-cyan">
              dev_mode · sandbox
            </span>
            <h2 className="font-display text-2xl font-semibold text-[color:var(--ink-50)] mt-2">
              Dormant experiments
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-lg border border-slate-900/10 text-[color:var(--ink-400)] hover:text-cyan hover:border-cyan/40 transition-colors"
            aria-label="Close sandbox"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STUBS.map((stub) => {
            const Icon = stub.icon;
            const Render = stub.render;
            return (
              <div key={stub.id} className="glass rounded-xl p-5 flex flex-col">
                <span className="w-9 h-9 grid place-items-center rounded-lg border border-slate-900/10 text-cyan mb-4">
                  <Icon size={16} />
                </span>
                <h3 className="font-semibold text-[color:var(--ink-100)] mb-2">{stub.title}</h3>
                <p className="text-[.8rem] text-[color:var(--ink-400)] leading-relaxed mb-4 flex-1">{stub.body}</p>
                <Render />
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
