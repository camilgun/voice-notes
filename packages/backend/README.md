# @voice-notes/backend

Bun-based API server and CLI for audio transcription.

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable           | Description                      | Example                    |
| ------------------ | -------------------------------- | -------------------------- |
| `WHISPER_FOLDER`   | Path to whisper.cpp installation | `~/whisper.cpp`            |
| `WHISPER_MODEL`    | Model filename                   | `ggml-large-v3.bin`        |
| `WHISPER_LANGUAGE` | Language code or `auto`          | `it`, `en`, `auto`         |
| `WHISPER_SERVER`   | Whisper server URL (optional)    | `http://127.0.0.1:8080`    |
| `FFMPEG`           | Path to ffmpeg binary            | `/opt/homebrew/bin/ffmpeg` |
| `DB_PATH`          | SQLite database path             | `./voice_notes.db`         |

Paths are derived from `WHISPER_FOLDER`:

- CLI: `$WHISPER_FOLDER/build/bin/whisper-cli`
- Server: `$WHISPER_FOLDER/build/bin/whisper-server`
- Model: `$WHISPER_FOLDER/models/$WHISPER_MODEL`

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

### Options

| Option                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `-o, --output <file>`   | Save transcript to file (single file only) |
| `-c, --concurrency <n>` | Parallel files (default: 4, folders only)  |
| `-f, --force`           | Reprocess files already in database        |
| `-h, --help`            | Show help                                  |

### Supported formats

wav, mp3, m4a, ogg, flac, webm, mp4, mov, aac

### What happens

1. The file is converted to WAV 16kHz mono (if needed)
2. Whisper transcribes the audio
3. The transcription is saved to SQLite
4. The text is printed to stdout (or saved to file)

### Automatic path update

Files are identified by content hash. If you move or rename a file and run transcription again, the `source_file` path in the database is updated without re-transcribing.

## Whisper Server

For faster transcriptions (especially batch), use whisper-server instead of CLI.

### Start local server

```bash
pnpm whisper:start
```

### Use remote server

Set `WHISPER_SERVER` to the remote URL:

```env
WHISPER_SERVER=http://my-whisper-server.example.com:8080
```

If `WHISPER_SERVER` is set and reachable, it's used automatically. Otherwise falls back to whisper-cli.

## API Server

```bash
pnpm dev
```

Runs on port 3000. The frontend proxies `/api/*` requests here.

## Database

Transcriptions are saved to `voice_notes.db` (SQLite).

### Schema: `entries`

| Field              | Type    | Description                             |
| ------------------ | ------- | --------------------------------------- |
| `id`               | INTEGER | Auto-increment                          |
| `text`             | TEXT    | Transcription                           |
| `transcribed_at`   | TEXT    | ISO 8601 timestamp                      |
| `recorded_at`      | TEXT    | Original recording date (from metadata) |
| `source_file`      | TEXT    | Audio file path                         |
| `duration_seconds` | REAL    | Duration in seconds                     |
| `file_hash`        | TEXT    | Content hash for file identification    |
