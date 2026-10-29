// What Emet knows, built from the site's own data.
//
// Nothing here restates a project, a role or a tool by hand: the entries are
// generated from projects.js, content.js and tools.js, so the chat panel and
// the page can never drift apart. Only the intent entries (greetings, who
// Emet is, availability) are written out, because no data file holds them.
//
// House style: plain words, short sentences, no em dashes.

import { ABOUT, CONTACT, HERO, ROLES } from "../data/content.js";
import { EXPERIMENTS, FEATURED, FEATURED_GRID, LISTED_PROJECTS, OPEN_SOURCE_PROJECTS } from "../data/projects.js";
import { TOOL_INFO } from "../data/tools.js";
import { createMatcher, normalize, tokenize } from "./emetMatcher.js";

const EMAIL = CONTACT.email;

// Names people use that no data field spells out.
const PROJECT_ALIASES = {
  "decision-models": ["jev", "decision model", "small ai", "typesafe"],
  "rea-study": ["rea", "reverse engineering", "decompiler"],
  storyera: ["story era", "novel", "continuity"],
  "site-recon": ["site recon", "recon"],
  "authorized-web-exposure-audit": ["exposure audit", "web audit", "security audit"],
  "digital-double": ["digital double", "digital me", "3d head", "avatar"],
  reptrack: ["rep track", "workout app", "gym app", "fitness app"],
  jarvis: ["personal agent", "job agent", "personal assistant"],
  haloscript: ["halo script", "handwriting", "ipad app"],
  sitescout: ["site scout", "scout"],
  "sql-playground": ["sql playground", "sandbox"],
};

function sentences(text, count) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .slice(0, count)
    .join(" ")
    .trim();
}

function list(items, max = 4) {
  const kept = items.filter(Boolean).slice(0, max);
  if (kept.length <= 1) return kept.join("");
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}

/* ── projects ─────────────────────────────────────────────── */

function projectEntry(project) {
  const aliases = PROJECT_ALIASES[project.slug] || [];
  const plain = (text) => String(text).replace(/\s*·\s*/g, ", ");
  const parts = [`${project.title} (${plain(project.kind)}).`];
  if (project.hook) parts.push(sentences(project.hook, 2));
  parts.push(`Status: ${plain(project.status)}.`);
  if (project.stack?.length) parts.push(`Built with ${list(project.stack, 4)}.`);

  return {
    id: `project:${project.slug}`,
    label: project.title,
    group: "projects",
    destination: `project/${project.slug}`,
    answer: parts.join(" "),
    phrases: [project.title, ...aliases],
    strong: [project.title, project.slug.replace(/-/g, " "), ...aliases],
    weak: [project.kind, ...(project.tags || []), ...(project.stack || [])],
  };
}

