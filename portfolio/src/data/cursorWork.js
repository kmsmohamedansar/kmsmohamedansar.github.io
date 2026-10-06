// AI-native development: case studies, the "Cursor + MCP" narrative, and
// the diagrams that go with them.
//
// Everything here is deliberately generic. These projects live in private
// employer repos, so this file describes capabilities, design decisions,
// and stack, never proprietary names, hosts, datasets, or figures. The
// diagrams are drawn from a plain {columns, edges}-style spec (see
// FlowDiagram in CursorWorkSection.jsx) and every label is a stand-in.

export const CURSOR_FILTERS = ["All", "Cursor", "MCP", "Chrome", "Next.js", "Agents"];

export const CURSOR_INTRO = {
  kicker: "AI-native development",
  title: "Building with Cursor & MCP",
  lede:
    "A retail intelligence platform at a data company is where I do most of this work: internal tools and agent-facing infrastructure, built with an AI-native IDE and the Model Context Protocol. The code is private, so these are write-ups of the design, not the source.",
  paragraphs: [
    "I reach for Cursor when the work is a vertical slice: an extension's side-panel UI, its background service worker, and a CSV export all have to agree on one message shape. Keeping all three in one agent session means a change to the message contract lands in every layer at once, instead of drifting apart across three separate edits.",
    "MCP is what turned the chat window from a paste box into a tool belt. Instead of copying a response from an internal API into a prompt, the agent calls a typed tool, gets structured JSON back, and keeps going. The difference shows up in the boring places: fewer pasted payloads, fewer stale answers, and a record of exactly which calls the agent made.",
    "The path I've seen work for an MCP server is local first. A stdio process on a developer's machine is the fastest way to iterate on tool schemas and see how an agent actually uses them. Once the tools are stable, the same handlers go behind a stateless HTTP transport in a container so a whole team can point their agents at one shared endpoint, with credentials supplied through the environment rather than committed config. I've built that pattern myself in a small public stub, and use it in daily sessions with a team-built server.",
    "Day to day, an agent session has several servers attached at once. Each one covers a different kind of context, and the agent picks between them the way I'd pick between tabs.",
  ],
  integrations: [
    { name: "Scoped filesystem", note: "Read and write limited to the folders a task actually needs." },
    { name: "Browser DevTools", note: "Inspect a service worker, replay message passing, read console output while debugging an extension." },
    { name: "Work tracker", note: "Pull story context and acceptance criteria into the session instead of re-typing them." },
    { name: "Docs / wiki", note: "Look up the written spec while writing the code that implements it." },
    { name: "Data catalog / lineage", note: "Check what a table feeds before changing it." },
    { name: "Custom analytics bridge", note: "The server in the first case study below." },
  ],
  skills: [
    "Multi-root workspaces",
    "Agent skills & hooks",
    "PR splitting",
    "Security review loops",
    "Extension debugging with browser MCP",
  ],
};

// Shared across the intro and the case studies. Columns are drawn left to
// right; each node can point at nodes in the next column via `to`.
export const AGENT_STACK_DIAGRAM = {
  caption: "How an agent session reaches internal context (generic labels).",
  columns: [
    { label: "You", nodes: [{ id: "user", text: "Prompt in the IDE", tone: "cyan" }] },
    { label: "Agent", nodes: [{ id: "agent", text: "Cursor agent", tone: "violet" }] },
    {
      label: "MCP servers",
      nodes: [
        { id: "custom", text: "Custom analytics MCP", tone: "green" },
        { id: "catalog", text: "Data catalog MCP", tone: "green" },
        { id: "pm", text: "Work tracker MCP", tone: "green" },
        { id: "fs", text: "Filesystem / DevTools MCP", tone: "green" },
      ],
    },
    {
      label: "Behind them",
      nodes: [
        { id: "api", text: "Internal analytics API", tone: "amber" },
        { id: "meta", text: "Catalog metadata", tone: "amber" },
        { id: "tickets", text: "Tickets & docs", tone: "amber" },
        { id: "local", text: "Local files & browser", tone: "amber" },
      ],
    },
  ],
  edges: [
    ["user", "agent"],
    ["agent", "custom"],
    ["agent", "catalog"],
    ["agent", "pm"],
    ["agent", "fs"],
    ["custom", "api"],
    ["catalog", "meta"],
    ["pm", "tickets"],
    ["fs", "local"],
  ],
};

