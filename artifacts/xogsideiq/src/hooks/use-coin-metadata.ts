import { useQuery } from "@tanstack/react-query";
import { loadCoinMetadataIndex, resolveCoin, type CoinMetadataIndex } from "@/lib/coin-metadata";

export function useCoinMetadataIndex() {
  return useQuery({
    queryKey: ["coins-market-metadata-index"],
    queryFn: loadCoinMetadataIndex,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
  });
}

export function useResolvedCoinMetadata(symbol: string, coinId?: string | null) {
  const { data: index, isLoading } = useCoinMetadataIndex();
  const coin = resolveCoin(index, symbol, coinId);
  return { coin, index, isLoading, isReady: !!index };
}

export function useCoinsByCategoryFromMetadata(categoryId: string | null, enabled: boolean) {
  const { data: index } = useCoinMetadataIndex();
  return useQuery({
    queryKey: ["metadata-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const r = await fetch(
        `/api/coins/categories/${encodeURIComponent(categoryId)}/coins?page=1&per_page=250&sparkline=false&price_change_percentage=1h,7d`,
      );
      if (!r.ok) throw new Error(`category ${r.status}`);
      const markets = (await r.json()) as Array<{ id: string }>;
      const ids = new Set(markets.map((m) => m.id));
      const meta = index ?? (await loadCoinMetadataIndex());
      return meta.payload.coins.filter((c) => ids.has(c.id));
    },
    enabled: enabled && !!categoryId,
    staleTime: 60_000,
    retry: 1,
  });
}
