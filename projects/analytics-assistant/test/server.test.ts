import { describe, expect, it } from "vitest";
import { buildDatabase } from "../src/data/seed.ts";
import { buildApp } from "../src/server/app.ts";
import { fakeOllama } from "./fake-ollama.ts";

describe("web server", () => {
  const { fetchImpl } = fakeOllama([{ content: "Crunchwell." }]);
  const app = buildApp(buildDatabase(), { webDir: "/nonexistent", fetchImpl });

  it("answers with brain A", async () => {
    const r = await app.inject({ method: "POST", url: "/api/ask", payload: { question: "Which region sells the most cereal?", brain: "rules" } });
    expect(r.json()).toMatchObject({ brain: "rules", text: expect.stringContaining("South") });
  });

  it("answers with brain B", async () => {
    const r = await app.inject({ method: "POST", url: "/api/ask", payload: { question: "Which brand?", brain: "ai" } });
    expect(r.json()).toMatchObject({ brain: "ai", text: "Crunchwell.", model: "qwen2.5:7b" });
  });

  it("refuses an empty question", async () => {
    const r = await app.inject({ method: "POST", url: "/api/ask", payload: { question: "  " } });
    expect(r.statusCode).toBe(400);
  });

  it("reports whether the local model is ready", async () => {
    const r = await app.inject({ url: "/api/status" });
    expect(r.json().ai).toMatchObject({ reachable: true, pulled: true });
  });
});
