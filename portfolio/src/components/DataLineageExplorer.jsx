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

  const colWidth = 220;
  const rowHeight = 64;
  const positions = new Map();
  const maxRows = Math.max(...[...columns.values()].map((c) => c.length));
  columns.forEach((ids, col) => {
    const offsetY = ((maxRows - ids.length) * rowHeight) / 2;
    ids.forEach((id, row) => {
      positions.set(id, { x: col * colWidth + 90, y: offsetY + row * rowHeight + 50 });
    });
  });

  const width = (Math.max(...depth.values()) + 1) * colWidth + 90;
  const height = maxRows * rowHeight + 100;
  return { positions, forward, width, height };
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

const TYPE_STYLES = {
  source: { fill: "#0f2436", stroke: "#38bdf8", label: "Source" },
  table: { fill: "#12261d", stroke: "#34d399", label: "Table" },
  job: { fill: "#2a1f0f", stroke: "#fbbf24", label: "Job" },
  dashboard: { fill: "#25142f", stroke: "#c084fc", label: "Consumer" },
};

function LineageNode({ node, pos, isSelected, isDownstream, isDimmed, onClick }) {
  const style = TYPE_STYLES[node.type];
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={() => onClick(node.id)}
      className="cursor-pointer"
      role="button"
      aria-label={`${node.label} (${style.label})`}
    >
      <rect
        x={-85}
        y={-20}
        width={170}
        height={40}
        rx={8}
        fill={style.fill}
        stroke={isSelected ? "#fff" : style.stroke}
        strokeWidth={isSelected ? 2.5 : isDownstream ? 2 : 1.2}
        opacity={isDimmed ? 0.25 : 1}
      />
      <text
        x={0}
        y={-2}
        textAnchor="middle"
        className="font-mono select-none"
        fontSize={11}
        fontWeight={isSelected ? 700 : 500}
        fill={isDimmed ? "#64748b" : "#e2e8f0"}
      >
        {node.label}
      </text>
      <text
        x={0}
        y={12}
        textAnchor="middle"
        className="font-mono select-none uppercase"
        fontSize={7.5}
        letterSpacing={1}
        fill={isDimmed ? "#475569" : style.stroke}
        opacity={isDimmed ? 0.5 : 0.85}
      >
        {style.label}
      </text>
    </g>
  );
}

function edgePath(a, b) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x + 85} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - 85} ${b.y}`;
}

export default function DataLineageExplorer() {
  const { navigate } = useRoute();
  const [selected, setSelected] = useState(null);

  const { positions, forward, width, height } = useMemo(
    () => computeLayout(LINEAGE_NODES, LINEAGE_EDGES),
    []
  );

  const impact = useMemo(() => {
    if (!selected) return null;
    return downstreamOf(selected, forward);
  }, [selected, forward]);

  const selectedNode = LINEAGE_NODES.find((n) => n.id === selected);
  const impactList = useMemo(() => {
    if (!impact) return [];
    return LINEAGE_NODES.filter((n) => impact.nodes.has(n.id) && n.id !== selected);
  }, [impact, selected]);

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
          Click any table, job, or dashboard to see the full downstream impact chain — everything
          that would break, go stale, or need a re-run if that node changed.
        </p>
        <p className="font-mono text-[.65rem] text-slate-500 mb-8">
          Synthetic sample dataset — a made-up retail pricing pipeline, built to demo the pattern.
        </p>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-x-auto">
            <svg width={width} height={height} className="block min-w-full">
              <g>
                {LINEAGE_EDGES.map(([from, to]) => {
                  const a = positions.get(from);
                  const b = positions.get(to);
                  const key = `${from}->${to}`;
                  const isHot = impact?.edges.has(key);
                  const isDimmed = selected && !isHot;
                  return (
                    <path
                      key={key}
                      d={edgePath(a, b)}
                      fill="none"
                      stroke={isHot ? "#38bdf8" : "#334155"}
                      strokeWidth={isHot ? 2.2 : 1.2}
                      opacity={isDimmed ? 0.15 : isHot ? 0.95 : 0.5}
                    />
                  );
                })}
              </g>
              <g>
                {LINEAGE_NODES.map((node) => {
                  const pos = positions.get(node.id);
                  const isSelected = node.id === selected;
                  const isDownstream = impact?.nodes.has(node.id) && !isSelected;
                  const isDimmed = selected && !impact.nodes.has(node.id);
                  return (
                    <LineageNode
                      key={node.id}
                      node={node}
                      pos={pos}
                      isSelected={isSelected}
                      isDownstream={isDownstream}
                      isDimmed={isDimmed}
                      onClick={(id) => setSelected((cur) => (cur === id ? null : id))}
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
                Select a node on the left to see what's downstream of it.
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
                  <p className="text-slate-500 text-[.8rem]">Nothing downstream — this is a terminal node.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {impactList.map((n) => (
                      <li key={n.id} className="flex items-center gap-2 font-mono text-[.72rem]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: TYPE_STYLES[n.type].stroke }}
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
