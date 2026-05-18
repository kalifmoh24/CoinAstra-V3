import React, { useState, useEffect, useMemo } from "react";
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
import { ActionButton } from "@/components/action-button";
import { TokenStatsGrid } from "@/components/token-stats-grid";
import { CategoriesStrip, ExchangeListings, BlockchainNetworks } from "@/components/token-extras";
import { TokenIntelligencePanel } from "@/components/token-intelligence-panel";
import { TradingViewCoinChart } from "@/components/tradingview-coin-chart";
import { researchHref } from "@/lib/research-url";
import { isDisplayablePrice } from "@/lib/coin-detail-persist";
import {
  Star, ArrowLeft, ArrowUp, ArrowDown, ExternalLink, Globe, Twitter, Github,
  FileText, Layers, Search, BrainCircuit, Activity, AlertTriangle, BarChart2,
  TrendingUp, Users, Zap, Copy, ChevronRight,
  BookOpen, Clock, Radio, MessageCircle,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtP(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}
function fmtB(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n: number | null | undefined, showPlus = true): string {
  if (n == null) return "—";
  const s = n >= 0 && showPlus ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

const CARD = { background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 };
const CARD_HIGHLIGHT = { background: "rgba(10,14,22,0.92)", border: "1px solid rgba(41,98,255,0.2)", borderRadius: 16 };

const WORKSPACE_LINKS: { id: string; label: string }[] = [
  { id: "sec-overview", label: "Overview" },
  { id: "sec-markets", label: "Markets" },
  { id: "sec-news", label: "News" },
  { id: "sec-similar", label: "Similar Coins" },
  { id: "sec-history", label: "Historic Data" },
  { id: "sec-ai", label: "AI Analysis" },
  { id: "sec-onchain", label: "On-Chain" },
  { id: "sec-holders", label: "Holders" },
  { id: "sec-social", label: "Social Sentiment" },
  { id: "sec-tokenomics", label: "Tokenomics" },
];

const QUICK_COINS = [
  { symbol: "BTC", name: "Bitcoin" }, { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" }, { symbol: "XRP", name: "XRP" },
  { symbol: "BNB", name: "BNB" }, { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" }, { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" }, { symbol: "LINK", name: "Chainlink" },
];

// ── Quick Coin Nav ─────────────────────────────────────────────────────────────

function QuickCoinNav({ currentSymbol }: { currentSymbol: string }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchData } = useCoinSearch(query);

  const recentlyViewed: { symbol: string; name: string }[] = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("ca-recently-viewed") ?? "[]");
      return stored.filter((c: { symbol: string }) => c.symbol !== currentSymbol).slice(0, 5);
    } catch { return []; }
  }, [currentSymbol]);

  const go = (symbol: string) => setLocation(`/research/${symbol.toUpperCase()}`);

  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={() => setLocation("/research")}
        className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-bold shrink-0 transition-all hover:bg-white/5"
        style={{ color: "#5a6072", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <ArrowLeft className="h-3.5 w-3.5" /> Research
      </button>

      <div className="flex-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {[...QUICK_COINS, ...recentlyViewed.filter(r => !QUICK_COINS.some(q => q.symbol === r.symbol))].map(c => (
            <button key={c.symbol} onClick={() => go(c.symbol)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-bold shrink-0 transition-all"
              style={{
                background: currentSymbol === c.symbol ? "rgba(41,98,255,0.2)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${currentSymbol === c.symbol ? "rgba(41,98,255,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: currentSymbol === c.symbol ? "#4d7fff" : "#5a6072",
              }}>
              {c.symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="relative shrink-0">
        <div className="flex items-center gap-2 px-3 h-8 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Search className="h-3.5 w-3.5" style={{ color: "#5a6072" }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            placeholder="Find coin..."
            className="bg-transparent outline-none text-[11px] text-white placeholder:text-[#3a4058] w-28"
          />
        </div>
        {showSearch && query && searchData?.coins && searchData.coins.length > 0 && (
          <div className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.1)", width: 220 }}>
            {searchData.coins.slice(0, 8).map(c => (
              <button key={c.id} onClick={() => { setLocation(researchHref({ id: c.id, symbol: c.symbol })); setQuery(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-all">
                {c.thumb && <img src={c.thumb} alt={c.symbol} className="w-5 h-5 rounded-full" />}
                <div>
                  <div className="text-[11px] font-bold text-white">{c.name}</div>
                  <div className="text-[9px]" style={{ color: "#5a6072" }}>{c.symbol.toUpperCase()}</div>
                </div>
                {c.market_cap_rank && <span className="ml-auto text-[9px]" style={{ color: "#3a4058" }}>#{c.market_cap_rank}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function WorkspaceNav() {
  return (
    <div
      className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl p-1 mb-3"
      style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {WORKSPACE_LINKS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => scrollToSection(l.id)}
          className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:bg-white/[0.04]"
          style={{ color: "#8a92a6" }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: { label: string; value: React.ReactNode; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span style={{ color: color ?? "#5a6072" }}>{icon}</span>}
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{label}</span>
      </div>
      <div className="text-[15px] font-mono font-bold text-white">{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "#5a6072" }}>{sub}</div>}
    </div>
  );
}

// ── Score Bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color?: string }) {
  const pct = (value / max) * 100;
  const c = color ?? (pct >= 70 ? "#26a69a" : pct >= 40 ? "#f7931a" : "#ef5350");
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#5a6072" }}>{label}</span>
        <span className="font-mono font-bold text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
      </div>
    </div>
  );
}

// ── AI Analysis Tab ────────────────────────────────────────────────────────────

function AiAnalysisTab({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const ai = useMemo(() => analyzeToken({
    priceChange24h: live?.priceChange24h ?? 0,
    priceChange7d: live?.priceChange7d,
    volume24h: live?.volume24h,
    marketCap: live?.marketCap,
    symbol,
  }), [live, symbol]);

  const sentimentColor = ai.sentiment.includes("BULLISH") ? "#26a69a" : ai.sentiment.includes("BEARISH") ? "#ef5350" : "#f7931a";
  const signalColor = ai.signal === "STRONG_BUY" ? "#26a69a" : ai.signal === "BUY" ? "#4d7fff" : ai.signal === "STRONG_SELL" ? "#ef5350" : ai.signal === "SELL" ? "#f7931a" : "#8a92a6";
  const smColor = ai.smartMoney === "ACCUMULATING" ? "#26a69a" : ai.smartMoney === "DISTRIBUTING" ? "#ef5350" : "#f7931a";
  const whaColor = ai.whaleActivity === "EXTREME" ? "#ef5350" : ai.whaleActivity === "HIGH" ? "#f7931a" : ai.whaleActivity === "MEDIUM" ? "#4d7fff" : "#5a6072";

  return (
    <div className="space-y-4">
      {/* Main signal row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4 flex flex-col items-center gap-2" style={CARD_HIGHLIGHT}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>AI Sentiment</div>
          <div className="text-[22px] font-black" style={{ color: sentimentColor }}>
            {ai.sentiment.replace("_", " ")}
          </div>
          <div className="text-[10px]" style={{ color: "#5a6072" }}>Score: {ai.sentimentScore}/100</div>
        </div>
        <div className="rounded-2xl p-4 flex flex-col items-center gap-2" style={CARD}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Signal</div>
          <div className="text-[20px] font-black" style={{ color: signalColor }}>
            {ai.signal.replace("_", " ")}
          </div>
          <div className="text-[10px]" style={{ color: "#5a6072" }}>Confidence {ai.confidence}%</div>
        </div>
        <div className="rounded-2xl p-4 flex flex-col items-center gap-2" style={CARD}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Smart Money</div>
          <div className="text-[20px] font-black" style={{ color: smColor }}>{ai.smartMoney}</div>
          <div className="text-[10px]" style={{ color: "#5a6072" }}>Score: {ai.smartMoneyScore}/100</div>
        </div>
        <div className="rounded-2xl p-4 flex flex-col items-center gap-2" style={CARD}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Whale Activity</div>
          <div className="text-[20px] font-black" style={{ color: whaColor }}>{ai.whaleActivity}</div>
          <div className="text-[10px]" style={{ color: "#5a6072" }}>Score: {ai.whaleScore}/100</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Probability bars */}
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: "#4d7fff" }} />
            <span className="text-[13px] font-bold text-white">Price Probability</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: "#26a69a" }}>Bullish</span>
                <span className="font-bold text-white">{ai.bullishProbability}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${ai.bullishProbability}%`, background: "#26a69a" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: "#f7931a" }}>Neutral/Hold</span>
                <span className="font-bold text-white">{ai.holdProbability}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${ai.holdProbability}%`, background: "#f7931a" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: "#ef5350" }}>Bearish</span>
                <span className="font-bold text-white">{ai.bearishProbability}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${ai.bearishProbability}%`, background: "#ef5350" }} />
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(41,98,255,0.06)", border: "1px solid rgba(41,98,255,0.12)" }}>
            <div className="flex justify-between text-[10px] mb-1">
              <span style={{ color: "#5a6072" }}>AI Confidence</span>
              <span className="font-bold" style={{ color: "#4d7fff" }}>{ai.confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${ai.confidence}%`, background: "#4d7fff" }} />
            </div>
          </div>
        </div>

        {/* AI Scores */}
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="h-4 w-4" style={{ color: "#4d7fff" }} />
            <span className="text-[13px] font-bold text-white">AI Intelligence Scores</span>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Sentiment Score" value={ai.sentimentScore} />
            <ScoreBar label="Momentum Score" value={Math.round((ai.momentumScore + 100) / 2)} />
            <ScoreBar label="Narrative Strength" value={ai.narrativeStrength} />
            <ScoreBar label="Smart Money Score" value={ai.smartMoneyScore} />
            <ScoreBar label="Whale Activity Score" value={ai.whaleScore} />
          </div>
        </div>
      </div>

      {/* Timeframe Matrix */}
      <div className="rounded-2xl p-5" style={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4" style={{ color: "#4d7fff" }} />
          <span className="text-[13px] font-bold text-white">Timeframe Analysis</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ai.timeframes.map(tf => {
            const c = tf.sentiment === "BULLISH" ? "#26a69a" : tf.sentiment === "BEARISH" ? "#ef5350" : "#f7931a";
            return (
              <div key={tf.tf} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: "#5a6072" }}>{tf.tf}</div>
                <div className="text-[14px] font-black" style={{ color: c }}>{tf.sentiment}</div>
                <div className="text-[9px] mt-1" style={{ color: "#4a5068" }}>Conf: {tf.confidence}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── On-Chain Tab (live market-derived metrics only) ───────────────────────────

function OnChainTab({ live }: { live: CoinLiveData | undefined; symbol: string }) {
  const mcap = live?.marketCap;
  const vol = live?.volume24h;
  const vmr = mcap && mcap > 0 && vol != null ? (vol / mcap) * 100 : null;
  const hi = live?.high24h;
  const lo = live?.low24h;
  const px = live?.price;
  const rangePos =
    hi != null && lo != null && hi !== lo && px != null
      ? ((px - lo) / (hi - lo)) * 100
      : null;

  const cards = [
    { label: "24h Volume", value: fmtB(vol), icon: <Activity className="h-3.5 w-3.5" />, color: "#4d7fff" },
    { label: "Volume / MCap", value: vmr != null ? `${vmr.toFixed(2)}%` : "—", icon: <BarChart2 className="h-3.5 w-3.5" />, color: "#26a69a", sub: "24h turnover" },
    { label: "24h High", value: fmtP(hi), icon: <ArrowUp className="h-3.5 w-3.5" />, color: "#26a69a" },
    { label: "24h Low", value: fmtP(lo), icon: <ArrowDown className="h-3.5 w-3.5" />, color: "#ef5350" },
    { label: "Circulating Supply", value: live?.circulatingSupply ? formatNumber(live.circulatingSupply) : "—", icon: <Layers className="h-3.5 w-3.5" />, color: "#f7931a" },
    {
      label: "Price vs 24h Range",
      value: rangePos != null && Number.isFinite(rangePos) ? `${rangePos.toFixed(1)}%` : "—",
      icon: <Zap className="h-3.5 w-3.5" />,
      color: "#7c3aed",
      sub: "0% = low, 100% = high",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 text-[11px] leading-relaxed" style={{ background: "rgba(41,98,255,0.08)", border: "1px solid rgba(41,98,255,0.15)", color: "#8892a4" }}>
        On-chain wallet and DEX-level analytics are not available in this build. The metrics below are derived only from live CoinGecko market fields for this coin.
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => (
          <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} color={c.color} icon={c.icon} />
        ))}
      </div>
    </div>
  );
}

// ── Social Tab (CoinGecko community + official links) ──────────────────────────

function SocialTab({ live }: { live: CoinLiveData | undefined; symbol: string }) {
  const c = live?.community;
  const hasCommunity =
    (c?.twitterFollowers != null && c.twitterFollowers > 0) ||
    (c?.redditSubscribers != null && c.redditSubscribers > 0) ||
    (c?.telegramUsers != null && c.telegramUsers > 0);

  return (
    <div className="space-y-4">
      {hasCommunity ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {c?.twitterFollowers != null && c.twitterFollowers > 0 && (
            <StatCard label="Twitter followers" value={c.twitterFollowers.toLocaleString()} icon={<Twitter className="h-3.5 w-3.5" />} color="#1DA1F2" />
          )}
          {c?.redditSubscribers != null && c.redditSubscribers > 0 && (
            <StatCard label="Reddit subscribers" value={c.redditSubscribers.toLocaleString()} icon={<MessageCircle className="h-3.5 w-3.5" />} color="#FF4500" />
          )}
          {c?.telegramUsers != null && c.telegramUsers > 0 && (
            <StatCard label="Telegram users" value={c.telegramUsers.toLocaleString()} icon={<Zap className="h-3.5 w-3.5" />} color="#0088cc" />
          )}
        </div>
      ) : (
        <div className="rounded-xl p-4 text-[11px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#8892a4" }}>
          CoinGecko has not published community follower counts for this asset. Use the official links below for social channels.
        </div>
      )}

      <div className="rounded-2xl p-5" style={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4" style={{ color: "#4d7fff" }} />
          <span className="text-[13px] font-bold text-white">Official Channels</span>
        </div>
        <div className="space-y-2">
          {live?.links?.homepage && (
            <a href={live.links.homepage} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <Globe className="h-4 w-4" style={{ color: "#4d7fff" }} />
              <span className="text-[12px] font-semibold text-white">Official Website</span>
              <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
            </a>
          )}
          {live?.links?.twitter && (
            <a
              href={live.links.twitter.startsWith("http") ? live.links.twitter : `https://twitter.com/${live.links.twitter}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <Twitter className="h-4 w-4" style={{ color: "#1DA1F2" }} />
              <span className="text-[12px] font-semibold text-white">X (Twitter)</span>
              <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
            </a>
          )}
          {live?.links?.reddit && (
            <a href={live.links.reddit} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <MessageCircle className="h-4 w-4" style={{ color: "#FF4500" }} />
              <span className="text-[12px] font-semibold text-white">Reddit</span>
              <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
            </a>
          )}
          {live?.links?.github?.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <Github className="h-4 w-4" style={{ color: "#8a92a6" }} />
              <span className="text-[12px] font-semibold text-white truncate">GitHub</span>
              <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: "#5a6072" }} />
            </a>
          ))}
          {!live?.links?.homepage && !live?.links?.twitter && !live?.links?.reddit && !(live?.links?.github && live.links.github.length > 0) && (
            <div className="text-center py-6 text-[12px]" style={{ color: "#5a6072" }}>No official social links listed for this coin.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── News Tab ───────────────────────────────────────────────────────────────────

function NewsTab({ symbol }: { symbol: string }) {
  const { data: news, isLoading } = useGetTokenNews(symbol, {
    query: { queryKey: getGetTokenNewsQueryKey(symbol) },
  });

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>;
  }
  if (!news?.length) {
    return (
      <div className="rounded-2xl p-12 text-center" style={CARD}>
        <Radio className="h-8 w-8 mx-auto mb-3" style={{ color: "#3a4058" }} />
        <p className="text-[13px]" style={{ color: "#5a6072" }}>No recent news for {symbol}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      {news.map((item, i) => (
        <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
          className="block px-5 py-4 transition-all hover:bg-white/[0.025]"
          style={{ borderBottom: i < news.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold"
              style={{
                background: item.sentiment === "bullish" ? "rgba(38,166,154,0.15)" : item.sentiment === "bearish" ? "rgba(239,83,80,0.15)" : "rgba(255,255,255,0.06)",
                color: item.sentiment === "bullish" ? "#26a69a" : item.sentiment === "bearish" ? "#ef5350" : "#5a6072",
              }}>
              {item.sentiment?.toUpperCase()}
            </span>
            <span className="text-[10px]" style={{ color: "#4a5068" }}>{item.source}</span>
            <span className="text-[10px] ml-auto" style={{ color: "#3a4058" }}>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</span>
          </div>
          <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
          {item.summary && <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "#5a6072" }}>{item.summary}</p>}
        </a>
      ))}
    </div>
  );
}

// ── Info Tab ───────────────────────────────────────────────────────────────────

function InfoTab({ live, symbol }: { live: CoinLiveData | undefined; symbol: string }) {
  const [showFull, setShowFull] = useState(false);
  const desc = live?.description?.replace(/<[^>]+>/g, "") ?? "";

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="rounded-2xl p-5" style={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4" style={{ color: "#4d7fff" }} />
          <span className="text-[13px] font-bold text-white">About {live?.name ?? symbol}</span>
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: "#8a92a6" }}>
          {desc ? (showFull ? desc : desc.slice(0, 500) + (desc.length > 500 ? "..." : "")) : "No description available."}
        </p>
        {desc.length > 500 && (
          <button onClick={() => setShowFull(f => !f)} className="mt-2 text-[11px] font-semibold" style={{ color: "#4d7fff" }}>
            {showFull ? "Show less ▲" : "Show more ▼"}
          </button>
        )}
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="text-[12px] font-bold text-white mb-3">Market Data</div>
          <div className="space-y-2">
            {[
              { label: "ATH", value: fmtP(live?.ath), sub: live?.athDate ? `${new Date(live.athDate).toLocaleDateString()}` : undefined },
              { label: "ATH Change", value: fmtPct(live?.athChange), color: (live?.athChange ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
              { label: "ATL", value: fmtP(live?.atl) },
              { label: "30d Change", value: fmtPct(live?.priceChange30d), color: (live?.priceChange30d ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
              { label: "1y Change", value: fmtPct(live?.priceChange1y), color: (live?.priceChange1y ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
              { label: "Max Supply", value: live?.maxSupply ? formatNumber(live.maxSupply) : "∞" },
              { label: "Total Supply", value: live?.totalSupply ? formatNumber(live.totalSupply) : "—" },
              { label: "Circ. Supply", value: live?.circulatingSupply ? formatNumber(live.circulatingSupply) : "—" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[10px]" style={{ color: "#5a6072" }}>{row.label}</span>
                <div className="text-right">
                  <span className="text-[12px] font-mono font-bold" style={{ color: row.color ?? "white" }}>{row.value}</span>
                  {row.sub && <div className="text-[9px]" style={{ color: "#4a5068" }}>{row.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={CARD}>
          <div className="text-[12px] font-bold text-white mb-3">Links & Resources</div>
          <div className="space-y-1.5">
            {live?.links?.homepage && (
              <a href={live.links.homepage} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all">
                <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "#4d7fff" }} />
                <span className="text-[11px] text-white truncate">Website</span>
                <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: "#5a6072" }} />
              </a>
            )}
            {live?.links?.whitepaper && (
              <a href={live.links.whitepaper} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all">
                <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "#f7931a" }} />
                <span className="text-[11px] text-white">Whitepaper</span>
                <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: "#5a6072" }} />
              </a>
            )}
            {live?.links?.explorers?.filter(Boolean).map((url, i) => {
              let label = "Explorer";
              try {
                label = new URL(url).hostname;
              } catch {
                /* invalid URL from feed */
              }
              return (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all">
                <Layers className="h-3.5 w-3.5 shrink-0" style={{ color: "#7c3aed" }} />
                <span className="text-[11px] text-white truncate">{label}</span>
                <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: "#5a6072" }} />
              </a>
            );})}
          </div>

          {live?.platforms && Object.entries(live.platforms).filter(([,v]) => v).length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#4a5068" }}>Contract Addresses</div>
              {Object.entries(live.platforms).filter(([,v]) => v).map(([chain, addr]) => (
                <div key={chain} className="mb-2">
                  <div className="text-[9px] font-semibold capitalize mb-0.5" style={{ color: "#5a6072" }}>{chain}</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <code className="text-[10px] text-white font-mono truncate flex-1">{addr}</code>
                    <button onClick={() => navigator.clipboard.writeText(addr)}>
                      <Copy className="h-3 w-3" style={{ color: "#5a6072" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {live?.categories && live.categories.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#4a5068" }}>Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {live.categories.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(41,98,255,0.1)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.15)" }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Related Coins ──────────────────────────────────────────────────────────────

function RelatedCoins({ symbol, live }: { symbol: string; live: CoinLiveData | undefined }) {
  const [, setLocation] = useLocation();
  const { data: coins } = useLiveCoins(1, 100);
  const related = useMemo(() => {
    if (!coins) return [];
    return coins.filter(c => c.symbol.toUpperCase() !== symbol)
      .sort((a, b) => {
        const aScore = Math.abs(a.price_change_percentage_24h - (live?.priceChange24h ?? 0));
        const bScore = Math.abs(b.price_change_percentage_24h - (live?.priceChange24h ?? 0));
        return aScore - bScore;
      }).slice(0, 6);
  }, [coins, symbol, live]);

  if (!related.length) return null;
  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <TrendingUp className="h-4 w-4" style={{ color: "#4d7fff" }} />
        <span className="text-[13px] font-bold text-white">Related Coins</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {related.map(c => {
          const up = c.price_change_percentage_24h >= 0;
          return (
            <button key={c.id} onClick={() => setLocation(researchHref({ id: c.id, symbol: c.symbol }))}
              className="flex flex-col items-center gap-1.5 p-4 transition-all hover:bg-white/[0.03]"
              style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
              {c.image ? (
                <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff" }}>{c.symbol.slice(0, 2)}</div>
              )}
              <div className="text-[11px] font-bold text-white">{c.symbol.toUpperCase()}</div>
              <div className={`text-[10px] font-bold ${up ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
                {fmtPct(c.price_change_percentage_24h)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Placeholder — requires dedicated indexer / subgraph */
function HoldersSection() {
  return (
    <div className="rounded-2xl p-6 text-center" style={CARD}>
      <Users className="h-8 w-8 mx-auto mb-2" style={{ color: "#3a4058" }} />
      <p className="text-[12px] font-bold text-white mb-1">Holder analytics</p>
      <p className="text-[11px] leading-relaxed" style={{ color: "#5a6072" }}>
        CoinGecko does not expose wallet-level holders here. Connect an on-chain provider to unlock this block.
      </p>
    </div>
  );
}

// ── CMC-Style Price Header ─────────────────────────────────────────────────────

function CmcPriceHeader({ live, symbol, isFetchingLive }: { live: CoinLiveData | undefined; symbol: string; isFetchingLive: boolean }) {
  const price = live?.price;
  const ch24 = live?.priceChange24h ?? 0;
  const high24 = live?.high24h;
  const low24 = live?.low24h;
  const ath = live?.ath;
  const atl = live?.atl;
  const isUp = ch24 >= 0;

  const rangePos =
    high24 != null && low24 != null && high24 !== low24 && price != null
      ? Math.min(100, Math.max(0, ((price - low24) / (high24 - low24)) * 100))
      : null;

  const athPos =
    ath != null && atl != null && ath !== atl && price != null && ath > 0
      ? Math.min(100, Math.max(0, ((price - atl) / (ath - atl)) * 100))
      : null;

  const supplyPct =
    live?.circulatingSupply && live?.maxSupply && live.maxSupply > 0
      ? Math.min(100, (live.circulatingSupply / live.maxSupply) * 100)
      : null;

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          {live?.image && (
            <img src={live.image} alt={live.name ?? symbol} className="w-10 h-10 rounded-full shrink-0"
              style={{ boxShadow: "0 0 12px rgba(0,0,0,0.5)" }} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-black text-white">{live?.name ?? symbol}</span>
              <span className="text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>{symbol}</span>
              {live?.rank && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}>
                  Rank #{live.rank}
                </span>
              )}
            </div>
            {live?.categories && live.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {live.categories.slice(0, 3).map(c => (
                  <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                    style={{ background: "rgba(124,58,237,0.12)", color: "#9f7aea", border: "1px solid rgba(124,58,237,0.2)" }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Market Cap</div>
            <div className="text-[13px] font-bold text-white font-mono">{fmtB(live?.marketCap)}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Volume 24h</div>
            <div className="text-[13px] font-bold text-white font-mono">{fmtB(live?.volume24h)}</div>
          </div>
          {live?.fdv != null && live.fdv > 0 && (
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>FDV</div>
              <div className="text-[13px] font-bold text-white font-mono">{fmtB(live.fdv)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="text-[36px] font-black text-white font-mono tabular-nums tracking-tight leading-none">
          {isFetchingLive && !price ? (
            <div className="h-9 w-48 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
          ) : (
            fmtP(price)
          )}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-black"
            style={{
              background: isUp ? "rgba(38,166,154,0.15)" : "rgba(239,83,80,0.15)",
              color: isUp ? "#26a69a" : "#ef5350",
              border: `1px solid ${isUp ? "rgba(38,166,154,0.25)" : "rgba(239,83,80,0.25)"}`,
            }}>
            {isUp ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {Math.abs(ch24).toFixed(2)}%
          </span>
          <span className="text-[10px]" style={{ color: "#4a5068" }}>24h change</span>
          {live?.priceChange7d != null && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-bold"
              style={{
                background: live.priceChange7d >= 0 ? "rgba(38,166,154,0.08)" : "rgba(239,83,80,0.08)",
                color: live.priceChange7d >= 0 ? "#26a69a" : "#ef5350",
              }}>
              {live.priceChange7d >= 0 ? "+" : ""}{live.priceChange7d.toFixed(2)}% 7d
            </span>
          )}
        </div>
      </div>

      {/* 24h Price Range Bar */}
      {high24 != null && low24 != null && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>24h Range</span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span style={{ color: "#ef5350" }}>{fmtP(low24)}</span>
              <span style={{ color: "#3a4058" }}>—</span>
              <span style={{ color: "#26a69a" }}>{fmtP(high24)}</span>
            </div>
          </div>
          <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="absolute h-full rounded-full"
              style={{ width: `${Math.max(2, Math.min(98, rangePos ?? 50))}%`,
                background: "linear-gradient(90deg, #ef5350, #f7931a 50%, #26a69a)" }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-lg"
              style={{ left: `${Math.max(2, Math.min(96, rangePos ?? 50))}%`,
                transform: "translate(-50%, -50%)", background: "#fff",
                boxShadow: "0 0 6px rgba(255,255,255,0.4)" }} />
          </div>
        </div>
      )}

      {/* ATH / ATL Range Bar */}
      {ath != null && ath > 0 && atl != null && atl > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>All-Time Range</span>
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span style={{ color: "#4a5068" }}>ATL: {fmtP(atl)}</span>
              <span style={{ color: "#3a4058" }}>→</span>
              <span style={{ color: "#4a5068" }}>ATH: {fmtP(ath)}</span>
              {live?.athChange != null && (
                <span style={{ color: "#ef5350" }}>({fmtPct(live.athChange)} from ATH)</span>
              )}
            </div>
          </div>
          <div className="relative h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="absolute h-full rounded-full"
              style={{ width: `${Math.max(1, Math.min(99, athPos ?? 50))}%`,
                background: "linear-gradient(90deg, #ef5350, #f7931a, #2962ff, #26a69a)" }} />
          </div>
          <div className="flex justify-between text-[8px] mt-1 font-mono" style={{ color: "#3a4058" }}>
            <span>ATL</span>
            <span>ATH</span>
          </div>
        </div>
      )}

      {/* Circulating Supply Bar */}
      {supplyPct != null && live?.circulatingSupply && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>Circulating Supply</span>
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="text-white">{supplyPct.toFixed(1)}%</span>
              <span style={{ color: "#4a5068" }}>
                {live.circulatingSupply >= 1e9
                  ? `${(live.circulatingSupply / 1e9).toFixed(2)}B`
                  : `${(live.circulatingSupply / 1e6).toFixed(2)}M`} {symbol}
                {live.maxSupply ? ` / ${live.maxSupply >= 1e9 ? `${(live.maxSupply / 1e9).toFixed(2)}B` : `${(live.maxSupply / 1e6).toFixed(2)}M`} max` : ""}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${supplyPct}%`,
                background: supplyPct > 80 ? "#26a69a" : supplyPct > 50 ? "#2962ff" : "#f7931a" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TokenDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol ?? "").toUpperCase();
  const [chartBgSync, setChartBgSync] = useState(false);

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
      <div className="rounded-2xl p-12 text-center" style={CARD}>
        <p className="text-[13px]" style={{ color: "#5a6072" }}>Missing coin symbol.</p>
      </div>
    );
  }

  if (isError && !hasInstantShell && !metaLoading) {
    return (
      <div className="pb-16">
        <QuickCoinNav currentSymbol={symbol} />
        <div className="rounded-2xl p-12 text-center" style={CARD}>
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

      <QuickCoinNav currentSymbol={symbol} />

      {metaLoading && !live ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-10 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-[400px] w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
          </div>
          <Skeleton className="h-[720px] w-full rounded-2xl animate-pulse min-h-[50vh]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            <CmcPriceHeader live={live} symbol={symbol} isFetchingLive={isFetchingLive} />
            <WorkspaceNav />
            <TradingViewCoinChart
              coinId={cid}
              symbol={symbol}
              live={live}
              onChartRevalidate={setChartBgSync}
            />

            <div id="sec-overview" className="scroll-mt-24 space-y-4">
              <div className="rounded-2xl p-4" style={CARD}>
                <div className="text-[12px] font-bold text-white mb-3">Snapshot</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="ATH" value={fmtP(live?.ath)} sub={live?.athDate ? new Date(live.athDate).toLocaleDateString() : undefined} />
                  <StatCard label="ATH Δ" value={fmtPct(live?.athChange)} color={(live?.athChange ?? 0) >= 0 ? "#26a69a" : "#ef5350"} />
                  <StatCard label="30d" value={fmtPct(live?.priceChange30d)} color={(live?.priceChange30d ?? 0) >= 0 ? "#26a69a" : "#ef5350"} />
                  <StatCard label="1y" value={fmtPct(live?.priceChange1y)} color={(live?.priceChange1y ?? 0) >= 0 ? "#26a69a" : "#ef5350"} />
                </div>
              </div>
            </div>

            <div id="sec-markets" className="scroll-mt-24 space-y-4">
              <div className="rounded-2xl p-4 min-w-0 overflow-hidden" style={CARD}>
                <div className="text-[12px] font-bold text-white mb-3">Market statistics</div>
                <TokenStatsGrid live={live} loading={isFetchingLive && !isDisplayablePrice(live?.price)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                <ExchangeListings exchanges={live?.exchanges} loading={isEnriching && !live?.exchanges?.length} />
                <BlockchainNetworks
                  platforms={live?.platforms}
                  explorers={live?.links?.explorers}
                  loading={isEnriching && !live?.platforms}
                />
              </div>
            </div>

            <div id="sec-news" className="scroll-mt-24">
              <NewsTab symbol={symbol} />
            </div>

            <div id="sec-similar" className="scroll-mt-24">
              <RelatedCoins symbol={symbol} live={live} />
            </div>

            <div id="sec-history" className="scroll-mt-24">
              <div className="rounded-2xl p-5 space-y-2" style={CARD}>
                <div className="text-[12px] font-bold text-white">Historic data</div>
                <p className="text-[11px] leading-relaxed" style={{ color: "#8892a4" }}>
                  Long-range history, indicators, and drawings are powered by the embedded TradingView chart above. CoinGecko remains the source for ATH/ATL and market metadata on this page.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>ATH: {fmtP(live?.ath)}</div>
                  <div>ATL: {fmtP(live?.atl)}</div>
                </div>
              </div>
            </div>

            <div id="sec-ai" className="scroll-mt-24">
              <AiAnalysisTab live={live} symbol={symbol} />
            </div>

            <div id="sec-onchain" className="scroll-mt-24">
              <OnChainTab live={live} symbol={symbol} />
            </div>

            <div id="sec-holders" className="scroll-mt-24">
              <HoldersSection />
            </div>

            <div id="sec-social" className="scroll-mt-24">
              <SocialTab live={live} symbol={symbol} />
            </div>

            <div id="sec-tokenomics" className="scroll-mt-24 space-y-4">
              <div className="rounded-2xl p-4 min-w-0" style={CARD}>
                <div className="text-[12px] font-bold text-white mb-2">Categories</div>
                <CategoriesStrip categories={live?.categories} loading={isEnriching && !live?.categories?.length} />
              </div>
              <InfoTab live={live} symbol={symbol} />
            </div>
          </div>

          <aside className="xl:sticky xl:top-4 xl:self-start z-10">
            <TokenIntelligencePanel
              symbol={symbol}
              live={live}
              isFetchingLive={isFetchingLive}
              isEnriching={isEnriching}
              chartSynced={chartBgSync}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
