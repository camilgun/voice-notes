# voice-notes

Trascrizione audio locale con Whisper e persistenza SQLite.

## Requisiti

- [Bun](https://bun.sh)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) compilato
- ffmpeg/ffprobe

## Setup

1. Installa le dipendenze:
```bash
bun install
```

2. Copia `.env.example` in `.env` e configura i path:
```bash
cp .env.example .env
```

```env
WHISPER_CLI=~/whisper.cpp/build/bin/whisper-cli
WHISPER_MODEL=~/whisper.cpp/models/ggml-large-v3.bin
FFMPEG=/opt/homebrew/bin/ffmpeg
```

## Utilizzo

### Trascrivi un file audio

```bash
# Output su stdout
bun run transcribe recording.m4a

# Output su file
bun run transcribe recording.m4a -o transcript.txt
```

Formati supportati: wav, mp3, m4a, ogg, flac, webm, mp4, mov, ecc.

### Cosa succede

1. Il file viene convertito in WAV 16kHz mono (se necessario)
2. Whisper trascrive l'audio
3. La trascrizione viene salvata nel database SQLite
4. Il testo viene stampato su stdout (o salvato su file)

## Database

Le trascrizioni vengono salvate automaticamente in `voice_notes.db` (SQLite).

**Schema tabella `entries`:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | INTEGER | Auto-increment |
| text | TEXT | Trascrizione |
| created_at | TEXT | Timestamp ISO 8601 |
| source_file | TEXT | Nome file audio |
| duration_seconds | REAL | Durata in secondi |

Il database viene creato automaticamente alla prima trascrizione.

### Query dirette

```bash
# Vedi tutte le entries
sqlite3 voice_notes.db "SELECT id, source_file, duration_seconds, created_at FROM entries"

# Cerca nel testo
sqlite3 voice_notes.db "SELECT * FROM entries WHERE text LIKE '%parola%'"
```

## Scripts

```bash
bun run transcribe <file>  # Trascrivi audio
bun run build              # Compila in dist/
bun run typecheck          # Verifica tipi TypeScript
```

## Architettura

```
src/
  transcribe.ts  # CLI principale
  db.ts          # Layer database (saveEntry, getEntries, ...)
  audio.ts       # Conversione audio e durata
```

Il layer database (`src/db.ts`) e' separato per essere riutilizzabile quando verra' aggiunto un server HTTP.
