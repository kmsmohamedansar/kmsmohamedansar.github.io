import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRoute } from "../App";
import { LINEAGE_NODES, LINEAGE_EDGES } from "../data/lineageData";

// Layout: each node's column is its longest-path depth from any node
// with no inbound edges (a "source"). Nodes in the same column are
// stacked in the order they appear in LINEAGE_NODES. This is enough
// structure to read a DAG left-to-right without pulling in a graph
// layout library for a demo dataset this small.
function computeLayout(nodes, edges) {
  const forward = new Map(nodes.map((n) => [n.id, []]));
  const remainingIn = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach(([from, to]) => {
    forward.get(from).push(to);
    remainingIn.set(to, (remainingIn.get(to) || 0) + 1);
  });

  // Longest-path-from-a-source depth via Kahn's algorithm: a node's
  // depth is only finalized once every edge into it has been relaxed,
  // which a plain BFS queue can't guarantee on its own.
  const depth = new Map(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => remainingIn.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift();
    for (const next of forward.get(id) || []) {
      depth.set(next, Math.max(depth.get(next), depth.get(id) + 1));
      remainingIn.set(next, remainingIn.get(next) - 1);
      if (remainingIn.get(next) === 0) queue.push(next);
    }
  }

  const columns = new Map();
  nodes.forEach((n) => {
    const d = depth.get(n.id) || 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(n.id);
  });

  const colWidth = 150;
  const rowHeight = 46;
  const positions = new Map();
  const maxRows = Math.max(...[...columns.values()].map((c) => c.length));
  columns.forEach((ids, col) => {
    const offsetY = ((maxRows - ids.length) * rowHeight) / 2;
    ids.forEach((id, row) => {
      positions.set(id, { x: col * colWidth + 50, y: offsetY + row * rowHeight + 36 });
    });
  });

  const width = (Math.max(...depth.values()) + 1) * colWidth + 110;
  const height = maxRows * rowHeight + 70;
  return { positions, forward, width, height };
}

// Reverse adjacency, built once, so hover can reach a node's upstream
// neighbors as easily as its downstream ones.
function buildReverse(nodes, edges) {
  const reverse = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach(([from, to]) => reverse.get(to).push(from));
  return reverse;
}

function downstreamOf(startId, forward) {
  const visited = new Set([startId]);
  const queue = [startId];
  const edgesHit = new Set();
  while (queue.length) {
    const id = queue.shift();
    for (const next of forward.get(id) || []) {
      edgesHit.add(`${id}->${next}`);
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return { nodes: visited, edges: edgesHit };
}

// One hop in either direction, the quick "what does this touch"
// preview used on hover, before a click pins the full chain.
function neighborsOf(id, forward, reverse) {
  const nodes = new Set([id]);
  const edges = new Set();
  (forward.get(id) || []).forEach((n) => {
    nodes.add(n);
    edges.add(`${id}->${n}`);
  });
  (reverse.get(id) || []).forEach((n) => {
    nodes.add(n);
    edges.add(`${n}->${id}`);
  });
  return { nodes, edges };
}

const TYPE_STYLES = {
  source: { color: "#38bdf8", label: "Source", r: 6 },
  table: { color: "#34d399", label: "Table", r: 5.5 },
  job: { color: "#fbbf24", label: "Job", r: 5.5 },
  dashboard: { color: "#c084fc", label: "Consumer", r: 6.5 },
};

function edgeLine(a, b, r) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: a.x + ux * r,
    y1: a.y + uy * r,
    x2: b.x - ux * r,
    y2: b.y - uy * r,
  };
}

function LineageNode({ node, pos, active, dimmed, onClick, onHoverStart, onHoverEnd }) {
  const style = TYPE_STYLES[node.type];
  const radius = active ? style.r * 1.6 : style.r;
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={() => onClick(node.id)}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      className="cursor-pointer"
      role="button"
      aria-label={`${node.label} (${style.label})`}
    >
      {active && (
        <circle r={style.r * 3} fill={style.color} opacity={0.16} className="transition-all duration-200" />
      )}
      <circle
        r={radius}
        fill={dimmed ? "#1e293b" : style.color}
        stroke={active ? "#fff" : "transparent"}
        strokeWidth={1.5}
        opacity={dimmed ? 0.35 : 1}
        style={{ filter: active ? `drop-shadow(0 0 6px ${style.color})` : "none" }}
        className="transition-all duration-200"
      />
      {/* Larger invisible ring so hover fires well before the cursor is
          pixel-perfect on a 5-6px dot, the visible circle above stays
          small, this just widens the hit area around it. */}
      <circle r={16} fill="transparent" style={{ pointerEvents: "all" }} />
      <text
        x={style.r + 10}
        y={4}
        className="font-mono select-none pointer-events-none transition-opacity duration-150"
        fontSize={11}
        fontWeight={700}
        fill="#fff"
        opacity={active ? 1 : 0}
      >
        {node.label}
      </text>
    </g>
  );
}

