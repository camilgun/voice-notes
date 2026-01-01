import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ToolPaths } from "@voice-notes/shared";

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(process.env.HOME!, path.slice(2));
  }
  return path;
}

export function getWhisperPaths() {
  const folder = process.env.WHISPER_FOLDER;
  const model = process.env.WHISPER_MODEL;

  if (!folder) {
    console.error("WHISPER_FOLDER environment variable is not set");
    process.exit(1);
  }
  if (!model) {
    console.error("WHISPER_MODEL environment variable is not set");
    process.exit(1);
  }

  const whisperFolder = expandPath(folder);

  return {
    folder: whisperFolder,
    cli: join(whisperFolder, "build/bin/whisper-cli"),
    server: join(whisperFolder, "build/bin/whisper-server"),
    model: join(whisperFolder, "models", model),
  };
}

export function getToolPaths(): ToolPaths {
  const errors: string[] = [];

  if (!process.env.WHISPER_FOLDER) {
    errors.push("WHISPER_FOLDER environment variable is not set");
  }
  if (!process.env.WHISPER_MODEL) {
    errors.push("WHISPER_MODEL environment variable is not set");
  }
  if (!process.env.FFMPEG) {
    errors.push("FFMPEG environment variable is not set");
  }

  if (errors.length > 0) {
    console.error("Missing environment variables:\n  - " + errors.join("\n  - "));
    console.error("\nMake sure you have a .env file with WHISPER_FOLDER, WHISPER_MODEL, and FFMPEG set.");
    process.exit(1);
  }

  const whisper = getWhisperPaths();

  return {
    whisperCli: whisper.cli,
    whisperModel: whisper.model,
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
