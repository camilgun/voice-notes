## Project Structure

pnpm monorepo with 3 packages:

- `packages/backend` - Bun runtime (Bun.serve, bun:sqlite)
- `packages/frontend` - Vite + React 19 + Tailwind
- `packages/shared` - TypeScript types only

## Commands

```bash
pnpm dev          # backend
pnpm dev:frontend # frontend (Vite)
pnpm dev:all      # both in parallel
pnpm lint         # eslint
pnpm format       # prettier
pnpm typecheck    # tsc
```

## After Code Changes

Run formatting and linting:

```bash
pnpm format       # prettier
pnpm lint         # eslint (fix issues if any)
```

## Notes

- Frontend uses **Vite**, not Bun.serve
- Backend uses **Bun** runtime and APIs
- Use `pnpm` for package management (not bun install)
