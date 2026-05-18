# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CoinAstra is a crypto intelligence platform built as a **pnpm workspace monorepo**. Key packages:

- `artifacts/xogsideiq` — React/Vite frontend (main app)
- `artifacts/api-server` — Express 5 API server (production only)
- `lib/api-spec` — OpenAPI spec + Orval codegen
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod schemas

### Running in dev mode

In development, **only the Vite frontend needs to run**. The Vite config includes a `coinastraDevApiPlugin` that serves all `/api/*` requests inline using CoinGecko + an in-memory store — no separate API server or database needed.

```
pnpm --filter @workspace/xogsideiq run dev
```

The dev server runs on port **5173** by default.

### Node.js version

Requires **Node.js 24**. Use `nvm use 24` if nvm is available.

### Type checking

- `pnpm --filter @workspace/xogsideiq run typecheck` — frontend typecheck (recommended)
- `pnpm run typecheck` — full workspace typecheck; note that `tsc --build` on `lib/api-zod` has a pre-existing error (`allowImportingTsExtensions` not enabled in its tsconfig), so the root typecheck fails on that step. The frontend typecheck passes independently.

### Building

- `pnpm --filter @workspace/xogsideiq run build` — builds the frontend

### Formatting

- `npx prettier --check .` — check formatting
- No ESLint configured in this repo

### External APIs

The app fetches live data from **CoinGecko** (free tier, rate-limited) and **Alternative.me** (Fear & Greed index). No API keys are required, but CoinGecko's free API may rate-limit requests from the same IP.

### Gotchas

- After editing `openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks/schemas.
- The in-memory store resets on every dev server restart — all user data, watchlists, positions, and signals are ephemeral.
- CoinGecko free API may show rate-limit errors or dashes in dev; this is expected behavior.
