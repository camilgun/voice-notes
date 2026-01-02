import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { unlinkSync } from "node:fs";
import {
  getDB,
  resetDB,
  saveEntry,
  saveOrUpdateEntry,
  getEntries,
  getEntryById,
  entryExistsAndComplete,
  getSourcePath,
  updateSourcePath,
} from "../src/core/db";
import type { NewEntry } from "@voice-notes/shared";

const TEST_DB_PATH = "./test_voice_notes.db";

function makeEntry(overrides: Partial<NewEntry> = {}): NewEntry {
  return {
    text: "Test transcription",
    transcribed_at: new Date().toISOString(),
    recorded_at: new Date().toISOString(),
    source_file: "/path/to/audio.mp3",
    duration_seconds: 120,
    file_hash: `hash_${Date.now()}_${Math.random()}`,
    ...overrides,
  };
}

// Set DB_PATH BEFORE any test runs - this is critical!
beforeAll(() => {
  process.env.DB_PATH = TEST_DB_PATH;
  // Clean up any existing test DB
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // ignore
  }
});

beforeEach(() => {
  // Reset DB connection to get fresh state for each test
  resetDB();
});

afterAll(() => {
  resetDB();
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // ignore if file doesn't exist
  }
});

describe("saveEntry + getEntryById", () => {
  it("saves entry and retrieves it by id", () => {
    const entry = makeEntry({ text: "Hello world" });
    const id = saveEntry(entry);

    const retrieved = getEntryById(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.text).toBe("Hello world");
    expect(retrieved!.source_file).toBe("/path/to/audio.mp3");
  });

  it("returns null for non-existent id", () => {
    getDB(); // ensure DB is initialized
    const retrieved = getEntryById(99999);
    expect(retrieved).toBeNull();
  });
});

describe("saveOrUpdateEntry (upsert)", () => {
  it("creates new entry when hash does not exist", () => {
    const entry = makeEntry({ file_hash: "unique_hash_1" });
    const result = saveOrUpdateEntry(entry);

    expect(result.wasUpdated).toBe(false);
    expect(result.id).toBeGreaterThan(0);
  });

  it("updates existing entry when hash exists", () => {
    const hash = "duplicate_hash";
    const entry1 = makeEntry({ text: "Original", file_hash: hash });
    const result1 = saveOrUpdateEntry(entry1);

    const entry2 = makeEntry({ text: "Updated", file_hash: hash });
    const result2 = saveOrUpdateEntry(entry2);

    expect(result2.wasUpdated).toBe(true);
    expect(result2.id).toBe(result1.id);

    const retrieved = getEntryById(result2.id);
    expect(retrieved!.text).toBe("Updated");
  });
});

describe("getEntries", () => {
  it("returns entries ordered by recorded_at DESC", () => {
    const old = makeEntry({
      recorded_at: "2024-01-01T00:00:00Z",
      file_hash: "old_hash",
    });
    const recent = makeEntry({
      recorded_at: "2024-06-01T00:00:00Z",
      file_hash: "recent_hash",
    });

    saveEntry(old);
    saveEntry(recent);

    const entries = getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    const recentIndex = entries.findIndex((e) => e.file_hash === "recent_hash");
    const oldIndex = entries.findIndex((e) => e.file_hash === "old_hash");
    expect(recentIndex).toBeLessThan(oldIndex);
  });
});

describe("entryExistsAndComplete", () => {
  it("returns true when entry exists with non-empty text", () => {
    const entry = makeEntry({ text: "Some text", file_hash: "complete_hash" });
    saveEntry(entry);

    expect(entryExistsAndComplete("complete_hash")).toBe(true);
  });

  it("returns false when entry has empty text", () => {
    const entry = makeEntry({ text: "", file_hash: "empty_hash" });
    saveEntry(entry);

    expect(entryExistsAndComplete("empty_hash")).toBe(false);
  });

  it("returns false when hash does not exist", () => {
    getDB();
    expect(entryExistsAndComplete("nonexistent_hash")).toBe(false);
  });
});

describe("getSourcePath + updateSourcePath", () => {
  it("gets source path by hash", () => {
    const entry = makeEntry({
      source_file: "/original/path.mp3",
      file_hash: "path_hash",
    });
    saveEntry(entry);

    expect(getSourcePath("path_hash")).toBe("/original/path.mp3");
  });

  it("updates source path", () => {
    const entry = makeEntry({
      source_file: "/old/path.mp3",
      file_hash: "update_path_hash",
    });
    saveEntry(entry);

    const updated = updateSourcePath("update_path_hash", "/new/path.mp3");
    expect(updated).toBe(true);
    expect(getSourcePath("update_path_hash")).toBe("/new/path.mp3");
  });

  it("returns false when path unchanged", () => {
    const entry = makeEntry({
      source_file: "/same/path.mp3",
      file_hash: "same_path_hash",
    });
    saveEntry(entry);

    const updated = updateSourcePath("same_path_hash", "/same/path.mp3");
    expect(updated).toBe(false);
  });
});
