#!/usr/bin/env bun
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { entryExistsAndComplete } from "./db";
import { checkDependencies, getToolPaths } from "./config/tools";
import { processFolder, transcribeAndSave, SUPPORTED_EXTENSIONS } from "./services/transcription";

const DEFAULT_CONCURRENCY = 4;

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
