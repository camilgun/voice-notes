// Database entry types
export interface Entry {
  id: number;
  text: string;
  created_at: string;
  source_file: string;
  duration_seconds: number | null;
  file_hash: string | null;
}

export type NewEntry = Omit<Entry, "id" | "file_hash"> & { file_hash: string };

// Tool configuration
export interface ToolPaths {
  whisperCli: string;
  whisperModel: string;
  ffmpeg: string;
}

// Processing results
export interface ProcessResult {
  processed: number;
  skipped: number;
  failed: string[];
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  entryId?: number;
  wasUpdated?: boolean;
  error?: string;
}
