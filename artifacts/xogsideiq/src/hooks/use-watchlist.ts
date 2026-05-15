import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WatchlistItem {
  id: number;
  coinId: string;
  symbol: string;
  name: string;
  image?: string | null;
  targetPrice?: number | null;
  alertEnabled: boolean;
  addedAt: string;
}

const QUERY_KEY = ["ca-watchlist"];

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const r = await fetch("/api/watchlist");
      if (!r.ok) throw new Error(`watchlist ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coin: { coinId: string; symbol: string; name: string; image?: string; targetPrice?: number }) => {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coin),
      });
      if (r.status === 409) return (await r.json()).item as WatchlistItem;
      if (!r.ok) throw new Error(`add watchlist ${r.status}`);
      return r.json() as Promise<WatchlistItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(`remove watchlist ${r.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetPrice, alertEnabled }: { id: number; targetPrice?: number; alertEnabled?: boolean }) => {
      const r = await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPrice, alertEnabled }),
      });
      if (!r.ok) throw new Error(`update watchlist ${r.status}`);
      return r.json() as Promise<WatchlistItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Check if a coin is in watchlist */
export function useIsWatchlisted(coinId: string) {
  const { data } = useWatchlist();
  return data?.some((item) => item.coinId === coinId) ?? false;
}
