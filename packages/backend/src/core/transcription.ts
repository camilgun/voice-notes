import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { getDuration, getRecordedAt } from "./audio.ts";
import {
  entryExistsAndComplete,
  saveOrUpdateEntry,
  updateSourcePath,
} from "./db.ts";
import { computeFileHash } from "./hash.ts";
import { transcribe } from "./whisper.ts";
import type {
  ToolPaths,
  ProcessResult,
  TranscriptionResult,
} from "@voice-notes/shared";
import { SUPPORTED_EXTENSIONS } from "@voice-notes/shared";

function isAudioFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export async function transcribeAndSave(
  audioPath: string,
  tools: ToolPaths,
): Promise<TranscriptionResult> {
  try {
    const [text, duration, fileHash, recordedAt] = await Promise.all([
      transcribe(audioPath, tools),
      getDuration(audioPath, tools.ffmpeg),
      computeFileHash(audioPath),
      getRecordedAt(audioPath, tools.ffmpeg),
    ]);

    const result = saveOrUpdateEntry({
      text,
      transcribed_at: new Date().toISOString(),
      recorded_at: recordedAt,
      source_file: audioPath,
      duration_seconds: duration,
      file_hash: fileHash,
    });

    return {
      success: true,
      text,
      entryId: result.id,
      wasUpdated: result.wasUpdated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function processFolder(
  folderPath: string,
  tools: ToolPaths,
  concurrency: number,
  force: boolean,
): Promise<ProcessResult> {
  const absolutePath = resolve(folderPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Folder not found: ${absolutePath}`);
  }

  const files = await readdir(absolutePath);
  const audioFiles = files.filter(isAudioFile);

  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    failed: [],
  };

  const toProcess: string[] = [];
  for (const file of audioFiles) {
    const audioPath = join(absolutePath, file);
    if (!force) {
      const fileHash = await computeFileHash(audioPath);
      if (entryExistsAndComplete(fileHash)) {
        const pathUpdated = updateSourcePath(fileHash, audioPath);
        if (pathUpdated) {
          console.log(`[skip] ${file} (path updated in database)`);
        } else {
          console.log(`[skip] ${file} (already in database)`);
        }
        result.skipped++;
        continue;
      }
    }
    toProcess.push(audioPath);
  }

  if (toProcess.length === 0) {
    return result;
  }

  console.log(
    `\nProcessing ${toProcess.length} files (concurrency: ${concurrency})...\n`,
  );

  const totalBatches = Math.ceil(toProcess.length / concurrency);

  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const batchNumber = Math.floor(i / concurrency) + 1;
    const batchFiles = batch.map((p) => p.split("/").pop());

    console.log(
      `[batch ${batchNumber}/${totalBatches}] ${batchFiles.join(", ")}`,
    );

    const promises = batch.map((audioPath) =>
      transcribeAndSave(audioPath, tools),
    );
    const results = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const audioPath = batch[j]!;
      const fileName = audioPath.split("/").pop()!;
      const res = results[j]!;

      if (res.success) {
        const action = res.wasUpdated ? "updated" : "created";
        console.log(
          `  [done] ${fileName} -> entry #${res.entryId} (${action})`,
        );
        result.processed++;
      } else {
        console.error(`  [error] ${fileName}: ${res.error}`);
        result.failed.push(fileName);
      }
    }
  }

  return result;
}
