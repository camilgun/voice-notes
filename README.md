# voice-notes

Local audio transcription with Whisper and SQLite persistence.

## Structure

```
voice-notes/
├── packages/
│   ├── backend/    # Bun - API server + CLI
│   ├── frontend/   # Vite + React + Tailwind
│   └── shared/     # TypeScript types
└── pnpm-workspace.yaml
```

## Requirements

- [pnpm](https://pnpm.io)
- [Bun](https://bun.sh) (backend runtime)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) compiled
- ffmpeg

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment (see packages/backend/README.md for details)
cp packages/backend/.env.example packages/backend/.env

# Start development servers
pnpm dev:all
```

## Scripts

| Command                  | Description               |
| ------------------------ | ------------------------- |
| `pnpm dev`               | Backend only (port 3000)  |
| `pnpm dev:frontend`      | Frontend only (port 5173) |
| `pnpm dev:all`           | Both in parallel          |
| `pnpm transcribe <file>` | CLI transcription         |
| `pnpm lint`              | ESLint                    |
| `pnpm format`            | Prettier                  |
| `pnpm typecheck`         | TypeScript check          |

See [packages/backend/README.md](packages/backend/README.md) for CLI usage and configuration.
