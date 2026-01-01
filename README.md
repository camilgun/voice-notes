# voice-notes

Local audio transcription with Whisper and SQLite persistence.

## Project Structure

```
voice-notes/
├── packages/
│   ├── shared/       # @voice-notes/shared - Types and constants
│   ├── backend/      # @voice-notes/backend - API server + CLI (Bun)
│   └── frontend/     # @voice-notes/frontend - Web UI (Vite + React)
├── package.json      # Workspace root
└── pnpm-workspace.yaml
```

## Requirements

- [Node.js](https://nodejs.org) >= 18
- [pnpm](https://pnpm.io)
- [Bun](https://bun.sh) (for backend)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) compiled
- ffmpeg/ffprobe

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy `.env` to `packages/backend/.env` and configure:
```bash
cp .env.example packages/backend/.env
```

```env
WHISPER_FOLDER=~/whisper.cpp
WHISPER_MODEL=ggml-large-v3.bin
WHISPER_LANGUAGE=auto  # language code (e.g., "it", "en") or "auto" for detection
WHISPER_SERVER=http://127.0.0.1:8080  # whisper server URL (local or remote)
FFMPEG=/opt/homebrew/bin/ffmpeg
```

The paths are derived automatically from `WHISPER_FOLDER`:
- CLI: `$WHISPER_FOLDER/build/bin/whisper-cli`
- Server: `$WHISPER_FOLDER/build/bin/whisper-server`
- Model: `$WHISPER_FOLDER/models/$WHISPER_MODEL`

## Development

### Start both servers (parallel)
```bash
pnpm dev:all
```

### Start individually
```bash
# Backend API (port 3000)
pnpm dev

# Frontend (port 5173)
pnpm dev:frontend
```

The frontend proxies `/api/*` requests to the backend automatically.

## Whisper Server (optional)

For faster transcriptions (especially in batch), you can use a whisper-server instead of the CLI.

### Using a remote server

Set `WHISPER_SERVER` to the remote server URL:
```env
WHISPER_SERVER=http://my-whisper-server.example.com:8080
```

### Starting a local server
```bash
pnpm whisper:start
```

If `WHISPER_SERVER` is set and reachable, it will be used automatically. Otherwise, it falls back to whisper-cli.

## CLI Usage

### Transcribe files or folders

```bash
# Single file (output to stdout)
pnpm transcribe recording.m4a

# Single file with output to file
pnpm transcribe recording.m4a -o transcript.txt

# Entire folder
pnpm transcribe ./recordings/

# Folder with options
pnpm transcribe ./recordings/ -c 2 -f
```

**Options:**
- `-o, --output <file>` - save transcript to file (single file only)
- `-c, --concurrency <n>` - parallel files (default: 4, folders only)
- `-f, --force` - reprocess files already in database
- `-h, --help` - show help

Supported formats: wav, mp3, m4a, ogg, flac, webm, mp4, mov, aac.

### What happens

1. The file is converted to WAV 16kHz mono (if needed)
2. Whisper transcribes the audio
3. The transcription is saved to the SQLite database
4. The text is printed to stdout (or saved to file)

### Automatic path update

Files are identified by their content hash. If you move or rename a file and run the transcription again, the `source_file` path in the database is automatically updated without re-transcribing.

## Build

```bash
# Build all packages
pnpm build

# Build frontend only (for deployment)
pnpm build:frontend
```

## Database

Transcriptions are saved to `voice_notes.db` (SQLite).

**`entries` table schema:**

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Auto-increment |
| text | TEXT | Transcription |
| transcribed_at | TEXT | When transcribed (ISO 8601) |
| recorded_at | TEXT | Original recording date (from metadata) |
| source_file | TEXT | Audio file path |
| duration_seconds | REAL | Duration in seconds |
| file_hash | TEXT | Content hash for file identification |
