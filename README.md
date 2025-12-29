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
WHISPER_SERVER=http://localhost:8080  # opzionale, per usare il server
```

## Whisper Server (opzionale)

Per trascrizioni più veloci (specialmente in batch), puoi usare whisper-server invece della CLI:

```bash
# Avvia il server
bun run server:start

# Ferma il server
bun run server:stop
```

Il comando `server:start` esegue:
```bash
~/whisper.cpp/build/bin/whisper-server \
  -m ~/whisper.cpp/models/ggml-large-v3.bin \
  --convert \
  --port 8080 \
  -l auto \
  -t 4 \
  -p 4
```

Parametri:
- `-m` - path al modello
- `--convert` - converte automaticamente formati non-WAV
- `-t 4` - 4 thread per trascrizione
- `-p 4` - 4 richieste parallele

Se `WHISPER_SERVER` è configurato nel `.env` e il server è raggiungibile, viene usato automaticamente. Altrimenti fallback a whisper-cli.

## Utilizzo

### Trascrivi file o cartelle

```bash
# File singolo (output su stdout)
bun run transcribe recording.m4a

# File singolo con output su file
bun run transcribe recording.m4a -o transcript.txt

# Cartella intera
bun run transcribe ./recordings/

# Cartella con opzioni
bun run transcribe ./recordings/ -c 2 -f
```

**Opzioni:**
- `-o, --output <file>` - salva transcript su file (solo file singolo)
- `-c, --concurrency <n>` - file paralleli (default: 4, solo cartelle)
- `-f, --force` - riprocessa file già nel database
- `-h, --help` - mostra aiuto

Formati supportati: wav, mp3, m4a, ogg, flac, webm, mp4, mov, aac.

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
bun run transcribe <path>  # Trascrivi file o cartella
bun run server:start       # Avvia whisper-server
bun run server:stop        # Ferma whisper-server
bun run build              # Compila in dist/
bun run typecheck          # Verifica tipi TypeScript
```

## Architettura

```
src/
  transcribe.ts  # CLI principale (file singoli e cartelle)
  whisper.ts     # Trascrizione (server HTTP o CLI)
  db.ts          # Layer database (saveEntry, getEntries, ...)
  audio.ts       # Conversione audio e durata
```

I layer sono separati per essere riutilizzabili quando verrà aggiunto un server HTTP.
