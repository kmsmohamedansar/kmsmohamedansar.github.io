# kmsmohamedansar.github.io

Live portfolio for **Mohamed Ansar** — Solutions Engineer building data systems, pipelines, and shipped native apps.

**Live site:** [kmsmohamedansar.github.io](https://kmsmohamedansar.github.io)

For the full project index, live demos, and how to reach out about private repos, see my [GitHub profile](https://github.com/kmsmohamedansar).

## What's in this repo

```
portfolio/            React + Vite + Tailwind site, deployed to GitHub Pages
projects/
  forex/               AUD/USD trading analysis (Python)
  f1-telemetry/         F1 session/car telemetry pipeline (Python)
.github/workflows/     CI/CD for portfolio deployment
```

RepTrack and Cerebra now live in their own repositories — reach out if you'd like access.

## How it's built

The portfolio site auto-deploys to GitHub Pages on every push to `main` that touches `portfolio/**`, via `.github/workflows/deploy-portfolio.yml` using `npm run build`.
