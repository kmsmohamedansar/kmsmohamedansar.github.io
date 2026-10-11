import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildDatabase } from "./seed.ts";

/** Open the dataset read-only, building the file first if it isn't there yet. */
export function openDatabase(path = process.env.DB_PATH ?? "data/cereal.db"): DatabaseSync {
  if (path === ":memory:") return buildDatabase();
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    buildDatabase(path).close();
  }
  return new DatabaseSync(path, { readOnly: true });
}