export const CASE_STUDIES = [
  {
    id: "mcp-server",
    icon: "plug",
    title: "Analytics MCP server: my daily agent workflow",
    hook: "My team's analytics web app is exposed to IDE agents as typed MCP tools, so I can ask category and product questions from inside Cursor instead of replaying API calls by hand. A platform team built the server. I'm a pilot user and IDE integrator, and this write-up covers how it's designed and how I use it.",
    role: "Pilot user and IDE integrator. I wire it into my agent sessions, iterate on prompts against it, and give feedback. I did not build the server myself; it was built by a platform team.",
    status: "MVP · limited internal pilot",
    primary: true,
    tags: ["MCP", "TypeScript", "Cursor", "Agents"],
    stack: ["TypeScript", "Node", "MCP SDK", "Zod", "Stateless HTTP transport", "Containerised deploy"],
    problem:
      "Analysts and solutions engineers wanting answers from the analytics web app had no structured route from an IDE agent into it. They copied credentials, ran one-off HTTP calls, and pasted JSON into chat. That was slow, easy to get wrong, and hard to repeat.",
    approach: [
      "A thin adapter rather than a fork: MCP's JSON-RPC on one side, the app's existing REST routes on the other, with the session forwarded from an environment-supplied credential. No scrapers and no duplicated business logic.",
      "A mandatory onboarding tool runs first. It confirms login, or says plainly that credentials need refreshing, so an agent never hits an opaque auth failure halfway through a session.",
      "Tools are organised by domain (resolvers, insights, widgets, data quality, collections), each registered on its own rather than in one giant handler file.",
      "A stateless HTTP transport so the server can sit behind several instances without assuming shared session state.",
      "Agent guidance (tool-selection notes, response formatting, human-first output) is emitted from the repo alongside the tools, so behaviour is part of the contract.",
    ],
    outcome:
      "Pilot users can stay in the IDE for category and product questions. Auth failures now say 'refresh your login' instead of returning silent empty results, and a data-quality check runs before the agent summarises. The open tradeoff is that the tool surface mirrors a large API, so an agent can still pick the wrong insight tool unless descriptions and guidance are kept curated.",
    builtWithCursor: [
      "Wired the server into my IDE and iterated on a set of golden prompts to see how tool choice behaves.",
      "Used the agent for local login and smoke flows, and read the agent-guidance docs to understand what rules to attach.",
      "Where Cursor didn't help: agents still over-call tools or dump raw metrics unless the guidance rules are attached, and session login needed a human step.",
      "My own public stub (linked below) re-creates the pattern with fake data, so I could write and test it myself.",
    ],
    diagram: {
      caption: "Request path for one tool call (illustrative).",
      columns: [
        { label: "Client", nodes: [{ id: "ide", text: "IDE agent (MCP client)", tone: "violet" }] },
        { label: "Transport", nodes: [{ id: "rpc", text: "stdio or HTTP · JSON-RPC", tone: "cyan" }] },
        {
          label: "MCP server",
          nodes: [
            { id: "onb", text: "Onboarding / auth check", tone: "green" },
            { id: "res", text: "Resolver tools", tone: "green" },
            { id: "ctx", text: "Insight & context tools", tone: "green" },
            { id: "dq", text: "Data-quality check", tone: "green" },
          ],
        },
        { label: "Upstream", nodes: [{ id: "rest", text: "Analytics REST API (HTTPS)", tone: "amber" }] },
      ],
      edges: [
        ["ide", "rpc"],
        ["rpc", "onb"],
        ["onb", "res"],
        ["res", "ctx"],
        ["ctx", "dq"],
        ["res", "rest"],
        ["ctx", "rest"],
      ],
    },
    link: { label: "Private team repo · my public stub is linked below" },
  },
  {
    id: "scope-checker",
    icon: "check",
    title: "In-scope checker: Chrome MV3 side panel",
    hook: "A side-panel extension where ops and research users paste product or store identifiers and find out, per retail banner, whether each item matches the collection's scope rules. Results export to CSV.",
    role: "Lead: I built the multi-banner extension and have iterated on it since.",
    status: "Internal production-style tool · v2.x",
    primary: true,
    tags: ["Chrome", "Cursor", "Retail"],
    stack: ["Manifest V3", "Side panel API", "Content scripts", "Per-banner rule modules"],
    problem:
      "Before adding products to collection pipelines, staff opened each retailer page and judged eligibility by eye (seller type, availability, banner-specific rules). It was error-prone and inconsistent across marketplace, mass-merchant and grocery banners.",
    approach: [
      "A central banner catalogue with a handful of rule families, instead of a one-off script per banner. Each family reads the signals its pages expose and returns a plain in-scope true/false with a reason.",
      "The background worker orchestrates the run and asks a content script for signals, re-injecting it if messaging fails, and every wait is cancellable so a long run can be stopped.",
      "The side panel owns the workflow: choose a banner, paste identifiers, then watch a Done / Pending / Total counter fill in as pages are checked.",
      "Pages are opened by the user, so the extension reads what is already in front of them rather than crawling.",
      "A rule engine turns the collected signals into a verdict per identifier, and the whole run exports as CSV.",
    ],
    outcome:
      "The same rules are applied the same way every time, and a run is a CSV someone else can review. New banners are added as new modules without touching the panel.",
    builtWithCursor: [
      "Added banner modules incrementally, with the agent generating tests against synthetic HTML snippets (never real retailer pages).",
      "Polished the side-panel state machine, the loading screen (an explicit done / pending / total count, not just animation) and CSV export through short edit-run-look loops.",
      "Hard bug: navigation was rejected when reusing the active tab if it was a browser-internal page. The fix prefers an existing retailer tab, validates URLs, and opens a fresh tab when an update fails.",
      "Where it didn't help: it couldn't replace testing on real retailer pages, so rule hints still needed manual verification per banner.",
      "Used the browser DevTools MCP to debug the service worker and the message passing between panel, worker, and content script.",
    ],
    diagram: {
      caption: "Scope-check flow (illustrative).",
      columns: [
        { label: "Input", nodes: [{ id: "pick", text: "Choose banner · paste IDs", tone: "cyan" }] },
        { label: "Collect", nodes: [{ id: "open", text: "User opens retailer pages", tone: "violet" }, { id: "read", text: "Content script reads signals", tone: "violet" }] },
        { label: "Decide", nodes: [{ id: "rules", text: "Banner rule module", tone: "green" }] },
        { label: "Output", nodes: [{ id: "csv", text: "in_scope true / false → CSV", tone: "amber" }] },
      ],
      edges: [
        ["pick", "open"],
        ["open", "read"],
        ["read", "rules"],
        ["rules", "csv"],
      ],
    },
    link: { label: "Private · mock UI only, demo on request" },
  },
  {
    id: "undercut",
    icon: "search",
    title: "Undercut: early retail intelligence side panel",
    hook: "One MV3 side panel for ad-hoc product and store-level pulls, used before the standard production collection runs are in place. A retailer dropdown switches between different flows, each its own module.",
    role: "Lead: I unified the earlier single-retailer tools and the club-retailer scraper into this extension.",
    status: "Internal production · active iteration · v1.x",
    primary: true,
    tags: ["Chrome", "Cursor", "Retail"],
    stack: ["Manifest V3", "Side panel", "Per-retailer modules", "CSV export"],
    problem:
      "Solutions and data-quality work often needs a first look at a retailer's catalogue or store availability before any scheduled pipeline exists for it. That used to mean a different one-off script per retailer, each with its own quirks.",
    approach: [
      "Consolidated several single-retailer tools into one extension with a retailer selector, a shared side panel, and per-retailer engines imported into one ES-module service worker. The old folders stay only as deprecated reference.",
      "Each retailer is a self-contained module with its own flow, so adding or changing one doesn't risk the others.",
      "Flows range from category and multi-brand search crawls, to a postcode-and-brand availability check, to a store finder that reuses the user's active tab for its requests.",
      "Every flow ends in a CSV with a consistent, small set of columns.",
    ],
    outcome:
      "A quick, repeatable way to get an early read on a retailer, positioned as an internal acceleration tool for solutions engineering and data quality, never a consumer product.",
    builtWithCursor: [
      "Planned and carried out the large refactor that renamed and nested the legacy folders into one extension, with the agent updating the manifest and imports as files moved.",
      "Iterated on the UI copy and the retailer-selector UX in Composer.",
      "Merged a 16/48/128 icon set into the extension and fixed ES-module loading in the side panel.",
      "Where it didn't help: it can't get past retailer bot checks, so the user still passes human verification in the browser. Human-like pacing lowers blocks but makes runs slower, and I expose that as an option.",
    ],
    module: {
      title: "A retailer module: category & search collector",
      body: "One of the modules is a collector for a membership-club retailer's browse and search pages. It has category pagination, an optional product-page depth setting, and batched search terms (including multi-line brand lists). Rather than a separate project, I treat it as one entry in a family of pluggable retailer modules. It is still evolving, and a branch with optional visual-context capture for QA is in progress.",
    },
    diagram: {
      caption: "One extension, many retailer modules (illustrative).",
      columns: [
        { label: "Panel", nodes: [{ id: "sel", text: "Retailer selector", tone: "cyan" }] },
        {
          label: "Modules",
          nodes: [
            { id: "m1", text: "Club retailer · category & search", tone: "violet" },
            { id: "m2", text: "Regional grocer A · store availability", tone: "violet" },
            { id: "m3", text: "Regional grocer B · store finder", tone: "violet" },
          ],
        },
        { label: "Shared", nodes: [{ id: "bg", text: "Service worker & messaging", tone: "green" }] },
        { label: "Output", nodes: [{ id: "out", text: "CSV export", tone: "amber" }] },
      ],
      edges: [
        ["sel", "m1"],
        ["sel", "m2"],
        ["sel", "m3"],
        ["m1", "bg"],
        ["m2", "bg"],
        ["m3", "bg"],
        ["bg", "out"],
      ],
    },
    link: { label: "Private · mock UI only, demo on request" },
  },
  {
    id: "health-dashboard",
    icon: "layout",
    title: "Collection health dashboard: Next.js MVP",
    hook: "An internal dashboard with two halves: a summary panel built from versioned JSON snapshots, and a priority queue of work items pulled from a project-management API. It's an MVP scaffold.",
    role: "I built the scaffold. It is an MVP and I'm not claiming it has been used in live meetings yet.",
    status: "MVP scaffold",
    primary: true,
    tags: ["Next.js", "Cursor"],
    stack: ["Next.js (App Router)", "React", "TypeScript", "Tailwind CSS", "Vitest", "JSON snapshots"],
    problem:
      "Recurring collection-health meetings needed one screen: snapshot KPIs with highlights and risks, plus a priority queue tied to engineering stories. Without it, people juggled static exports and the work tracker separately.",
    approach: [
      "Summary half: KPIs, status, highlights, and risks read from versioned snapshot files, with a selector so a past meeting can be re-opened.",
      "Queue half: a sortable, filterable table of priority rows, each linking out to its work item.",
      "Credentials never reach the browser. The client only calls the app's own /api routes, behind a small client abstraction so the data source can change without touching components.",
      "A server layer with a TTL cache, a stale-data fallback, and on-disk mocks, so a live-API blip degrades gracefully instead of failing the page.",
      "One module maps tracker stories to priority rows and is shared by the mocks and the live path, so the table sees a single shape.",
    ],
    outcome:
      "Meeting prep can use one dashboard shape for summary and queue instead of reconciling spreadsheets and tracker views by hand, and local demos work without any live tokens. Live search pagination, rate limits and auth hardening are still open items, and the snapshot KPIs stay file-backed until a database overlay exists.",
    builtWithCursor: [
      "Scaffolded the app structure and a typed API layer quickly, with Vitest covering the mapping and the client.",
      "Designed the snapshot JSON schema with the agent, and added a mock-first mode so every piece runs offline.",
      "Where it didn't help: the story-search pagination design and production hardening still needed my own judgement.",
    ],
    diagram: {
      caption: "Data flow (illustrative, fake names only).",
      columns: [
        {
          label: "Sources",
          nodes: [
            { id: "snap", text: "Versioned snapshot JSON", tone: "amber" },
            { id: "pm", text: "Work-tracker API", tone: "amber" },
          ],
        },
        { label: "Server", nodes: [{ id: "api", text: "API routes · cache · mock fallback", tone: "green" }] },
        {
          label: "Client",
          nodes: [
            { id: "sum", text: "Summary panel", tone: "cyan" },
            { id: "tbl", text: "Priority queue table", tone: "cyan" },
          ],
        },
      ],
      edges: [
        ["snap", "api"],
        ["pm", "api"],
        ["api", "sum"],
        ["api", "tbl"],
      ],
    },
    link: { label: "Private · mock-data demo on request" },
  },
  {
    id: "copilot",
    icon: "message",
    title: "Category analytics copilot (prototype)",
    hook: "A hackathon-style local demo: ask a plain-English question about a grocery category and get a summary, KPIs, a chart, a table and the main drivers back. It's rule-based, with no LLM, and runs on seeded synthetic data.",
    role: "Hackathon prototype, built by me.",
    status: "Prototype",
    primary: false,
    tags: ["Cursor", "Next.js"],
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Radix UI", "TanStack Table", "Recharts", "Vitest"],
    problem:
      "Category-facing roles had pricing, promo and assortment views but no fast path from a plain question to one scannable answer. Building ad hoc reports across tabs was slow, and the prototype was aimed at demos for sales and category users.",
    approach: [
      "A deterministic pipeline: parse the question (domain, entity, time, intent), resolve it to seeded catalogue entities, plan an answer type, compute the blocks, then render.",
      "Each question maps to an explicit answer archetype with its own logic, rather than one generic template.",
      "Confidence gating: when the parse signals are weak it falls back to a generic answer instead of pretending to be sure.",
      "Follow-up chips let a demo chain questions without retyping. The data is seeded and in the browser, so it works offline.",
      "One optional path can call a live analytics API when environment flags are set. The default is fully mock.",
    ],
    outcome:
      "Demos can show natural-language Q&A with consistent, replayable answers, and follow-ups make multi-step exploration feel conversational without a model. The tradeoff is a brittle keyword parser: unsupported phrasing falls back to a low-confidence generic answer. It is a prototype, not a production analytics platform.",
    builtWithCursor: [
      "Rapid scaffolding across the parse, plan, compute and render modules, plus a set of copy-paste prompts for repeating the setup.",
      "Added Vitest and documented the optional live-API wiring.",
      "Where it didn't help: parser coverage was manual work, and the live API's auth couldn't be automated.",
    ],
    diagram: {
      caption: "From question to answer (illustrative).",
      columns: [
        { label: "Ask", nodes: [{ id: "q", text: "Plain-English question", tone: "cyan" }] },
        { label: "Interpret", nodes: [{ id: "parse", text: "Parse · resolve entities", tone: "violet" }, { id: "gate", text: "Confidence gate", tone: "violet" }] },
        { label: "Compute", nodes: [{ id: "plan", text: "Pick answer archetype", tone: "green" }, { id: "data", text: "Seeded local data", tone: "green" }] },
        {
          label: "Answer",
          nodes: [
            { id: "kpi", text: "KPIs, chart, table", tone: "amber" },
            { id: "sum", text: "Drivers + follow-up chips", tone: "amber" },
          ],
        },
      ],
      edges: [
        ["q", "parse"],
        ["parse", "gate"],
        ["gate", "plan"],
        ["plan", "data"],
        ["data", "kpi"],
        ["data", "sum"],
      ],
    },
    link: { label: "Prototype · local demo, synthetic data only" },
  },
];

