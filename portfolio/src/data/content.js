// Single source of truth for portfolio content.
// Keeping copy here (instead of scattered across JSX) means every
// component that needs it — hero dock, command palette, nav — reads
// from the same list and can't drift out of sync.

import emetArt from "../assets/cards/emet-art.webp";
import datasemblyMark from "../assets/cards/datasembly-mark.png";
import amazonMark from "../assets/cards/amazon-mark.png";
import projectsBanner from "../assets/cards/projects-banner.png";
import contactBook from "../assets/cards/contact-book.png";

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
// number — a numeral doesn't say what a card is, an icon does, and
// is also the fallback if "image" fails to load. "imageFit" picks how
// the picture fills the card: "cover" crops full-bleed edge to edge
// (right for a photo/art piece), "contain" zooms out to show the
// whole image with room to breathe (right for a wordmark or a wide
// banner, where a tight crop would slice through it). "imageInset"
// trims a fraction off the top/bottom of the source before a "cover"
// crop — EMET's art has thin black letterbox bars baked into the
// file that a plain crop can't remove on its own. "title" is what
// the floating hover label shows (see NavCardDeck) — EMET and
// Contact stay short, the other three spell out "work exp[erience]"
// since a bare "Current"/"Before" reads as unclear on its own.
export const HERO_DECK = [
  {
    id: "emet",
    go: "#emet",
    kicker: "assistant",
    title: "EMET",
    tagline: "Ask the AI terminal",
    accent: "#22d3ee",
    mark: "terminal",
    image: emetArt,
    imageFit: "cover",
    imageInset: { top: 0.045, bottom: 0.045 },
  },
  { id: "now", go: "#source", kicker: "current work experience", title: "Current Work Exp", tagline: "Solutions Engineer, Datasembly", accent: "#8e7dff", mark: "pulse", image: datasemblyMark, imageFit: "contain" },
  { id: "before", go: "#lineage", kicker: "previous work experience", title: "Previous Work Exp", tagline: "Amazon · Spongelii · Datasembly", accent: "#fbbf24", mark: "clock", image: amazonMark, imageFit: "contain" },
  { id: "work", go: "#build", kicker: "project work", title: "Project Work", tagline: "RepTrack + 9 more shipped", accent: "#34d399", mark: "rocket", image: projectsBanner, imageFit: "contain" },
  { id: "contact", go: "#commit", kicker: "reach", title: "Contact", tagline: "Say hello", accent: "#fb7185", mark: "mail", image: contactBook, imageFit: "contain" },
];

// Per-view ambient background theme — keyed by route (not card id,
// since routes and card ids don't share a naming scheme). Only for
// routes that use the general-purpose LightAmbientField backdrop —
// the deck itself, and "story" (reachable only from the command
// palette, not one of the five deck destinations). Each of the five
// destinations has its own bespoke animated background instead (see
// RouteBackgrounds.jsx), so it no longer needs an entry here.
export const ROUTE_THEME = {
  deck: { accent: "14,116,144", accent2: "180,83,9", mode: "stream" },
  story: { accent: "109,40,217", accent2: "190,18,60", mode: "pulse" },
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
  github: "https://github.com/kmsmohamedansar",
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
