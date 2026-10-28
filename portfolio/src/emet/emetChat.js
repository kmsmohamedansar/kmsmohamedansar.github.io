import { answerLocally, emetSuggestions, EMET_SUGGESTIONS } from "./emetKnowledge.js";

const ENDPOINT = import.meta.env.VITE_EMET_AI_URL?.trim();
const SESSION_KEY = "emet-ai-session";
const REQUEST_TIMEOUT = 12000;

export function createEmetId() {
  const secureId = globalThis.crypto?.randomUUID?.();
  if (secureId) return secureId;
  return `emet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export { emetSuggestions, EMET_SUGGESTIONS };

function fallbackFor(question) {
  const local = answerLocally(question);
  return { answer: local.answer, destination: local.destination };
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
  if (!ENDPOINT) return { ...fallbackFor(question), source: "local" };

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
