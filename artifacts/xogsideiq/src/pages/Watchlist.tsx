import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Star, Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, BarChart2, Zap, Search, X, Loader2,
} from "lucide-react";
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist, useUpdateWatchlistItem } from "@/hooks/use-watchlist";
import { useCoinSearch } from "@/hooks/use-coins";
import { useLiveCoins } from "@/hooks/use-market-data";

function fmtPrice(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function fmtLarge(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export default function Watchlist() {
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  const { data: watchlist = [], isLoading } = useWatchlist();
  const { data: liveCoins } = useLiveCoins(1, 250);
  const { data: searchResults, isLoading: searching } = useCoinSearch(addSearch);
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const updateMutation = useUpdateWatchlistItem();

  const enriched = useMemo(() => watchlist.map(item => {
    const live = liveCoins?.find(c => c.id === item.coinId);
    return {
      ...item,
      price: live?.current_price,
      ch24: live?.price_change_percentage_24h,
      ch7d: live?.price_change_percentage_7d_in_currency,
      mcap: live?.market_cap,
    };
  }), [watchlist, liveCoins]);

  const bullCount = enriched.filter(c => (c.ch24 ?? 0) >= 0).length;

  function handleAdd(coin: { id: string; name: string; symbol: string; thumb: string }) {
    addMutation.mutate({ coinId: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, image: coin.thumb });
    setAddSearch("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f7931a,#fbbf24)", boxShadow: "0 0 16px rgba(247,147,26,0.4)" }}>
              <Star className="h-4 w-4 text-white" style={{ fill: "white" }} />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#fde68a 50%,#f7931a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Watchlist
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {watchlist.length} coins tracked · {bullCount} bullish today · live prices
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(247,147,26,0.18)", color: "#f7931a", border: "1px solid rgba(247,147,26,0.35)" }}>
          <Plus className="h-3.5 w-3.5" /> Add Coin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Watching", value: watchlist.length.toString(), color: "#f7931a", icon: Star },
          { label: "Bullish", value: bullCount.toString(), color: "#26a69a", icon: TrendingUp },
          { label: "Alerts On", value: watchlist.filter(c => c.alertEnabled).length.toString(), color: "#2962ff", icon: Bell },
          { label: "Bearish", value: enriched.filter(c => (c.ch24 ?? 0) < 0).length.toString(), color: "#ef5350", icon: TrendingDown },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
            </div>
            <div className="text-[20px] font-black" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Add coin panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(247,147,26,0.25)" }}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Search className="h-4 w-4 shrink-0" style={{ color: "#5a6072" }} />
                <input autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search any coin (e.g. Bitcoin, SOL, MATIC...)"
                  className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#3a4058]" />
                {searching && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#5a6072" }} />}
                <button onClick={() => { setShowAdd(false); setAddSearch(""); }}>
                  <X className="h-4 w-4" style={{ color: "#5a6072" }} />
                </button>
              </div>
              {searchResults?.coins && searchResults.coins.length > 0 && (
                <div className="space-y-0.5 max-h-52 overflow-y-auto">
                  {searchResults.coins.map(coin => (
                    <button key={coin.id} onClick={() => handleAdd(coin)}
                      disabled={addMutation.isPending}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all hover:bg-white/5 text-left">
                      {coin.thumb && <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-white">{coin.symbol.toUpperCase()}</div>
                        <div className="text-[10px] truncate" style={{ color: "#5a6072" }}>{coin.name}</div>
                      </div>
                      {coin.market_cap_rank && (
                        <span className="text-[9px] shrink-0" style={{ color: "#3a4058" }}>#{coin.market_cap_rank}</span>
                      )}
                      <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: "#f7931a" }} />
                    </button>
                  ))}
                </div>
              )}
              {addSearch.length >= 2 && searchResults?.coins?.length === 0 && !searching && (
                <p className="text-[11px] text-center py-4" style={{ color: "#5a6072" }}>No coins found for "{addSearch}"</p>
              )}
              {/* Quick adds */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#3a4058" }}>Popular</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png" },
                    { id: "ethereum", symbol: "ETH", name: "Ethereum", thumb: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png" },
                    { id: "solana", symbol: "SOL", name: "Solana", thumb: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png" },
                    { id: "chainlink", symbol: "LINK", name: "Chainlink", thumb: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png" },
                    { id: "sui", symbol: "SUI", name: "SUI", thumb: "https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg" },
                  ].filter(s => !watchlist.some(w => w.coinId === s.id)).map(coin => (
                    <button key={coin.id} onClick={() => handleAdd(coin)} disabled={addMutation.isPending}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/5"
                      style={{ background: "rgba(255,255,255,0.04)", color: "#a0a8bc", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Plus className="h-2.5 w-2.5" /> {coin.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" style={{ color: "#f7931a" }} />
          <p className="text-[12px]" style={{ color: "#5a6072" }}>Loading watchlist...</p>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "#f7931a" }} />
          <p className="text-[14px] font-bold text-white mb-1">Your watchlist is empty</p>
          <p className="text-[12px] mb-4" style={{ color: "#5a6072" }}>Add coins to track their live prices and set price alerts</p>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl text-[11px] font-bold"
            style={{ background: "rgba(247,147,26,0.2)", color: "#f7931a", border: "1px solid rgba(247,147,26,0.35)" }}>
            <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Your First Coin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Star className="h-3.5 w-3.5" style={{ color: "#f7931a", fill: "#f7931a" }} />
                <span className="text-[12px] font-bold text-white">Tracked Coins</span>
                <span className="ml-auto text-[9px]" style={{ color: "#3a4058" }}>Live prices · 30s refresh</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 580 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {["Coin", "Price", "24h", "7d", "Market Cap", "Alert", ""].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((coin, i) => (
                      <motion.tr key={coin.id} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(247,147,26,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                        <td className="px-3 py-3">
                          <Link href={`/research/${coin.symbol}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            {coin.image && <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                            <div>
                              <div className="text-[12px] font-black text-white">{coin.symbol}</div>
                              <div className="text-[9px] max-w-[72px] truncate" style={{ color: "#4a5068" }}>{coin.name}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[12px] font-bold text-white font-mono">{fmtPrice(coin.price)}</span>
                        </td>
                        <td className="px-3 py-3">
                          {coin.ch24 != null ? (
                            <div className="flex items-center gap-0.5" style={{ color: coin.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                              {coin.ch24 >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              <span className="text-[11px] font-bold tabular-nums">{Math.abs(coin.ch24).toFixed(1)}%</span>
                            </div>
                          ) : <span className="text-[10px]" style={{ color: "#3a4058" }}>—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {coin.ch7d != null ? (
                            <span className="text-[11px] font-bold tabular-nums" style={{ color: coin.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                              {coin.ch7d >= 0 ? "+" : ""}{coin.ch7d.toFixed(1)}%
                            </span>
                          ) : <span className="text-[10px]" style={{ color: "#3a4058" }}>—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-mono text-white">{fmtLarge(coin.mcap)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => updateMutation.mutate({ id: coin.id, alertEnabled: !coin.alertEnabled })}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/5">
                            {coin.alertEnabled
                              ? <Bell className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
                              : <BellOff className="h-3.5 w-3.5" style={{ color: "#3a4058" }} />}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => removeMutation.mutate(coin.id)} disabled={removeMutation.isPending}
                            className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 group">
                            <Trash2 className="h-3.5 w-3.5 transition-colors" style={{ color: "#3a4058" }}
                              onMouseEnter={e => (e.currentTarget as SVGElement).style.color = "#ef5350"}
                              onMouseLeave={e => (e.currentTarget as SVGElement).style.color = "#3a4058"} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
                <span className="text-[12px] font-bold text-white">24h Performance</span>
              </div>
              <div className="space-y-2.5">
                {[...enriched].sort((a, b) => (b.ch24 ?? 0) - (a.ch24 ?? 0)).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-white w-12 truncate">{c.symbol}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, Math.abs(c.ch24 ?? 0) * 8)}%`,
                        background: (c.ch24 ?? 0) >= 0 ? "linear-gradient(90deg,#26a69a,#4dd0c5)" : "linear-gradient(90deg,#ef5350,#ff8a80)",
                      }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums w-14 text-right"
                      style={{ color: (c.ch24 ?? 0) >= 0 ? "#26a69a" : "#ef5350" }}>
                      {(c.ch24 ?? 0) >= 0 ? "+" : ""}{(c.ch24 ?? 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
                <span className="text-[12px] font-bold text-white">Quick Links</span>
              </div>
              <div className="space-y-1.5">
                {enriched.slice(0, 5).map(c => (
                  <Link key={c.id} href={`/research/${c.symbol}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                    {c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}
                    <span className="text-[11px] font-semibold text-white">{c.symbol}</span>
                    <span className="ml-auto text-[9px]" style={{ color: "#3a4058" }}>View Research →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
