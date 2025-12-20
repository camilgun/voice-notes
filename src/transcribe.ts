#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDuration } from "./audio";
import { saveEntry } from "./db";
import { getToolPaths, checkDependencies, transcribe } from "./whisper";

interface CliArgs {
  audioPath: string;
  outputFile: string | null;
}

function showHelp(): never {
  console.log(`
voice-notes - Transcribe audio with Whisper

Usage:
  bun run src/transcribe.ts <audio-file> [options]

Options:
  -o, --output <file>   Save result to file instead of stdout
  -h, --help            Show this message

Supported formats: wav, mp3, m4a, ogg, flac, webm, mp4, mov, etc.

Examples:
  bun run src/transcribe.ts recording.m4a
  bun run src/transcribe.ts audio.mp3 -o transcript.txt
`);
  process.exit(0);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
  }

  const audioFile = args[0];
  if (!audioFile) {
    console.error("Error: no audio file specified");
    process.exit(1);
  }

  const audioPath = resolve(audioFile);
  if (!existsSync(audioPath)) {
    console.error(`Error: file not found: ${audioPath}`);
    process.exit(1);
  }

  const outputIndex = args.findIndex(a => a === "-o" || a === "--output");
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] ?? null : null;

  return { audioPath, outputFile };
}

async function main() {
  const { audioPath, outputFile } = parseArgs();

  const tools = getToolPaths();
  await checkDependencies(tools);

  try {
    const text = await transcribe(audioPath, tools);
    const duration = await getDuration(audioPath, tools.ffmpeg);

    const entryId = saveEntry({
      text,
      created_at: new Date().toISOString(),
      source_file: audioPath,
      duration_seconds: duration,
    });

    console.log(`Entry saved with id: ${entryId}`);

    if (outputFile) {
      await Bun.write(outputFile, text);
      console.log(`Transcript saved to: ${outputFile}`);
    } else {
      console.log(text);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
