// Database entry types
export interface Entry {
  id: number;
  text: string;
  transcribed_at: string;
  recorded_at: string | null;
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

// Project - gruppi tematici
export interface Project {
  id: number;
  name: string;
  description: string | null;
}

// Insight - cuore del sistema
export interface Insight {
  id: number;
  project_id: number | null;
  title: string;
  module_type: string;
  summary: string | null;
  content_data: string | null; // JSON stringified
  created_at: string;
  // Populated from join
  project_name?: string | null;
}

// Parsed version with content_data as object
export interface InsightParsed extends Omit<Insight, "content_data"> {
  content_data: Record<string, unknown> | null;
}
