import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useLiveCoins, type LiveCoin } from "@/hooks/use-market-data";
import { useCoinSearch, type CoinSearchResult } from "@/hooks/use-coins";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useBatchPrices } from "@/hooks/use-batch-prices";
import { dedupeById } from "@/lib/dedupe-coins";
import { researchHref } from "@/lib/research-url";

function mapSearchToRows(coins: CoinSearchResult[]): LiveCoin[] {
  return coins.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.thumb,
    current_price: 0,
    market_cap: 0,
    market_cap_rank: c.market_cap_rank ?? 0,
    fully_diluted_valuation: null,
    total_volume: 0,
    high_24h: 0,
    low_24h: 0,
    price_change_24h: 0,
    price_change_percentage_24h: 0,
    circulating_supply: 0,
    total_supply: null,
    max_supply: null,
    ath: 0,
    atl: 0,
    last_updated: "",
  }));
}

export default function Research() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 280);

  const { data: liveCoins, isLoading: liveLoading } = useLiveCoins(1, 250);
  const { data: searchData, isFetching: searchFetching } = useCoinSearch(debounced.length >= 2 ? debounced : "");

  const searchIds = useMemo(
    () => (debounced.length >= 2 && searchData?.coins?.length ? searchData.coins.map((c) => c.id) : []),
    [debounced, searchData],
  );
  const { data: searchPrices } = useBatchPrices(searchIds, searchIds.length > 0);

  const rows = useMemo(() => {
    let list: LiveCoin[] = [];
    if (debounced.length >= 2 && searchData?.coins?.length) {
      list = mapSearchToRows(searchData.coins).map((c) => {
        const q = searchPrices?.[c.id];
        if (!q?.usd) return c;
        return {
          ...c,
          current_price: q.usd,
          market_cap: q.usd_market_cap ?? c.market_cap,
          total_volume: q.usd_24h_vol ?? c.total_volume,
          price_change_percentage_24h: q.usd_24h_change ?? c.price_change_percentage_24h,
        };
      });
    } else {
      list = liveCoins ?? [];
      if (debounced) {
        const q = debounced.toLowerCase();
        list = list.filter(
          (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
        );
      }
    }
    return dedupeById(list);
  }, [debounced, liveCoins, searchData, searchPrices]);

  const isLoading = debounced.length >= 2 ? searchFetching : liveLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Research Terminal</h1>
        <p className="text-muted-foreground mt-1">
          Live market data from CoinGecko (top 250 by market cap). Search queries the full CoinGecko catalog — open any row for details.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search any coin (name, symbol, or id)…"
            className="pl-9 bg-card border-card-border focus-visible:ring-primary h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {debounced.length >= 2 && searchFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setLocation("/discover")}
          className="h-11 px-4 flex items-center justify-center gap-2 border border-border bg-card rounded-md text-sm font-medium hover:bg-secondary transition-colors shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" /> Categories
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">24h Change</th>
              <th className="px-4 py-3 text-right">Market Cap</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4">
                    <Skeleton className="h-6 w-32" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-6 w-20 ml-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-6 w-16 ml-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="h-6 w-24 ml-auto" />
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <Skeleton className="h-6 w-20 ml-auto" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No coins match &quot;{debounced}&quot;. Try another name or symbol.
                </td>
              </tr>
            ) : (
              rows.map((token) => {
                const fromSearch = debounced.length >= 2 && (searchData?.coins?.length ?? 0) > 0;
                const href = researchHref({ id: token.id, symbol: token.symbol });
                return (
                  <tr
                    key={`${token.id}-${token.symbol}`}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setLocation(href)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {token.image ? (
                          <img src={token.image} alt="" className="h-8 w-8 rounded-full bg-secondary" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                            {token.symbol.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground">{token.name}</div>
                          <div className="text-muted-foreground text-xs flex items-center gap-2 flex-wrap">
                            <span>{token.symbol.toUpperCase()}</span>
                            {token.market_cap_rank > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                Rank #{token.market_cap_rank}
                              </Badge>
                            )}
                            {fromSearch && (
                              <Badge variant="outline" className="text-[10px]">
                                Search hit
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {fromSearch && !token.current_price ? (
                        <span className="text-muted-foreground text-xs">Open for live</span>
                      ) : (
                        formatCurrency(token.current_price)
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-bold ${
                        (token.price_change_percentage_24h || 0) >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {fromSearch && !token.current_price ? (
                        "—"
                      ) : (
                        <>
                          {(token.price_change_percentage_24h || 0) > 0 && "+"}
                          {formatPercent(token.price_change_percentage_24h)}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {token.market_cap ? formatCurrency(token.market_cap) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono hidden md:table-cell">
                      {token.total_volume ? formatCurrency(token.total_volume) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <p>
            For category filters and paginated browsing of thousands of assets, use{" "}
            <Link href="/discover" className="text-primary font-medium hover:underline">
              Discover
            </Link>
            . Graded &quot;platform&quot; tokens from the database are available via the API; this page focuses on universal live listings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
