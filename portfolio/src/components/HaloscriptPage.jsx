import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";

const IMG = (name) => `${import.meta.env.BASE_URL}shots/haloscript/${name}`;
const SITE_URL = "https://kmsmohamedansar.github.io/haloscript-site/";
const VIOLET = "#b9a8ff";

const STATS = [
  ["3", "devices, one SwiftUI codebase: Mac, iPad, iPhone"],
  ["~30k", "lines of Swift across 180 files"],
  ["0", "accounts, ads, analytics or servers"],
  ["Free", "on the App Store at launch"],
];

const MAC = [
  ["write_mac.jpg", "Write", "A focused scene editor with rich text, page themes and word counts that roll up the binder."],
  ["corkboard_mac.jpg", "Corkboard", "Index cards for every scene. Drag to reorder, or move a scene to another chapter."],
  ["outline_mac.jpg", "Outline", "The whole manuscript at a glance, with status, POV and plotline tags."],
  ["storybible_mac.jpg", "Story Bible", "Characters, locations, research and ideas, kept with each novel."],
];

const IPAD = [
  ["write_ipad.jpg", "Writing on iPad"],
  ["corkboard_ipad.jpg", "Corkboard on iPad"],
  ["board_ipad.jpg", "Whiteboard with Apple Pencil"],
];

const IPHONE = [
  ["home_iphone.jpg", "Home"],
  ["write_iphone.jpg", "Write"],
  ["corkboard_iphone.jpg", "Corkboard"],
];

const FEATURES = [
  ["Writing", [
    "Parts, chapters and scenes in a binder, with a status per scene",
    "Rich-text scene editor with autosave and focus mode",
    "Daily word goal with a streak, plus a whole-novel goal",
    "Scene snapshots with restore, and find & replace across the book",
    "Import from Word or Markdown; export to Word, ePub, Markdown and text",
  ]],
  ["Whiteboard", [
    "Infinite canvas: sticky notes, text, shapes, connectors and charts",
    "A plot board per novel, with one column per chapter mirroring its scenes",
    "Writer templates: three-act, hero's journey, save the cat",
  ]],
  ["Apple Pencil", [
    "Pressure-sensitive ink with palm rejection",
    "A hover ring that previews the brush",
    "Pencil Pro squeeze or double-tap to switch pen and select",
  ]],
  ["Safe by design", [
    "Soft delete with a 30-day Recently Deleted",
    "Full backup and restore",
    "A visible save and sync status, always",
  ]],
];

const ROAD = [
  ["done", "Novel and whiteboard core, built and verified on the Mac, iPad and iPhone simulators"],
  ["done", "iCloud sync wired up, with the conflict rules below"],
  ["done", "Writer templates, import, and save-on-background"],
  ["next", "Two-device sync test on real hardware"],
  ["next", "CloudKit schema to production, then TestFlight"],
  ["next", "App Store review and launch, free"],
];

const LESSONS = [
  ["Design the data for year five.", "CloudKit schemas can only grow. Every field needs a default, nothing gets renamed, and deletes are soft. Getting that right on day one is cheaper than any migration."],
  ["Sync is a product feature.", "Making each whiteboard element its own record, with a small tested merge, is what lets a Pencil stroke on the iPad and a typed note on the Mac both survive."],
  ["Cut scope with a date.", "A written cut-line for launch (must ship, if time allows, v1.1) kept the first version shippable instead of endless."],
  ["Free, private, no AI in v1.", "No accounts and no backend means nothing to run, nothing to breach, and nothing between a writer and the first sentence."],
];

function Shot({ src, alt, className = "" }) {
  return (
    <img src={IMG(src)} alt={alt} loading="lazy"
      className={`w-full rounded-xl border border-white/10 bg-[#0d1117] shadow-[0_20px_60px_-30px_rgba(185,168,255,.45)] ${className}`} />
  );
}

/* Showcase page for Haloscript: a tour of the app across devices and
   how it's built. The source is private; only screenshots and the
   design are shown here. */
