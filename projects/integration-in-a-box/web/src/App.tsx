import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { EventFeed, Orders, Pipe, SystemPanel } from "./components";
import type { ConnectorEvent, State } from "./types";

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 2 ? "just now" : `${s}s ago`;
};

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [events, setEvents] = useState<ConnectorEvent[]>([]);
  const [packets, setPackets] = useState<{ id: number; direction: "h2m" | "m2h"; kind: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/state");
      setState(await r.json());
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 2000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    const es = new EventSource("/api/events");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as ConnectorEvent;
      setEvents((prev) => (prev.some((p) => p.id === e.id) ? prev : [...prev.slice(-200), e]));
      if (e.direction) {
        setPackets((p) => [...p, { id: e.id, direction: e.direction!, kind: e.kind }]);
        setTimeout(() => setPackets((p) => p.filter((x) => x.id !== e.id)), 1300);
      }
      refresh();
    };
    return () => { clearInterval(poll); clearInterval(clock); es.close(); };
  }, [refresh]);

  const act = async (name: string, path: string) => {
    setBusy(name);
    try {
      await fetch(path, { method: "POST" });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const c = state?.connector;
  const health = !c || c.lastOk === null ? "idle" : c.lastOk ? "ok" : "bad";

  return (
    <div className="app">
      <div className="grid-bg" aria-hidden />
      <header className="top">
        <div>
          <p className="kicker">Integration-in-a-box</p>
          <h1>Control room</h1>
          <p className="sub">Two made-up companies, one connector in the middle. Everything here is synthetic.</p>
        </div>
        <div className={`health health-${health}`}>
          <span className="health-dot" />
          {health === "ok" ? "Healthy" : health === "bad" ? "Problem, retrying" : "Starting"}
          <small>{connected ? "live" : "reconnecting"}</small>
        </div>
      </header>

      <div className="stage">
        <SystemPanel
          name="Harbourline"
          tagline="Inventory software. The source of truth for stock."
          tone="hb"
          fieldNames={["sku", "name", "stock_level"]}
          empty="No products"
          rows={state?.harbourline?.map((p) => ({ key: p.sku, label: p.name, sub: p.sku, qty: p.stock_level })) ?? (state ? null : [])}
        />

        <section className="middle">
          <motion.div className="connector-card" animate={busy === "sync" ? { scale: [1, 1.03, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }}>
            <h2>Connector</h2>
            <p className="mapping"><code>stock_level</code> → <code>qty</code></p>
            <dl className="stats">
              <div><dt>Last sync</dt><dd>{ago(c?.lastRunAt ?? null)}</dd></div>
              <div><dt>Cycles</dt><dd>{c?.cycles ?? 0}</dd></div>
              <div><dt>Items updated</dt><dd>{c?.itemsUpdated ?? 0}</dd></div>
              <div><dt>Orders sent</dt><dd>{c?.ordersSent ?? 0}</dd></div>
              <div><dt>Orders rejected</dt><dd className={c?.ordersFailed ? "bad" : ""}>{c?.ordersFailed ?? 0}</dd></div>
            </dl>
          </motion.div>
          <Pipe packets={packets} />
          <div className="controls">
            <motion.button whileTap={{ scale: 0.96 }} className="btn btn-mm" disabled={!!busy} onClick={() => act("sale", "/api/demo/sale")}>
              A shopper buys something at Maple & Main
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} className="btn btn-hb" disabled={!!busy} onClick={() => act("delivery", "/api/demo/delivery")}>
              A delivery arrives at Harbourline
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} className="btn btn-ghost" disabled={!!busy} onClick={() => act("sync", "/api/sync")}>
              Sync now
            </motion.button>
          </div>
        </section>

        <SystemPanel
          name="Maple & Main"
          tagline="A grocer. Its own system, its own field names."
          tone="mm"
          fieldNames={["item_code", "description", "qty"]}
          empty="Shelves empty. Waiting for the first sync…"
          rows={state?.maple?.map((i) => ({ key: i.item_code, label: i.description, sub: i.item_code, qty: i.qty })) ?? (state ? null : [])}
        >
          <Orders orders={state?.orders ?? null} />
        </SystemPanel>
      </div>

      <EventFeed events={events} />
    </div>
  );
}
