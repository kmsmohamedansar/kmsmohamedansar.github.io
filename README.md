# kmsmohamedansar.github.io

Personal site and a small workspace of side projects.

**Live site:** [kmsmohamedansar.github.io](https://kmsmohamedansar.github.io)

> The repo name has to stay exactly `kmsmohamedansar.github.io` — that's
> what makes GitHub Pages serve it as a user site.

## Structure

```
portfolio/     The live site — React + Vite + Tailwind. See portfolio/README.md.
projects/      Side projects, kept here but out of the way of the site:
  flowdesk/      Cerebra — a native macOS smart-canvas app (SwiftUI + SwiftData)
  reptrack/      RepTrack — a native iOS workout tracker, shipped to the App Store
  forex/         Python scripts: AUD/USD backtests, news sentiment, a static dashboard
  f1-telemetry/  Python scripts: pull F1 session and car telemetry data
.github/workflows/  CI: builds and deploys portfolio/ to GitHub Pages
```

Each project folder has its own README with more detail.

## Deployment

`.github/workflows/deploy-portfolio.yml` builds `portfolio/` with
`npm ci && npm run build` and publishes `portfolio/dist` to GitHub Pages
via `actions/deploy-pages`, on every push to `main` that touches
`portfolio/**`.
