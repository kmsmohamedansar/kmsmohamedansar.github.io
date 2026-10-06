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
    "My usual path for a new MCP server is local first. A stdio process on my own machine is the fastest way to iterate on tool schemas and see how an agent actually uses them. Once the tools are stable, the same handlers go behind a stateless HTTP transport in a container so a whole team can point their agents at one shared endpoint, with credentials supplied through the environment rather than committed config.",
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
    title: "Custom MCP server for analytics context",
    hook: "I wrapped a production analytics API as typed MCP tools so IDE agents can ask it questions directly, with no curl and no copy-paste. It started as a local stdio server and now also runs as a shared HTTP service for the team.",
    status: "Shipped MVP · in use by internal agents",
    primary: true,
    tags: ["MCP", "TypeScript", "Cursor", "Agents"],
    stack: ["TypeScript", "Node", "MCP SDK", "Zod", "Docker / managed container hosting"],
    problem:
      "Answering questions about a category, a brand, or a product group meant switching to the web app, copying results, and pasting them back into a chat. Every answer was already stale by the time it was pasted, and nothing recorded where it came from.",
    approach: [
      "Exposed two families of tools: resolvers (turn a name into a stable identifier) and context tools (given an identifier, return insights, collection pages, product groups, product details).",
      "Validated tool inputs and outputs with schemas, so a malformed call fails loudly instead of returning something plausible and wrong.",
      "Kept credentials out of config: a session cookie or bearer token is read from the environment at start-up.",
      "Ran it as a local stdio process during development, then containerised the same handlers behind a stateless HTTP transport for shared team use.",
      "Generated an agent-guidelines file from the API surface, so the policy that tells an agent how to use the tools stays in sync with the tools themselves.",
    ],
    outcome:
      "Agents can resolve a name, pull context, and cite the exact calls they made, in one conversation. A smoke-test script and a unit test suite on the Node test runner keep the tool contracts honest.",
    builtWithCursor: [
      "Scaffolded the tool schemas and handler map from a plain list of the API's endpoints.",
      "Iterated on the smoke-test and local harness scripts with the agent, including an optional proxy for replaying calls.",
      "Ran a security pass: dependency-audit fixes, and moving every secret to environment variables rather than committed config.",
      "Used the agent to tighten tool descriptions, since how an agent chooses a tool depends heavily on how it's described.",
    ],
    diagram: {
      caption: "Request path for one tool call (illustrative).",
      columns: [
        { label: "Client", nodes: [{ id: "ide", text: "IDE agent (MCP client)", tone: "violet" }] },
        { label: "Transport", nodes: [{ id: "rpc", text: "stdio or HTTP · JSON-RPC", tone: "cyan" }] },
        {
          label: "MCP server",
          nodes: [
            { id: "val", text: "Schema validation", tone: "green" },
            { id: "res", text: "Resolver tools", tone: "green" },
            { id: "ctx", text: "Context tools", tone: "green" },
          ],
        },
        { label: "Upstream", nodes: [{ id: "rest", text: "Analytics REST API (HTTPS)", tone: "amber" }] },
      ],
      edges: [
        ["ide", "rpc"],
        ["rpc", "val"],
        ["val", "res"],
        ["val", "ctx"],
        ["res", "rest"],
        ["ctx", "rest"],
      ],
    },
    link: { label: "Private repo · walkthrough available on request" },
  },
  {
    id: "scope-checker",
    icon: "check",
    title: "In-scope checker: Chrome MV3 side panel",
    hook: "A side-panel extension where ops and research users paste product or store identifiers and find out, per retail banner, whether each item matches the collection's scope rules. Results export to CSV.",
    status: "Internal production tool · v2.x",
    primary: true,
    tags: ["Chrome", "Cursor", "Retail"],
    stack: ["Manifest V3", "Side panel API", "Content scripts", "Per-banner rule modules"],
    problem:
      "Checking whether a product belongs in a collection meant opening each retailer page and judging it by eye against a rule sheet. It was slow, and two people could reach different answers on the same item.",
    approach: [
      "Wrote one small rule module per banner. Each reads the signals that banner exposes on its pages and returns a plain in-scope true/false with a reason.",
      "The side panel owns the workflow: choose a banner, paste identifiers, then watch a Done / Pending / Total counter fill in as pages are checked.",
      "Pages are opened by the user, so the extension reads what is already in front of them rather than crawling.",
      "A rule engine turns the collected signals into a verdict per identifier, and the whole run exports as CSV.",
    ],
    outcome:
      "The same rules are applied the same way every time, and a run is a CSV someone else can review. New banners are added as new modules without touching the panel.",
    builtWithCursor: [
      "Added banner modules incrementally, with the agent generating tests against synthetic HTML snippets (never real retailer pages).",
      "Polished the side-panel state machine and CSV export through short edit-run-look loops.",
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
    status: "Internal tool · v1.x",
    primary: true,
    tags: ["Chrome", "Cursor", "Retail"],
    stack: ["Manifest V3", "Side panel", "Per-retailer modules", "CSV export"],
    problem:
      "Solutions and data-quality work often needs a first look at a retailer's catalogue or store availability before any scheduled pipeline exists for it. That used to mean a different one-off script per retailer, each with its own quirks.",
    approach: [
      "Consolidated several single-retailer tools into one extension with a retailer selector at the top.",
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
    hook: "An internal meeting dashboard with two halves: a summary panel built from versioned JSON snapshots, and a priority queue of work items pulled from a project-management API.",
    status: "MVP scaffold · active internal use",
    primary: true,
    tags: ["Next.js", "Cursor", "Agents"],
    stack: ["Next.js (App Router)", "TypeScript", "API routes", "JSON snapshots"],
    problem:
      "A recurring ops-health meeting spent its first ten minutes assembling status from several places. The summary lived in spreadsheets and the open work lived in a tracker.",
    approach: [
      "Summary half: KPIs, status, highlights, and risks read from versioned snapshot files, with a snapshot selector so any past meeting can be re-opened.",
      "Queue half: a sortable, filterable table of priority rows, each linking out to its work item.",
      "Credentials never reach the browser. The client only calls the app's own /api routes, which hold the tokens and shape the data.",
      "A mock mode serves fake data, so the app runs locally and can be demoed without any keys.",
    ],
    outcome:
      "One page for the meeting: what the state is, and what's next in line. A shared types file keeps the snapshot schema, the API layer, and the UI agreeing with each other.",
    builtWithCursor: [
      "Scaffolded the app structure and a typed API layer quickly, then refined it route by route.",
      "Designed the snapshot JSON schema with the agent, and added the mock mode so every piece could be exercised offline.",
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
        { label: "Server", nodes: [{ id: "api", text: "Next.js API routes (tokens stay here)", tone: "green" }] },
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
    hook: "A hackathon-style local demo: ask a plain-English question about a grocery category and get KPIs, charts, tables, and a short driver summary back. It runs entirely on synthetic data, with no external APIs.",
    status: "Prototype",
    primary: false,
    tags: ["Cursor", "Agents", "Next.js"],
    stack: ["TypeScript", "React", "Synthetic demo data", "Chart components"],
    problem:
      "Category questions (what moved, why, versus what) usually take a round trip through an analyst. Could a first-pass answer arrive in seconds, in a form you can poke at?",
    approach: [
      "Turn the question into a structured intent: which metric, which slice, which time window, and compared to what.",
      "Run that intent against a local data layer and render the result as KPI tiles, a chart, a table, and a plain-language summary of the main drivers.",
      "Everything is synthetic and bundled, so it needs no network and the whole thing is safe to demo anywhere.",
    ],
    outcome:
      "A prototype only, not a production analytics platform. I also explored a larger fork that tried to line it up with a production app shell, but that stayed an experiment.",
    builtWithCursor: [
      "Built the UI and a mock data layer in quick iterations.",
      "Worked out the question-to-intent pattern with the agent, treating the intent as a small typed schema rather than free text.",
    ],
    diagram: {
      caption: "From question to answer (illustrative).",
      columns: [
        { label: "Ask", nodes: [{ id: "q", text: "Plain-English question", tone: "cyan" }] },
        { label: "Interpret", nodes: [{ id: "intent", text: "Structured intent", tone: "violet" }] },
        { label: "Compute", nodes: [{ id: "data", text: "Local synthetic data layer", tone: "green" }] },
        {
          label: "Answer",
          nodes: [
            { id: "kpi", text: "KPIs & charts", tone: "amber" },
            { id: "sum", text: "Driver summary", tone: "amber" },
          ],
        },
      ],
      edges: [
        ["q", "intent"],
        ["intent", "data"],
        ["data", "kpi"],
        ["data", "sum"],
      ],
    },
    link: { label: "Prototype · a synthetic-data public demo may follow" },
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
