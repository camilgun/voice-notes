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

const WHISPER_CLI = expandPath(process.env.WHISPER_CLI!);
const MODEL_PATH = expandPath(process.env.WHISPER_MODEL!);
const FFMPEG = expandPath(process.env.FFMPEG!);

async function convertToWav(inputPath: string): Promise<string> {
  const tempWav = join(tmpdir(), `voice-notes-${Date.now()}.wav`);

  // Convert to WAV 16kHz mono (required by whisper.cpp)
  await $`${FFMPEG} -i ${inputPath} -ar 16000 -ac 1 -c:a pcm_s16le ${tempWav} -y`.quiet();

  return tempWav;
}

async function transcribe(audioPath: string): Promise<string> {
  const absolutePath = resolve(audioPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Convert to WAV if needed
  let wavPath = absolutePath;
  const ext = extname(absolutePath).toLowerCase();
  const needsConversion = ext !== ".wav";

  if (needsConversion) {
    wavPath = await convertToWav(absolutePath);
  }

  try {
    // Run whisper-cli (stderr has logs, stdout has text)
    const result = await $`${WHISPER_CLI} -m ${MODEL_PATH} -f ${wavPath} --no-timestamps -l auto 2>/dev/null`.text();

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

  const audioFile = args[0];

  if (!audioFile) {
    console.error("Error: no audio file specified");
    process.exit(1);
  }

  const outputIndex = args.findIndex(a => a === "-o" || a === "--output");
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

  try {
    const text = await transcribe(audioFile);

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