function experimentEntry(experiment) {
  return {
    id: `experiment:${experiment.id}`,
    label: experiment.title,
    group: "fun",
    destination: experiment.href?.replace(/^#/, "") || "projects",
    answer: `${sentences(experiment.hook, 2)} ${sentences(experiment.body, 1)}`.trim(),
    phrases: [experiment.title],
    strong: [experiment.title, experiment.id],
    weak: [experiment.hook],
  };
}

/* ── tools ────────────────────────────────────────────────── */

function toolEntries() {
  const skillItems = ABOUT.groups.flatMap((group) => group.items.map((item) => ({ item, group: group.title })));
  const names = new Set([
    ...Object.keys(TOOL_INFO),
    ...skillItems.map(({ item }) => item),
    ...LISTED_PROJECTS.flatMap((project) => project.stack || []),
  ]);

  return [...names].map((name) => {
    const used = LISTED_PROJECTS.filter((project) => project.stack?.includes(name));
    const skill = skillItems.find(({ item }) => item === name);
    const parts = [`Yes, ${name} is part of his toolkit.`];
    if (skill) parts[0] = `Yes, ${name} is on his skills list, under ${skill.group}.`;
    if (TOOL_INFO[name]) parts.push(sentences(TOOL_INFO[name], 1));
    if (used.length) parts.push(`He used it in ${list(used.map((project) => project.title), 3)}.`);

    return {
      id: `tool:${name}`,
      label: name,
      group: "tools",
      destination: used.length === 1 ? `project/${used[0].slug}` : "about",
      answer: parts.join(" "),
      phrases: [name],
      strong: [name],
      weak: used.flatMap((project) => [project.title]),
    };
  });
}

/* ── the parts no data file holds ─────────────────────────── */

const currentRole = ROLES.find((role) => role.current) || ROLES[0];

const INTENT_ENTRIES = [
  {
    id: "greeting",
    label: "Say hello",
    group: "intent",
    destination: null,
    answer: "Hello. I'm Emet, the droid that follows Ansar around this site. Ask me about his projects, his work, the tools he uses, or how to reach him.",
    phrases: ["hi", "hello", "hey", "yo", "good morning", "good evening", "howdy", "hi there"],
    strong: ["hello", "greetings"],
    weak: [],
  },
  {
    id: "identity",
    label: "Who Emet is",
    group: "intent",
    destination: null,
    answer: "I'm Emet, a small droid Ansar built for this site with three.js. I roam the page and answer questions about his work from what the site already says. I'm not Ansar, and I only talk about this portfolio.",
    phrases: ["who are you", "what are you", "your name", "are you a bot", "are you human", "are you ai", "what is emet", "who is emet"],
    strong: ["droid", "robot", "chatbot"],
    weak: ["bot"],
  },
  {
    id: "about",
    label: "Who Ansar is",
    group: "intent",
    destination: "about",
    answer: `${HERO.eyebrow}. ${HERO.title} By day he works on retail pricing data with SQL and Snowflake. The rest of the time he builds his own things: ${list([...FEATURED, ...FEATURED_GRID].map((project) => project.title), 3)}.`,
    phrases: [
      "who is he", "who is ansar", "about him", "about ansar", "tell me about him", "tell me about ansar",
      "his background", "introduce him", "what does he do", "what do you do", "what does ansar do",
    ],
    strong: ["about", "background", "bio", "himself", "introduction"],
    weak: ["person"],
  },
  {
    id: "experience",
    label: "His experience",
    group: "intent",
    destination: "experience",
    answer: `${currentRole.title} at ${currentRole.company}, ${currentRole.when.split("·")[0].trim()}. ${currentRole.summary} Before that: ${list(ROLES.slice(1).map((role) => `${role.company} (${role.title})`), 4)}.`,
    phrases: [
      "where has he worked", "work history", "his career", "how long", "how many years",
      "years of experience", "current job", "where does he work", "what is his job",
    ],
    strong: ["experience", "career", "job", "employment", "role", "resume", "cv", "history", "employer", "company", "amazon", "datasembly", "spongelii"],
    weak: ["worked", "working", "senior", "year"],
  },
  {
    id: "skills",
    label: "His skills",
    group: "intent",
    destination: "about",
    answer: ABOUT.groups.map((group) => `${group.title}: ${list(group.items, 5)}.`).join(" "),
    phrases: ["what does he know", "his skills", "tech stack", "what languages", "what tools"],
    strong: ["skill", "stack", "toolkit", "technology", "language", "expertise", "proficient"],
    weak: ["tool", "know"],
  },
  {
    id: "data",
    label: "His data work",
    group: "intent",
    destination: "experience",
    answer: `Data is the day job. He works on retail pricing data with SQL and Snowflake, and builds the reports and checks around it. ${list(ABOUT.groups[0].items, 6)} are the tools he reaches for.`,
    phrases: ["data experience", "data work", "data engineering", "retail data", "pricing data"],
    strong: ["data", "warehouse", "pipeline", "etl", "analytics", "reporting", "dashboard"],
    weak: ["query", "table", "report"],
  },
  {
    id: "ai",
    label: "His AI work",
    group: "intent",
    destination: "ai",
    answer: `He runs his own AI studies and writes them up in full, including the failures. ${list(OPEN_SOURCE_PROJECTS.map((project) => project.title), 5)} are the open ones, and there is a 3D model of his head made with AI that looks back at you.`,
    phrases: ["ai work", "ai projects", "machine learning", "llm", "his experiments", "ai experience"],
    strong: ["ai", "llm", "model", "experiment", "study", "ml"],
    weak: ["learning", "agent", "prompt"],
  },
  {
    id: "projects",
    label: "What he has built",
    group: "intent",
    destination: "projects",
    answer: `${LISTED_PROJECTS.length} projects are on the site. The headline ones are ${list([...FEATURED, ...FEATURED_GRID].map((project) => project.title), 4)}. Ask me about any of them by name.`,
    phrases: ["what has he built", "what else has he built", "his projects", "what does he build", "show me his work", "portfolio"],
    strong: ["project", "built", "build", "portfolio", "shipped", "made", "app"],
    weak: ["thing", "stuff", "demo"],
  },
  {
    id: "contact",
    label: "How to reach him",
    group: "intent",
    destination: "contact",
    answer: `Email is fastest: ${EMAIL}. He's on LinkedIn as kmsmohamedansar and on GitHub as kmsmohamedansar. The contact section has all three.`,
    phrases: ["how do i reach him", "contact him", "get in touch", "his email", "email address", "reach out"],
    strong: ["contact", "email", "linkedin", "github", "reach", "message"],
    weak: ["touch", "address"],
  },
  {
    id: "availability",
    label: "Whether he's available",
    group: "intent",
    destination: "contact",
    answer: `He's working full time as ${currentRole.title} at ${currentRole.company}, so he isn't looking for freelance work on the side. He is always happy to talk about interesting problems. Email ${EMAIL}.`,
    phrases: ["is he available", "is he looking", "open to work", "for hire", "can i hire him", "freelance work", "contract work", "job opportunity", "new role"],
    strong: ["available", "availability", "hire", "hiring", "freelance", "contract", "consulting", "recruiter", "opportunity", "vacancy"],
    weak: ["open", "looking"],
  },
  {
    id: "resume",
    label: "His resume",
    group: "intent",
    destination: "experience",
    answer: `There's no PDF to download here. The experience section is the resume: every role, what he did, and the tools behind it. For a copy, email ${EMAIL}.`,
    phrases: ["his resume", "his cv", "download resume", "send me his resume"],
    strong: ["resume", "cv", "curriculum"],
    weak: ["pdf", "download"],
  },
  {
    id: "location",
    label: "Where he is",
    group: "intent",
    destination: "experience",
    answer: `${HERO.eyebrow}. He works remotely from Canada, and worked in India before that.`,
    phrases: ["where is he", "where does he live", "what timezone", "is he remote", "based in"],
    strong: ["location", "canada", "remote", "timezone", "country", "city", "live", "based"],
    weak: ["where"],
  },
];

export const EMET_ENTRIES = [
  ...INTENT_ENTRIES,
  ...LISTED_PROJECTS.map(projectEntry),
  ...EXPERIMENTS.map(experimentEntry),
  ...toolEntries(),
];

export const EMET_THRESHOLD = 2.4;

export const emetMatcher = createMatcher(EMET_ENTRIES, { threshold: EMET_THRESHOLD });

const byId = new Map(EMET_ENTRIES.map((entry) => [entry.id, entry]));
export const getEmetEntry = (id) => byId.get(id) || null;

const FALLBACK_LABELS = ["his projects", "his experience", "the tools he uses", "how to reach him"];

const FOLLOW_UP_WORDS = new Set([
  "it", "that", "this", "they", "them", "those", "stack", "tool", "technology", "status", "result", "code", "source",
]);

function asksAboutPreviousEntry(text) {
  const normalized = normalize(text);
  const tokens = tokenize(text);
  return /\b(what|how|where|why) about\b/.test(normalized)
    || /\b(it|that|this|they|them|those|one)\b/.test(normalized)
    || (tokens.length <= 4 && tokens.some((token) => FOLLOW_UP_WORDS.has(token)));
}

function questionFor(entry) {
  if (!entry) return null;
  if (entry.group === "projects" || entry.group === "fun" || entry.group === "tools") return `What is ${entry.label}?`;
  const label = entry.label.replace(/^(His|How|What|Whether|Where)\s+/i, "").replace(/[?.]$/, "");
  return `What about ${label.charAt(0).toLowerCase()}${label.slice(1)}?`;
}

function destinationAction(entry) {
  if (!entry?.destination) return null;
  if (entry.destination.startsWith("project/")) return `Open ${entry.label}`;
  const labels = {
    about: "Open about",
    ai: "Open AI projects",
    contact: "Open contact",
    experience: "Open experience",
    projects: "Open projects",
  };
  return labels[entry.destination] || "Open section";
}

/**
 * Emet's local answer. It always returns something: a confident answer when
 * the question matches an entry well enough, and otherwise an honest "not
 * sure" that names the nearest topics it does know.
 */
export function answerLocally(question, { contextEntryId = null } = {}) {
  const text = String(question || "").trim();
  if (!text) {
    return {
      answer: "Ask me anything about Ansar's projects, his experience, or how to reach him.",
      destination: null,
      confident: false,
      entryId: null,
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
      actionLabel: null,
    };
  }

  const contextEntry = contextEntryId ? getEmetEntry(contextEntryId) : null;
  const useContext = contextEntry && asksAboutPreviousEntry(text);
  const contextual = useContext
    ? emetMatcher.match(`${contextEntry.label} ${text}`)
    : null;
  const direct = emetMatcher.match(text);
  const result = contextual?.confident
    ? contextual
    : useContext
      ? { entry: contextEntry, score: contextual?.score || 0, confident: true, alternatives: direct.entry ? [direct.entry, ...direct.alternatives] : [] }
      : direct;
  const { entry, score, confident, alternatives } = result;
  const suggestions = alternatives.map(questionFor).filter(Boolean).slice(0, 3);
  if (entry && confident) {
    return {
      answer: entry.answer,
      destination: entry.destination,
      confident: true,
      entryId: entry.id,
      score,
      suggestions: suggestions.length ? suggestions : emetSuggestions(entry.destination || "main").slice(0, 3),
      actionLabel: destinationAction(entry),
    };
  }

  const nearby = (entry ? [entry, ...alternatives] : [])
    .map((item) => item.label)
    .filter(Boolean)
    .map((label) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label));
  const offered = nearby.length ? list(nearby, 3) : list(FALLBACK_LABELS, 3);
  return {
    answer: `I'm not sure about that one, and I'd rather not guess. I can tell you about ${offered}.`,
    destination: entry?.destination || "projects",
    confident: false,
    entryId: null,
    score,
    suggestions: suggestions.length ? suggestions : DEFAULT_SUGGESTIONS.slice(0, 3),
    actionLabel: entry ? destinationAction(entry) : "Open projects",
  };
}

