import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { API_CACHE, cachedJsonFetch } from "@/lib/api-cache";
import { getLivePricesBridge } from "@/lib/live-prices-bridge";
import { useMarketStore } from "@/stores/market-store";

export type SortKey = "rank" | "price" | "ch1h" | "ch24h" | "ch7d" | "mcap" | "vol";

export interface MetadataCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  r: number;
  mc: number;
  v: number;
  csup: number;
  tsup: number | null;
  msup: number | null;
  h24: number;
  l24: number;
  ch1h: number | null;
  ch7d: number | null;
  ch24: number | null;
  pc24: number | null;
}

export interface MetadataPayload {
  v: number;
  generatedAt: string;
  count: number;
  coins: MetadataCoin[];
}

export type CoinMarketView = {
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
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  last_updated?: string;
  _pricePending?: boolean;
};

type SimpleQuote = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
  last_updated_at?: number;
};

const BATCH = 200;
const INITIAL_VISIBLE = 100;
const PAGE_VISIBLE = 80;
const PRICE_PREFETCH_EXTRA = 400;
const PRICE_STALE_MS = 30_000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mergeRow(m: MetadataCoin, q: SimpleQuote | undefined): CoinMarketView {
  const has = q != null && q.usd != null;
  const price = has ? (q.usd as number) : 0;
  const pctLive = has && q.usd_24h_change != null ? q.usd_24h_change : null;
  const pct = pctLive ?? m.ch24 ?? 0;
  const rawChange =
    has && q.usd != null && q.usd_24h_change != null ? (q.usd * q.usd_24h_change) / 100 : (m.pc24 ?? 0);
  return {
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    image: m.image,
    current_price: price,
    market_cap: has && q.usd_market_cap != null ? q.usd_market_cap : m.mc,
    market_cap_rank: m.r,
    fully_diluted_valuation: null,
    total_volume: has && q.usd_24h_vol != null ? q.usd_24h_vol : m.v,
    high_24h: m.h24,
    low_24h: m.l24,
    price_change_24h: rawChange,
    price_change_percentage_24h: pct,
    circulating_supply: m.csup,
    total_supply: m.tsup,
    max_supply: m.msup,
    ath: 0,
    ath_change_percentage: 0,
    atl: 0,
    sparkline_in_7d: { price: [] },
    price_change_percentage_1h_in_currency: m.ch1h ?? undefined,
    price_change_percentage_7d_in_currency: m.ch7d ?? undefined,
    last_updated: has && q.last_updated_at ? new Date(q.last_updated_at * 1000).toISOString() : undefined,
    _pricePending: !has,
  };
}

export function useOptimizedMarkets(enabled: boolean, search: string, sortKey: SortKey, sortDir: "asc" | "desc") {
  const metaQ = useQuery({
    queryKey: ["coins-market-metadata"],
    queryFn: async (): Promise<MetadataPayload> => {
      const r = await fetch("/data/coins-market-metadata.json", { cache: "force-cache" });
      if (!r.ok) throw new Error(`metadata ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
  });

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [sortKey, sortDir, search, enabled]);

  const filtered = useMemo(() => {
    const all = metaQ.data?.coins ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.includes(q));
  }, [metaQ.data?.coins, search]);

  const sortedMeta = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === "rank") {
        av = a.r;
        bv = b.r;
      }
      if (sortKey === "price") {
        av = a.mc > 0 ? a.mc : a.r;
        bv = b.mc > 0 ? b.mc : b.r;
      }
      if (sortKey === "ch1h") {
        av = a.ch1h ?? 0;
        bv = b.ch1h ?? 0;
      }
      if (sortKey === "ch24h") {
        av = a.ch24 ?? 0;
        bv = b.ch24 ?? 0;
      }
      if (sortKey === "ch7d") {
        av = a.ch7d ?? 0;
        bv = b.ch7d ?? 0;
      }
      if (sortKey === "mcap") {
        av = a.mc;
        bv = b.mc;
      }
      if (sortKey === "vol") {
        av = a.v;
        bv = b.v;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const visibleMeta = useMemo(
    () => sortedMeta.slice(0, Math.min(visibleCount, sortedMeta.length)),
    [sortedMeta, visibleCount],
  );

  const prefetchIds = useMemo(() => {
    const n = Math.min(sortedMeta.length, visibleCount + PRICE_PREFETCH_EXTRA);
    return sortedMeta.slice(0, n).map((c) => c.id);
  }, [sortedMeta, visibleCount]);

  const batches = useMemo(() => chunk(prefetchIds, BATCH), [prefetchIds]);

  const priceQueries = useQueries({
    queries: batches.map((ids) => ({
      queryKey: ["market-prices", ids.join(",")],
      queryFn: async (): Promise<Record<string, SimpleQuote>> => {
        const url = `/api/coins/market-prices?ids=${encodeURIComponent(ids.join(","))}`;
        useMarketStore.getState().setRefreshingPrices(true);
        const data = await cachedJsonFetch<Record<string, SimpleQuote>>(url, API_CACHE.prices);
        useMarketStore.getState().mergeQuotes(data);
        return data;
      },
      enabled: enabled && ids.length > 0 && metaQ.isSuccess,
      staleTime: PRICE_STALE_MS,
      refetchInterval: PRICE_STALE_MS,
      retry: 1,
    })),
  });

  const priceMap = useMemo(() => {
    const m: Record<string, SimpleQuote> = {};
    for (const q of priceQueries) {
      if (q.data) Object.assign(m, q.data);
    }
    return m;
  }, [priceQueries]);

  useEffect(() => {
    if (!enabled) return;
    getLivePricesBridge().setDesiredIds(prefetchIds);
  }, [enabled, prefetchIds]);

  const rows: CoinMarketView[] = useMemo(() => {
    const merged = visibleMeta.map((c) => mergeRow(c, priceMap[c.id]));
    if (sortKey !== "price") return merged;
    const sorted = [...merged];
    sorted.sort((a, b) => {
      const av = a.current_price || 0;
      const bv = b.current_price || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [visibleMeta, priceMap, sortKey, sortDir]);

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_VISIBLE, sortedMeta.length));
  }, [sortedMeta.length]);

  const hasMore = visibleCount < sortedMeta.length;

  const refetchPrices = useCallback(() => {
    void Promise.all(priceQueries.map((q) => q.refetch()));
  }, [priceQueries]);

  const priceUpdatedAt = useMemo(() => {
    let t = 0;
    for (const q of priceQueries) {
      if (q.dataUpdatedAt && q.dataUpdatedAt > t) t = q.dataUpdatedAt;
    }
    return t || metaQ.dataUpdatedAt;
  }, [priceQueries, metaQ.dataUpdatedAt]);

  const metadataLoading = metaQ.isLoading;
  const isFetchingPrices = priceQueries.some((q) => q.isFetching);
  const isError = metaQ.isError;
  const error = metaQ.error;

  return {
    rows,
    total: sortedMeta.length,
    metadataLoading,
    isFetchingPrices,
    isError,
    error,
    priceUpdatedAt,
    refetchPrices,
    loadMore,
    hasMore,
  };
}

export function useInfiniteSentinel(
  loadMore: () => void,
  hasMore: boolean,
  rootRef: RefObject<HTMLElement | null>,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const root = rootRef.current;
    const io = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          if (e.isIntersecting) loadMore();
        }
      },
      { root: root ?? undefined, rootMargin: "400px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, rootRef]);
  return ref;
}
