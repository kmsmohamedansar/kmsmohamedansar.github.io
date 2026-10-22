import { getProject } from "../data/projects";

/* A hash route swaps the whole view, so it should read like a page: its own
   tab title, and focus moved to the new heading. Without this every project
   shares one title in tabs, history and bookmarks, and a screen reader is
   never told the view changed. */
export const SITE_TITLE = "Mohamed Ansar · Solutions Engineer, retail data and tools";

// The takeover views that are not a project page.
const VIEW_TITLES = {
  emet: "Emet",
  explore: "Solar system explorer",
  "lineage-demo": "Data lineage explorer",
  "digital-double": "A 3D model of me, made with AI",
  infinity: "Infinity loop",
  work: "Selected work",
};

export function titleForRoute(route) {
  if (!route || route === "main") return SITE_TITLE;
  if (route.startsWith("project/")) {
    const project = getProject(route.slice("project/".length));
    return project ? `${project.title} · Mohamed Ansar` : SITE_TITLE;
  }
  const view = VIEW_TITLES[route];
  return view ? `${view} · Mohamed Ansar` : SITE_TITLE;
}
