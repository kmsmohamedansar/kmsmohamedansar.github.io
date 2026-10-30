import { DATA_PREVIEW_PROJECTS, DATA_PREVIEW_READOUTS, PREVIEWABLE_PROJECTS } from "../lib/projectMotion";

const JARVIS_STEPS = ["CHECK JOB POSTINGS", "RESEARCH A COMPANY", "REVIEW GITHUB REPOS", "REMEMBER IT ALL"];

export default function ProjectMotionPreview({ project, active = false, expanded = false }) {
  if (!PREVIEWABLE_PROJECTS.has(project.slug)) return null;

  if (project.slug === "site-recon") {
    return (
      <div className={`ed-project-motion ed-motion-recon ${active ? "is-active" : ""} ${expanded ? "is-expanded" : ""}`} aria-hidden="true">
        <span className="ed-recon-grid" />
        <span className="ed-recon-beam" />
        <span className="ed-recon-layer ed-recon-layer-dom">DOM</span>
        <span className="ed-recon-layer ed-recon-layer-motion">MOTION</span>
        <span className="ed-recon-layer ed-recon-layer-assets">ASSETS</span>
        <span className="ed-recon-readout">PUBLIC SURFACE / VERIFIED</span>
      </div>
    );
  }

  if (project.slug === "storyera") {
    return (
      <div className={`ed-project-motion ed-motion-story ${active ? "is-active" : ""}`} aria-hidden="true">
        <span className="ed-story-thread" />
        <span className="ed-story-node ed-story-node-a">FACT</span>
        <span className="ed-story-node ed-story-node-b">CHECK</span>
        <span className="ed-story-node ed-story-node-c">REPAIR</span>
      </div>
    );
  }

  if (project.slug === "haloscript") {
    return (
      <div className={`ed-project-motion ed-motion-haloscript ${active ? "is-active" : ""} ${expanded ? "is-expanded" : ""}`} aria-hidden="true">
        <span className="ed-halo-sheet"><i /><i /><i /><b /></span>
        <span className="ed-halo-card ed-halo-card-draft">DRAFT</span>
        <span className="ed-halo-card ed-halo-card-board">WHITEBOARD</span>
        <span className="ed-halo-sync">ICLOUD / SYNCED</span>
      </div>
    );
  }

  if (project.slug === "jarvis") {
    return (
      <div className={`ed-project-motion ed-motion-jarvis ${active ? "is-active" : ""} ${expanded ? "is-expanded" : ""}`} aria-hidden="true">
        <span className="ed-jarvis-cap">20 / DAY · LOCAL</span>
        <span className="ed-jarvis-log">
          <b>JARVIS ›</b>
          {JARVIS_STEPS.map((step) => <i key={step}>{step}</i>)}
        </span>
      </div>
    );
  }

  if (DATA_PREVIEW_PROJECTS.has(project.slug)) {
    return (
      <div className={`ed-project-motion ed-motion-data ${active ? "is-active" : ""}`} aria-hidden="true">
        <span className="ed-data-table"><i /><i /><i className="is-held" /><i /></span>
        <span className="ed-data-gate" />
        <span className="ed-data-readout">{DATA_PREVIEW_READOUTS[project.slug]}</span>
      </div>
    );
  }

  if (project.slug === "digital-double") {
    return (
      <div className={`ed-project-motion ed-motion-double ${active ? "is-active" : ""} ${expanded ? "is-expanded" : ""}`} aria-hidden="true">
        <span className="ed-double-grid" />
        <span className="ed-double-orbit ed-double-orbit-a" />
        <span className="ed-double-orbit ed-double-orbit-b" />
        <span className="ed-double-reticle"><i /></span>
        <span className="ed-double-label ed-double-label-capture">13S / CAPTURE</span>
        <span className="ed-double-label ed-double-label-build">12 / REBUILDS</span>
        <span className="ed-double-label ed-double-label-live">WEBGL / LIVE</span>
      </div>
    );
  }

  return (
    <div className={`ed-project-motion ed-motion-study ed-motion-${project.slug} ${active ? "is-active" : ""}`} aria-hidden="true">
      <span className="ed-study-pulse ed-study-pulse-a" />
      <span className="ed-study-pulse ed-study-pulse-b" />
      <span className="ed-study-pulse ed-study-pulse-c" />
      <span className="ed-study-meter"><i /></span>
      <span className="ed-study-readout">QUESTION → TEST → RESULT</span>
    </div>
  );
}
