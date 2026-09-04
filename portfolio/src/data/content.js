// Single source of truth for portfolio content.
// Keeping copy here (instead of scattered across JSX) means every
// component that needs it — hero dock, command palette, nav — reads
// from the same list and can't drift out of sync.

// emet answers these itself, inline in the terminal, instead of just
// linking off to the section — "go" is kept only as an optional
// "see the full page" escape hatch shown once the answer's done
// typing, not the primary way to get the information. "keywords"
// lets freeform input match a topic (e.g. typing "amazon" or "sql")
// without needing the exact numbered shortcut.
export const EMET_TOPICS = [
  {
    n: 1,
    label: "What does he do now?",
    go: "#source",
    keywords: ["now", "current", "today", "sql", "snowflake", "datasembly", "job", "role"],
    answer: [
      { text: "Solutions Engineer at " },
      { text: "Datasembly", cls: "font-bold" },
      {
        text:
          " since Jan 2026 — SQL and Snowflake at retail pricing scale, pre-sales solution design, and turning stakeholder questions into technical approaches they actually trust.",
      },
    ],
  },
  {
    n: 2,
    label: "Where has he worked?",
    go: "#lineage",
    keywords: ["before", "worked", "history", "amazon", "spongelii", "experience", "past"],
    answer: [
      { text: "Datasembly", cls: "font-bold" },
      { text: " (Solutions Engineer, then Tech Support) · " },
      { text: "Spongelii", cls: "font-bold" },
      { text: " (business analysis) · " },
      { text: "Amazon Prime Video", cls: "font-bold" },
      { text: " (quality auditing, digital content) — progressively more technical ownership at each stop." },
    ],
  },
  {
    n: 3,
    label: "What has he shipped?",
    go: "#build",
    keywords: ["shipped", "built", "projects", "ios", "app", "reptrack", "swift", "demo"],
    answer: [
      { text: "10+ projects. " },
      { text: "RepTrack", cls: "font-bold" },
      { text: " — a SwiftUI workout log — is live on the " },
      { text: "App Store", cls: "font-bold" },
      {
        text:
          ", built and submitted solo. Plus a SQL playground, an ML pipeline with retries, a retention model, and a local semantic search assistant — most with live demos.",
      },
    ],
  },
  {
    n: 4,
    label: "How do I reach him?",
    go: "#commit",
    keywords: ["reach", "contact", "email", "linkedin", "hire", "talk", "hello", "hi"],
    answer: [
      { text: "Fastest: " },
      { text: "mohamedansarkms@gmail.com", cls: "font-bold" },
      { text: ". Also on LinkedIn — " },
      { text: "kmsmohamedansar", cls: "font-bold" },
      { text: ". Say hello, he reads everything." },
    ],
  },
];

export const STACK_TAGS = [
  "SQL",
  "Snowflake",
  "Python",
  "SwiftUI",
  "SwiftData",
  "Airflow",
  "BigQuery",
  "Tableau",
  "Power BI",
  "pandas",
  "FAISS",
  "Transformers",
  "DuckDB",
  "Xcode",
  "App Store Connect",
  "ETL / ELT",
];

export const PRINCIPLES = [
  {
    title: "Production analytics",
    body: "Snowflake, SQL, validated pipelines. Outputs teams trust on a recurring cadence, with lineage you can explain.",
  },
  {
    title: "Clarity first",
    body: "Stakeholder language up front; engineering that still holds after launch. Business questions become technical approaches, not jargon.",
  },
  {
    title: "Native product",
    body: "SwiftUI and SwiftData built for repeat daily use. Taken through Apple review and listing constraints, not slide screenshots.",
  },
];

