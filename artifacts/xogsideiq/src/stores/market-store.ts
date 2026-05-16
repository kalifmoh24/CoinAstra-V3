/**
 * Centralized client market state — syncs with React Query fetches.
 * Scales to watchlists, portfolios, alerts, and WebSocket price feeds.
 */
import { create } from "zustand";

export type LiveQuote = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
  last_updated_at?: number;
};

type MarketStoreState = {
  /** Active viewport coin ids for price batching */
  desiredPriceIds: string[];
  /** Latest simple/price quotes by coin id */
  quotes: Record<string, LiveQuote>;
  /** Global prices fetch in flight */
  isRefreshingPrices: boolean;
  /** Last successful price merge timestamp */
  pricesUpdatedAt: number;
  setDesiredPriceIds: (ids: string[]) => void;
  mergeQuotes: (batch: Record<string, LiveQuote>) => void;
  setRefreshingPrices: (v: boolean) => void;
};

export const useMarketStore = create<MarketStoreState>((set) => ({
    desiredPriceIds: [],
    quotes: {},
    isRefreshingPrices: false,
    pricesUpdatedAt: 0,
    setDesiredPriceIds: (ids) => {
      const uniq = [...new Set(ids.map((id) => id.toLowerCase()).filter(Boolean))];
      set({ desiredPriceIds: uniq });
    },
    mergeQuotes: (batch) =>
      set((s) => ({
        quotes: { ...s.quotes, ...batch },
        pricesUpdatedAt: Date.now(),
        isRefreshingPrices: false,
      })),
    setRefreshingPrices: (isRefreshingPrices) => set({ isRefreshingPrices }),
}));

export function selectQuote(coinId: string | undefined) {
  return (s: MarketStoreState) => (coinId ? s.quotes[coinId.toLowerCase()] : undefined);
}
