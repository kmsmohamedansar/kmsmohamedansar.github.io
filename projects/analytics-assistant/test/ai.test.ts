import { afterEach, describe, expect, it } from "vitest";
import { buildDatabase } from "../src/data/seed.ts";
import { makeTools } from "../src/tools/tools.ts";
import { askAI, aiStatus, OLLAMA_TOOLS } from "../src/brains/ai.ts";
import { fakeOllama } from "./fake-ollama.ts";

const db = buildDatabase();
afterEach(() => { delete process.env.OLLAMA_MODEL; delete process.env.OLLAMA_URL; });

describe("brain B (local AI) wiring, with a stand-in for Ollama", () => {
  it("offers the model all six tools with JSON schemas", () => {
    expect(OLLAMA_TOOLS.map((t) => t.function.name)).toEqual(["find_product", "describe_metric", "get_metric", "compare_periods", "list_events", "what_changed"]);
    expect(OLLAMA_TOOLS[2].function.parameters).toMatchObject({ type: "object", required: ["metric"] });
  });

  it("runs the tools the model asks for and sends the results back", async () => {
    const { fetchImpl, sent } = fakeOllama([
      { tool_calls: [{ function: { name: "get_metric", arguments: { metric: "share", by: "brand" } } }] },
      { content: "Crunchwell had the highest share, 28.1%." },
    ]);
    const a = await askAI("Which brand had the highest share?", makeTools(db), fetchImpl);
    expect(a.text).toBe("Crunchwell had the highest share, 28.1%.");
    expect(a.calls.map((c) => c.tool)).toEqual(["get_metric"]);
    const toolMsg = sent[1].messages.at(-1);
    expect(toolMsg.role).toBe("tool");
    expect(JSON.parse(toolMsg.content).rows[0]).toEqual({ key: "Crunchwell", value: 28.1 });
    expect(a.chart?.kind).toBe("bar");
  });

  it("passes a tool's error back to the model so it can correct itself", async () => {
    const { fetchImpl, sent } = fakeOllama([
      { tool_calls: [{ function: { name: "get_metric", arguments: '{"metric":"revenue"}' } }] },
      { content: "ok" },
    ]);
    await askAI("q", makeTools(db), fetchImpl);
    expect(sent[1].messages.at(-1).content).toMatch(/Invalid enum value/);
  });

  it("stops after the round limit instead of looping forever", async () => {
    const { fetchImpl } = fakeOllama([{ tool_calls: [{ function: { name: "find_product", arguments: { query: "x" } } }] }]);
    const a = await askAI("q", makeTools(db), fetchImpl);
    expect(a.error).toMatch(/Stopped after 6 rounds/);
  });

  it("says how to fix a missing model", async () => {
    process.env.OLLAMA_MODEL = "llama3.1:8b";
    const { fetchImpl } = fakeOllama([{ content: "x" }]);
    const a = await askAI("q", makeTools(db), fetchImpl);
    expect(a.error).toMatch(/ollama pull llama3.1:8b/);
  });

  it("says how to start Ollama when it isn't running", async () => {
    process.env.OLLAMA_URL = "http://127.0.0.1:9"; // nothing listens here
    const a = await askAI("q", makeTools(db));
    expect(a.error).toMatch(/Can't reach Ollama .*\(ollama serve\)/);
    expect((await aiStatus()).reachable).toBe(false);
  });

  it("the model is a setting", async () => {
    process.env.OLLAMA_MODEL = "qwen3:4b";
    const { fetchImpl, sent } = fakeOllama([{ content: "hi" }], ["qwen3:4b"]);
    await askAI("q", makeTools(db), fetchImpl);
    expect(sent[0].model).toBe("qwen3:4b");
  });
});
