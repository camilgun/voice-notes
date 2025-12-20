#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, resolve, join } from "node:path";
import { getDuration } from "./audio";
import { saveOrUpdateEntry, entryExistsAndComplete } from "./db";
import { getToolPaths, checkDependencies, transcribe } from "./whisper";
import type { ToolPaths } from "./whisper";

const SUPPORTED_EXTENSIONS = new Set([
  ".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4", ".mov", ".aac"
]);

function isAudioFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export interface ProcessResult {
  processed: number;
  skipped: number;
  failed: string[];
}

const CONCURRENCY = 4; // Match whisper-server -p value

interface FileTask {
  file: string;
  audioPath: string;
}

async function processFile(
  task: FileTask,
  tools: ToolPaths
): Promise<{ success: boolean; entryId?: number; updated?: boolean; error?: string }> {
  try {
    const text = await transcribe(task.audioPath, tools);
    const duration = await getDuration(task.audioPath, tools.ffmpeg);

    const result = saveOrUpdateEntry({
      text,
      created_at: new Date().toISOString(),
      source_file: task.audioPath,
      duration_seconds: duration,
    });

    return { success: true, entryId: result.id, updated: result.wasUpdated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function processFolder(folderPath: string, tools: ToolPaths): Promise<ProcessResult> {
  const absolutePath = resolve(folderPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Folder not found: ${absolutePath}`);
  }

  const files = await readdir(absolutePath);
  const audioFiles = files.filter(isAudioFile);

  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    failed: [],
  };

  // Filter out already processed files
  const toProcess: FileTask[] = [];
  for (const file of audioFiles) {
    const audioPath = join(absolutePath, file);
    if (entryExistsAndComplete(audioPath)) {
      console.log(`[skip] ${file} (already in database)`);
      result.skipped++;
    } else {
      toProcess.push({ file, audioPath });
    }
  }

  if (toProcess.length === 0) {
    return result;
  }

  console.log(`\nProcessing ${toProcess.length} files (concurrency: ${CONCURRENCY})...\n`);

  // Process in batches of CONCURRENCY
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);

    console.log(`[batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(toProcess.length / CONCURRENCY)}] ${batch.map(t => t.file).join(", ")}`);

    const promises = batch.map(task => processFile(task, tools));
    const results = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const task = batch[j]!;
      const res = results[j]!;

      if (res.success) {
        const action = res.updated ? "updated" : "created";
        console.log(`  [done] ${task.file} -> entry #${res.entryId} (${action})`);
        result.processed++;
      } else {
        console.error(`  [error] ${task.file}: ${res.error}`);
        result.failed.push(task.file);
      }
    }
  }

  return result;
}

function showHelp(): never {
  console.log(`
voice-notes batch - Process all audio files in a folder

Usage:
  bun run src/batch.ts <folder>

Options:
  -h, --help    Show this message

Supported formats: ${[...SUPPORTED_EXTENSIONS].join(", ")}

Files already in the database will be skipped (no duplicates).
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
  }

  const folderPath = args[0];
  if (!folderPath) {
    console.error("Error: no folder specified");
    process.exit(1);
  }

  const tools = getToolPaths();
  await checkDependencies(tools);

  try {
    const result = await processFolder(folderPath, tools);

    console.log("\n--- Summary ---");
    console.log(`Processed: ${result.processed}`);
    console.log(`Skipped:   ${result.skipped}`);
    if (result.failed.length > 0) {
      console.log(`Failed:    ${result.failed.length}`);
      result.failed.forEach(f => console.log(`  - ${f}`));
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
