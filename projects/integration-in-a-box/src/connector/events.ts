// A small in-memory event log. The control room streams it live.

export type EventKind = "sync" | "stock" | "order" | "error" | "demo";
export type Direction = "h2m" | "m2h" | null;

export interface ConnectorEvent {
  id: number;
  at: string;
  kind: EventKind;
  direction: Direction;
  title: string;
  detail?: string;
}

type Listener = (e: ConnectorEvent) => void;

export class EventLog {
  private items: ConnectorEvent[] = [];
  private listeners = new Set<Listener>();
  private next = 1;

  constructor(private max = 300) {}

  push(kind: EventKind, title: string, opts: { direction?: Direction; detail?: string } = {}): ConnectorEvent {
    const e: ConnectorEvent = { id: this.next++, at: new Date().toISOString(), kind, direction: opts.direction ?? null, title, detail: opts.detail };
    this.items.push(e);
    if (this.items.length > this.max) this.items.shift();
    for (const l of this.listeners) l(e);
    return e;
  }

  recent(n = 100): ConnectorEvent[] {
    return this.items.slice(-n);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
