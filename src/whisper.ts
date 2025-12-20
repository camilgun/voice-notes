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

async function isServerReachable(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(serverUrl, { method: "GET" });
    return response.ok || response.status === 404; // server is up even if endpoint doesn't exist
  } catch {
    return false;
  }
}

async function transcribeViaServer(audioPath: string, serverUrl: string): Promise<string> {
  const file = Bun.file(audioPath);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("response_format", "json");

  const response = await fetch(`${serverUrl}/inference`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { text?: string };
  return (result.text || "").trim();
}

async function transcribeViaCli(audioPath: string, tools: ToolPaths): Promise<string> {
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

let serverChecked = false;
let serverAvailable = false;

export async function transcribe(audioPath: string, tools: ToolPaths): Promise<string> {
  const serverUrl = process.env.WHISPER_SERVER;

  if (serverUrl) {
    // Check server once per session
    if (!serverChecked) {
      serverAvailable = await isServerReachable(serverUrl);
      serverChecked = true;
      if (serverAvailable) {
        console.log(`Using whisper-server at ${serverUrl}`);
      } else {
        console.log("whisper-server not reachable, using whisper-cli");
      }
    }

    if (serverAvailable) {
      return transcribeViaServer(audioPath, serverUrl);
    }
  }

  return transcribeViaCli(audioPath, tools);
}
