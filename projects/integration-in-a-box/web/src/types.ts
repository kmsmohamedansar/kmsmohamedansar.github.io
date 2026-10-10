export interface HbProduct { sku: string; name: string; unit_price_cents: number; stock_level: number; updated_at: string }
export interface MmItem { item_code: string; description: string; qty: number; last_synced_at: string }
export interface MmOrder { id: string; lines: { item_code: string; qty: number }[]; status: "pending_sync" | "synced" | "failed"; harbourline_order_id: string | null; error: string | null; created_at: string }
export interface HbDelivery { id: string; event_id: string; event_type: string; attempts: number; status: "pending" | "delivered" | "failed"; last_status_code: number | null; last_error: string | null; created_at: string; delivered_at: string | null }
export interface Stats { webhooksReceived: number; webhooksRejected: number; lastRunAt: string | null; lastOk: boolean | null; highWaterMark: string | null; cycles: number; itemsUpdated: number; ordersSent: number; ordersFailed: number }
export interface State {
  harbourline: HbProduct[] | null; maple: MmItem[] | null; orders: MmOrder[] | null; deliveries: HbDelivery[] | null; connector: Stats;
  auth: { tokenExpiresInSec: number | null; tokensFetched: number } | null;
  webhooks: { subscribed: boolean } | null;
}
export interface Me { user: { name: string; email: string } | null; sso?: boolean }
export interface ConnectorEvent { id: number; at: string; kind: "sync" | "stock" | "order" | "error" | "demo" | "auth" | "webhook"; direction: "h2m" | "m2h" | null; title: string; detail?: string }
