import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ConnectorEvent, MmOrder } from "./types";

/** A number that counts to its new value and flashes when it changes. */
export function LiveNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (n) => String(Math.round(n)));
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? "up" : "down");
      const c = animate(mv, value, { duration: 0.6, ease: "easeOut" });
      const t = setTimeout(() => setFlash(null), 1100);
      prev.current = value;
      return () => { c.stop(); clearTimeout(t); };
    }
  }, [value, mv]);
  return <motion.span className={`live-num ${flash ? `flash-${flash}` : ""}`}>{text}</motion.span>;
}

export interface Row { key: string; label: string; sub: string; qty: number }

export function SystemPanel(props: {
  name: string;
  tagline: string;
  tone: "hb" | "mm";
  rows: Row[] | null;
  fieldNames: [string, string, string];
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`panel tone-${props.tone}`}>
      <header className="panel-head">
        <div className="panel-dot" />
        <div>
          <h2>{props.name}</h2>
          <p>{props.tagline}</p>
        </div>
      </header>
      <div className="fields" title="This system's own field names">
        {props.fieldNames.map((f) => <code key={f}>{f}</code>)}
      </div>
      {props.rows === null ? (
        <p className="offline">Can't reach this system</p>
      ) : props.rows.length === 0 ? (
        <motion.p className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{props.empty}</motion.p>
      ) : (
        <ul className="rows">
          <AnimatePresence initial={false}>
            {props.rows.map((r, i) => (
              <motion.li
                key={r.key}
                layout
                initial={{ opacity: 0, x: props.tone === "mm" ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, type: "spring", stiffness: 300, damping: 28 }}
              >
                <span className="row-label">
                  {r.label}
                  <small>{r.sub}</small>
                </span>
                <span className={`qty ${r.qty < 10 ? "low" : ""}`}><LiveNumber value={r.qty} /></span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {props.children}
    </section>
  );
}

/** The middle column: two lanes with packets flying across when data moves. */
export function Pipe({ packets }: { packets: { id: number; direction: "h2m" | "m2h"; kind: string }[] }) {
  return (
    <div className="pipe" aria-hidden>
      {(["h2m", "m2h"] as const).map((lane) => (
        <div key={lane} className={`lane lane-${lane}`}>
          <span className="lane-label">{lane === "h2m" ? "stock →" : "← orders"}</span>
          <div className="lane-track" />
          <AnimatePresence>
            {packets.filter((p) => p.direction === lane).map((p) => (
              <motion.span
                key={p.id}
                className={`packet packet-${p.kind}`}
                initial={{ left: lane === "h2m" ? "0%" : "100%", opacity: 0, scale: 0.4 }}
                animate={{ left: lane === "h2m" ? "100%" : "0%", opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6] }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

const STATUS_TEXT: Record<MmOrder["status"], string> = { pending_sync: "waiting", synced: "synced", failed: "failed" };

export function Orders({ orders }: { orders: MmOrder[] | null }) {
  if (!orders || orders.length === 0) return null;
  return (
    <div className="orders">
      <h3>Recent orders</h3>
      <ul>
        <AnimatePresence initial={false}>
          {orders.slice(0, 5).map((o) => (
            <motion.li key={o.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <code>{o.id}</code>
              <span className="order-lines">{o.lines.map((l) => `${l.qty} x ${l.item_code}`).join(", ")}</span>
              <motion.span layout className={`pill pill-${o.status}`} title={o.error ?? o.harbourline_order_id ?? ""}>
                {o.status === "pending_sync" && <span className="pulse" />}
                {STATUS_TEXT[o.status]}
              </motion.span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const KIND_ICON: Record<ConnectorEvent["kind"], string> = { sync: "⟳", stock: "▲", order: "◆", error: "!", demo: "•" };

export function EventFeed({ events }: { events: ConnectorEvent[] }) {
  return (
    <section className="feed">
      <h2>What the connector is doing</h2>
      <ol>
        <AnimatePresence initial={false}>
          {events.slice(-14).reverse().map((e) => (
            <motion.li
              key={e.id}
              layout
              className={`ev ev-${e.kind}`}
              initial={{ opacity: 0, y: -14, backgroundColor: "rgba(139,92,246,0.25)" }}
              animate={{ opacity: 1, y: 0, backgroundColor: "rgba(139,92,246,0)" }}
              transition={{ duration: 0.5 }}
            >
              <span className="ev-icon">{KIND_ICON[e.kind]}</span>
              <span className="ev-time">{new Date(e.at).toLocaleTimeString([], { hour12: false })}</span>
              <span className="ev-text">
                {e.title}
                {e.detail && <small>{e.detail}</small>}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
