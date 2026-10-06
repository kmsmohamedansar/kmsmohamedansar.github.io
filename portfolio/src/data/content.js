// Site-wide copy: the hero, experience, skills, EMET's answers, contact
// details and command palette. Projects live in projects.js.
//
// House style: plain words, short sentences, first person, no em dashes.

export const HERO = {
  eyebrow: "Solutions Engineer · Remote, Canada",
  title: "Hi, I'm Mohamed. I work with retail data, and build the tools around it.",
  lede: [
    { text: "By day I write " },
    { text: "SQL", cls: "text-cyan font-semibold" },
    { text: " on a big retail pricing dataset and help teams get answers they can trust. The rest of the time I build things: an " },
    { text: "iOS app", cls: "text-amber font-semibold" },
    { text: " that's on the App Store, a few browser tools, and some experiments with " },
    { text: "AI", cls: "text-[#b9a8ff] font-semibold" },
    { text: "." },
  ],
};

export const SECTION_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export const ABOUT = {
  title: "What I do, and what I know",
  story: [
    "I started in content and quality operations at Amazon Prime Video, where I learned that bad data rarely shows up as an error. It shows up two teams later as a wrong decision. That stuck with me.",
    "A business analysis internship pulled me towards SQL and Snowflake, and I wanted to be the person building the pipeline, not only reading what came out of it. Today, as a solutions engineer, I turn what a stakeholder is really asking into something technical that holds up, and I double-check my own numbers before anyone else has to.",
    "Outside work I keep building. An iOS app on the App Store, a SQL playground, a few machine learning demos, and a growing pile of tools made with AI as a pair programmer. None of it was assigned. It's just how I learn.",
  ],
  groups: [
    { title: "Data", accent: "cyan", items: ["SQL", "Snowflake", "BigQuery", "Python", "pandas", "DuckDB", "Airflow", "ETL and ELT"] },
    { title: "Reporting", accent: "amber", items: ["Tableau", "Power BI", "Dashboards people open every week"] },
    { title: "Building", accent: "green", items: ["SwiftUI", "SwiftData", "React", "Next.js", "TypeScript", "Chrome extensions (MV3)"] },
    { title: "AI tooling", accent: "violet", items: ["Cursor", "MCP servers", "Local models with Ollama", "FAISS and embeddings", "Transformers"] },
  ],
};

export const ROLES = [
  {
    company: "Datasembly",
    title: "Solutions Engineer",
    when: "Jan 2026 to now · Remote, Canada",
    current: true,
    accent: "cyan",
    summary: "Turning a client's question into data work that holds up, on a big retail pricing dataset.",
    bullets: [
      "Build data solutions for retail pricing: client needs, pre-sales analysis, and one-off data requests.",
      "Use SQL and Snowflake to dig into tricky data problems, then check my own work before handing it over.",
      "Work with other teams to turn a business question into something technical that actually gets used.",
    ],
    tags: ["SQL", "Snowflake", "Pre-sales", "Data solutions"],
  },
  {
    company: "Datasembly",
    title: "Tech Support",
    when: "Aug 2024 to Dec 2025 · Remote, Canada",
    accent: "violet",
    summary: "Where I got properly deep into SQL reporting and Snowflake, helping clients and internal teams.",
    bullets: [
      "Built SQL reports for pricing analytics and tidied up internal data workflows along the way.",
      "Fixed recurring data issues for clients and internal teams, mostly in Snowflake.",
      "Made dashboards and reports more reliable, and cleaned up how the team worked.",
    ],
    tags: ["SQL", "Snowflake", "Reporting"],
  },
  {
    company: "Spongelii",
    title: "Business Development Intern, Business Analysis",
    when: "Jan to Apr 2024 · Remote, Canada",
    accent: "amber",
    summary: "Where SQL and Snowflake went from something I used to something I wanted to do properly.",
    bullets: [
      "Business analysis tied to data workflows and reporting needs.",
      "SQL and Snowflake work behind the dashboards and reports.",
      "Wrote down requirements, the logic behind the analysis, and how the pieces fit together.",
    ],
    tags: ["Business analysis", "SQL", "Snowflake", "Tableau"],
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst II, Quality Auditing",
    when: "Oct 2021 to Aug 2022 · Hybrid, India",
    accent: "rose",
    summary: "Auditing how content operations worked, and fixing the gaps I found.",
    bullets: [
      "Quality auditing and process improvement for content operations.",
      "Reporting and analysis to spot workflow gaps and support decisions.",
      "Updated SOPs and helped make audits consistent across teams.",
    ],
    tags: ["Quality auditing", "Process improvement", "Reporting"],
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst I, Digital Content",
    when: "Aug 2019 to Sep 2021 · Hybrid, India",
    accent: "green",
    summary: "Keeping a large digital catalogue accurate and ready to publish.",
    bullets: [
      "Quality control and day-to-day coordination for the digital content catalogue.",
      "Worked with stakeholders on defects, metadata accuracy and getting content ready to publish.",
      "Kept quality steady across recurring operations and solved issues as they came up.",
    ],
    tags: ["Digital content", "Quality control", "Stakeholders"],
  },
];

