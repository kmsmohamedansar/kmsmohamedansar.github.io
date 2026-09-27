// Synthetic sample dataset for the Data Lineage Explorer demo.
// Every table, job, and dashboard name here is made up — there's no
// real pipeline or company behind it. It's shaped like a retail
// pricing pipeline (ingest -> staging -> facts -> marts -> dashboards)
// because that's a familiar pattern, not because it's copied from
// anywhere.

export const LINEAGE_NODES = [
  { id: "raw_price_events", label: "raw_price_events", type: "source", desc: "Raw price change events landed from the vendor feed, one row per observed price." },
  { id: "raw_products", label: "raw_products", type: "source", desc: "Raw product catalog snapshot, refreshed nightly." },
  { id: "raw_competitor_feed", label: "raw_competitor_feed", type: "source", desc: "Third-party competitor pricing feed, landed as-is." },

  { id: "job_ingest_prices", label: "ingest_prices", type: "job", desc: "Loads raw_price_events into staging and validates the schema." },
  { id: "job_ingest_products", label: "ingest_products", type: "job", desc: "Loads raw_products into staging." },
  { id: "job_ingest_competitor", label: "ingest_competitor", type: "job", desc: "Loads raw_competitor_feed into staging." },

  { id: "stg_price_events", label: "stg_price_events", type: "table", desc: "Cleaned, typed price events. One row per event." },
  { id: "stg_products", label: "stg_products", type: "table", desc: "Cleaned product catalog, deduped on product_id." },
  { id: "stg_competitor_prices", label: "stg_competitor_prices", type: "table", desc: "Cleaned competitor price observations." },

  { id: "job_dedupe_products", label: "dedupe_products", type: "job", desc: "Resolves duplicate product records from multiple source systems." },
  { id: "int_products_clean", label: "int_products_clean", type: "table", desc: "One row per canonical product, survivorship rules applied." },

  { id: "job_build_price_history", label: "build_price_history", type: "job", desc: "Joins price events to canonical products, builds the history fact." },
  { id: "fct_price_history", label: "fct_price_history", type: "table", desc: "Full price history fact table, one row per product per change." },

  { id: "job_compute_price_index", label: "compute_price_index", type: "job", desc: "Rolls price history up into a daily price index per category." },
  { id: "fct_price_index", label: "fct_price_index", type: "table", desc: "Daily price index by category and region." },

  { id: "job_match_competitor", label: "match_competitor", type: "job", desc: "Matches internal products to competitor SKUs for comparison." },
  { id: "fct_competitor_gap", label: "fct_competitor_gap", type: "table", desc: "Price gap vs. matched competitor SKUs, daily grain." },

  { id: "job_refresh_dashboard", label: "refresh_dashboard", type: "job", desc: "Refreshes the executive pricing dashboard from fct_price_index." },
  { id: "dash_retail_pricing", label: "dash_retail_pricing", type: "dashboard", desc: "Exec-facing dashboard: price trends by category and region." },

  { id: "job_refresh_alerts", label: "refresh_alerts", type: "job", desc: "Evaluates alert thresholds against the latest price index." },
  { id: "svc_price_alerts", label: "svc_price_alerts", type: "dashboard", desc: "Alerting service that pages the pricing team on threshold breaches." },

  { id: "job_export_partner_feed", label: "export_partner_feed", type: "job", desc: "Exports a partner-facing price feed from price history." },
  { id: "partner_feed_export", label: "partner_feed_export", type: "dashboard", desc: "Nightly file drop consumed by an external partner system." },

  { id: "job_refresh_gap_report", label: "refresh_gap_report", type: "job", desc: "Refreshes the competitor gap report." },
  { id: "dash_competitor_gap", label: "dash_competitor_gap", type: "dashboard", desc: "Competitor gap dashboard used by category managers." },
];

// Directed edges: from -> to, meaning "from" feeds "to". Clicking a
// node highlights everything reachable by following these edges
// forward, i.e. everything downstream that would be affected by a
// change to that node.
export const LINEAGE_EDGES = [
  ["raw_price_events", "job_ingest_prices"],
  ["job_ingest_prices", "stg_price_events"],

  ["raw_products", "job_ingest_products"],
  ["job_ingest_products", "stg_products"],

  ["raw_competitor_feed", "job_ingest_competitor"],
  ["job_ingest_competitor", "stg_competitor_prices"],

  ["stg_products", "job_dedupe_products"],
  ["job_dedupe_products", "int_products_clean"],

  ["stg_price_events", "job_build_price_history"],
  ["int_products_clean", "job_build_price_history"],
  ["job_build_price_history", "fct_price_history"],

  ["fct_price_history", "job_compute_price_index"],
  ["job_compute_price_index", "fct_price_index"],

  ["int_products_clean", "job_match_competitor"],
  ["stg_competitor_prices", "job_match_competitor"],
  ["job_match_competitor", "fct_competitor_gap"],

  ["fct_price_index", "job_refresh_dashboard"],
  ["job_refresh_dashboard", "dash_retail_pricing"],

  ["fct_price_index", "job_refresh_alerts"],
  ["job_refresh_alerts", "svc_price_alerts"],

  ["fct_price_history", "job_export_partner_feed"],
  ["job_export_partner_feed", "partner_feed_export"],

  ["fct_competitor_gap", "job_refresh_gap_report"],
  ["job_refresh_gap_report", "dash_competitor_gap"],
];
