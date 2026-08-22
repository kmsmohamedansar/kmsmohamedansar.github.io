# kmsmohamedansar.github.io

Full-stack engineer building native apps, data tools, and web experiences.

**Live portfolio:** [kmsmohamedansar.github.io](https://kmsmohamedansar.github.io)

## Highlights

- **RepTrack** — iOS workout tracker shipped to the App Store. SwiftUI + SwiftData for a smooth native experience.
- **Cerebra** — native macOS canvas app for sketching and thinking. Built with SwiftUI, infinite board with shapes, connectors, and freehand strokes.
- **Forex tools** — Python backtesting and sentiment analysis on real tick data with scheduled news events.
- **F1 telemetry** — Python data pipeline pulling live F1 session and car telemetry from FastF1 and OpenF1 APIs.
- **Portfolio site** — React + Vite + Tailwind personal site deployed to GitHub Pages.

## Repository Structure

```
portfolio/           React + Vite site, deployed to GitHub Pages
projects/
  reptrack/          iOS app (App Store)
  flowdesk/          macOS canvas app (Cerebra)
  forex/             AUD/USD trading analysis
  f1-telemetry/      Formula 1 data pulling
.github/workflows/   CI/CD for portfolio deployment
```

Each project folder has its own README with setup and usage details.

## How It's Built

The portfolio site auto-deploys to GitHub Pages on every push to `main` that touches `portfolio/**`, via `.github/workflows/deploy-portfolio.yml` using `npm run build`.