export default function DataLineageExplorer() {
  const { navigate } = useRoute();
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const { positions, forward, width, height } = useMemo(
    () => computeLayout(LINEAGE_NODES, LINEAGE_EDGES),
    []
  );
  const reverse = useMemo(() => buildReverse(LINEAGE_NODES, LINEAGE_EDGES), []);

  // A click pins the full downstream impact chain (and drives the side
  // panel); hovering with nothing pinned previews just the immediate
  // connections, so the graph feels alive before you commit to a node.
  const active = selected
    ? { id: selected, ...downstreamOf(selected, forward) }
    : hovered
      ? { id: hovered, ...neighborsOf(hovered, forward, reverse) }
      : null;

  const selectedNode = LINEAGE_NODES.find((n) => n.id === selected);
  const impactList = useMemo(() => {
    if (!selected) return [];
    const impact = downstreamOf(selected, forward);
    return LINEAGE_NODES.filter((n) => impact.nodes.has(n.id) && n.id !== selected);
  }, [selected, forward]);

  return (
    <div className="h-full overflow-y-auto mono-scroll bg-[#050911]">
      <div className="mx-auto max-w-[1260px] px-5 py-10">
        <button
          onClick={() => navigate("deck")}
          className="mb-6 font-mono text-[.68rem] uppercase tracking-[.14em] text-cyan hover:text-white transition-colors"
        >
          ← Home
        </button>

        <p className="font-mono text-[.68rem] uppercase tracking-[.14em] text-cyan mb-2">Live demo</p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold mb-3">Data Lineage &amp; Impact Explorer</h1>
        <p className="text-slate-400 text-sm max-w-2xl mb-2">
          Hover a point to see what it connects to. Click one to pin the full downstream impact
          chain: everything that would break, go stale or need a re-run if that node changed.
        </p>
        <p className="font-mono text-[.65rem] text-slate-500 mb-8">
          Sample data only. This is a made-up retail pricing pipeline, built to show the idea.
        </p>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2 h-[420px] sm:h-[500px]">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              className="block w-full h-full"
            >
              <g>
                {LINEAGE_EDGES.map(([from, to]) => {
                  const a = positions.get(from);
                  const b = positions.get(to);
                  const key = `${from}->${to}`;
                  const isHot = active?.edges.has(key);
                  const isDimmed = active && !isHot;
                  const line = edgeLine(a, b, 8);
                  return (
                    <line
                      key={key}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={isHot ? "#38bdf8" : "#334155"}
                      strokeWidth={isHot ? 1.8 : 1}
                      opacity={isDimmed ? 0.12 : isHot ? 0.95 : 0.45}
                      style={{ filter: isHot ? "drop-shadow(0 0 3px #38bdf8)" : "none" }}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </g>
              <g>
                {LINEAGE_NODES.map((node) => {
                  const pos = positions.get(node.id);
                  const isActive = active?.nodes.has(node.id);
                  const isDimmed = active && !isActive;
                  return (
                    <LineageNode
                      key={node.id}
                      node={node}
                      pos={pos}
                      active={isActive}
                      dimmed={isDimmed}
                      onClick={(id) => setSelected((cur) => (cur === id ? null : id))}
                      onHoverStart={setHovered}
                      onHoverEnd={() => setHovered(null)}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          <motion.div
            key={selected || "empty"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-5 h-fit"
          >
            {!selectedNode ? (
              <p className="text-slate-500 text-sm">
                Hover a point to preview its connections. Click one to pin the full impact chain.
              </p>
            ) : (
              <>
                <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-cyan mb-1">
                  {TYPE_STYLES[selectedNode.type].label}
                </p>
                <h2 className="font-mono text-sm font-bold mb-2">{selectedNode.label}</h2>
                <p className="text-slate-400 text-[.8rem] mb-4">{selectedNode.desc}</p>

                <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-slate-500 mb-2">
                  Downstream impact ({impactList.length})
                </p>
                {impactList.length === 0 ? (
                  <p className="text-slate-500 text-[.8rem]">Nothing downstream. This is an end point.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {impactList.map((n) => (
                      <li key={n.id} className="flex items-center gap-2 font-mono text-[.72rem]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: TYPE_STYLES[n.type].color }}
                        />
                        <span className="text-slate-300">{n.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
