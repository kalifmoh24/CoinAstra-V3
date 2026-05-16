import { logger } from "./logger.js";

const CG_BASE = "https://api.coingecko.com/api/v3";
const ALT_BASE = "https://api.alternative.me";

// ── In-memory cache (fresh + stale windows, deduped in-flight) ─────────────────

interface CacheEntry {
  data: unknown;
  freshUntil: number;
  staleUntil: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const FETCH_TIMEOUT_MS = 5_000;

function getEntry<T>(key: string): { data: T; isFresh: boolean; isStale: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.staleUntil) {
    cache.delete(key);
    return null;
  }
  return {
    data: entry.data as T,
    isFresh: now < entry.freshUntil,
    isStale: now >= entry.freshUntil,
  };
}

function setCache(key: string, data: unknown, freshMs: number, staleMs: number): void {
  const now = Date.now();
  cache.set(key, { data, freshUntil: now + freshMs, staleUntil: now + staleMs });
}

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "CoinAstra/1.0" },
    });
    if (!r.ok) throw new Error(`CoinGecko ${r.status}: ${url}`);
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cgFetch<T>(path: string, freshMs: number, params?: Record<string, string>, staleMs?: number): Promise<T> {
  const url = new URL(`${CG_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const key = url.toString();
  const stale = staleMs ?? freshMs * 4;
  const hit = getEntry<T>(key);

  if (hit?.isFresh) return hit.data;
  if (hit?.isStale && !inflight.has(key)) {
    const bg = fetchJson(key)
      .then((data) => {
        setCache(key, data, freshMs, stale);
        return data as T;
      })
      .catch((err) => {
        logger.warn({ err, key }, "CoinGecko background revalidate failed");
        return hit.data;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, bg);
    return hit.data;
  }
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const p = fetchJson(key)
    .then((data) => {
      setCache(key, data, freshMs, stale);
      return data as T;
    })
    .catch((err) => {
      if (hit) return hit.data;
      throw err;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function altFetch<T>(path: string, freshMs: number, staleMs?: number): Promise<T> {
  const key = `alt:${path}`;
  const stale = staleMs ?? freshMs * 4;
  const hit = getEntry<T>(key);
  if (hit?.isFresh) return hit.data;
  if (hit?.isStale) return hit.data;

  const r = await fetch(`${ALT_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`alternative.me ${r.status}`);
  const data = await r.json() as T;
  setCache(key, data, freshMs, stale);
  return data;
}

// ── Public API ─────────────────────────────────────────────────────────────────

const TTL = {
  MARKETS: 30_000,
  PRICE_BATCH: 30_000,
  TRENDING: 300_000,
  SEARCH: 300_000,
  COIN: 300_000,        // 5min — coin details
  CHART: 300_000,
  OHLC: 300_000,
  FEAR_GREED: 600_000,
  GLOBAL: 60_000,
  CATEGORIES: 3_600_000, // 1h
  CAT_COINS: 30_000,
};

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

export interface TrendingItem {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
  data: {
    price: string;
    price_change_percentage_24h?: { usd: number };
    market_cap: string;
  };
}

export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  image: { thumb: string; small: string; large: string };
  market_cap_rank: number;
  links: {
    homepage: string[];
    whitepaper?: string | string[];
    blockchain_site: string[];
    twitter_screen_name: string;
    subreddit_url: string;
    repos_url?: { github?: string[] };
  };
  contract_address?: string;
  platforms?: Record<string, string>;
  community_data?: {
    twitter_followers?: number;
    reddit_subscribers?: number;
    telegram_channel_user_count?: number;
  };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
    ath_date: { usd: string };
    atl: { usd: number };
    atl_change_percentage?: { usd: number };
    atl_date?: { usd: string };
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
  };
  categories: string[];
}

export interface GlobalData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

export interface MarketsQueryOpts {
  sparkline?: boolean;
  /** CoinGecko `price_change_percentage` param, e.g. `1h,7d,30d` */
  priceChangePercentage?: string;
  /** CoinGecko markets order, e.g. `market_cap_desc`, `created_desc` */
  order?: string;
}

/** Live USD fields from /simple/price for a set of coin ids (max ~200 per HTTP call). */
export type SimpleUsdQuote = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
  last_updated_at?: number;
};

const MAX_SIMPLE_IDS = 200;

/** One CoinGecko /simple/price request (cached 30s). */
export async function getSimplePricesForIds(ids: string[]): Promise<Record<string, SimpleUsdQuote>> {
  const uniq = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (uniq.length === 0) return {};
  const slice = uniq.slice(0, MAX_SIMPLE_IDS);
  const params: Record<string, string> = {
    ids: slice.join(","),
    vs_currencies: "usd",
    include_market_cap: "true",
    include_24hr_vol: "true",
    include_24hr_change: "true",
    include_last_updated_at: "true",
  };
  return cgFetch<Record<string, SimpleUsdQuote>>("/simple/price", TTL.PRICE_BATCH, params);
}

/** Multiple /simple/price requests (each cached); concurrency-limited. */
export async function getSimplePricesBatched(allIds: string[], concurrency = 2): Promise<Record<string, SimpleUsdQuote>> {
  const uniq = [...new Set(allIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += MAX_SIMPLE_IDS) {
    chunks.push(uniq.slice(i, i + MAX_SIMPLE_IDS));
  }
  const out: Record<string, SimpleUsdQuote> = {};
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const parts = await Promise.all(batch.map((c) => getSimplePricesForIds(c)));
    for (const p of parts) Object.assign(out, p);
  }
  return out;
}

