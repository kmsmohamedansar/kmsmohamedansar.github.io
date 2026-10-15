# kmsmohamedansar.github.io

Live portfolio for **Mohamed Ansar** — Solutions Engineer building data systems, pipelines, and shipped native apps.

**Live site:** [kmsmohamedansar.github.io](https://kmsmohamedansar.github.io), https://ansarbuilds.dev/

For the full project index, live demos, and how to reach out about private repos, see my [GitHub profile](https://github.com/kmsmohamedansar).

## What's in this repo

```
portfolio/            React + Vite + Tailwind site, deployed to GitHub Pages
projects/
  forex/              AUD/USD trading analysis (Python)
  f1-telemetry/       F1 session/car telemetry pipeline (Python)
.github/workflows/    CI/CD for portfolio deployment
```

Other projects live in their own repositories:

- [analytics-assistant](https://github.com/kmsmohamedansar/analytics-assistant)
- [catalogue-checker](https://github.com/kmsmohamedansar/catalogue-checker)
- [data-delivery](https://github.com/kmsmohamedansar/data-delivery)
- [integration-in-a-box](https://github.com/kmsmohamedansar/integration-in-a-box)
- [sitescout](https://github.com/kmsmohamedansar/sitescout)
- [mcp-analytics-stub](https://github.com/kmsmohamedansar/mcp-analytics-stub)
- [mv3-sidepanel-starter](https://github.com/kmsmohamedansar/mv3-sidepanel-starter)

RepTrack and Cerebra now live in their own repositories — reach out if you'd like access.

## How it's built

The portfolio site auto-deploys to GitHub Pages on every push to `main` that touches `portfolio/**`, via `.github/workflows/deploy-portfolio.yml` using `npm run build`.
