import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type DbConnection = Database.Database;

export const createConnection = (dataDir: string): DbConnection => {
  fs.mkdirSync(dataDir, { recursive: true });
  const connection = new Database(path.join(dataDir, "ielts-diary.sqlite"));
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.pragma("busy_timeout = 5000");
  return connection;
};
