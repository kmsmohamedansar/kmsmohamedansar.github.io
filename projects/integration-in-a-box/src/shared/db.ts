import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Open a SQLite database file (or ":memory:" for tests). SQLite is just a file, no server. */
export function openDb(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}

export const now = () => new Date().toISOString();

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}
