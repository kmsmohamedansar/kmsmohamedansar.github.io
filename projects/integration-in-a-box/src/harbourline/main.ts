import { createHarbourline } from "./app.ts";

const port = Number(process.env.PORT ?? 4001);
const app = createHarbourline({ dbPath: process.env.DB_PATH ?? "data/harbourline.db", logger: true });
await app.listen({ port, host: "0.0.0.0" });
