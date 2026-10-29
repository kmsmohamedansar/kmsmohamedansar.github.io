// Tools used at each step of a project's "How it works" flow, in column
// order. The Summary panel on each project page puts these under the
// matching step. Why and result come from the project itself.
export const STEP_TOOLS = {
  "decision-models": [[], [], ["Ollama", "qwen2.5:7b", "Strands Decider 2B", "Kev-0.8B", "Laya", "MLX"], ["Python"]],
  "rea-study": [[], ["REA", "Ghidra", "Model Context Protocol"], ["Claude Code", "Claude Sonnet 5.5"], ["Python"]],
  "agent-flight-recorder": [["Python", "Model Context Protocol"], ["SQLite"], ["Python"], ["Model Context Protocol"]],
  "site-recon": [["Playwright"], ["JavaScript"], ["Agent Skills", "Markdown"], ["React"]],
  "authorized-web-exposure-audit": [["Agent Skills"], ["Python"], ["Python"], ["Markdown", "JSON"]],
  sitescout: [["React", "Side panel"], ["Chrome extension (Manifest V3)"], ["TypeScript"], ["React", "Framer Motion"]],
  integration: [["React"], ["Node.js", "Fastify", "OAuth 2.0 / OpenID Connect"], ["Keycloak", "SQLite"], ["Fastify", "SQLite"]],
  "analytics-assistant": [["React"], ["Ollama (qwen2.5:7b)", "TypeScript"], ["Model Context Protocol", "Zod", "SQLite"], ["React", "Framer Motion"]],
  reptrack: [["SwiftUI"], ["SwiftUI"], ["SwiftData"], ["SwiftUI"]],
  jarvis: [[], ["Python"], ["Claude Code"], ["SQLite"]],
  "data-delivery": [["Python"], ["YAML", "Dagster"], ["dbt", "DuckDB"], ["Dagster", "pytest"]],
  "catalogue-checker": [["Open Food Facts", "pandas"], ["sentence-transformers"], ["facebook/bart-large-mnli"], ["pandas", "matplotlib"]],
  "mcp-workflow": [["Cursor"], ["Cursor"], ["Model Context Protocol", "TypeScript", "Zod"], ["Stateless HTTP transport"]],
  "health-dashboard": [[], ["Next.js (App Router)", "TypeScript"], ["React", "Tailwind CSS"]],
  "category-copilot": [["Next.js"], ["TypeScript"], ["TypeScript"], ["Recharts", "TanStack Table"]],
  sidecar: [[], ["Chrome extension (Manifest V3)", "Side panel"], ["CSV export"]],
  "scope-checker": [["Side panel"], ["Chrome extension (Manifest V3)"], ["CSV export"]],
  "fine-food-sentiment": [["pandas"], ["scikit-learn", "DistilBERT"], ["Weights & Biases"]],
  "news-scraper": [[], ["Selenium"], ["Beautiful Soup", "pandas"]],
  "smart-categorization": [["pandas"], ["facebook/bart-large-mnli"], ["pandas"], []],
  "spotify-trends": [["pandas"], ["pandas", "Jupyter"], ["matplotlib", "seaborn"]],
  "cpl-dream-xi": [["pandas"], ["Scoring logic"], ["pandas"], ["Power BI"]],
  "sql-playground": [["Static HTML"], ["JavaScript"], ["sql.js (SQLite in WebAssembly)"], ["PapaParse"]],
  "lineage-explorer": [[], [], [], ["React", "SVG", "Framer Motion"]],
  "local-agent": [["OpenClaw"], ["Docker via Colima", "DuckDuckGo search"], ["Ollama (4B local model)"], ["Telegram"]],
  taskmaster: [["Python"], ["Python"], ["Python"], ["Hugging Face Spaces"]],
  "customer-predictor": [["pandas"], ["scikit-learn Random Forest"], ["SHAP", "matplotlib"], ["Streamlit", "Hugging Face Spaces"]],
  "grocery-assistant": [[], ["sentence-transformers", "FAISS"], ["LangChain", "Flan-T5"], ["Gradio"]],
  "forex-tools": [["Dukascopy tick data", "Google News RSS"], ["pandas", "matplotlib"], ["Python"], ["Static HTML"]],
  "f1-telemetry": [["FastF1", "OpenF1 API"], ["pandas"], []],
};

// Before and after, for projects that replaced a slower way of working.
// Work projects stay generic: no numbers, per the rules in projects.js.
export const BEFORE_AFTER = {
  "catalogue-checker": {
    before: ["Old notebook, one product at a time", "No answer key, so accuracy unknown"],
    after: ["Fast pass on everything, slow pass only on doubtful ones", "Scored against 50 planted errors"],
    change: "About 12 minutes for 5 products → 1.45 minutes for 5,000",
  },
  sitescout: {
    before: ["15 tabs open", "Copy and paste every number", "One slip puts a number in the wrong row"],
    after: ["Paste tickers, press Scout", "Cards plus one CSV", "A broken page shows a red card saying what broke"],
    change: "About an hour of copy and paste → one click",
  },
  "analytics-assistant": {
    before: ["Rules or AI? Nobody had measured it"],
    after: ["Both answer the same 30 questions with the same six tools", "Every answer scored"],
    change: "Rules: 28 of 30 right in about 1 ms. Local AI: 20 of 30 in about 6 s",
  },
  "data-delivery": {
    before: ["Files in different formats, each with its own mess", "A wrong delivery gets used"],
    after: ["A settings file per customer", "dbt cleans and tests every week", "Deliver, or block with a reason"],
    change: "Bad weeks are stopped with the problem named, before anyone uses them",
  },
  sidecar: {
    before: ["Wait for the weekly scheduled run", "Or copy the data by hand"],
    after: ["Pick a site in the side panel", "CSV download, same columns every time"],
    change: "Data the same day, without touching the weekly run",
  },
  "scope-checker": {
    before: ["Check each product by hand against the retailer's rules", "Slow, and two careful people could disagree"],
    after: ["Paste IDs, pick a retailer", "Yes or no for each, with a reason", "CSV download"],
    change: "Consistent answers, with the reason written down",
  },
  "health-dashboard": {
    before: ["Exported files and the work tracker open side by side"],
    after: ["Headline numbers and the priority queue on one screen", "Each issue shows the accounts it affects"],
    change: "One page for the whole weekly review",
  },
};
