import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getInsights, resolveCategory } from "./data.js";

const server = new McpServer({ name: "mcp-analytics-stub", version: "0.1.0" });

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

// Resolver tool: turn a human name into a stable identifier.
server.tool(
  "resolve_category",
  "Find categories whose name contains the query. Returns ids to use with other tools.",
  { query: z.string().min(1).describe("Part of a category name") },
  async ({ query }) => asText({ matches: resolveCategory(query) }),
);

// Context tool: given an identifier, return structured insight rows.
server.tool(
  "get_insights",
  "Return top insights for a category id from resolve_category.",
  {
    category_id: z.string().describe("An id returned by resolve_category"),
    limit: z.number().int().min(1).max(10).default(3),
  },
  async ({ category_id, limit }) => {
    const insights = getInsights(category_id, limit);
    if (!insights) {
      return { ...asText({ error: `Unknown category_id: ${category_id}` }), isError: true };
    }
    return asText({ category_id, insights });
  },
);

await server.connect(new StdioServerTransport());
