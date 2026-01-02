import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { unlinkSync } from "node:fs";
import { createServer } from "../src/api/index";
import { resetDB, saveEntry, getDB } from "../src/core/db";
import type { Entry } from "@voice-notes/shared";
const TEST_DB_PATH = "./test_api_voice_notes.db";
const TEST_PORT = 3099;

let server: ReturnType<typeof createServer>;

beforeAll(() => {
  // Clean up any existing test DB
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // ignore
  }
  resetDB();
  process.env.DB_PATH = TEST_DB_PATH;
  getDB(); // Initialize fresh DB
  server = createServer(TEST_PORT);
});

afterAll(() => {
  server.stop();
  resetDB();
  try {
    unlinkSync(TEST_DB_PATH);
  } catch {
    // ignore
  }
});

describe("GET /api/entries", () => {
  it("returns empty array when no entries", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/entries`);

    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toContain("application/json");

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns entries from database", async () => {
    saveEntry({
      text: "Test entry",
      transcribed_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      source_file: "/test.mp3",
      duration_seconds: 60,
      file_hash: "api_test_hash",
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/entries`);
    const data = (await res.json()) as Entry[];

    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((e) => e.text === "Test entry")).toBe(true);
  });
});

describe("GET /api/entries/:id", () => {
  it("returns entry by id", async () => {
    const id = saveEntry({
      text: "Specific entry",
      transcribed_at: new Date().toISOString(),
      recorded_at: null,
      source_file: "/specific.mp3",
      duration_seconds: 30,
      file_hash: "specific_hash",
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/entries/${id}`);

    expect(res.ok).toBe(true);
    const data = (await res.json()) as Entry;
    expect(data.text).toBe("Specific entry");
    expect(data.id).toBe(id);
  });

  it("returns 404 for non-existent id", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/entries/99999`);

    expect(res.status).toBe(404);
  });
});

describe("GET /api/audio/:id", () => {
  it("returns 404 when entry does not exist", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/audio/99999`);
    expect(res.status).toBe(404);
  });

  it("returns 404 when audio file does not exist on disk", async () => {
    const id = saveEntry({
      text: "Entry with missing file",
      transcribed_at: new Date().toISOString(),
      recorded_at: null,
      source_file: "/nonexistent/audio.mp3",
      duration_seconds: 30,
      file_hash: "missing_file_hash",
    });

    const res = await fetch(`http://localhost:${TEST_PORT}/api/audio/${id}`);
    expect(res.status).toBe(404);
  });
});

describe("Unknown routes", () => {
  it("returns 404 for unknown API routes", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
