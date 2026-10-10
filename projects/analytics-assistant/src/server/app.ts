// The web server: answers questions with either brain and serves the screen.

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { makeTools } from "../tools/tools.ts";
import { askRules } from "../brains/rules.ts";
import { askAI, aiStatus } from "../brains/ai.ts";
import { METRICS } from "../data/metrics.ts";
import { PLANTED } from "../data/seed.ts";

export function buildApp(db: DatabaseSync, opts: { webDir?: string; resultsDir?: string; fetchImpl?: typeof fetch } = {}) {
  const app = Fastify({ logger: false });

  app.post<{ Body: { question?: string; brain?: string } }>("/api/ask", async (req, reply) => {
    const question = String(req.body?.question ?? "").trim().slice(0, 500);
    if (!question) return reply.code(400).send({ error: "Ask a question." });
    const tools = makeTools(db);
    const answer = req.body?.brain === "ai" ? await askAI(question, tools, opts.fetchImpl) : await askRules(question, tools);
    return { question, ...answer };
  });

  app.get("/api/status", async () => ({ ai: await aiStatus(opts.fetchImpl), metrics: METRICS }));

  // The test results, for the Results tab. Only files the eval wrote.
  app.get("/api/results", async () => {
    const dir = opts.resultsDir ?? "eval/results";
    if (!existsSync(dir)) return { runs: [] };
    const runs = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
    return { runs };
  });

  app.get("/api/about", async () => ({ planted: Object.values(PLANTED).map((p) => p.text) }));

  const web = resolve(opts.webDir ?? "web/dist");
  if (existsSync(web)) app.register(fastifyStatic, { root: web });
  return app;
}