export default function HaloscriptPage() {
  return (
    <div className="bg-[#07070b] text-[color:var(--ink-200)]">
      <header className="mx-auto max-w-5xl px-5 pt-10 sm:px-8 sm:pt-16">
        <a href="#projects" className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[.12em]" style={{ color: VIOLET }}>
          <ArrowLeft size={13} /> Back to projects
        </a>
        <div className="mt-8 flex items-center gap-4">
          <img src={IMG("icon.png")} alt="Haloscript app icon" className="h-16 w-16 rounded-2xl shadow-lg sm:h-20 sm:w-20" />
          <div>
            <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">Haloscript</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-[.12em]" style={{ color: VIOLET }}>
              Mac · iPad · iPhone · In testing, App Store soon
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[color:var(--ink-100)]">
          A writing app for novelists, with an infinite whiteboard beside the manuscript. Plan on a corkboard, keep a Story
          Bible, sketch with Apple Pencil, and write in a focused editor. Everything syncs privately through the writer's own
          iCloud. No accounts, no ads, no analytics.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[#07070b] hover:brightness-110"
            style={{ background: VIOLET }}>
            Support and privacy <ArrowUpRight size={15} />
          </a>
          <a href="#contact" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm hover:border-white/50 hover:text-white">
            <Lock size={14} /> Source is private. Walkthrough on request.
          </a>
        </div>
        <Shot src="hero_home_mac.jpg" alt="Haloscript home on the Mac: choose Novel or Whiteboard" className="mt-12" />
      </header>

      <article className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={small} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <dt className="font-display text-3xl font-semibold text-white">{big}</dt>
              <dd className="mt-1 text-xs leading-snug">{small}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">On the Mac</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {MAC.map(([img, title, cap]) => (
            <figure key={img}>
              <Shot src={img} alt={`${title} on the Mac`} />
              <figcaption className="mt-3"><span className="font-semibold text-white">{title}.</span> {cap}</figcaption>
            </figure>
          ))}
        </div>
        <figure className="mt-8">
          <Shot src="whiteboard_mac.jpg" alt="The infinite whiteboard on the Mac" />
          <figcaption className="mt-3"><span className="font-semibold text-white">Whiteboard.</span> An infinite canvas for notes, shapes, connectors, charts and freehand ink, with a plot board linked to every novel.</figcaption>
        </figure>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">On the iPad, with Apple Pencil</h2>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {IPAD.map(([img, alt]) => (
            <figure key={img}>
              <Shot src={img} alt={alt} />
              <figcaption className="mt-2 text-xs">{alt}</figcaption>
            </figure>
          ))}
        </div>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">On the iPhone</h2>
        <div className="mt-6 grid max-w-2xl grid-cols-3 gap-4">
          {IPHONE.map(([img, alt]) => (
            <figure key={img}>
              <Shot src={img} alt={`iPhone: ${alt}`} />
              <figcaption className="mt-2 text-xs">{alt}</figcaption>
            </figure>
          ))}
        </div>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">What it does</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(([head, items]) => (
            <section key={head} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <h3 className="font-semibold text-white">{head}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                {items.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: VIOLET }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">How it's built</h2>
        <p className="mt-3 max-w-3xl leading-relaxed">
          One SwiftUI app target runs on macOS, iPadOS and iOS. The same SwiftData models drive every screen, and CloudKit
          syncs them through the writer's private iCloud, so there's no server of mine anywhere in the loop. The hard part
          was making sync safe when two devices edit at once.
        </p>
        <figure className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <img src={IMG("architecture.svg")} alt="Architecture: Mac, iPad and iPhone share one SwiftUI app and SwiftData models, synced through private iCloud. Whiteboard elements merge per element; scene text keeps the other version as a snapshot." className="w-full" loading="lazy" />
        </figure>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed">
          Platform-independent logic (word counting, streaks, search and replace, stylus pressure, and the ZIP, DOCX and ePub
          writers) is covered by a test script that runs without an Xcode test target.
        </p>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">Road to launch</h2>
        <ol className="mt-6 space-y-3">
          {ROAD.map(([state, text]) => (
            <li key={text} className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[.1em] ${state === "done" ? "bg-green/15 text-green" : "bg-white/10 text-white/70"}`}>
                {state === "done" ? "Done" : "Next"}
              </span>
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-20 font-display text-2xl font-semibold text-white">What I learned</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {LESSONS.map(([head, body]) => (
            <li key={head} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="font-semibold text-white">{head}</p>
              <p className="mt-1 text-sm leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <a href="#contact" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-[#07070b] hover:-translate-y-0.5 transition-transform" style={{ background: VIOLET }}>
            Want to beta test? Get in touch
          </a>
          <a href="#projects" className="text-sm text-white/70 hover:text-white">Back to projects</a>
        </div>
      </article>
    </div>
  );
}
