import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_CACHE, cachedJsonFetch } from "@/lib/api-cache";
import { preloadCoinLogo, resolveCoin } from "@/lib/coin-metadata";
import {
  isDisplayablePrice,
  isDisplayableUsd,
  readPersistedDetail,
  writeSnapshot,
} from "@/lib/coin-detail-persist";
import type { CoinLiveData } from "@/hooks/use-coins";
import { useCoinMetadataIndex } from "@/hooks/use-coin-metadata";

type SimpleQuote = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
  last_updated_at?: number;
};

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
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
};

function pickNum(
  quote: number | undefined | null,
  market: number | undefined | null,
  meta: number | undefined | null,
): number | undefined {
  if (quote != null && Number.isFinite(quote) && quote > 0) return quote;
  if (market != null && Number.isFinite(market) && market > 0) return market;
  if (meta != null && Number.isFinite(meta) && meta > 0) return meta;
  return undefined;
}

function buildLiveFromMetaAndMarket(
  meta: ReturnType<typeof resolveCoin>,
  m: MarketRow | undefined,
  quote: SimpleQuote | undefined,
): CoinLiveData | undefined {
  if (!meta) return undefined;
  const price = pickNum(quote?.usd, m?.current_price, undefined);
  const qMc = quote?.usd_market_cap;
  const qV = quote?.usd_24h_vol;
  const ch24 = quote?.usd_24h_change ?? m?.price_change_percentage_24h ?? meta.ch24 ?? undefined;
  const out: CoinLiveData = {
    id: meta.id,
    symbol: meta.symbol.toUpperCase(),
    name: meta.name,
    image: meta.image || m?.image,
    price: price ?? 0,
    priceChange24h: typeof ch24 === "number" && Number.isFinite(ch24) ? ch24 : 0,
    priceChange7d: m?.price_change_percentage_7d_in_currency ?? meta.ch7d ?? 0,
    priceChange30d: m?.price_change_percentage_30d_in_currency ?? 0,
    priceChange1y: 0,
    marketCap: pickNum(undefined, m?.market_cap, meta.mc) ?? 0,
    volume24h: pickNum(undefined, m?.total_volume, meta.v) ?? 0,
    fdv: 0,
    high24h: pickNum(undefined, m?.high_24h, meta.h24) ?? 0,
    low24h: pickNum(undefined, m?.low_24h, meta.l24) ?? 0,
    ath: m?.ath && m.ath > 0 ? m.ath : 0,
    athChange: m?.ath_change_percentage ?? 0,
    athDate: "",
    circulatingSupply: m?.circulating_supply ?? meta.csup ?? 0,
    totalSupply: m?.total_supply ?? meta.tsup,
    maxSupply: m?.max_supply ?? meta.msup,
    rank: meta.r,
  };
  /* Prefer simple-quote market cap / volume when present */
  if (qMc != null && Number.isFinite(qMc) && qMc > 0) out.marketCap = qMc;
  if (qV != null && Number.isFinite(qV) && qV > 0) out.volume24h = qV;
  return out;
}

function mergePersistedLive(cache: CoinLiveData | undefined, built: CoinLiveData | undefined): CoinLiveData | undefined {
  if (!built) return cache;
  if (!cache) return built;
  if (cache.id !== built.id) return built;
  return {
    ...cache,
    ...built,
    price: isDisplayablePrice(built.price) ? built.price : cache.price,
    marketCap: isDisplayableUsd(built.marketCap) ? built.marketCap : cache.marketCap,
    volume24h: isDisplayableUsd(built.volume24h) ? built.volume24h : cache.volume24h,
    fdv: isDisplayableUsd(built.fdv) ? built.fdv : cache.fdv,
    high24h: built.high24h > 0 ? built.high24h : cache.high24h,
    low24h: built.low24h > 0 ? built.low24h : cache.low24h,
    ath: built.ath > 0 ? built.ath : cache.ath,
    athChange: Number.isFinite(built.athChange) ? built.athChange : cache.athChange,
    circulatingSupply: built.circulatingSupply > 0 ? built.circulatingSupply : cache.circulatingSupply,
    totalSupply: built.totalSupply ?? cache.totalSupply,
    maxSupply: built.maxSupply ?? cache.maxSupply,
    priceChange24h: Number.isFinite(built.priceChange24h) ? built.priceChange24h : cache.priceChange24h,
    priceChange7d: built.priceChange7d ?? cache.priceChange7d,
    priceChange30d: built.priceChange30d ?? cache.priceChange30d,
    priceChange1y: built.priceChange1y ?? cache.priceChange1y,
    image: built.image || cache.image,
    name: built.name || cache.name,
    symbol: built.symbol || cache.symbol,
    id: built.id,
    rank: built.rank ?? cache.rank,
  };
}

