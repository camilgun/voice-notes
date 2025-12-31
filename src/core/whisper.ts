import { $ } from "bun";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { convertToWav } from "./audio";
import type { ToolPaths } from "../shared/types";

async function isServerReachable(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(serverUrl, { method: "GET" });
    return response.ok || response.status === 404;
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
