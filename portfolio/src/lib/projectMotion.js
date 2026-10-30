// The data-work tiles share one preview: rows going through a check.
// Each one names its own path through the check.
export const DATA_PREVIEW_READOUTS = {
  "data-delivery": "3 LAYOUTS → CHECK → 1 TABLE",
  integration: "APP A → OAUTH → APP B",
  "analytics-assistant": "RULES ⇄ AI · 30 QUESTIONS",
  "catalogue-checker": "PRODUCT → AISLE? → FLAG",
};
export const DATA_PREVIEW_PROJECTS = new Set(Object.keys(DATA_PREVIEW_READOUTS));
export const PREVIEWABLE_PROJECTS = new Set(["decision-models", "rea-study", "storyera", "site-recon", "haloscript", "digital-double", "jarvis", ...DATA_PREVIEW_PROJECTS]);
