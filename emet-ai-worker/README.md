# Emet portfolio AI

This Cloudflare Worker gives the Emet companion a real hosted language model without exposing credentials in the portfolio frontend. It uses the Workers AI binding, a free-plan-compatible model, a six-requests-per-minute session limit and a fixed set of verified portfolio facts.

## Local setup

1. Create or sign in to a Cloudflare account.
2. Run `npm install` in this directory.
3. Run `npx wrangler login`.
4. Run `npm run dev` to start the Worker.
5. Copy `portfolio/.env.example` to `portfolio/.env.local` and set `VITE_EMET_AI_URL` to the local Worker's `/chat` URL.
6. Restart the Vite portfolio server.

Without `VITE_EMET_AI_URL`, the chat interface deliberately uses a small built-in portfolio guide. It does not pretend that fallback text came from the model.

## Deploy later

Run `npm run deploy`, then set `VITE_EMET_AI_URL` in the portfolio build environment to the deployed Worker's `/chat` URL. Merging the frontend before configuring that value is safe because the built-in fallback remains available.

The Worker accepts requests only from origins listed in `wrangler.jsonc`. Add any preview domain before testing a hosted preview. Do not put Cloudflare API tokens or other model credentials in the Vite environment; `VITE_*` values are public by design.

## Safety boundaries

- Questions are limited to 280 characters.
- Answers are capped and prompted to remain under 70 words.
- The model receives curated portfolio facts, not private data or a database.
- The session rate limiter is approximate and protects the free allocation from ordinary abuse.
- Model errors return a generic response and the browser falls back to deterministic guidance.
