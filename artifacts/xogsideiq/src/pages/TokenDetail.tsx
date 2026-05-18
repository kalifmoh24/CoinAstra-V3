import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetTokenNews, getGetTokenNewsQueryKey,
} from "@workspace/api-client-react";
import {
  useCoinSearch,
  type CoinLiveData,
} from "@/hooks/use-coins";
import { useTokenDetail } from "@/hooks/use-token-detail";
import { useLiveCoins, type LiveCoin } from "@/hooks/use-market-data";
import { analyzeToken } from "@/lib/ai-engine";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { TradingViewCoinChart } from "@/components/tradingview-coin-chart";
import { researchHref } from "@/lib/research-url";
import { isDisplayablePrice } from "@/lib/coin-detail-persist";
import {
  Star, ArrowLeft, ArrowUp, ArrowDown, ExternalLink, Globe, Twitter, Github,
  FileText, Layers, Search, BrainCircuit, Activity, AlertTriangle, BarChart2,
  TrendingUp, Users, Zap, Copy, ChevronRight, ChevronDown,
  BookOpen, Clock, Radio, MessageCircle, Share2, Bell, RefreshCw,
  ArrowLeftRight, Hash, CircleDot, Flame, Shield,
} from "lucide-react";

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "--";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}
function fmtBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "--";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(n: number | null | undefined, showPlus = true): string {
  if (n == null || !Number.isFinite(n)) return "--";
  const s = n >= 0 && showPlus ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}
