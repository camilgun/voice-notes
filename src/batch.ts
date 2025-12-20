#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, resolve, join } from "node:path";
import { getDuration } from "./audio";
import { saveEntry, entryExistsBySourceFile } from "./db";
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

  for (const file of audioFiles) {
    const audioPath = join(absolutePath, file);

    if (entryExistsBySourceFile(audioPath)) {
      console.log(`[skip] ${file} (already in database)`);
      result.skipped++;
      continue;
    }

    try {
      console.log(`[processing] ${file}...`);
      const text = await transcribe(audioPath, tools);
      const duration = await getDuration(audioPath, tools.ffmpeg);

      const entryId = saveEntry({
        text,
        created_at: new Date().toISOString(),
        source_file: audioPath,
        duration_seconds: duration,
      });

      console.log(`[done] ${file} -> entry #${entryId}`);
      result.processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${file}: ${message}`);
      result.failed.push(file);
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
