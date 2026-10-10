import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("MCP server", () => {
  it("starts over stdio, lists six tools and answers a call", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--no-warnings", "--import", "tsx", "src/tools/mcp-server.ts"],
      env: { ...process.env, DB_PATH: join(mkdtempSync(join(tmpdir(), "aa-")), "cereal.db") } as Record<string, string>,
      stderr: "ignore",
    });
    const client = new Client({ name: "test", version: "0" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["compare_periods", "describe_metric", "find_product", "get_metric", "list_events", "what_changed"]);
    const r = (await client.callTool({ name: "get_metric", arguments: { metric: "share", by: "brand" } })) as { content: { text: string }[] };
    expect(JSON.parse(r.content[0].text).rows[0].key).toBe("Crunchwell");
    const bad = (await client.callTool({ name: "get_metric", arguments: { metric: "nope" } })) as { isError?: boolean };
    expect(bad.isError).toBe(true);
    await client.close();
  }, 30000);
});
