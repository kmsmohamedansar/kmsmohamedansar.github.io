export const PREVIEWABLE_PROJECTS = new Set(["decision-models", "rea-study", "storyera", "site-recon", "haloscript", "digital-double"]);

export function cursorAction(project) {
  if (project.slug === "site-recon") return "Inspect method";
  if (project.slug === "storyera") return "Open skill";
  if (project.slug === "authorized-web-exposure-audit") return "Audit safely";
  if (project.spotlightCategory === "studies") return "Read study";
  if (project.kind?.toLowerCase().includes("interactive")) return "Try demo";
  return "Read story";
}
