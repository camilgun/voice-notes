#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, resolve } from "node:path";

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(process.env.HOME!, path.slice(2));
  }
  return path;
}

function getConfig() {
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
    WHISPER_CLI: expandPath(process.env.WHISPER_CLI!),
    MODEL_PATH: expandPath(process.env.WHISPER_MODEL!),
    FFMPEG: expandPath(process.env.FFMPEG!),
  };
}

async function checkDependencies(config: ReturnType<typeof getConfig>): Promise<void> {
  const errors: string[] = [];

  if (!existsSync(config.WHISPER_CLI)) {
    errors.push(`whisper-cli not found at: ${config.WHISPER_CLI}`);
  } else {
    try {
      await $`${config.WHISPER_CLI} --help`.quiet();
    } catch {
      errors.push(`whisper-cli exists but failed to execute: ${config.WHISPER_CLI}`);
    }
  }

  if (!existsSync(config.MODEL_PATH)) {
    errors.push(`Whisper model not found at: ${config.MODEL_PATH}`);
  }

  if (!existsSync(config.FFMPEG)) {
    errors.push(`ffmpeg not found at: ${config.FFMPEG}`);
  } else {
    try {
      await $`${config.FFMPEG} -version`.quiet();
    } catch {
      errors.push(`ffmpeg exists but failed to execute: ${config.FFMPEG}`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Missing dependencies:\n  - " + errors.join("\n  - "));
    console.error("\nPlease install the missing dependencies and update your .env file.");
    process.exit(1);
  }
}

async function convertToWav(inputPath: string, ffmpegPath: string): Promise<string> {
  const tempWav = join(tmpdir(), `voice-notes-${Date.now()}.wav`);

  // Convert to WAV 16kHz mono (required by whisper.cpp)
  await $`${ffmpegPath} -i ${inputPath} -ar 16000 -ac 1 -c:a pcm_s16le ${tempWav} -y`.quiet();

  return tempWav;
}

async function transcribe(audioPath: string, config: ReturnType<typeof getConfig>): Promise<string> {
  const absolutePath = resolve(audioPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Convert to WAV if needed
  let wavPath = absolutePath;
  const ext = extname(absolutePath).toLowerCase();
  const needsConversion = ext !== ".wav";

  if (needsConversion) {
    wavPath = await convertToWav(absolutePath, config.FFMPEG);
  }

  try {
    // Run whisper-cli (stderr has logs, stdout has text)
    const result = await $`${config.WHISPER_CLI} -m ${config.MODEL_PATH} -f ${wavPath} --no-timestamps -l auto 2>/dev/null`.text();

    return result.trim();
  } finally {
    // Cleanup temp file
    if (needsConversion && existsSync(wavPath)) {
      await Bun.file(wavPath).delete();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
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

  // Check all dependencies before proceeding
  const config = getConfig();
  await checkDependencies(config);

  const audioFile = args[0];

  if (!audioFile) {
    console.error("Error: no audio file specified");
    process.exit(1);
  }

  const outputIndex = args.findIndex(a => a === "-o" || a === "--output");
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

  try {
    const text = await transcribe(audioFile, config);

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
