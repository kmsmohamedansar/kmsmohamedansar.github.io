import { openDatabase } from "../data/db.ts";
import { buildApp } from "./app.ts";
import { aiConfig } from "../brains/ai.ts";

const port = Number(process.env.PORT ?? 4300);
const app = buildApp(openDatabase());
await app.listen({ port, host: process.env.HOST ?? "127.0.0.1" });
console.log(`Analytics assistant on http://localhost:${port}  (AI brain: ${aiConfig().model} via ${aiConfig().url})`);
