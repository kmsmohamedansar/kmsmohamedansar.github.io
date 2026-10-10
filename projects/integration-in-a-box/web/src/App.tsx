import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { BreakPanel, Deliveries, EventFeed, Orders, Pipe, SignIn, SystemPanel } from "./components";
import type { BreakInfo, ConnectorEvent, Me, State } from "./types";

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 2 ? "just now" : `${s}s ago`;
};

const mmss = (s: number | null | undefined) => (s == null ? "none yet" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

export default function App() {
  const [me, setMe] = useState<Me | "loading" | "signed-out">("loading");
  useEffect(() => {
    fetch("/auth/me").then(async (r) => setMe(r.ok ? await r.json() : "signed-out")).catch(() => setMe("signed-out"));
  }, []);
  if (me === "loading") return null;
  if (me === "signed-out") return <SignIn />;
  return <ControlRoom me={me} />;
}

function ControlRoom({ me }: { me: Me }) {
  const [state, setState] = useState<State | null>(null);
  const [events, setEvents] = useState<ConnectorEvent[]>([]);
  const [packets, setPackets] = useState<{ id: number; direction: "h2m" | "m2h"; kind: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [breaks, setBreaks] = useState<BreakInfo[]>([]);
  const loadBreaks = useCallback(async () => {
    const r = await fetch("/api/breaks");
    if (r.ok) setBreaks(await r.json());
  }, []);
  useEffect(() => { loadBreaks(); }, [loadBreaks]);
  const toggleBreak = async (b: BreakInfo) => {
    setBusy(b.id);
    try {
      await fetch(`/api/breaks/${b.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ on: b.kind === "once" ? true : !b.active }) });
      await loadBreaks();
      await refresh();
    } finally {
      setBusy(null);
    }
  };
  const fixAll = async () => {
    setBusy("all");
    try {
      await fetch("/api/breaks", { method: "DELETE" });
      await loadBreaks();
    } finally {
      setBusy(null);
    }
  };
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
        <div className="top-right">
          {me.user && (
            <div className="who">
              <span className="avatar">{me.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
              <span>
                {me.user.name}
                <small>signed in with Maple &amp; Main SSO</small>
              </span>
              <a href="/auth/logout" className="signout">Sign out</a>
            </div>
          )}
          <div className={`health health-${health}`}>
            <span className="health-dot" />
            {health === "ok" ? "Healthy" : health === "bad" ? "Problem, retrying" : "Starting"}
            <small>{connected ? "live" : "reconnecting"}</small>
          </div>
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
        >
          <Deliveries deliveries={state?.deliveries ?? null} />
        </SystemPanel>

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
              {state?.webhooks && <div><dt>Webhooks in</dt><dd>{c?.webhooksReceived ?? 0}</dd></div>}
              {state?.webhooks && <div><dt>Bad signatures</dt><dd className={c?.webhooksRejected ? "bad" : ""}>{c?.webhooksRejected ?? 0}</dd></div>}
            </dl>
            {!!state?.pausedForSec && <p className="paused">Paused by rate limit · {state.pausedForSec}s</p>}
            {state?.auth && (
              <div className="token" title="OAuth 2.0 client credentials: the connector's pass for calling Harbourline">
                <span className="token-label">⚿ Access token</span>
                <span className={`token-time ${(state.auth.tokenExpiresInSec ?? 99) < 40 ? "soon" : ""}`}>{mmss(state.auth.tokenExpiresInSec)}</span>
                <small>{state.auth.tokensFetched} issued so far</small>
              </div>
            )}
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

      {breaks.length > 0 && <BreakPanel breaks={breaks} onToggle={toggleBreak} onFixAll={fixAll} busy={busy} />}

      <EventFeed events={events} />
    </div>
  );
}
