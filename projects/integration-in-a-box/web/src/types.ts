export interface HbProduct { sku: string; name: string; unit_price_cents: number; stock_level: number; updated_at: string }
export interface MmItem { item_code: string; description: string; qty: number; last_synced_at: string }
export interface MmOrder { id: string; lines: { item_code: string; qty: number }[]; status: "pending_sync" | "synced" | "failed"; harbourline_order_id: string | null; error: string | null; created_at: string }
export interface Stats { lastRunAt: string | null; lastOk: boolean | null; highWaterMark: string | null; cycles: number; itemsUpdated: number; ordersSent: number; ordersFailed: number }
export interface State { harbourline: HbProduct[] | null; maple: MmItem[] | null; orders: MmOrder[] | null; connector: Stats }
export interface ConnectorEvent { id: number; at: string; kind: "sync" | "stock" | "order" | "error" | "demo"; direction: "h2m" | "m2h" | null; title: string; detail?: string }