/** Market rows for specific coin ids (lightweight vs /coins/{id}). */
export async function getCoinsMarketsByIds(
  ids: string[],
  opts?: MarketsQueryOpts,
): Promise<CoinMarket[]> {
  const uniq = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (uniq.length === 0) return [];
  const params: Record<string, string> = {
    vs_currency: "usd",
    ids: uniq.slice(0, 250).join(","),
    order: "market_cap_desc",
    per_page: String(Math.min(uniq.length, 250)),
    page: "1",
    sparkline: opts?.sparkline === true ? "true" : "false",
    price_change_percentage: opts?.priceChangePercentage ?? "1h,7d,30d",
  };
  return cgFetch<CoinMarket[]>("/coins/markets", TTL.MARKETS, params);
}

/** Top coins by market cap, paginated (max 250 per call on free tier) */
export async function getCoinsMarkets(
  page = 1,
  perPage = 100,
  category?: string,
  opts?: MarketsQueryOpts,
): Promise<CoinMarket[]> {
  const params: Record<string, string> = {
    vs_currency: "usd",
    order: opts?.order ?? "market_cap_desc",
    per_page: String(Math.min(perPage, 250)),
    page: String(page),
    sparkline: opts?.sparkline === false ? "false" : "true",
    price_change_percentage: opts?.priceChangePercentage ?? "7d,30d",
  };
  if (category) params.category = category;
  return cgFetch<CoinMarket[]>("/coins/markets", TTL.MARKETS, params);
}

/** Search coins, exchanges, categories */
export async function searchCoins(query: string): Promise<{ coins: { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }[] }> {
  return cgFetch("/search", TTL.SEARCH, { query });
}

export type CoinDetailsOpts = { includeTickers?: boolean };

/** Single coin detailed data */
export async function getCoinDetails(id: string, opts?: CoinDetailsOpts): Promise<CoinDetails> {
  return cgFetch<CoinDetails>(`/coins/${encodeURIComponent(id)}`, TTL.COIN, {
    localization: "false",
    tickers: opts?.includeTickers ? "true" : "false",
    market_data: "true",
    community_data: "true",
    developer_data: "false",
    sparkline: "false",
  });
}

/** Price chart — [timestamp, price] pairs. `days` may be `max` for full history (CoinGecko). */
export async function getCoinChart(
  id: string,
  days: number | "max",
): Promise<{ prices: [number, number][]; market_caps: [number, number][]; total_volumes: [number, number][] }> {
  const daysParam = days === "max" ? "max" : String(days);
  const d = days === "max" ? 365 : days;
  return cgFetch(`/coins/${encodeURIComponent(id)}/market_chart`, TTL.CHART, {
    vs_currency: "usd",
    days: daysParam,
    interval:
      days === "max"
        ? "daily"
        : d <= 1
          ? "hourly"
          : d <= 90
            ? "daily"
            : "daily",
  });
}

/** Trending coins */
export async function getTrending(): Promise<{ coins: { item: TrendingItem }[] }> {
  return cgFetch("/search/trending", TTL.TRENDING);
}

/** Global market data */
export async function getGlobal(): Promise<GlobalData> {
  return cgFetch<GlobalData>("/global", TTL.GLOBAL);
}

/** Fear & Greed index */
export async function getFearGreed(): Promise<{ data: { value: string; value_classification: string; timestamp: string }[] }> {
  return altFetch("/fng/?limit=7&format=json", TTL.FEAR_GREED);
}

/** OHLC candlestick data — [[timestamp_ms, open, high, low, close], ...] */
export async function getCoinOHLC(id: string, days: number): Promise<number[][]> {
  const validDays = [1, 7, 14, 30, 90, 180, 365].includes(days) ? days : 7;
  return cgFetch<number[][]>(`/coins/${encodeURIComponent(id)}/ohlc`, TTL.OHLC, {
    vs_currency: "usd",
    days: String(validDays),
  });
}

export interface CoinCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  content: string;
  top_3_coins: string[];
  top_3_coins_id?: string[];
  volume_24h: number;
  updated_at: string;
}

/** All CoinGecko categories with market data, sorted by market cap */
export async function getCoinCategories(): Promise<CoinCategory[]> {
  return cgFetch<CoinCategory[]>("/coins/categories", TTL.CATEGORIES, {
    order: "market_cap_desc",
  });
}

/** Coins in a specific CoinGecko category, paginated */
export async function getCoinsByCategory(
  categoryId: string,
  page = 1,
  perPage = 100,
  opts?: MarketsQueryOpts,
): Promise<CoinMarket[]> {
  return cgFetch<CoinMarket[]>("/coins/markets", TTL.CAT_COINS, {
    vs_currency: "usd",
    category: categoryId,
    order: "market_cap_desc",
    per_page: String(Math.min(perPage, 250)),
    page: String(page),
    sparkline: opts?.sparkline === false ? "false" : "true",
    price_change_percentage: opts?.priceChangePercentage ?? "7d,30d",
  });
}

/** Find a coin ID by symbol — prefers highest market_cap_rank. */
export async function getCoinIdBySymbol(symbol: string, preferredId?: string): Promise<string | null> {
  if (preferredId) return preferredId.toLowerCase();
  try {
    const result = await searchCoins(symbol);
    const sym = symbol.toLowerCase();
    const exact = result.coins.filter((c) => c.symbol.toLowerCase() === sym);
    if (exact.length === 0) return null;
    exact.sort((a, b) => {
      const ar = a.market_cap_rank ?? 999_999;
      const br = b.market_cap_rank ?? 999_999;
      return ar - br;
    });
    return exact[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, symbol }, "getCoinIdBySymbol failed");
    return null;
  }
}
