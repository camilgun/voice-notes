#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync } from "node:fs";
import { getWhisperPaths } from "../core/tools.ts";

const whisper = getWhisperPaths();
const language = process.env.WHISPER_LANGUAGE || "auto";

// Extract port from WHISPER_SERVER URL, default to 8080
const serverUrl = process.env.WHISPER_SERVER || "http://127.0.0.1:8080";
const port = new URL(serverUrl).port || "8080";

if (!existsSync(whisper.server)) {
  console.error(`whisper-server not found at: ${whisper.server}`);
  process.exit(1);
}

if (!existsSync(whisper.model)) {
  console.error(`Whisper model not found at: ${whisper.model}`);
  process.exit(1);
}

console.log(`Starting whisper-server on port ${port} (language: ${language})`);
console.log(`Model: ${whisper.model}`);

await $`${whisper.server} -m ${whisper.model} --convert --port ${port} -l ${language} -t 4 -p 4`;
