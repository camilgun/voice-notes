import { $ } from "bun";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export async function convertToWav(audioPath: string, ffmpegPath: string): Promise<string> {
  const tempWav = join(tmpdir(), `voice-notes-${Date.now()}.wav`);
  await $`${ffmpegPath} -i ${audioPath} -ar 16000 -ac 1 -c:a pcm_s16le ${tempWav} -y`.quiet();
  return tempWav;
}

export async function getDuration(audioPath: string, ffmpegPath: string): Promise<number> {
  const ffprobePath = join(dirname(ffmpegPath), "ffprobe");
  const result = await $`${ffprobePath} -v quiet -print_format json -show_format ${audioPath}`.json();
  return parseFloat(result.format.duration);
}

/**
 * Extracts the original recording date from audio file metadata.
 * Looks for creation_time in the format tags (common in Voice Memos and other recorders).
 * Returns null if no recording date is found.
 */
export async function getRecordedAt(audioPath: string, ffmpegPath: string): Promise<string | null> {
  const ffprobePath = join(dirname(ffmpegPath), "ffprobe");
  try {
    const result = await $`${ffprobePath} -v quiet -print_format json -show_format ${audioPath}`.json();
    const creationTime = result.format?.tags?.creation_time;
    if (creationTime && typeof creationTime === "string") {
      // Validate it's a proper ISO date
      const date = new Date(creationTime);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  } catch {
    return null;
  }
}
