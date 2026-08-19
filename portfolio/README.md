# Mohamed Ansar — Portfolio (React / Vite / Tailwind)

Production React rewrite of the portfolio, replacing the previous
single-file vanilla HTML/CSS/JS version. Same content, same visual
language (dark ink-blue, cyan for data systems, amber for shipped
product), rebuilt as a proper component architecture.

## Stack

- **Vite** — build tooling
- **React 19**
- **Tailwind CSS v4** (CSS-first config via `@theme` in `src/index.css`)
- **Framer Motion** — scroll reveals, command palette transitions
- **Lucide React** — icons

## Structure

```
src/
  App.jsx                    Theme provider, sandbox state, nav, viewport controller
  index.css                  Tailwind import + design tokens + CRT effects
  data/content.js            Single source of truth for all copy/links
  components/
    HeroGrid.jsx              Twin CRT monitor hero (EMET terminal + identity panel)
    CommandPalette.jsx        ⌘K / Ctrl+K searchable command overlay
    ContentSections.jsx       Now / Before / Work / Why / Contact sections
    SandboxStubs.jsx          Dormant RPG / voxel / schema experiments (dev_mode)
```

## Local development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## Deployment

Deployed via `.github/workflows/deploy-portfolio.yml` on every push to
`main` that touches `portfolio/**`. The workflow builds with `npm ci &&
npm run build` and publishes `portfolio/dist` as the GitHub Pages
artifact using the official `actions/deploy-pages` action.

**One-time manual step required:** this repo's GitHub Pages is
currently configured to "Deploy from a branch" (serving the root
`index.html` directly). For this workflow to actually take over
deployment, go to **Settings → Pages → Build and deployment → Source**
and switch it to **GitHub Actions**. Until that toggle is flipped, the
old root `index.html` stays live and this workflow will build
successfully but Pages won't serve its output.

## `dev_mode`

Type `dev_mode` into the EMET terminal prompt, or run "Toggle dev_mode
· sandbox stubs" from the command palette (⌘K), to reveal three dormant
experiments that predate this rewrite: a tile-based "day in the life of
an SE" preview, a small rotating voxel warehouse canvas, and a schema
diagram. All three are wireframes/previews, not the full original
builds (Phaser RPG, 3D voxel world) — those are intentionally disabled,
not deleted, matching the same choice made in the previous version of
this site.
