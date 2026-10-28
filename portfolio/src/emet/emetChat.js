import { answerLocally, emetSuggestions, EMET_SUGGESTIONS } from "./emetKnowledge.js";

const ENDPOINT = import.meta.env.VITE_EMET_AI_URL?.trim();
const SESSION_KEY = "emet-ai-session";
const UNANSWERED_KEY = "emet-unanswered-questions";
const REQUEST_TIMEOUT = 12000;

export function createEmetId() {
  const secureId = globalThis.crypto?.randomUUID?.();
  if (secureId) return secureId;
  return `emet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export { emetSuggestions, EMET_SUGGESTIONS };

function fallbackFor(question, options) {
  return answerLocally(question, options);
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

function recordUnanswered(question, contextEntryId) {
  const detail = { question, contextEntryId: contextEntryId || null };
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(UNANSWERED_KEY) || "[]");
    const queue = Array.isArray(saved) ? saved : [];
    window.sessionStorage.setItem(UNANSWERED_KEY, JSON.stringify([...queue, detail].slice(-20)));
  } catch {
    // Storage may be unavailable, but the event still lets an opt-in analytics
    // adapter observe misses without coupling the chat to a vendor.
  }
  window.dispatchEvent(new CustomEvent("emet:unanswered", { detail }));
}

export async function askEmet(question, { contextEntryId = null } = {}) {
  const local = fallbackFor(question, { contextEntryId });
  if (!local.confident) recordUnanswered(question, contextEntryId);
  if (!ENDPOINT) return { ...local, source: "local" };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, sessionId: sessionId(), contextEntryId }),
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
      destination: local.destination || (typeof payload.destination === "string" ? payload.destination : null),
      entryId: local.entryId,
      suggestions: local.suggestions,
      actionLabel: local.actionLabel,
      source: "ai",
    };
  } catch (error) {
    if (error?.status === 429) throw error;
    return { ...local, source: "fallback" };
  } finally {
    window.clearTimeout(timeout);
  }
}
