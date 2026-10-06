# mcp-analytics-stub

A minimal [Model Context Protocol](https://modelcontextprotocol.io) server in TypeScript. It exposes two tools over stdio and returns **synthetic data only**. It exists to show the shape of an MCP server that wraps an analytics API, without wrapping a real one.

## Tools

| Tool | Kind | What it does |
|------|------|--------------|
| `resolve_category` | resolver | Turns a name fragment into stable category ids. |
| `get_insights` | context | Given an id, returns a few insight rows. Unknown ids return an error result. |

## Shape

```
MCP client (IDE agent)
   │  JSON-RPC over stdio
   ▼
MCP server  ── zod validation ──▶ resolver / context handlers ──▶ data layer
```

In a real server the data layer would be an HTTPS client, with credentials read from environment variables. Here it is an in-memory list.

## Why these two tool kinds

- **Resolvers** map human names to ids, so the agent never has to guess an identifier.
- **Context tools** take an id and return structured data, so answers come from a call rather than from pasted text.
- Inputs are schema-validated, so a malformed call fails loudly.
- Tool descriptions matter: they are what an agent reads when choosing a tool.

## Run it

```bash
npm install
npm test
npm run dev        # stdio server
```

To use it from an MCP-capable editor, point it at `npx tsx src/server.ts` (or `node dist/server.js` after `npm run build`) as a stdio server.

## From local to shared

The same handlers can sit behind a stateless HTTP transport in a container for team use. This stub keeps stdio only, to stay small.

## License

MIT. All data is invented.