export const ROLES = [
  {
    company: "Datasembly",
    title: "Solutions Engineer",
    when: "Jan 2026 to Present · Remote, Canada",
    current: true,
    bullets: [
      "Design data solutions for retail pricing datasets: client needs, pre-sales analysis, and custom data requests.",
      "Use SQL and Snowflake to investigate complex data issues, validate outputs, and deliver reliable stakeholder-ready solutions.",
      "Partner with internal teams to translate business questions into clear technical approaches and usable deliverables.",
    ],
    tags: ["SQL", "Snowflake", "Pre-sales", "Data solutions"],
  },
  {
    company: "Datasembly",
    title: "Tech Support",
    when: "Aug 2024 to Dec 2025 · Remote, Canada",
    current: false,
    bullets: [
      "Supported pricing analytics initiatives by building SQL-based reporting solutions and improving internal data workflows.",
      "Resolved complex data issues across recurring client and internal requests using Snowflake and related tooling.",
      "Contributed to dashboarding, reporting reliability, and workflow improvements across analytics operations.",
    ],
    tags: ["SQL", "Snowflake", "Reporting", "Workflow support"],
  },
  {
    company: "Spongelii",
    title: "Business Development Intern · Business Analysis",
    when: "Jan 2024 to Apr 2024 · Remote, Canada",
    current: false,
    bullets: [
      "Business analysis tied to data workflows, reporting needs, and stakeholder requirements.",
      "SQL and Snowflake-based work shaping dashboard and reporting outputs.",
      "Documentation for requirements, analysis logic, and workflow structure.",
    ],
    tags: ["Business analysis", "SQL", "Snowflake", "Tableau"],
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst II · Quality Auditing",
    when: "Oct 2021 to Aug 2022 · Hybrid, India",
    current: false,
    bullets: [
      "Quality auditing and process improvement for Prime Video content operations.",
      "Reporting and analysis for workflow gaps, trends, and operational decisions.",
      "SOP updates, audit consistency, and cross-team standardization.",
    ],
    tags: ["Quality auditing", "Process improvement", "Reporting", "Operations"],
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst I · Digital Content",
    when: "Aug 2019 to Sep 2021 · Hybrid, India",
    current: false,
    bullets: [
      "Quality control and operational coordination for the digital content catalog.",
      "Stakeholder work on defects, metadata accuracy, and content readiness.",
      "Process quality across recurring operations and issue resolution.",
    ],
    tags: ["Digital content", "Quality control", "Stakeholders", "Operations"],
  },
];

