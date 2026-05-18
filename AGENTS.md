# AGENTS.md

## Cursor Cloud specific instructions

### Quick Reference

- **Dev server**: `pnpm --filter @workspace/xogsideiq run dev` (port 5173, includes embedded API via Vite plugin)
- **Typecheck**: `pnpm run typecheck` (see known issues below)
- **Format check**: `pnpm exec prettier --check .`
- **Build API server**: `pnpm --filter @workspace/api-server run build`
- **Full build**: `pnpm run build`

### Architecture (Dev Mode)

In development, only the frontend Vite dev server is needed. It includes a Vite plugin (`artifacts/xogsideiq/dev-api/vite-plugin.ts`) that serves all `/api/*` routes in-process using an in-memory store and live CoinGecko/alternative.me proxy. No database or separate API server is required in dev mode.

### Node.js Version

This project requires **Node.js 24** (specified in `replit.md`). Use `nvm install 24 && nvm use 24` to switch. After switching Node versions, pnpm must be reinstalled globally: `npm install -g pnpm`.

### Known Issues

- `pnpm run typecheck` fails on `lib/api-zod/src/index.ts` with error TS5097 (`.ts` extension in import path without `allowImportingTsExtensions`). This is a pre-existing configuration issue and does not affect the dev server or builds since Vite/esbuild handle TS resolution differently.

### External API Dependencies

All market data comes from:
- **CoinGecko API** (free tier, rate-limited) — prices, market cap, volumes, trending coins
- **alternative.me** — Fear & Greed index

These are remote HTTP APIs. No local services or API keys are needed.

### No Auth in Dev

There is no authentication in the current version. The app provides a single shared environment for portfolio, signals, and research.
