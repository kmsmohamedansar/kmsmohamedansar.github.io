# Mohamed Ansar, portfolio

The source for [kmsmohamedansar.github.io](https://kmsmohamedansar.github.io).
React 19, Vite, Tailwind v4, Framer Motion, and three.js for the backdrop.

## How the site is laid out

One scrolling page, then a detail page per project:

1. **Hero**: who I am, in two sentences.
2. **Projects**: three featured cards, then a sideways scroller with the rest.
3. **Experience**: a sideways scroller of roles.
4. **About**: the short story and what I know.
5. **Built with AI**: experiments (the EMET terminal, the solar system, the star field).
6. **Contact**.

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
    SolarSystemExplorer.jsx, DataLineageExplorer.jsx, StarFormationBackground.jsx
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
