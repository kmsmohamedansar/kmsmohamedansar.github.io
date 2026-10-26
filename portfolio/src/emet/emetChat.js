const ENDPOINT = import.meta.env.VITE_EMET_AI_URL?.trim();
const SESSION_KEY = "emet-ai-session";
const REQUEST_TIMEOUT = 12000;

export function createEmetId() {
  const secureId = globalThis.crypto?.randomUUID?.();
  if (secureId) return secureId;
  return `emet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const EMET_SUGGESTIONS = [
  "What does Ansar build?",
  "Show me his AI projects",
  "What is his data experience?",
  "How can I contact him?",
];

const FALLBACKS = [
  {
    matches: ["contact", "email", "reach", "hire"],
    answer: "You can reach Ansar at mohamedansarkms@gmail.com, or use the contact section below.",
    destination: "contact",
  },
  {
    matches: ["ai", "model", "experiment", "rea", "storyera"],
    answer: "Ansar tests AI ideas instead of only describing them. His work includes decision-model and REA studies, StoryEra, and an interactive digital double.",
    destination: "ai",
  },
  {
    matches: ["data", "sql", "work", "experience", "career"],
    answer: "Ansar is a Solutions Engineer working with retail pricing data. His background includes SQL, Snowflake, reporting, data quality, and client-facing problem solving.",
    destination: "experience",
  },
  {
    matches: ["project", "build", "app", "portfolio"],
    answer: "Ansar builds data tools, Apple apps, browser extensions, and AI experiments. RepTrack, Haloscript, Sitescout, and his independent AI studies are good places to start.",
    destination: "projects",
  },
];

function fallbackFor(question) {
  const normalized = question.toLowerCase();
  const match = FALLBACKS.find((item) => item.matches.some((keyword) => normalized.includes(keyword)));
  return match || {
    answer: "My AI link is unavailable right now, but I can still guide you through Ansar’s projects, experience, and contact details.",
    destination: "projects",
  };
}

function sessionId() {
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const value = createEmetId();
    window.sessionStorage.setItem(SESSION_KEY, value);
    return value;
  } catch {
    return createEmetId();
  }
}

export async function askEmet(question) {
  if (!ENDPOINT) return { ...fallbackFor(question), source: "fallback" };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, sessionId: sessionId() }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.answer !== "string") {
      const error = new Error(payload.error || "Emet could not reach the AI service.");
      error.status = response.status;
      throw error;
    }
    return {
      answer: payload.answer,
      destination: typeof payload.destination === "string" ? payload.destination : null,
      source: "ai",
    };
  } catch (error) {
    if (error?.status === 429) throw error;
    return { ...fallbackFor(question), source: "fallback" };
  } finally {
    window.clearTimeout(timeout);
  }
}
