#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync } from "node:fs";
import { extname, resolve, join } from "node:path";
import { convertToWav, getDuration } from "./audio";
import { saveEntry } from "./db";

interface ToolPaths {
  whisperCli: string;
  whisperModel: string;
  ffmpeg: string;
}

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(process.env.HOME!, path.slice(2));
  }
  return path;
}

function getToolPaths(): ToolPaths {
  const errors: string[] = [];

  if (!process.env.WHISPER_CLI) {
    errors.push("WHISPER_CLI environment variable is not set");
  }
  if (!process.env.WHISPER_MODEL) {
    errors.push("WHISPER_MODEL environment variable is not set");
  }
  if (!process.env.FFMPEG) {
    errors.push("FFMPEG environment variable is not set");
  }

  if (errors.length > 0) {
    console.error("❌ Missing environment variables:\n  - " + errors.join("\n  - "));
    console.error("\nMake sure you have a .env file with WHISPER_CLI, WHISPER_MODEL, and FFMPEG set.");
    process.exit(1);
  }

  return {
    whisperCli: expandPath(process.env.WHISPER_CLI!),
    whisperModel: expandPath(process.env.WHISPER_MODEL!),
    ffmpeg: expandPath(process.env.FFMPEG!),
  };
}

async function checkDependencies(tools: ToolPaths): Promise<void> {
  const errors: string[] = [];

  if (!existsSync(tools.whisperCli)) {
    errors.push(`whisper-cli not found at: ${tools.whisperCli}`);
  } else {
    try {
      await $`${tools.whisperCli} --help`.quiet();
    } catch {
      errors.push(`whisper-cli exists but failed to execute: ${tools.whisperCli}`);
    }
  }

  if (!existsSync(tools.whisperModel)) {
    errors.push(`Whisper model not found at: ${tools.whisperModel}`);
  }

  if (!existsSync(tools.ffmpeg)) {
    errors.push(`ffmpeg not found at: ${tools.ffmpeg}`);
  } else {
    try {
      await $`${tools.ffmpeg} -version`.quiet();
    } catch {
      errors.push(`ffmpeg exists but failed to execute: ${tools.ffmpeg}`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Missing dependencies:\n  - " + errors.join("\n  - "));
    console.error("\nPlease install the missing dependencies and update your .env file.");
    process.exit(1);
  }
}

async function transcribe(audioPath: string, tools: ToolPaths): Promise<string> {
  // Convert to WAV if needed
  let wavPath = audioPath;
  const ext = extname(audioPath).toLowerCase();
  const needsConversion = ext !== ".wav";

  if (needsConversion) {
    wavPath = await convertToWav(audioPath, tools.ffmpeg);
  }

  try {
    // Run whisper-cli (stderr has logs, stdout has text)
    const result = await $`${tools.whisperCli} -m ${tools.whisperModel} -f ${wavPath} --no-timestamps -l auto 2>/dev/null`.text();

    return result.trim();
  } finally {
    // Cleanup temp file
    if (needsConversion && existsSync(wavPath)) {
      await Bun.file(wavPath).delete();
    }
  }
}

interface CliArgs {
  audioPath: string;        // path assoluto, già validato
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

  // Required: audio file
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

  // Optional: output file
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

    console.error(`Entry saved with id: ${entryId}`);

    if (outputFile) {
      await Bun.write(outputFile, text);
      console.error(`Transcript saved to: ${outputFile}`);
    } else {
      console.log(text);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
