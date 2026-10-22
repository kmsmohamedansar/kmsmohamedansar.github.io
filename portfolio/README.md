# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev).
React 19, Vite, Tailwind v4, Framer Motion, and three.js for the interactive experiments.

## How the site is laid out

One scrolling page, then a detail page per project:

1. **Hero**: particles gather into my name, then morph into what I build. The rotating project/tool line stays underneath, and the pointer disperses either text shape.
2. **Projects**: featured stories, a card grid, then a sideways scroller.
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

Edit `src/data/projects.js`. Set `featured: true` to put it in the top three. Flow diagrams are columns of boxes; boxes link to the next column automatically, or list `links` like `"0.0>1.1"` for a specific shape. Add images to `public/shots/` and list them under `shots`.

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
