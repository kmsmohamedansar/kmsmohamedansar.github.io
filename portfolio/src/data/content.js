// Single source of truth for portfolio content.
// Keeping copy here (instead of scattered across JSX) means every
// component that needs it — hero dock, command palette, nav — reads
// from the same list and can't drift out of sync.

import emetArt from "../assets/cards/emet-art.webp";
import datasemblyMark from "../assets/cards/datasembly-mark.png";
import primeVideoMark from "../assets/cards/prime-video-mark.png";
import projectsMark from "../assets/cards/projects-mark.png";

export const NAV_SECTIONS = [
  { id: "emet", label: "Emet", index: 0 },
  { id: "source", label: "Current", index: 1 },
  { id: "lineage", label: "Before", index: 2 },
  { id: "build", label: "Projects", index: 3 },
  { id: "commit", label: "Contact", index: 4 },
];

// The hero's card deck — one card per major destination on the page.
// EMET scrolls to the terminal instead of expanding inline, same as
// the other four, so all five behave identically: click a card, land
// on the section it represents. Each card carries its own accent color
// pulled from the site's existing palette — that color rides along
// onto the card face and into the ambient background of the view it
// opens, so a destination has one consistent identity everywhere it
// shows up, not just inside the deck. "mark" names an icon drawn on
// the card face (see three/cardTexture.js) rather than a bare index
// number — a numeral doesn't say what a card is, an icon does. "image"
// is optional: when set, the card face uses that picture instead of
// the drawn mark ("cover" crops full-bleed for artwork, "contain"
// keeps a logo whole on its own tile instead of cropping it).
export const HERO_DECK = [
  { id: "emet", go: "#emet", kicker: "assistant", title: "EMET", tagline: "Ask the terminal", accent: "#22d3ee", mark: "terminal", image: emetArt, imageFit: "cover" },
  { id: "now", go: "#source", kicker: "current role", title: "Current", tagline: "Solutions Engineer, Datasembly", accent: "#8e7dff", mark: "pulse", image: datasemblyMark, imageFit: "contain" },
  { id: "before", go: "#lineage", kicker: "career", title: "Before", tagline: "Amazon · Spongelii · Datasembly", accent: "#fbbf24", mark: "clock", image: primeVideoMark, imageFit: "contain" },
  { id: "work", go: "#build", kicker: "shipped", title: "Projects", tagline: "RepTrack + 9 more shipped", accent: "#34d399", mark: "rocket", image: projectsMark, imageFit: "contain" },
  { id: "contact", go: "#commit", kicker: "reach", title: "Contact", tagline: "Say hello", accent: "#fb7185", mark: "mail" },
];

// Per-view ambient background theme — keyed by route (not card id,
// since routes and card ids don't share a naming scheme). "mode"
// picks the particle behavior in AmbientField; light theme only
// borrows the colors, keeping its own calmer motion language.
export const ROUTE_THEME = {
  deck: { accent: "34,211,238", accent2: "251,191,36", lightAccent: "14,116,144", lightAccent2: "180,83,9", mode: "stream" },
  emet: { accent: "34,211,238", accent2: "14,116,144", lightAccent: "14,116,144", lightAccent2: "12,74,110", mode: "signal" },
  source: { accent: "142,125,255", accent2: "34,211,238", lightAccent: "109,40,217", lightAccent2: "14,116,144", mode: "pulse" },
  lineage: { accent: "251,191,36", accent2: "245,158,11", lightAccent: "180,83,9", lightAccent2: "146,64,14", mode: "settle" },
  build: { accent: "52,211,153", accent2: "34,211,238", lightAccent: "4,120,87", lightAccent2: "14,116,144", mode: "lattice" },
  story: { accent: "142,125,255", accent2: "251,113,133", lightAccent: "109,40,217", lightAccent2: "190,18,60", mode: "pulse" },
  commit: { accent: "251,113,133", accent2: "142,125,255", lightAccent: "190,18,60", lightAccent2: "109,40,217", mode: "converge" },
};

export const EMET_SHORTCUTS = [
  { n: 1, label: "What does he do now?", go: "#source" },
  { n: 2, label: "Where has he worked?", go: "#lineage" },
  { n: 3, label: "What has he shipped?", go: "#build" },
  { n: 4, label: "How do I reach him?", go: "#commit" },
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
};

export const COMMAND_ITEMS = [
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
