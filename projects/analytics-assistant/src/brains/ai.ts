// Brain B: a local AI model, run by Ollama on this computer (free, offline).
// It gets the question and the tool list, decides which tools to call, reads
// the results and writes the answer. The model is a setting:
//   OLLAMA_MODEL=qwen2.5:7b  (default)   OLLAMA_URL=http://localhost:11434

import { zodToJsonSchema } from "zod-to-json-schema";
import { TOOL_SPECS, type Tools } from "../tools/tools.ts";
import { chartFromCalls, type Answer } from "./types.ts";

export const aiConfig = () => ({
  url: (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, ""),
  model: process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
  maxRounds: Number(process.env.AI_MAX_ROUNDS ?? 6),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 180_000),
});

export const OLLAMA_TOOLS = Object.entries(TOOL_SPECS).map(([name, spec]) => {
  const { $schema, ...parameters } = zodToJsonSchema(spec.params, { target: "openApi3" }) as Record<string, unknown>;
  return { type: "function", function: { name, description: spec.description, parameters } };
});

export function systemPrompt(tools: Tools) {
  return [
    "You answer questions about weekly breakfast cereal sales at Fernhill Market, a grocer. The data covers weeks 1 to 52 of 2025.",
    "Q1 is weeks 1-13, Q2 weeks 14-26, Q3 weeks 27-39, Q4 weeks 40-52. First half is weeks 1-26, second half 27-52.",
    `Brands: ${tools.brands.join(", ")}. Fernhill is the store's own brand. Subcategories: ${tools.subcats.join(", ")}. Regions: North, South, East, West.`,
    "Always get numbers from the tools. Never guess or invent a number. If a name is unclear, call find_product first.",
    // v2: rules for the two failure types seen in the first real run (wrong weeks, wrong measure).
    "Weeks: 'before and after week N' or 'after week N' means weeks 1 to N-1 versus weeks N to 52. 'Last N weeks' means weeks 53-N to 52.",
    "Never guess when something happened. For promotions, price rises, launches or anything that stopped selling, call list_events first and use its weeks.",
    "For how much a promotion lifted sales, use get_metric with metric promo_lift (it already compares promotion weeks with the others).",
    "Pick the measure the question names: packs or units means units; price means avg_price; share means share; money, sales or revenue means sales.",
    "For a trend, call get_metric with by week and report the first and last week's values.",
    "Answer for the whole brand or category unless the question names a region, product or subcategory. Don't split by region or product unless asked.",
    "Sales are in dollars. When you compare two periods, use compare_periods, which already works per week.",
    "Answer in one to three plain sentences. Include the names and numbers that answer the question, with units.",
  ].join("\n");
}

type Msg = { role: string; content: string; tool_calls?: { function: { name: string; arguments: unknown } }[]; tool_name?: string };

export async function askAI(question: string, tools: Tools, fetchImpl: typeof fetch = fetch): Promise<Answer> {
  const cfg = aiConfig();
  const t0 = performance.now();
  const messages: Msg[] = [
    { role: "system", content: systemPrompt(tools) },
    { role: "user", content: question },
  ];
  const done = (text: string, error?: string): Answer => ({
    brain: "ai", text, error, model: cfg.model, chart: chartFromCalls(tools.log), calls: tools.log, ms: Math.round(performance.now() - t0),
  });

  try {
    for (let round = 0; round < cfg.maxRounds; round++) {
      const res = await fetchImpl(`${cfg.url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: cfg.model, messages, tools: OLLAMA_TOOLS, stream: false, options: { temperature: 0 } }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!res.ok) {
        const body = await res.text();
        const hint = res.status === 404 ? ` Run: ollama pull ${cfg.model}` : "";
        return done("", `Ollama answered ${res.status}: ${body.slice(0, 200)}.${hint}`);
      }
      const data = (await res.json()) as { message: Msg };
      const msg = data.message;
      messages.push(msg);
      if (!msg.tool_calls?.length) return done(msg.content.trim());
      for (const tc of msg.tool_calls) {
        let args = tc.function.arguments;
        if (typeof args === "string") { try { args = JSON.parse(args); } catch { /* the tool reports bad arguments */ } }
        const { result } = tools.call(tc.function.name, args);
        messages.push({ role: "tool", tool_name: tc.function.name, content: JSON.stringify(result) });
      }
    }
    return done("", `Stopped after ${cfg.maxRounds} rounds of tool calls without a final answer.`);
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    if (err.cause?.code === "ECONNREFUSED" || /fetch failed/.test(err.message)) {
      return done("", `Can't reach Ollama at ${cfg.url}. Start it (ollama serve) and pull the model (ollama pull ${cfg.model}).`);
    }
    if (err.name === "TimeoutError") return done("", `The model took longer than ${cfg.timeoutMs / 1000}s.`);
    return done("", err.message);
  }
}

export async function aiStatus(fetchImpl: typeof fetch = fetch) {
  const cfg = aiConfig();
  try {
    const res = await fetchImpl(`${cfg.url}/api/tags`, { signal: AbortSignal.timeout(2000) });
    const tags = (await res.json()) as { models?: { name: string }[] };
    const names = (tags.models ?? []).map((m) => m.name);
    const has = names.some((n) => n === cfg.model || n === `${cfg.model}:latest`);
    return { reachable: true, model: cfg.model, pulled: has, url: cfg.url };
  } catch {
    return { reachable: false, model: cfg.model, pulled: false, url: cfg.url };
  }
}
