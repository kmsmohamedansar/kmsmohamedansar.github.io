const STORAGE_KEY = "emet-context-offers";
const COMPANION_UI = ".bb8-edge, .bb8-edge-chat, .bb8-edge-guide";

export const EMET_READING_CONTEXTS = [
  {
    id: "hero",
    selector: "#hero",
    message: "First time here? I can point out the good bits.",
    actionLabel: "Guide me",
    question: "What should I look at first in Ansar's portfolio?",
  },
  {
    id: "projects",
    selector: "#projects",
    message: "Taking a closer look? I can give you the short version.",
    actionLabel: "Explain",
    question: "Can you give me a short overview of Ansar's selected projects?",
  },
  {
    id: "ai",
    selector: "#ai",
    message: "Curious about these experiments? I can explain what they test.",
    actionLabel: "Explain",
    question: "What are Ansar's AI experiments about?",
  },
  {
    id: "about",
    selector: "#about",
    message: "Want a quick read on Ansar’s background and tools?",
    actionLabel: "Summarize",
    question: "Can you briefly summarize Ansar's background and skills?",
  },
  {
    id: "experience",
    selector: "#experience",
    message: "Still reading? I can turn this timeline into a quick summary.",
    actionLabel: "Summarize",
    question: "Can you summarize Ansar's professional experience?",
  },
  {
    id: "contact",
    selector: "#contact",
    message: "Need help finding the best way to reach Ansar?",
    actionLabel: "Help me",
    question: "How can I contact Ansar?",
  },
];

function randomBetween(min, max, random) {
  return min + random() * (max - min);
}

export function visibleFraction(rect, viewportHeight) {
  if (!rect || rect.height <= 0 || viewportHeight <= 0) return 0;
  const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return visible / Math.min(rect.height, viewportHeight);
}

export function pickReadingContext(contexts, viewportHeight) {
  const candidates = contexts
    .map((context) => {
      const element = document.querySelector(context.selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const visibility = visibleFraction(rect, viewportHeight);
      const centreDistance = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
      return { ...context, element, visibility, centreDistance };
    })
    .filter((context) => context && context.visibility >= 0.48)
    .sort((a, b) => b.visibility - a.visibility || a.centreDistance - b.centreDistance);
  return candidates[0] || null;
}

function projectContext(route) {
  if (!route.startsWith("project/")) return null;
  const title = document.querySelector("main h1")?.textContent?.trim() || "this project";
  return {
    id: route,
    selector: "main",
    message: `Want the short version of ${title}?`,
    actionLabel: "Explain",
    question: `Can you briefly explain the ${title} project?`,
  };
}

function workContext(route) {
  if (route !== "work") return null;
  return {
    id: "work-index",
    selector: "main",
    message: "That’s a long workbench. Want help finding a project?",
    actionLabel: "Guide me",
    question: "Which of Ansar's projects should I look at first?",
  };
}

function readStoredOffers() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function storeOffers(offers) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...offers]));
  } catch {
    // Session storage can be unavailable in hardened browser contexts.
  }
}

function hasSelection() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

function isEditable(element) {
  return element instanceof Element && Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
}

export function createEmetBehaviorDirector({
  getRoute,
  canOffer,
  onOffer,
  onRetreat,
  random = Math.random,
  now = () => performance.now(),
  tickMs = 650,
}) {
  const offeredContexts = readStoredOffers();
  let activeContextId = null;
  let activeSince = now();
  let requiredDwell = 0;
  let lastActivityAt = now();
  let nextOfferAt = lastActivityAt + 7000;
  let activeOffer = null;

  const chooseDwell = () => {
    const phoneDelay = window.innerWidth <= 480 ? 5500 : 0;
    return randomBetween(8500, 13500, random) + phoneDelay;
  };

  const currentContext = () => {
    const route = getRoute();
    const standalone = projectContext(route) || workContext(route);
    const contexts = standalone ? [standalone] : route === "main" ? EMET_READING_CONTEXTS : [];
    return pickReadingContext(contexts, window.innerHeight);
  };

  const noteActivity = (event) => {
    if (event?.target instanceof Element && event.target.closest(COMPANION_UI)) return;
    lastActivityAt = now();
    if (!activeOffer) return;
    activeOffer = null;
    onRetreat();
  };

  const onSelectionChange = () => {
    if (hasSelection()) noteActivity();
  };

  const tick = () => {
    const timestamp = now();
    const context = currentContext();
    if (!context) {
      activeContextId = null;
      return;
    }

    if (context.id !== activeContextId) {
      activeContextId = context.id;
      activeSince = timestamp;
      requiredDwell = chooseDwell();
      return;
    }

    const visitorIsCalm = timestamp - lastActivityAt >= 2200
      && !document.hidden
      && !hasSelection()
      && !isEditable(document.activeElement);
    if (!visitorIsCalm || !canOffer() || activeOffer) return;
    if (offeredContexts.has(context.id) || timestamp < nextOfferAt) return;
    if (timestamp - activeSince < requiredDwell) return;

    const offer = {
      id: context.id,
      message: context.message,
      actionLabel: context.actionLabel,
      question: context.question,
    };
    activeOffer = offer;
    offeredContexts.add(context.id);
    storeOffers(offeredContexts);
    nextOfferAt = timestamp + randomBetween(55000, 90000, random);
    onOffer(offer);
  };

  window.addEventListener("scroll", noteActivity, { passive: true, capture: true });
  document.addEventListener("pointerdown", noteActivity, { passive: true });
  document.addEventListener("input", noteActivity);
  document.addEventListener("keydown", noteActivity);
  document.addEventListener("selectionchange", onSelectionChange);
  document.addEventListener("visibilitychange", noteActivity);
  const interval = window.setInterval(tick, tickMs);

  return {
    acknowledge() {
      activeOffer = null;
    },
    snooze(duration = 12000) {
      const timestamp = now();
      nextOfferAt = Math.max(nextOfferAt, timestamp + duration);
      activeSince = timestamp;
    },
    inspect() {
      return { activeContextId, activeSince, requiredDwell, lastActivityAt, nextOfferAt, activeOffer };
    },
    dispose() {
      window.clearInterval(interval);
      window.removeEventListener("scroll", noteActivity, true);
      document.removeEventListener("pointerdown", noteActivity);
      document.removeEventListener("input", noteActivity);
      document.removeEventListener("keydown", noteActivity);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("visibilitychange", noteActivity);
    },
  };
}
