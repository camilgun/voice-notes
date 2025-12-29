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
WHISPER_CLI=~/whisper.cpp/build/bin/whisper-cli
WHISPER_MODEL=~/whisper.cpp/models/ggml-large-v3.bin
FFMPEG=/opt/homebrew/bin/ffmpeg
WHISPER_SERVER=http://localhost:8080  # optional, to use the server
```

## Whisper Server (optional)

For faster transcriptions (especially in batch), you can use whisper-server instead of the CLI:

```bash
# Start the server
bun run server:start

# Stop the server
bun run server:stop
```

If `WHISPER_SERVER` is configured in `.env` and the server is reachable, it will be used automatically. Otherwise, it falls back to whisper-cli.

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

## Database

Transcriptions are automatically saved to `voice_notes.db` (SQLite).

**`entries` table schema:**

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Auto-increment |
| text | TEXT | Transcription |
| created_at | TEXT | ISO 8601 timestamp |
| source_file | TEXT | Audio file name |
| duration_seconds | REAL | Duration in seconds |

The database is created automatically on the first transcription.
