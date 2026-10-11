// The same tools as an MCP server, so any MCP client (Claude Code, Cursor,
// Claude Desktop) can ask the cereal dataset questions. Runs over stdio.
//   claude mcp add cereal -- npm --prefix /path/to/analytics-assistant run -s mcp

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDatabase } from "../data/db.ts";
import { makeTools, TOOL_SPECS, type ToolName } from "./tools.ts";

const tools = makeTools(openDatabase());
const server = new McpServer({ name: "cereal-analytics", version: "0.1.0" });

for (const [name, spec] of Object.entries(TOOL_SPECS)) {
  server.tool(name, spec.description, spec.params.shape, async (args: unknown) => {
    const { ok, result } = tools.call(name as ToolName, args);
    // Logged to stderr: stdout is the MCP channel itself.
    console.error(`[tool] ${name} ${JSON.stringify(args)} -> ${ok ? "ok" : "error"}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], isError: !ok };
  });
}

await server.connect(new StdioServerTransport());
console.error("cereal-analytics MCP server ready (read-only, 5 tools)");