function fmtSupply(n: number | null | undefined, symbol?: string): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "--";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}${symbol ? ` ${symbol}` : ""}`;
}

const pctColor = (n: number | null | undefined) =>
  n == null ? "#8a92a6" : n >= 0 ? "#16c784" : "#ea3943";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TokenDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol ?? "").toUpperCase();
  const [, setLocation] = useLocation();

  const coinIdParam = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("id");
  }, [symbol]);

  const { live, meta, coinId, metaLoading, isFetchingLive, isEnriching, hasInstantShell, isError } = useTokenDetail(
    symbol || undefined,
    coinIdParam,
  );

  useEffect(() => {
    if (!symbol || !live?.id) return;
    try {
      const key = "ca-recently-viewed";
      const stored: { symbol: string; name: string; id: string }[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      const filtered = stored.filter((c) => c.symbol !== symbol);
      const updated = [{ symbol, name: live.name, id: live.id }, ...filtered].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [symbol, live?.id, live?.name]);

  if (!symbol) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[13px]" style={{ color: "#5a6072" }}>Missing coin symbol.</p>
      </div>
    );
  }

  if (isError && !hasInstantShell && !metaLoading) {
    return (
      <div className="pb-16">
        <BackNav setLocation={setLocation} />
        <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: "#f7931a" }} />
          <p className="text-[14px] font-bold text-white mb-1">Could not load {symbol}</p>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            CoinGecko may be rate-limited. Retry shortly — cached data is shown when available.
          </p>
        </div>
      </div>
    );
  }

  const cid = coinId ?? meta?.id;

  return (
    <div className="pb-16">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      <BackNav setLocation={setLocation} />

      {metaLoading && !live ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <Skeleton className="h-[400px] w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-[400px] w-full rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Hero: Coin Name + Price ─────────────────────────────────────── */}
          <CoinHero live={live} symbol={symbol} />

          {/* ── Main Layout: Chart + Stats ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-5">
            <div className="space-y-6 min-w-0">
              {/* Chart */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-5 pt-4 pb-2">
                  <h2 className="text-[14px] font-bold text-white">{live?.name ?? symbol} to USD Chart</h2>
                </div>
                <TradingViewCoinChart coinId={cid} symbol={symbol} live={live} />
              </div>

              {/* Price Performance */}
              <PricePerformance live={live} />

              {/* Converter */}
              <CoinConverter live={live} symbol={symbol} />

              {/* Markets */}
              <MarketsSection live={live} symbol={symbol} />

              {/* News */}
              <NewsSection symbol={symbol} name={live?.name} />

              {/* About */}
              <AboutSection live={live} symbol={symbol} />

              {/* Similar Coins */}
              <SimilarCoins symbol={symbol} live={live} setLocation={setLocation} />
            </div>

            {/* ── Right Sidebar: Statistics ─────────────────────────────────── */}
            <aside className="lg:sticky lg:top-4 lg:self-start space-y-4">
              <StatisticsPanel live={live} symbol={symbol} />
              <LinksPanel live={live} />
              <TagsPanel live={live} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

// ── Back Nav ───────────────────────────────────────────────────────────────────

function BackNav({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={() => setLocation("/research")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:bg-white/5"
        style={{ color: "#8a92a6", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Cryptocurrencies
      </button>
    </div>
  );
}

// ── Coin Hero Section ──────────────────────────────────────────────────────────

function CoinHero({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const change24h = live?.priceChange24h ?? 0;
  const isUp = change24h >= 0;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      {/* Left: name + badge */}
      <div className="flex items-center gap-3">
        {live?.image ? (
          <img src={live.image} alt={symbol} className="w-9 h-9 rounded-full" />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black"
            style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff" }}>
            {symbol.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold text-white">{live?.name ?? symbol} price</h1>
            <span className="text-[13px] font-semibold" style={{ color: "#5a6072" }}>{symbol}</span>
          </div>
          {live?.rank && (
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: "#8a92a6" }}>
              #{live.rank}
            </span>
          )}
        </div>
      </div>

      {/* Right: price */}
      <div className="md:ml-auto flex items-baseline gap-3">
        <span className="text-[32px] font-bold text-white tracking-tight">
          {fmtPrice(live?.price)}
        </span>
        <span className="flex items-center gap-1 text-[15px] font-bold" style={{ color: pctColor(change24h) }}>
          {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {fmtPct(change24h, false)}
          <span className="text-[11px] font-normal ml-1" style={{ color: "#5a6072" }}>(24h)</span>
        </span>
      </div>
    </div>
  );
}

// ── Statistics Panel (Right sidebar) ───────────────────────────────────────────

function StatisticsPanel({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const volMcap = live?.marketCap && live.marketCap > 0 && live?.volume24h
    ? ((live.volume24h / live.marketCap) * 100).toFixed(2) + "%"
    : "--";

  const circPct = live?.circulatingSupply && live?.maxSupply && live.maxSupply > 0
    ? ((live.circulatingSupply / live.maxSupply) * 100).toFixed(2)
    : null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-[14px] font-bold text-white mb-4">{live?.name ?? symbol} Statistics</h3>

      <div className="space-y-3">
        <StatRow label="Market Cap" value={fmtBig(live?.marketCap)}
          change={live?.priceChange24h} />
        <StatRow label="Volume (24h)" value={fmtBig(live?.volume24h)} />
        <StatRow label="Vol / Mkt Cap (24h)" value={volMcap} />
        <StatRow label="FDV" value={fmtBig(live?.fdv)} />
        <div className="my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
        <StatRow label="Total Supply" value={fmtSupply(live?.totalSupply, symbol)} />
        <StatRow label="Max Supply" value={live?.maxSupply ? fmtSupply(live.maxSupply, symbol) : "∞"} />
        <StatRow label="Circulating Supply" value={fmtSupply(live?.circulatingSupply, symbol)} />

        {/* Supply progress bar */}
        {circPct && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span style={{ color: "#5a6072" }}>Circulating / Max</span>
              <span className="font-bold text-white">{circPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${circPct}%`, background: "#3861fb" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: "#5a6072" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-white">{value}</span>
        {change != null && Number.isFinite(change) && (
          <span className="text-[10px] font-semibold" style={{ color: pctColor(change) }}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Price Performance ──────────────────────────────────────────────────────────

function PricePerformance({ live }: { live: CoinLiveData | undefined }) {
  const hi = live?.high24h ?? 0;
  const lo = live?.low24h ?? 0;
  const price = live?.price ?? 0;
  const rangePos = hi > lo && price > 0 ? ((price - lo) / (hi - lo)) * 100 : 50;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-[14px] font-bold text-white mb-4">Price Performance</h3>

      {/* 24h Range */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] mb-2">
          <span style={{ color: "#5a6072" }}>24h Low</span>
          <span style={{ color: "#5a6072" }}>24h High</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-white shrink-0">{fmtPrice(lo)}</span>
          <div className="flex-1 h-2 rounded-full relative overflow-hidden" style={{ background: "linear-gradient(to right, #ea3943, #f7931a, #16c784)" }}>
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-gray-800 shadow-lg"
              style={{ left: `${Math.min(100, Math.max(0, rangePos))}%`, transform: "translate(-50%, -50%)" }} />
          </div>
          <span className="text-[12px] font-semibold text-white shrink-0">{fmtPrice(hi)}</span>
        </div>
      </div>

      {/* ATH / ATL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="h-3.5 w-3.5" style={{ color: "#16c784" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#5a6072" }}>All-Time High</span>
          </div>
          <div className="text-[16px] font-bold text-white">{fmtPrice(live?.ath)}</div>
          {live?.athDate && (
            <div className="text-[10px] mt-1" style={{ color: "#5a6072" }}>
              {new Date(live.athDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          <div className="text-[11px] font-semibold mt-1" style={{ color: pctColor(live?.athChange) }}>
            {fmtPct(live?.athChange)}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="h-3.5 w-3.5" style={{ color: "#ea3943" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#5a6072" }}>All-Time Low</span>
          </div>
          <div className="text-[16px] font-bold text-white">{fmtPrice(live?.atl)}</div>
          {live?.atlDate && (
            <div className="text-[10px] mt-1" style={{ color: "#5a6072" }}>
              {new Date(live.atlDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          <div className="text-[11px] font-semibold mt-1" style={{ color: pctColor(live?.atlChange) }}>
            {fmtPct(live?.atlChange)}
          </div>
        </div>
      </div>

      {/* Period changes */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { label: "24h", value: live?.priceChange24h },
          { label: "7d", value: live?.priceChange7d },
          { label: "30d", value: live?.priceChange30d },
          { label: "1y", value: live?.priceChange1y },
        ].map(({ label, value }) => (
          <div key={label} className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-semibold mb-1" style={{ color: "#5a6072" }}>{label}</div>
            <div className="text-[12px] font-bold" style={{ color: pctColor(value) }}>
              {fmtPct(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Converter ──────────────────────────────────────────────────────────────────

function CoinConverter({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const [coinAmount, setCoinAmount] = useState("1");
  const price = live?.price ?? 0;
  const usdValue = parseFloat(coinAmount || "0") * price;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-[14px] font-bold text-white mb-4">
        <ArrowLeftRight className="inline h-4 w-4 mr-2" style={{ color: "#3861fb" }} />
        {symbol} to USD Converter
      </h3>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] font-semibold mb-1" style={{ color: "#5a6072" }}>{symbol}</div>
          <input
            type="number"
            value={coinAmount}
            onChange={(e) => setCoinAmount(e.target.value)}
            className="w-full bg-transparent text-[16px] font-bold text-white outline-none"
            step="any"
            min="0"
          />
        </div>
        <ArrowLeftRight className="h-5 w-5 shrink-0" style={{ color: "#5a6072" }} />
        <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] font-semibold mb-1" style={{ color: "#5a6072" }}>USD</div>
          <div className="text-[16px] font-bold text-white">
            ${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Markets Section ────────────────────────────────────────────────────────────

function MarketsSection({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const exchanges = live?.exchanges ?? [];
  const [filter, setFilter] = useState<"all" | "cex" | "dex">("all");

  if (!exchanges.length) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 className="text-[14px] font-bold text-white mb-3">{live?.name ?? symbol} Markets</h3>
        <div className="text-center py-8">
          <BarChart2 className="h-8 w-8 mx-auto mb-2" style={{ color: "#3a4058" }} />
          <p className="text-[12px]" style={{ color: "#5a6072" }}>Market data loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-white">{live?.name ?? symbol} Markets</h3>
        <div className="flex gap-1">
          {(["all", "cex", "dex"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: filter === f ? "rgba(56,97,251,0.15)" : "transparent",
                color: filter === f ? "#3861fb" : "#5a6072",
                border: filter === f ? "1px solid rgba(56,97,251,0.3)" : "1px solid transparent",
              }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="px-5 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#5a6072" }}>#</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#5a6072" }}>Exchange</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#5a6072" }}>Pair</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase text-right" style={{ color: "#5a6072" }}>Volume (24h)</th>
            </tr>
          </thead>
          <tbody>
            {exchanges.map((ex, i) => (
              <tr key={`${ex.name}-${ex.pair}-${i}`}
                className="transition-all hover:bg-white/[0.02]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="px-5 py-3 text-[11px] text-white">{i + 1}</td>
                <td className="px-3 py-3">
                  <span className="text-[12px] font-semibold text-white">{ex.name}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[11px] font-mono" style={{ color: "#3861fb" }}>{ex.pair}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-[12px] font-semibold text-white">
                    {ex.volume ? fmtBig(ex.volume) : "--"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── News Section ───────────────────────────────────────────────────────────────

function NewsSection({ symbol, name }: { symbol: string; name?: string }) {
  const { data: news, isLoading } = useGetTokenNews(symbol, {
    query: { queryKey: getGetTokenNewsQueryKey(symbol) },
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-[14px] font-bold text-white">{name ?? symbol} News</h3>
      </div>

      {isLoading ? (
        <div className="px-5 pb-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !news?.length ? (
        <div className="px-5 pb-5 text-center py-8">
          <Radio className="h-7 w-7 mx-auto mb-2" style={{ color: "#3a4058" }} />
          <p className="text-[12px]" style={{ color: "#5a6072" }}>No recent news for {symbol}</p>
        </div>
      ) : (
        <div>
          {news.slice(0, 5).map((item, i) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
              className="block px-5 py-4 transition-all hover:bg-white/[0.02]"
              style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div className="flex items-center gap-2 mb-1">
                {item.sentiment && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: item.sentiment === "bullish" ? "rgba(22,199,132,0.12)" : item.sentiment === "bearish" ? "rgba(234,57,67,0.12)" : "rgba(255,255,255,0.06)",
                      color: item.sentiment === "bullish" ? "#16c784" : item.sentiment === "bearish" ? "#ea3943" : "#5a6072",
                    }}>
                    {item.sentiment.toUpperCase()}
                  </span>
                )}
                <span className="text-[10px]" style={{ color: "#5a6072" }}>{item.source}</span>
                <span className="text-[10px] ml-auto" style={{ color: "#3a4058" }}>
                  {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
              {item.summary && <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "#5a6072" }}>{item.summary}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── About Section ──────────────────────────────────────────────────────────────

function AboutSection({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const [expanded, setExpanded] = useState(false);
  const desc = live?.description?.replace(/<[^>]+>/g, "") ?? "";

  if (!desc) return null;

  const truncated = desc.length > 600 ? desc.slice(0, 600) + "..." : desc;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-[14px] font-bold text-white mb-3">About {live?.name ?? symbol}</h3>
      <div className="text-[12px] leading-relaxed" style={{ color: "#8a92a6" }}>
        {expanded ? desc : truncated}
      </div>
      {desc.length > 600 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-[12px] font-semibold transition-all hover:opacity-80"
          style={{ color: "#3861fb" }}>
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

// ── Similar Coins ──────────────────────────────────────────────────────────────

function SimilarCoins({ symbol, live, setLocation }: { symbol: string; live: CoinLiveData | undefined; setLocation: (path: string) => void }) {
  const { data: coins } = useLiveCoins(1, 100);
  const related = useMemo(() => {
    if (!coins) return [];
    return coins.filter(c => c.symbol.toUpperCase() !== symbol)
      .sort((a, b) => {
        const aScore = Math.abs(a.price_change_percentage_24h - (live?.priceChange24h ?? 0));
        const bScore = Math.abs(b.price_change_percentage_24h - (live?.priceChange24h ?? 0));
        return aScore - bScore;
      }).slice(0, 8);
  }, [coins, symbol, live]);

  if (!related.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-[14px] font-bold text-white">Similar Coins</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="px-5 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#5a6072" }}>#</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#5a6072" }}>Name</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase text-right" style={{ color: "#5a6072" }}>Price</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase text-right" style={{ color: "#5a6072" }}>24h %</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase text-right" style={{ color: "#5a6072" }}>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {related.map((c, i) => (
              <tr key={c.id}
                className="cursor-pointer transition-all hover:bg-white/[0.02]"
                onClick={() => setLocation(researchHref({ id: c.id, symbol: c.symbol }))}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="px-5 py-3 text-[11px] text-white">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    {c.image ? (
                      <img src={c.image} alt={c.symbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ background: "rgba(56,97,251,0.15)", color: "#3861fb" }}>{c.symbol.slice(0, 2)}</div>
                    )}
                    <div>
                      <div className="text-[12px] font-semibold text-white">{c.name}</div>
                      <div className="text-[10px]" style={{ color: "#5a6072" }}>{c.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-[12px] font-semibold text-white">
                  {fmtPrice(c.current_price)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-[12px] font-semibold" style={{ color: pctColor(c.price_change_percentage_24h) }}>
                    {fmtPct(c.price_change_percentage_24h)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-[12px] font-semibold text-white">
                  {fmtBig(c.market_cap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Links Panel ────────────────────────────────────────────────────────────────

function LinksPanel({ live }: { live: CoinLiveData | undefined }) {
  const links = live?.links;
  const hasAny = links?.homepage || links?.twitter || links?.reddit || links?.github?.length || links?.whitepaper || links?.explorers?.length;

  if (!hasAny) return null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h4 className="text-[12px] font-bold text-white mb-3">Links</h4>
      <div className="space-y-1.5">
        {links?.homepage && (
          <LinkChip icon={<Globe className="h-3.5 w-3.5" />} label="Website" href={links.homepage} color="#3861fb" />
        )}
        {links?.whitepaper && (
          <LinkChip icon={<FileText className="h-3.5 w-3.5" />} label="Whitepaper" href={links.whitepaper} color="#f7931a" />
        )}
        {links?.twitter && (
          <LinkChip icon={<Twitter className="h-3.5 w-3.5" />} label="Twitter"
            href={links.twitter.startsWith("http") ? links.twitter : `https://twitter.com/${links.twitter}`} color="#1DA1F2" />
        )}
        {links?.reddit && (
          <LinkChip icon={<MessageCircle className="h-3.5 w-3.5" />} label="Reddit" href={links.reddit} color="#FF4500" />
        )}
        {links?.github?.map((url, i) => (
          <LinkChip key={i} icon={<Github className="h-3.5 w-3.5" />} label="GitHub" href={url} color="#8a92a6" />
        ))}
        {links?.explorers?.filter(Boolean).slice(0, 3).map((url, i) => {
          let host = "Explorer";
          try { host = new URL(url).hostname.replace("www.", ""); } catch {}
          return <LinkChip key={`ex-${i}`} icon={<Layers className="h-3.5 w-3.5" />} label={host} href={url} color="#7c3aed" />;
        })}
      </div>

      {/* Contract addresses */}
      {live?.platforms && Object.entries(live.platforms).filter(([, v]) => v).length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#5a6072" }}>Contracts</div>
          {Object.entries(live.platforms).filter(([, v]) => v).slice(0, 3).map(([chain, addr]) => (
            <div key={chain} className="flex items-center gap-2 p-2 rounded-lg mb-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-[9px] font-semibold capitalize shrink-0" style={{ color: "#5a6072" }}>{chain}</span>
              <code className="text-[10px] text-white font-mono truncate flex-1">{addr}</code>
              <button onClick={() => navigator.clipboard.writeText(addr)} className="shrink-0 hover:opacity-70">
                <Copy className="h-3 w-3" style={{ color: "#5a6072" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkChip({ icon, label, href, color }: { icon: React.ReactNode; label: string; href: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-white/[0.04]"
      style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-[11px] font-semibold text-white truncate flex-1">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0" style={{ color: "#5a6072" }} />
    </a>
  );
}

// ── Tags Panel ─────────────────────────────────────────────────────────────────

function TagsPanel({ live }: { live: CoinLiveData | undefined }) {
  if (!live?.categories || live.categories.length === 0) return null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h4 className="text-[12px] font-bold text-white mb-3">Tags</h4>
      <div className="flex flex-wrap gap-1.5">
        {live.categories.map(cat => (
          <span key={cat} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
            style={{ background: "rgba(56,97,251,0.1)", color: "#3861fb", border: "1px solid rgba(56,97,251,0.15)" }}>
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
