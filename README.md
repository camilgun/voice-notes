# voice-notes

Local audio transcription with Whisper and SQLite persistence.

## Requirements

- [Bun](https://bun.sh)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) compiled
- ffmpeg/ffprobe

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy `.env.example` to `.env` and configure the paths:
```bash
cp .env.example .env
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

## Whisper Server (optional)

For faster transcriptions (especially in batch), you can use a whisper-server instead of the CLI. The server can be local or remote.

### Using a remote server

Set `WHISPER_SERVER` to the remote server URL:

```env
WHISPER_SERVER=http://my-whisper-server.example.com:8080
```

### Starting a local server

To start a local whisper-server using your `WHISPER_FOLDER` configuration:

```bash
bun run whisper:start
```

This starts a server on the port specified in `WHISPER_SERVER` (default: 8080) with the language from `WHISPER_LANGUAGE`.

### How it works

If `WHISPER_SERVER` is set and the server is reachable, it will be used automatically. Otherwise, it falls back to whisper-cli.

## Usage

### Transcribe files or folders

```bash
# Single file (output to stdout)
bun run transcribe recording.m4a

# Single file with output to file
bun run transcribe recording.m4a -o transcript.txt

# Entire folder
bun run transcribe ./recordings/

# Folder with options
bun run transcribe ./recordings/ -c 2 -f
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

Files are identified by their content hash. If you move or rename a file and run the transcription again, the `source_file` path in the database is automatically updated without re-transcribing. This is useful when reorganizing your audio files.

## Database

Transcriptions are automatically saved to `voice_notes.db` (SQLite).

**`entries` table schema:**

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Auto-increment |
| text | TEXT | Transcription |
| transcribed_at | TEXT | When the audio was transcribed (ISO 8601) |
| recorded_at | TEXT | When the audio was originally recorded (from file metadata, nullable) |
| source_file | TEXT | Audio file path |
| duration_seconds | REAL | Duration in seconds |
| file_hash | TEXT | Content hash for file identification |

The database is created automatically on the first transcription.

### Migrations

The database schema is managed through migrations located in `src/core/migrations/`. Migrations run automatically when the database is opened, ensuring your schema is always up to date.

### Backfill recorded_at

If you have existing entries without `recorded_at`, you can populate them from the audio file metadata:

```bash
bun src/scripts/backfill-recorded-at.ts
```

This extracts the original recording date from the `creation_time` metadata tag (common in Voice Memos and other recording apps).