/* ── suggestions ──────────────────────────────────────────── */

const DEFAULT_SUGGESTIONS = [
  "What has Ansar built?",
  "What is his data experience?",
  "Does he know Snowflake?",
  "How can I contact him?",
];

const ROUTE_SUGGESTIONS = {
  experience: ["Where has he worked?", "What is his data experience?", "Is he available for freelance?", "How can I contact him?"],
  about: ["What does he know?", "Does he know Snowflake?", "Where is he based?", "What has he built?"],
  contact: ["How can I contact him?", "Is he available for freelance?", "Can I see his resume?", "What has he built?"],
  ai: ["What are his AI projects?", "What is My Take on Jev?", "What is Site Recon?", "How can I contact him?"],
  projects: ["What is RepTrack?", "What is Haloscript?", "What are his AI projects?", "How can I contact him?"],
};

/**
 * Suggested questions for the route the visitor is on. A project route gets
 * a question about that project, so the first tap is never a dead end.
 */
export function emetSuggestions(route = "main") {
  const slug = String(route || "").startsWith("project/") ? route.slice("project/".length) : null;
  if (slug) {
    const project = LISTED_PROJECTS.find((item) => item.slug === slug);
    if (project) {
      return [
        `What is ${project.title}?`,
        project.stack?.length ? `Why ${project.stack[0]}?` : "What has he built?",
        "What else has he built?",
        "How can I contact him?",
      ];
    }
  }
  return ROUTE_SUGGESTIONS[route] || DEFAULT_SUGGESTIONS;
}

export const EMET_SUGGESTIONS = DEFAULT_SUGGESTIONS;
