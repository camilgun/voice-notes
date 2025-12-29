#!/usr/bin/env bun
import { existsSync, statSync } from "node:fs";
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

const DEFAULT_CONCURRENCY = 4;

export interface ProcessResult {
  processed: number;
  skipped: number;
  failed: string[];
}

interface TranscriptionResult {
  success: boolean;
  text?: string;
  entryId?: number;
  wasUpdated?: boolean;
  error?: string;
}

interface CliArgs {
  path: string;
  outputFile: string | null;
  concurrency: number;
  force: boolean;
}

function showHelp(): never {
  console.log(`
voice-notes - Transcribe audio with Whisper

Usage:
  bun run transcribe <file-or-folder> [options]

Options:
  -o, --output <file>       Save transcript to file (single file only)
  -c, --concurrency <n>     Parallel processing limit (default: ${DEFAULT_CONCURRENCY}, folders only)
  -f, --force               Reprocess files already in database
  -h, --help                Show this message

Supported formats: ${[...SUPPORTED_EXTENSIONS].join(", ")}

Examples:
  bun run transcribe recording.m4a
  bun run transcribe audio.mp3 -o transcript.txt
  bun run transcribe ./recordings/
  bun run transcribe ./recordings/ -c 2 -f
`);
  process.exit(0);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
  }

  const inputPath = args[0];
  if (!inputPath) {
    console.error("Error: no file or folder specified");
    process.exit(1);
  }

  const path = resolve(inputPath);
  if (!existsSync(path)) {
    console.error(`Error: path not found: ${path}`);
    process.exit(1);
  }

  const outputIndex = args.findIndex(a => a === "-o" || a === "--output");
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] ?? null : null;

  const concurrencyIndex = args.findIndex(a => a === "-c" || a === "--concurrency");
  const concurrency = concurrencyIndex !== -1
    ? parseInt(args[concurrencyIndex + 1] ?? String(DEFAULT_CONCURRENCY), 10)
    : DEFAULT_CONCURRENCY;

  const force = args.includes("-f") || args.includes("--force");

  return { path, outputFile, concurrency, force };
}

async function transcribeAndSave(
  audioPath: string,
  tools: ToolPaths
): Promise<TranscriptionResult> {
  try {
    const text = await transcribe(audioPath, tools);
    const duration = await getDuration(audioPath, tools.ffmpeg);

    const result = saveOrUpdateEntry({
      text,
      created_at: new Date().toISOString(),
      source_file: audioPath,
      duration_seconds: duration,
    });

    return {
      success: true,
      text,
      entryId: result.id,
      wasUpdated: result.wasUpdated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function processFolder(
  folderPath: string,
  tools: ToolPaths,
  concurrency: number,
  force: boolean
): Promise<ProcessResult> {
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

  const toProcess: string[] = [];
  for (const file of audioFiles) {
    const audioPath = join(absolutePath, file);
    if (!force && entryExistsAndComplete(audioPath)) {
      console.log(`[skip] ${file} (already in database)`);
      result.skipped++;
    } else {
      toProcess.push(audioPath);
    }
  }

  if (toProcess.length === 0) {
    return result;
  }

  console.log(`\nProcessing ${toProcess.length} files (concurrency: ${concurrency})...\n`);

  const totalBatches = Math.ceil(toProcess.length / concurrency);

  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const batchFiles = batch.map(p => p.split("/").pop());

    console.log(`[batch ${batchNumber}/${totalBatches}] ${batchFiles.join(", ")}`);

    const promises = batch.map(audioPath => transcribeAndSave(audioPath, tools));
    const results = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const audioPath = batch[j]!;
      const fileName = audioPath.split("/").pop()!;
      const res = results[j]!;

      if (res.success) {
        const action = res.wasUpdated ? "updated" : "created";
        console.log(`  [done] ${fileName} -> entry #${res.entryId} (${action})`);
        result.processed++;
      } else {
        console.error(`  [error] ${fileName}: ${res.error}`);
        result.failed.push(fileName);
      }
    }
  }

  return result;
}

async function main() {
  const { path, outputFile, concurrency, force } = parseArgs();

  const tools = getToolPaths();
  await checkDependencies(tools);

  const stat = statSync(path);

  try {
    if (stat.isDirectory()) {
      if (outputFile) {
        console.warn("Warning: -o/--output is ignored for folders");
      }

      const result = await processFolder(path, tools, concurrency, force);

      console.log("\n--- Summary ---");
      console.log(`Processed: ${result.processed}`);
      console.log(`Skipped:   ${result.skipped}`);
      if (result.failed.length > 0) {
        console.log(`Failed:    ${result.failed.length}`);
        result.failed.forEach(f => console.log(`  - ${f}`));
      }
    } else {
      if (!force && entryExistsAndComplete(path)) {
        console.log("File already in database. Use -f to reprocess.");
        return;
      }

      const result = await transcribeAndSave(path, tools);

      if (!result.success) {
        throw new Error(result.error);
      }

      const action = result.wasUpdated ? "updated" : "created";
      console.log(`Entry ${action} with id: ${result.entryId}`);

      if (outputFile) {
        await Bun.write(outputFile, result.text!);
        console.log(`Transcript saved to: ${outputFile}`);
      } else {
        console.log(result.text);
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
