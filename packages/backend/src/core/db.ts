import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import type { Entry, NewEntry } from "@voice-notes/shared";

let db: Database | null = null;

/**
 * Reset database connection. Only for testing.
 */
export function resetDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDB(): Database {
  if (!db) {
    const dbPath = resolve(process.env.DB_PATH || "./voice_notes.db");
    db = new Database(dbPath);

    // Create base schema if table doesn't exist (fresh database)
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        transcribed_at TEXT NOT NULL,
        recorded_at TEXT,
        source_file TEXT NOT NULL,
        duration_seconds REAL,
        file_hash TEXT
      )
    `);
  }
  return db;
}

export function saveEntry(entry: NewEntry): number {
  const database = getDB();
  const stmt = database.prepare(`
    INSERT INTO entries (text, transcribed_at, recorded_at, source_file, duration_seconds, file_hash)
    VALUES ($text, $transcribed_at, $recorded_at, $source_file, $duration_seconds, $file_hash)
  `);
  const result = stmt.run({
    $text: entry.text,
    $transcribed_at: entry.transcribed_at,
    $recorded_at: entry.recorded_at,
    $source_file: entry.source_file,
    $duration_seconds: entry.duration_seconds,
    $file_hash: entry.file_hash,
  });
  return Number(result.lastInsertRowid);
}

/**
 * Save or update an entry based on file_hash.
 * If an entry with the same file_hash exists, update it.
 * Otherwise, create a new entry.
 * This prevents duplicate entries for the same audio file content.
 */
export function saveOrUpdateEntry(entry: NewEntry): {
  id: number;
  wasUpdated: boolean;
} {
  const database = getDB();

  const existing = database
    .query("SELECT id FROM entries WHERE file_hash = $file_hash LIMIT 1")
    .get({ $file_hash: entry.file_hash }) as { id: number } | null;

  if (existing) {
    database
      .prepare(
        `
      UPDATE entries
      SET text = $text, transcribed_at = $transcribed_at, recorded_at = $recorded_at, duration_seconds = $duration_seconds, source_file = $source_file
      WHERE id = $id
    `,
      )
      .run({
        $id: existing.id,
        $text: entry.text,
        $transcribed_at: entry.transcribed_at,
        $recorded_at: entry.recorded_at,
        $duration_seconds: entry.duration_seconds,
        $source_file: entry.source_file,
      });
    return { id: existing.id, wasUpdated: true };
  }

  const id = saveEntry(entry);
  return { id, wasUpdated: false };
}

export function getEntries(): Entry[] {
  const database = getDB();
  return database
    .query(
      "SELECT * FROM entries ORDER BY recorded_at DESC, transcribed_at DESC",
    )
    .all() as Entry[];
}

export function getEntryById(id: number): Entry | null {
  const database = getDB();
  return database
    .query("SELECT * FROM entries WHERE id = $id")
    .get({ $id: id }) as Entry | null;
}

export function entryExistsAndComplete(fileHash: string): boolean {
  const database = getDB();
  const result = database
    .query(
      "SELECT 1 FROM entries WHERE file_hash = $file_hash AND text != '' LIMIT 1",
    )
    .get({ $file_hash: fileHash });
  return result !== null;
}

/**
 * Get the source_file path for an entry by file_hash.
 * Returns null if no entry exists.
 */
export function getSourcePath(fileHash: string): string | null {
  const database = getDB();
  const result = database
    .query(
      "SELECT source_file FROM entries WHERE file_hash = $file_hash LIMIT 1",
    )
    .get({ $file_hash: fileHash }) as { source_file: string } | null;
  return result?.source_file ?? null;
}

/**
 * Update the source_file path for an entry identified by file_hash.
 * Returns true if the path was updated, false if entry not found or path unchanged.
 */
export function updateSourcePath(fileHash: string, newPath: string): boolean {
  const database = getDB();
  const currentPath = getSourcePath(fileHash);

  if (currentPath === null || currentPath === newPath) {
    return false;
  }

  database
    .prepare(
      "UPDATE entries SET source_file = $source_file WHERE file_hash = $file_hash",
    )
    .run({ $source_file: newPath, $file_hash: fileHash });

  return true;
}
