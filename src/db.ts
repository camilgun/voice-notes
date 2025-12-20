import { Database } from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(import.meta.dir, "..", "voice_notes.db");

export interface Entry {
  id: number;
  text: string;
  created_at: string;
  source_file: string;
  duration_seconds: number | null;
}

export type NewEntry = Omit<Entry, "id">;

let db: Database | null = null;

export function getDB(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        source_file TEXT NOT NULL,
        duration_seconds REAL
      )
    `);
  }
  return db;
}

export function saveEntry(entry: NewEntry): number {
  const database = getDB();
  const stmt = database.prepare(`
    INSERT INTO entries (text, created_at, source_file, duration_seconds)
    VALUES ($text, $created_at, $source_file, $duration_seconds)
  `);
  const result = stmt.run({
    $text: entry.text,
    $created_at: entry.created_at,
    $source_file: entry.source_file,
    $duration_seconds: entry.duration_seconds,
  });
  return Number(result.lastInsertRowid);
}

export function getEntries(): Entry[] {
  const database = getDB();
  return database.query("SELECT * FROM entries ORDER BY created_at DESC").all() as Entry[];
}

export function getEntryById(id: number): Entry | null {
  const database = getDB();
  return database.query("SELECT * FROM entries WHERE id = $id").get({ $id: id }) as Entry | null;
}
