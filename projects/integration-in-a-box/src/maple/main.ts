import { createMaple } from "./app.ts";

const port = Number(process.env.PORT ?? 4002);
const app = createMaple({ dbPath: process.env.DB_PATH ?? "data/maple.db", logger: true });
await app.listen({ port, host: "0.0.0.0" });
