# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev).
React 19, Vite, Tailwind v4, Framer Motion, and three.js for the interactive experiments.

## How the site is laid out

One scrolling page, then a detail page per project:

1. **Hero**: particles gather into my name, then morph into what I build. The rotating project/tool line stays underneath, and the pointer disperses either text shape.
2. **Projects**: one manually controlled Open Source & Experiments feature for JEV, REA and StoryEra, followed by the other featured stories and project grid.
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

## Open source spotlight and StoryEra

JEV and REA remain independent studies with their original report links. StoryEra is the third slide, a reusable agent skill rather than another model benchmark. Its detail page documents the workflow, Codex and Claude Code installation, curated novel examples, saved evaluation limits and links to the public repository. The original novel is not included.

The collection displays all three projects together: cards across on desktop, image-and-detail rows on tablets, and stacked cards on phones. Each retains its image, details, story and report links. Existing project anchors scroll to the corresponding card. The full project index and command palette still expose each project individually.

`public/shots/spotlight/storyera.webp` is original AI-generated editorial artwork, made as a companion to the existing covers. It is an illustration, not an application screenshot. The two StoryEra diagrams in `public/shots/storyera/` come from the MIT-licensed StoryEra repository.