/** Instant metadata + async lightweight live prices (no blocking /coins/{id}). */
export function useTokenDetail(symbol: string | undefined, coinIdParam?: string | null) {
  const sym = symbol?.toUpperCase() ?? "";
  const { data: index, isLoading: metaLoading } = useCoinMetadataIndex();
  const meta = useMemo(
    () => (sym ? resolveCoin(index, sym, coinIdParam) : undefined),
    [index, sym, coinIdParam],
  );

  const resolvedId = coinIdParam ?? meta?.id;

  if (meta?.image) preloadCoinLogo(meta.image);

  const persisted = useMemo(
    () => readPersistedDetail(resolvedId ?? undefined, sym),
    [resolvedId, sym],
  );

  const pricesQ = useQuery({
    queryKey: ["token-live-prices", resolvedId],
    queryFn: async () => {
      if (!resolvedId) return {};
      const url = `/api/coins/market-prices?ids=${encodeURIComponent(resolvedId)}`;
      return cachedJsonFetch<Record<string, SimpleQuote>>(url, API_CACHE.prices);
    },
    enabled: !!resolvedId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (n) => Math.min(2_000 * 2 ** n, 12_000),
    placeholderData: (prev) => prev,
  });

  const marketQ = useQuery({
    queryKey: ["token-live-market", resolvedId],
    queryFn: async () => {
      if (!resolvedId) return [] as MarketRow[];
      const url = `/api/coins/markets-by-ids?ids=${encodeURIComponent(resolvedId)}&price_change_percentage=7d,30d`;
      return cachedJsonFetch<MarketRow[]>(url, API_CACHE.markets);
    },
    enabled: !!resolvedId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (n) => Math.min(2_000 * 2 ** n, 12_000),
    placeholderData: (prev) => prev,
  });

  const enrichQ = useQuery({
    queryKey: ["token-enrich", resolvedId],
    queryFn: async () => {
      if (!resolvedId) return null;
      const url = `/api/coins/${encodeURIComponent(resolvedId)}?tickers=1`;
      return cachedJsonFetch<{
        description?: { en?: string };
        categories?: string[];
        links?: CoinLiveData["links"];
        tickers?: Array<{
          market?: { name?: string };
          base?: string;
          target?: string;
          converted_volume?: { usd?: number };
        }>;
        community_data?: {
          twitter_followers?: number;
          reddit_subscribers?: number;
          telegram_channel_user_count?: number;
        };
        market_data?: {
          price_change_percentage_1y?: number;
          fully_diluted_valuation?: { usd?: number };
          ath_date?: { usd?: string };
          atl?: { usd?: number };
          atl_change_percentage?: { usd?: number };
          atl_date?: { usd?: string };
        };
        contract_address?: string;
        platforms?: Record<string, string>;
      }>(url, API_CACHE.coinDetail);
    },
    enabled: !!resolvedId,
    staleTime: 300_000,
    retry: 2,
    retryDelay: (n) => Math.min(1_500 * 2 ** n, 10_000),
  });

  const quote = resolvedId ? pricesQ.data?.[resolvedId] : undefined;
  const marketRow = marketQ.data?.[0];

  const mergedBase = useMemo(
    () => mergePersistedLive(persisted?.live, buildLiveFromMetaAndMarket(meta, marketRow, quote)),
    [persisted, meta, marketRow, quote],
  );

  const live: CoinLiveData | undefined = useMemo(() => {
    if (!mergedBase) return undefined;
    const e = enrichQ.data;
    if (!e) return mergedBase;
    const md = e.market_data;
    const fdvUsd = md?.fully_diluted_valuation?.usd;
    return {
      ...mergedBase,
      priceChange1y: md?.price_change_percentage_1y ?? mergedBase.priceChange1y,
      fdv: isDisplayableUsd(fdvUsd) ? fdvUsd! : mergedBase.fdv,
      athDate: md?.ath_date?.usd ?? mergedBase.athDate,
      atl: md?.atl?.usd ?? mergedBase.atl,
      atlChange: md?.atl_change_percentage?.usd,
      atlDate: md?.atl_date?.usd,
      categories: e.categories ?? mergedBase.categories,
      description: e.description?.en ?? mergedBase.description,
      contractAddress: e.contract_address ?? mergedBase.contractAddress,
      platforms: e.platforms ?? mergedBase.platforms,
      community: e.community_data
        ? {
            twitterFollowers: e.community_data.twitter_followers ?? null,
            redditSubscribers: e.community_data.reddit_subscribers ?? null,
            telegramUsers: e.community_data.telegram_channel_user_count ?? null,
          }
        : mergedBase.community,
      links: e.links ?? mergedBase.links,
      exchanges: (() => {
        const tickers = e.tickers ?? [];
        const seen = new Set<string>();
        const out: CoinLiveData["exchanges"] = [];
        for (const t of tickers) {
          const name = t.market?.name ?? "Exchange";
          const pair = `${(t.base ?? "").toUpperCase()}/${(t.target ?? "").toUpperCase()}`;
          const key = `${name}:${pair}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ name, pair, volume: t.converted_volume?.usd });
          if (out.length >= 12) break;
        }
        return out.length ? out : mergedBase.exchanges;
      })(),
      trendingScore:
        mergedBase.rank && mergedBase.rank <= 10
          ? "Top 10"
          : mergedBase.rank && mergedBase.rank <= 100
            ? "Top 100"
            : mergedBase.rank && mergedBase.rank <= 500
              ? "Top 500"
              : undefined,
    };
  }, [mergedBase, enrichQ.data]);

  useEffect(() => {
    if (!live?.id || !isDisplayablePrice(live.price)) return;
    writeSnapshot(live.id, live);
  }, [live]);

  const isEnriching = enrichQ.isFetching && !enrichQ.data;
  const isFetchingLive = pricesQ.isFetching || marketQ.isFetching;
  const hasInstantShell = !!persisted?.live || !!meta || metaLoading;
  const isError =
    !persisted?.live &&
    !meta &&
    !metaLoading &&
    !!resolvedId &&
    pricesQ.isError &&
    marketQ.isError;

  return {
    live,
    meta,
    coinId: resolvedId,
    metaLoading,
    isFetchingLive,
    isEnriching,
    hasInstantShell,
    persistedAt: persisted?.updatedAt,
    isError,
    refetchLive: () => {
      void pricesQ.refetch();
      void marketQ.refetch();
    },
  };
}
