// Site-wide copy: the hero, experience, skills, EMET's answers, contact
// details and command palette. Projects live in projects.js.
//
// House style: plain words, short sentences, first person, no em dashes.

export const HERO = {
  eyebrow: "Solutions Engineer · Remote, Canada",
  title: "Retail data into answers. Ideas into working apps.",
  lede: [
    { text: "By day I use " },
    { text: "SQL", cls: "text-marigold font-semibold" },
    { text: " to study retail prices and help teams get answers they can trust. The rest of the time I build things: an " },
    { text: "iPhone app", cls: "text-marigold font-semibold" },
    { text: " on the App Store, a novel-writing app in testing, and a 3D model of my own head built with " },
    { text: "AI", cls: "text-marigold font-semibold" },
    { text: " that looks back at you." },
  ],
};

// Quick proof, right under the intro, before anyone reads a paragraph.
export const RECEIPTS = [
  { value: "2", label: "apps for Apple devices built, one live on the App Store", accent: "amber" },
  { value: "2", label: "independent AI studies, each with a full report", accent: "rose" },
  { value: "PROJECTS", label: "projects with code, write-ups or live demos", accent: "green" },
  { value: "2019", label: "the year I started working with data", accent: "cyan" },
];

export const SECTION_LINKS = [
  { id: "projects", label: "Projects" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];

export const ABOUT = {
  title: "What I do, and what I know",
  story: [
    "I learned that at Amazon Prime Video. Since then I've wanted to build the systems that move and check data, not just read the results. I check my own numbers before anyone else has to.",
    "Outside work I keep building. Two apps for Apple devices, two independent AI studies, data tools with honest tests, and a growing pile of things made with AI as a coding partner. None of it was assigned. It's just how I learn.",
  ],
  groups: [
    { title: "Data", accent: "cyan", items: ["SQL", "Snowflake", "BigQuery", "Python", "pandas", "DuckDB", "Airflow", "ETL and ELT"] },
    { title: "Reporting", accent: "amber", items: ["Tableau", "Power BI", "Dashboards people open every week"] },
    { title: "Building", accent: "green", items: ["Swift", "SwiftUI", "SwiftData", "React", "Next.js", "TypeScript", "three.js", "Docker", "Chrome extensions (MV3)"] },
    { title: "AI tools", accent: "violet", items: ["Claude Code", "Cursor", "MCP servers", "Local models with Ollama", "Hugging Face Transformers", "FAISS and embeddings", "Blender"] },
  ],
};

export const ROLES = [
  {
    company: "Datasembly",
    logo: "/logos/datasembly-wordmark.png",
    title: "Solutions Engineer",
    when: "Jan 2026 to now · Remote, Canada",
    current: true,
    accent: "cyan",
    summary: "Turning a client's question into data work that holds up, on a big retail pricing dataset.",
    bullets: [
      "Build reports and tools for retail pricing, from early client questions to one-off data requests.",
      "Use SQL and Snowflake to dig into tricky data problems, then check my own work before handing it over.",
      "Work with other teams to turn a business question into a useful report or tool.",
    ],
    tags: ["SQL", "Snowflake", "Pre-sales", "Data solutions"],
  },
  {
    company: "Datasembly",
    logo: "/logos/datasembly-wordmark.png",
    title: "Technical Support",
    when: "Aug 2024 to Dec 2025 · Remote, Canada",
    accent: "violet",
    summary: "Helped clients and coworkers get reliable answers from retail pricing data.",
    bullets: [
      "Built SQL reports for pricing analytics and tidied up internal data workflows along the way.",
      "Fixed recurring data issues for clients and internal teams, mostly in Snowflake.",
      "Made dashboards and reports more reliable, and cleaned up how the team worked.",
    ],
    tags: ["SQL", "Snowflake", "Reporting"],
  },
  {
    company: "Spongelii",
    compact: true,
    logo: "/logos/spongelii.png",
    title: "Business Development Intern, Business Analysis",
    when: "Jan to Apr 2024 · Remote, Canada",
    accent: "amber",
    summary: "Used data tools to turn business questions into reports and dashboards.",
    bullets: [
      "Business analysis tied to data workflows and reporting needs.",
      "SQL and Snowflake work behind the dashboards and reports.",
      "Wrote down requirements, the logic behind the analysis, and how the pieces fit together.",
    ],
    tags: ["Business analysis", "SQL", "Snowflake", "Tableau"],
  },
  {
    company: "Amazon Prime Video",
    logo: "/logos/prime-video-wordmark.svg",
    title: "Business Analyst II, Quality Auditing",
    compact: true,
    when: "Oct 2021 to Aug 2022 · Hybrid, India",
    accent: "rose",
    summary: "Auditing how content operations worked, and fixing the gaps I found.",
    bullets: [
      "Quality auditing and process improvement for content operations.",
      "Reporting and analysis to spot workflow gaps and support decisions.",
      "Updated written procedures and helped make audits consistent across teams.",
    ],
    tags: ["Quality auditing", "Process improvement", "Reporting"],
  },
  {
    company: "Amazon Prime Video",
    logo: "/logos/prime-video-wordmark.svg",
    title: "Business Analyst I, Digital Content",
    compact: true,
    when: "Aug 2019 to Sep 2021 · Hybrid, India",
    accent: "green",
    summary: "Keeping a large digital catalogue accurate and ready to publish.",
    bullets: [
      "Quality control and day-to-day coordination for the digital content catalogue.",
      "Worked with other teams to fix errors in catalogue information and get content ready to publish.",
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
          ", since January 2026. I use SQL and Snowflake to work with retail pricing data, and help clients turn their questions into reports or tools they can rely on.",
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
          ". I also ran an independent study of open AI decision models, with a full technical report, and I build data tools that test themselves. Most have a live demo or a write-up.",
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
  { label: "My Take on Jev, project page", go: "#project/decision-models", group: "Projects" },
  { label: "My Take on REA, project page", go: "#project/rea-study", group: "Projects" },
  { label: "StoryEra, novel continuity skill", go: "#project/storyera", group: "Projects" },
  { label: "Site Recon, website inspection skill", go: "#project/site-recon", group: "Projects" },
  { label: "Exposure Audit, authorized website review skill", go: "#project/authorized-web-exposure-audit", group: "Projects" },
  { label: "Haloscript, project page", go: "#project/haloscript", group: "Projects" },
  { label: "EMET · ask the terminal", go: "#emet", group: "Fun" },
  { label: "Solar system explorer", go: "#explore", group: "Fun" },
  { label: "A 3D model of me, made with AI", go: "#digital-double", group: "Fun" },
  { label: "RepTrack on the App Store", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", group: "Links" },
  { label: "My Take on Jev, technical report", href: "/p/decision-models/report.html", group: "Links" },
  { label: "My Take on REA, technical report", href: "/p/rea-study/report.html", group: "Links" },
  { label: "Site Recon on GitHub", href: "https://github.com/kmsmohamedansar/site-recon", group: "Links" },
  { label: "Exposure Audit on GitHub", href: "https://github.com/kmsmohamedansar/authorized-web-exposure-audit", group: "Links" },
  { label: "GitHub", href: CONTACT.github, group: "Links" },
  { label: "LinkedIn", href: CONTACT.linkedin, group: "Links" },
  { label: "Email · " + CONTACT.email, href: "mailto:" + CONTACT.email, group: "Links" },
  { label: "Toggle dev_mode · sandbox stubs", action: "toggle-sandbox", group: "System" },
];