export const PROJECTS = [
  {
    title: "RepTrack: workout log, shipped iOS",
    kicker: "App Store",
    warm: true,
    featured: true,
    body: "Log sets and reps fast; see last session without digging. SwiftUI + SwiftData, local-first, no account wall. Taken through Apple review and App Store Connect submission. End to end, nothing handed off.",
    tags: ["SwiftUI", "SwiftData", "iOS 17+", "App Store"],
    links: [
      { label: "View on App Store ↗", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", external: true, warm: true },
    ],
  },
  {
    title: "SQL Playground: Snowflake style, in your browser",
    kicker: "Live demo",
    body: "A browser-based SQL practice environment on SQLite WASM with a lightweight Snowflake-style translation layer. Product thinking, SQL fluency, and a genuinely useful learning interface.",
    tags: ["SQL", "WASM", "Browser app"],
    links: [{ label: "Open playground →", href: "https://kmsmohamedansar.github.io/sql-playground", external: true }],
  },
  {
    title: "TaskMaster: small ML pipeline with retries",
    kicker: "Live demo",
    body: "A production-style mini pipeline with idempotent steps, retry logic, structured logs, and a live interface. More than notebook ML, closer to real system behavior.",
    tags: ["ML", "Pipeline", "Retries"],
    links: [{ label: "Open demo →", href: "https://huggingface.co/spaces/kmsmohamedansar/TaskMaster-Job-Scheduler", external: true }],
  },
  {
    title: "High-value customer predictor",
    kicker: "Live demo",
    body: "Retention-focused model with validation, explainability, and basic MLOps hygiene. Modeling with stakeholder usability in mind.",
    tags: ["ML", "Retention", "Explainability"],
    links: [{ label: "Open demo →", href: "https://huggingface.co/spaces/kmsmohamedansar/high-value-customer-predictor", external: true }],
  },
  {
    title: "Grocery AI assistant: local semantic search",
    kicker: "Live demo",
    collapsed: true,
    body: "Offline product search and grounded Q&A using embeddings, FAISS, and a lightweight local model. Retrieval, local AI, practical interfaces.",
    tags: ["Search", "LLM", "Local-first"],
    links: [{ label: "Open demo →", href: "https://huggingface.co/spaces/kmsmohamedansar/ai_knowledge_assistant", external: true }],
  },
  {
    title: "Amazon fine-food sentiment",
    collapsed: true,
    body: "Baseline-to-transformer sentiment analysis with stronger NLP performance and deployment exploration.",
    tags: ["NLP", "Transformers", "Sentiment"],
  },
  {
    title: "Yahoo Finance news scraper",
    collapsed: true,
    body: "Headless-browser scraper for JS-heavy news pages, normalized into a structured dataset for downstream NLP and research workflows.",
    tags: ["Scraping", "Automation", "Python"],
  },
  {
    title: "Smart product categorization: zero-shot",
    collapsed: true,
    body: "Category validation with BART-MNLI plus lightweight rules for low-label review queues.",
    tags: ["Zero-shot", "LLM / NLI", "QA"],
  },
  {
    title: "Spotify music trends: quick EDA",
    collapsed: true,
    body: "Audio features and popularity over time, focused on clean data storytelling and visualization.",
    tags: ["EDA", "Python", "Visualization"],
  },
  {
    title: "Canadian Premier League: Dream XI (2019)",
    collapsed: true,
    body: "Role-aware KPI model for player selection with a Power BI dashboard for storytelling.",
    tags: ["Sports analytics", "Power BI", "Scoring logic"],
  },
];

export const STORY_BEATS = [
  {
    n: "01",
    title: "Operations first",
    body: "I started in content and quality operations at Amazon Prime Video, auditing catalogs and chasing down why numbers didn't match. That is where I learned the real cost of bad data: it rarely shows up as an error. It shows up two teams downstream as a wrong decision.",
  },
  {
    n: "02",
    title: "The pull toward data",
    body: "Business analysis work at Spongelii pulled me deeper into SQL and Snowflake. The questions got more interesting than the answers. I wanted to be the person building the pipeline, not just reading what came out of it.",
  },
  {
    n: "03",
    title: "Making it the job",
    body: "At Datasembly, that became the actual work: SQL and Snowflake at retail pricing scale, pre-sales solution design, and being the person a stakeholder trusts to explain why a number is right, not just that it is.",
  },
  {
    n: "04",
    title: "Building outside the job too",
    body: "RepTrack, shipped to the App Store. An in-browser SQL playground. A handful of ML pipelines. None of it was assigned. Working a real problem end to end, not just the data layer, is how I actually learn something.",
  },
];

export const CONTACT = {
  email: "mohamedansarkms@gmail.com",
  linkedin: "https://www.linkedin.com/in/kmsmohamedansar/",
  github: "https://github.com/kmsmohamedansar",
};

export const COMMAND_ITEMS = [
  { label: "Emet — ask the AI terminal", go: "#emet", group: "Sections" },
  { label: "Current — what he does today", go: "#source", group: "Sections" },
  { label: "Before — where he's worked", go: "#lineage", group: "Sections" },
  { label: "Projects — what he's shipped", go: "#build", group: "Sections" },
  { label: "Why — the short version", go: "#story", group: "Sections" },
  { label: "Contact", go: "#commit", group: "Sections" },
  { label: "RepTrack on the App Store", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", group: "Links" },
  { label: "LinkedIn · kmsmohamedansar", href: CONTACT.linkedin, group: "Links" },
  { label: "SQL Playground · live demo", href: "https://kmsmohamedansar.github.io/sql-playground", group: "Links" },
  { label: "Email · " + CONTACT.email, href: "mailto:" + CONTACT.email, group: "Links" },
  { label: "Toggle dev_mode · sandbox stubs", action: "toggle-sandbox", group: "System" },
];
