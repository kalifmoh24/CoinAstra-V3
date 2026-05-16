/**
 * Shared constants for market data architecture.
 * WebSocket bridge, watchlists, portfolios, and alerts plug in here later.
 */

export const MARKET_CACHE_TTL = {
  pricesMs: 30_000,
  coinDetailMs: 300_000,
  categoriesMs: 3_600_000,
  fetchTimeoutMs: 5_000,
} as const;

export const MARKET_PAGE = {
  initialVisible: 100,
  scrollPageSize: 80,
  priceBatchSize: 200,
} as const;
