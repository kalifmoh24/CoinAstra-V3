import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { readChartCache, writeChartCache, type CachedLineChart } from "@/lib/coin-detail-persist";

// ── Coin search ────────────────────────────────────────────────────────────────

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
}

export function useCoinSearch(query: string) {
  return useQuery<{ coins: CoinSearchResult[] }>({
    queryKey: ["ca-coin-search", query],
    queryFn: async () => {
      if (!query.trim()) return { coins: [] };
      const r = await fetch(`/api/coins/search?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error(`search ${r.status}`);
      return r.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 300_000,
    retry: 1,
  });
}

// ── Single coin live data ──────────────────────────────────────────────────────

export interface CoinLiveData {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price: number;
  priceChange1h?: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange1y: number;
  marketCap: number;
  volume24h: number;
  fdv: number;
  high24h: number;
  low24h: number;
  ath: number;
  athChange: number;
  athDate: string;
  atl?: number;
  atlChange?: number;
  atlDate?: string;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  contractAddress?: string;
  platforms?: Record<string, string>;
  categories?: string[];
  rank?: number;
  community?: {
    twitterFollowers?: number | null;
    redditSubscribers?: number | null;
    telegramUsers?: number | null;
  };
  links?: {
    homepage?: string;
    whitepaper?: string;
    twitter?: string;
    reddit?: string;
    github?: string[];
    explorers?: string[];
  };
  description?: string;
  /** Top exchange listings from CoinGecko tickers */
  exchanges?: { name: string; pair: string; volume?: number }[];
  trendingScore?: string;
}

export function useTokenLive(symbol: string | undefined, coinId?: string | null) {
  return useQuery<CoinLiveData>({
    queryKey: ["ca-token-live", symbol, coinId],
    queryFn: async () => {
      const qs = coinId ? `?id=${encodeURIComponent(coinId)}` : "";
      const r = await fetch(`/api/tokens/${symbol}/live${qs}`);
      if (!r.ok) throw new Error(`token live ${r.status}`);
      return r.json();
    },
    enabled: !!symbol,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}

// ── CoinGecko coin details (by CoinGecko ID) ──────────────────────────────────

export function useCoinById(coinId: string | undefined) {
  return useQuery({
    queryKey: ["ca-coin-by-id", coinId],
    queryFn: async () => {
      const r = await fetch(`/api/coins/${coinId}`);
      if (!r.ok) throw new Error(`coin ${r.status}`);
      return r.json();
    },
    enabled: !!coinId,
    staleTime: 60_000,
    retry: 2,
  });
}

// ── Price chart ────────────────────────────────────────────────────────────────

export interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

/** UI chart range — maps to CoinGecko `market_chart` / `ohlc` params */
export type ChartTimeframeKey = "1h" | "24h" | "7d" | "1m" | "3m" | "1y" | "all";

export function chartLineDaysParam(tf: ChartTimeframeKey): number | "max" {
  switch (tf) {
    case "1h":
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "1y":
      return 365;
    case "all":
      return "max";
  }
}

/** CoinGecko OHLC only supports discrete day counts — cap “all” at 365 */
export function chartOhlcDaysParam(tf: ChartTimeframeKey): number {
  const d = chartLineDaysParam(tf);
  return d === "max" ? 365 : d;
}

/** Trim intraday chart to recent window (CoinGecko hourly when days=1). */
export function sliceChartForDisplay(raw: ChartData | undefined, tf: ChartTimeframeKey): ChartData | undefined {
  if (!raw?.prices?.length) return raw;
  if (tf !== "1h") return raw;
  const cutoff = Date.now() - 3 * 3_600_000;
  const prices = raw.prices.filter(([t]) => t >= cutoff);
  const market_caps = raw.market_caps?.filter(([t]) => t >= cutoff);
  const total_volumes = raw.total_volumes?.filter(([t]) => t >= cutoff);
  if (prices.length < 2) return raw;
  return {
    prices,
    market_caps: market_caps?.length ? market_caps : raw.market_caps,
    total_volumes: total_volumes?.length ? total_volumes : raw.total_volumes,
  };
}

export function sliceOhlcForDisplay(ohlc: number[][] | undefined, tf: ChartTimeframeKey): number[][] | undefined {
  if (!ohlc?.length) return ohlc;
  if (tf !== "1h") return ohlc;
  const cutoff = Date.now() - 3 * 3_600_000;
  const out = ohlc.filter((row) => row[0] >= cutoff);
  return out.length >= 2 ? out : ohlc;
}

/** Fetch chart via backend token endpoint (resolves coingeckoId automatically) */
export function useTokenChart(symbol: string | undefined, days: number) {
  return useQuery<ChartData>({
    queryKey: ["ca-token-chart", symbol, days],
    queryFn: async () => {
      const r = await fetch(`/api/tokens/${symbol}/chart?days=${days}`);
      if (!r.ok) throw new Error(`chart ${r.status}`);
      return r.json();
    },
    enabled: !!symbol,
    staleTime: 300_000,
    retry: 2,
  });
}

/** Fetch chart directly by CoinGecko ID — persists to IndexedDB; hydrates cache into React Query. */
export function useCoinChart(coinId: string | undefined, tf: ChartTimeframeKey, symbol?: string) {
  const qc = useQueryClient();
  const normalizedId = coinId?.toLowerCase();
  const daysParam = chartLineDaysParam(tf);
  const cacheKey = daysParam === "max" ? "max" : daysParam;
  const qk = useMemo(() => ["ca-coin-chart", normalizedId, tf] as const, [normalizedId, tf]);

  useEffect(() => {
    if (!normalizedId) return;
    let cancelled = false;
    void readChartCache(normalizedId, "line", cacheKey).then((raw) => {
      if (cancelled || raw == null || !Array.isArray((raw as CachedLineChart).prices)) return;
      const data = raw as CachedLineChart;
      if (data.prices.length < 2) return;
      const existing = qc.getQueryData<ChartData>(qk);
      if (!existing) qc.setQueryData(qk, data);
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedId, cacheKey, qc, qk]);

  return useQuery<ChartData>({
    queryKey: qk,
    queryFn: async () => {
      if (!normalizedId) throw new Error("missing coin id");
      const qs = daysParam === "max" ? "max" : String(daysParam);
      const sym = symbol?.trim().toUpperCase();
      let r = await fetch(`/api/coins/${encodeURIComponent(normalizedId)}/chart?days=${qs}`);
      if (!r.ok && sym) {
        const dayNum = daysParam === "max" ? 365 : daysParam;
        r = await fetch(`/api/tokens/${encodeURIComponent(sym)}/chart?days=${dayNum}`);
      }
      if (!r.ok) throw new Error(`chart ${r.status}`);
      const data = (await r.json()) as ChartData;
      void writeChartCache(normalizedId, "line", cacheKey, data);
      return data;
    },
    enabled: !!normalizedId,
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    gcTime: 3_600_000,
    retry: 6,
    retryDelay: (n) => Math.min(2_000 * 2 ** n, 45_000),
    placeholderData: (prev) => prev,
  });
}

// ── OHLC candlestick data ──────────────────────────────────────────────────────

/** [timestamp_ms, open, high, low, close][] — for candlestick charts */
export function useCoinOHLC(coinId: string | undefined, tf: ChartTimeframeKey) {
  const qc = useQueryClient();
  const normalizedId = coinId?.toLowerCase();
  const days = chartOhlcDaysParam(tf);
  const qk = useMemo(() => ["ca-coin-ohlc", normalizedId, tf] as const, [normalizedId, tf]);

  useEffect(() => {
    if (!normalizedId) return;
    let cancelled = false;
    void readChartCache(normalizedId, "ohlc", days).then((raw) => {
      if (cancelled || raw == null || !Array.isArray(raw)) return;
      const data = raw as number[][];
      if (data.length < 2) return;
      const existing = qc.getQueryData<number[][]>(qk);
      if (!existing) qc.setQueryData(qk, data);
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedId, days, qc, qk]);

  return useQuery<number[][]>({
    queryKey: qk,
    queryFn: async () => {
      if (!normalizedId) throw new Error("missing coin id");
      const r = await fetch(`/api/coins/${encodeURIComponent(normalizedId)}/ohlc?days=${days}`);
      if (!r.ok) throw new Error(`ohlc ${r.status}`);
      const data = (await r.json()) as number[][];
      void writeChartCache(normalizedId, "ohlc", days, data);
      return data;
    },
    enabled: !!normalizedId,
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    gcTime: 3_600_000,
    retry: 6,
    retryDelay: (n) => Math.min(2_000 * 2 ** n, 45_000),
    placeholderData: (prev) => prev,
  });
}

// ── Coin categories (CoinGecko universe) ──────────────────────────────────────

export interface CoinCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  content: string;
  top_3_coins: string[];
  volume_24h: number;
  updated_at: string;
}

export interface CoinMarketItem {
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
  circulating_supply: number;
  total_supply: number | null;
  ath: number;
  ath_change_percentage: number;
}

/** All CoinGecko categories sorted by market cap */
export function useCoinCategories() {
  return useQuery<CoinCategory[]>({
    queryKey: ["ca-coin-categories"],
    queryFn: async () => {
      const r = await fetch("/api/coins/categories");
      if (!r.ok) throw new Error(`categories ${r.status}`);
      return r.json();
    },
    staleTime: 600_000,
    retry: 2,
  });
}

/** Coins in a specific CoinGecko category */
export function useCategoryCoins(categoryId: string | null, page: number) {
  return useQuery<CoinMarketItem[]>({
    queryKey: ["ca-category-coins", categoryId, page],
    queryFn: async () => {
      const r = await fetch(`/api/coins/categories/${categoryId}/coins?page=${page}&per_page=100`);
      if (!r.ok) throw new Error(`category-coins ${r.status}`);
      return r.json();
    },
    enabled: !!categoryId,
    staleTime: 60_000,
    retry: 2,
  });
}

/** All coins sorted by mcap (for "All Coins" view) */
export function useAllCoins(page: number) {
  return useQuery<CoinMarketItem[]>({
    queryKey: ["ca-all-coins", page],
    queryFn: async () => {
      const r = await fetch(`/api/coins/markets?page=${page}&per_page=100`);
      if (!r.ok) throw new Error(`all-coins ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
    retry: 2,
  });
}

/** Platform tokens (for checking which coins are already added) */
export function usePlatformTokenSymbols() {
  return useQuery<string[]>({
    queryKey: ["ca-platform-token-symbols"],
    queryFn: async () => {
      const r = await fetch("/api/tokens?limit=500");
      if (!r.ok) throw new Error(`tokens ${r.status}`);
      const data = await r.json() as Array<{ symbol: string }>;
      return data.map(t => t.symbol.toUpperCase());
    },
    staleTime: 30_000,
  });
}

/** Import a coin from CoinGecko into the platform */
export function useImportCoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coin: CoinMarketItem) => {
      const r = await fetch("/api/tokens/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coin),
      });
      if (!r.ok) throw new Error(`import ${r.status}`);
      return r.json() as Promise<{ imported: boolean; message: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ca-platform-token-symbols"] });
    },
  });
}

// ── Market overview ────────────────────────────────────────────────────────────

export function useMarketOverview() {
  return useQuery({
    queryKey: ["ca-market-overview"],
    queryFn: async () => {
      const r = await fetch("/api/market/overview");
      if (!r.ok) throw new Error(`overview ${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}