export const ADJACENT_WORK = [
  {
    title: "Browser sidecar fleet",
    problem: "Collecting retail data at scale across many retailers needs a lot of coordinated browser automation.",
    role: "A team-maintained set of master/worker MV3 extensions. I contributed debugging and documentation with Cursor, and I don't claim sole ownership.",
    tags: ["Chrome", "MV3"],
  },
  {
    title: "Data hub admin app",
    problem: "Internal teams needed a single place to manage and visualise their data.",
    role: "A Next.js internal app that I've worked in.",
    tags: ["Next.js", "Internal tools"],
  },
  {
    title: "Orchestration / DAG repo",
    problem: "Scheduled data workflows need to be dependable and reviewable.",
    role: "Airflow-style workflows, where I use Cursor for DAG and quality-engineering work.",
    tags: ["Airflow", "Cursor"],
  },
  {
    title: "SQL query library",
    problem: "A team accumulates warehouse SQL that is hard to find and hard to trust.",
    role: "I follow an authoring and linting workflow here. The queries themselves are not published.",
    tags: ["SQL", "Snowflake"],
  },
  {
    title: "Warehouse modelling repo",
    problem: "Standard analytics-engineering modelling work.",
    role: "Contributor; standard dbt-style practice.",
    tags: ["dbt", "SQL"],
  },
];

export const DEMO_REPOS = [
  {
    name: "mcp-analytics-stub",
    blurb: "A minimal TypeScript MCP server with fake resolver and insight tools returning synthetic JSON. Mirrors the shape of the real server, none of its content.",
    href: "https://github.com/kmsmohamedansar/mcp-analytics-stub",
    tags: ["MCP", "TypeScript"],
  },
  {
    name: "mv3-sidepanel-starter",
    blurb: "A tiny MV3 side panel: paste IDs, run mock rules, download a CSV. The patterns from the scope checker, with invented rules and no retailer branding.",
    href: "https://github.com/kmsmohamedansar/mv3-sidepanel-starter",
    tags: ["Chrome", "MV3"],
  },
];
