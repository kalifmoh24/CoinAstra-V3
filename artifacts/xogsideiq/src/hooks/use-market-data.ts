import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LiveCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply?: number | null;
  max_supply?: number | null;
  ath: number;
  atl: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

export interface TrendingCoinItem {
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

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

// ── Core fetchers via backend proxy ──────────────────────────────────────────

async function fetchLiveCoins(page = 1, perPage = 100): Promise<LiveCoin[]> {
  const r = await fetch(`/api/coins/markets?page=${page}&per_page=${perPage}`);
  if (!r.ok) throw new Error(`coins/markets ${r.status}`);
  return r.json();
}

async function fetchTrending(): Promise<{ coins: { item: TrendingCoinItem }[] }> {
  const r = await fetch("/api/coins/trending");
  if (!r.ok) throw new Error(`coins/trending ${r.status}`);
  return r.json();
}

async function fetchFearGreed(): Promise<{ data: FearGreedEntry[] }> {
  const r = await fetch("/api/coins/fear-greed");
  if (!r.ok) throw new Error("Fear & Greed unavailable");
  return r.json();
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/** Top 100 coins, auto-refreshed every 30s */
export function useLiveCoins(page = 1, perPage = 100) {
  return useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", page, perPage],
    queryFn: () => fetchLiveCoins(page, perPage),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}

/** Live top 300 coins (3 pages merged) */
export function useLiveCoins250() {
  const p1 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 1, 100],
    queryFn: () => fetchLiveCoins(1, 100),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
  const p2 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 2, 100],
    queryFn: () => fetchLiveCoins(2, 100),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
  const p3 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 3, 100],
    queryFn: () => fetchLiveCoins(3, 100),
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
  return {
    data: useMemo(() => [
      ...(p1.data ?? []),
      ...(p2.data ?? []),
      ...(p3.data ?? []),
    ], [p1.data, p2.data, p3.data]),
    isLoading: p1.isLoading,
    isError: p1.isError || p2.isError,
  };
}

/** Derived: top N gainers / losers from the live list */
export function useGainersLosers(n = 7) {
  const { data: coins, isLoading } = useLiveCoins();
  const gainers = useMemo(
    () => coins ? [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, n) : [],
    [coins, n]
  );
  const losers = useMemo(
    () => coins ? [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, n) : [],
    [coins, n]
  );
  return { gainers, losers, isLoading };
}

/** Trending coins, refreshes every 5 min */
export function useTrendingCoins() {
  return useQuery({
    queryKey: ["ca-trending"],
    queryFn: fetchTrending,
    refetchInterval: 300_000,
    staleTime: 295_000,
    retry: 2,
  });
}

/** Fear & Greed Index, refreshes every 10 min */
export function useFearGreedLive() {
  return useQuery<{ data: FearGreedEntry[] }>({
    queryKey: ["ca-fear-greed"],
    queryFn: fetchFearGreed,
    refetchInterval: 600_000,
    staleTime: 595_000,
    retry: 2,
  });
}

/** Meme coins from live list filtered by known IDs */
const MEME_IDS = ["dogecoin","shiba-inu","pepe","bonk","floki","dogwifhat","brett","mog-coin","book-of-meme","popcat"];

export function useMemeCoinLive() {
  const { data: coins } = useLiveCoins(1, 250);
  return useMemo(
    () => coins?.filter(c => MEME_IDS.includes(c.id)).slice(0, 6) ?? [],
    [coins]
  );
}

/** Prefetch coins on mount to warm the cache */
export function usePrefetchCoins() {
  const qc = useQueryClient();
  useEffect(() => {
    void qc.prefetchQuery({ queryKey: ["ca-live-coins", 1, 100], queryFn: () => fetchLiveCoins(1) });
  }, [qc]);
}
