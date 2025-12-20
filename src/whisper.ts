import { $ } from "bun";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { convertToWav } from "./audio";

export interface ToolPaths {
  whisperCli: string;
  whisperModel: string;
  ffmpeg: string;
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(process.env.HOME!, path.slice(2));
  }
  return path;
}

export function getToolPaths(): ToolPaths {
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
    console.error("Missing environment variables:\n  - " + errors.join("\n  - "));
    console.error("\nMake sure you have a .env file with WHISPER_CLI, WHISPER_MODEL, and FFMPEG set.");
    process.exit(1);
  }

  return {
    whisperCli: expandPath(process.env.WHISPER_CLI!),
    whisperModel: expandPath(process.env.WHISPER_MODEL!),
    ffmpeg: expandPath(process.env.FFMPEG!),
  };
}

export async function checkDependencies(tools: ToolPaths): Promise<void> {
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
    console.error("Missing dependencies:\n  - " + errors.join("\n  - "));
    console.error("\nPlease install the missing dependencies and update your .env file.");
    process.exit(1);
  }
}

export async function transcribe(audioPath: string, tools: ToolPaths): Promise<string> {
  let wavPath = audioPath;
  const ext = extname(audioPath).toLowerCase();
  const needsConversion = ext !== ".wav";

  if (needsConversion) {
    wavPath = await convertToWav(audioPath, tools.ffmpeg);
  }

  try {
    const result = await $`${tools.whisperCli} -m ${tools.whisperModel} -f ${wavPath} --no-timestamps -l auto 2>/dev/null`.text();
    return result.trim();
  } finally {
    if (needsConversion && existsSync(wavPath)) {
      await Bun.file(wavPath).delete();
    }
  }
}
