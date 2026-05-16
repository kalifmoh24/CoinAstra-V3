import { useQuery } from "@tanstack/react-query";
import { API_CACHE, cachedJsonFetch } from "@/lib/api-cache";
import { useMarketStore } from "@/stores/market-store";

type SimpleQuote = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
};

/** Batch live prices for coin ids (deduped, cached 30s). */
export function useBatchPrices(coinIds: string[], enabled = true) {
  const key = coinIds.slice(0, 200).join(",");
  return useQuery({
    queryKey: ["batch-prices", key],
    queryFn: async () => {
      if (!key) return {} as Record<string, SimpleQuote>;
      const url = `/api/coins/market-prices?ids=${encodeURIComponent(key)}`;
      const data = await cachedJsonFetch<Record<string, SimpleQuote>>(url, API_CACHE.prices);
      useMarketStore.getState().mergeQuotes(data);
      return data;
    },
    enabled: enabled && coinIds.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