// EMET answers as me, right in the terminal. `keywords` lets free text
// match a topic ("sql", "amazon"), and `go` is an optional "see more" link.
export const EMET_TOPICS = [
  {
    n: 1,
    label: "What do you do now?",
    go: "#experience",
    keywords: ["now", "current", "today", "sql", "snowflake", "datasembly", "job", "role"],
    answer: [
      { text: "I'm a solutions engineer at " },
      { text: "Datasembly", cls: "font-bold" },
      {
        text:
          ", since January 2026. Lots of SQL and Snowflake on a big retail pricing dataset, plus some pre-sales work: working out what a stakeholder is really asking and building something that holds up.",
      },
    ],
  },
  {
    n: 2,
    label: "Where have you worked?",
    go: "#experience",
    keywords: ["before", "worked", "history", "amazon", "spongelii", "experience", "past"],
    answer: [
      { text: "Datasembly", cls: "font-bold" },
      { text: " (solutions engineer, and tech support before that), " },
      { text: "Spongelii", cls: "font-bold" },
      { text: " (business analysis), and " },
      { text: "Amazon Prime Video", cls: "font-bold" },
      { text: " (quality auditing) before all of it. Each stop gave me a bit more technical ownership." },
    ],
  },
  {
    n: 3,
    label: "What have you built?",
    go: "#projects",
    keywords: ["shipped", "built", "projects", "ios", "app", "reptrack", "swift", "demo", "extension", "chrome"],
    answer: [
      { text: "The one I'm proudest of is " },
      { text: "RepTrack", cls: "font-bold" },
      { text: ", a workout log on the " },
      { text: "App Store", cls: "font-bold" },
      {
        text:
          ". I also build Chrome tools for retail data, a SQL playground that runs in the browser, and a few machine learning demos. Most have a live demo or a write-up.",
      },
    ],
  },
  {
    n: 4,
    label: "How do I reach you?",
    go: "#contact",
    keywords: ["reach", "contact", "email", "linkedin", "hire", "talk", "hello", "hi"],
    answer: [
      { text: "Email is fastest: " },
      { text: "mohamedansarkms@gmail.com", cls: "font-bold" },
      { text: ". I'm also on LinkedIn as " },
      { text: "kmsmohamedansar", cls: "font-bold" },
      { text: ". Say hi, I read everything." },
    ],
  },
];

export const CONTACT = {
  email: "mohamedansarkms@gmail.com",
  linkedin: "https://www.linkedin.com/in/kmsmohamedansar/",
  github: "https://github.com/kmsmohamedansar",
};

export const COMMAND_ITEMS = [
  { label: "Projects · what I've built", go: "#projects", group: "Sections" },
  { label: "Experience · where I've worked", go: "#experience", group: "Sections" },
  { label: "About · what I do and know", go: "#about", group: "Sections" },
  { label: "Built with AI · experiments", go: "#ai", group: "Sections" },
  { label: "Contact", go: "#contact", group: "Sections" },
  { label: "RepTrack, project page", go: "#project/reptrack", group: "Projects" },
  { label: "Undercut, project page", go: "#project/undercut", group: "Projects" },
  { label: "SQL Playground, project page", go: "#project/sql-playground", group: "Projects" },
  { label: "EMET · ask the terminal", go: "#emet", group: "Fun" },
  { label: "Solar system explorer", go: "#explore", group: "Fun" },
  { label: "Data lineage explorer, live demo", go: "#lineage-demo", group: "Fun" },
  { label: "RepTrack on the App Store", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", group: "Links" },
  { label: "SQL Playground, live", href: "https://kmsmohamedansar.github.io/sql-playground", group: "Links" },
  { label: "GitHub", href: CONTACT.github, group: "Links" },
  { label: "LinkedIn", href: CONTACT.linkedin, group: "Links" },
  { label: "Email · " + CONTACT.email, href: "mailto:" + CONTACT.email, group: "Links" },
  { label: "Toggle dev_mode · sandbox stubs", action: "toggle-sandbox", group: "System" },
];
