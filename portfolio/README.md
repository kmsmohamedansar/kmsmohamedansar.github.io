# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev).
React 19, Vite, Tailwind v4, Framer Motion, and three.js for the interactive experiments.

## How the site is laid out

One scrolling page, then a detail page per project:

1. **Hero**: particles gather into my name, then morph into what I build. The rotating project/tool line stays underneath, and the pointer disperses either text shape.
2. **Projects**: one open-source feature split into two collections: the JEV and REA studies, then the StoryEra and Site Recon agent skills. The other featured stories and project grid follow.
3. **Built with AI**: the EMET terminal, solar system, and infinity loop.
4. **Skills ticker** and **About**.
5. **Experience**.
6. **Contact**.

The portfolio uses warm ivory (`#EAE6DE`), editorial blue (`#226192`), and
coral (`#EF8557`). `src/editorial.css` contains the homepage's layout and light/dark
surfaces. Shared compatibility tokens live in `src/index.css`. The main page uses
oversized condensed headings, illustrated covers using the original project
icons, an open project grid, an experience timeline, and a blue
interactive experiments section. The particle name-to-statement sequence and
rotating project/tool line remain in the opening. The terminal and 3D scenes
keep their own colors. The opening pauses offscreen and in hidden tabs, caps
particles at 7,000 on desktop and 3,200 on phones, and reserves space for the
rotating copy to avoid layout shifts.

Clicking a project opens `#project/<slug>`: the story, a flow diagram, what I took from it, and links.

## Where things live

```
src/
  data/projects.js      every project (copy, flow diagram, links, screenshots)
  data/content.js       hero, roles, about/skills, EMET answers, command palette
  components/
    Sections.jsx        hero + the home page sections
    ProjectPage.jsx     the per-project detail page
    ui.jsx              Rail (scroller), FlowDiagram, tags, section heading
    EmetSection.jsx     the terminal
    NameParticles.jsx    canvas name animation
    SolarSystemExplorer.jsx, DataLineageExplorer.jsx, InfinityLoop.jsx
public/shots/           screenshots used on project pages
```

## Adding or changing a project

Edit `src/data/projects.js`. Set `featured: true` for a featured story. Add `spotlightGroup: "open-source"` to include a featured project in the shared Open Source & Experiments collection. Each card keeps its own artwork, copy, evidence and detail route; `spotlightLink` adds a direct report or documentation link. Flow diagrams are columns of boxes; boxes link to the next column automatically, or list `links` like `"0.0>1.1"` for a specific shape. Add images to `public/shots/` and list them under `shots`.

## Writing style

Plain words, first person, short sentences, no em dashes. Work projects stay generic: no employer, product, customer or retailer names, and no numbers.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run lint
```

## Deploy

`.github/workflows/deploy-portfolio.yml` builds and publishes to GitHub Pages on every push to `main` that touches `portfolio/**`. Pages must be set to the **GitHub Actions** source.

## Studies, skills and plugins

The homepage no longer presents JEV, REA and StoryEra as three equivalent cards. It introduces two clearer collections:

- **Independent AI studies:** My Take on Jev and My Take on REA, each with its original report, methods, saved results and individual project page.
- **Open-source skills & plugins:** StoryEra and Site Recon, each with Codex and Claude Code installation, documentation, limitations and a public repository.

The homepage renders two editorial collection cards on desktop and stacks them on smaller screens. Inside each collection, every project still has its own artwork or type treatment, summary, story link and repository/report link. Existing project anchors, the full project index and command palette continue to expose all four projects individually.

StoryEra documents a continuity-audit workflow for novels. Site Recon documents and automates public website inspection, including stack evidence, exact browser-visible animation values, mobile and reduced-motion comparison, and clean-room rebuild guidance.

`public/shots/spotlight/storyera.webp` is original AI-generated editorial artwork, made as a companion to the existing covers. It is an illustration, not an application screenshot. The two StoryEra diagrams in `public/shots/storyera/` come from the MIT-licensed StoryEra repository.
