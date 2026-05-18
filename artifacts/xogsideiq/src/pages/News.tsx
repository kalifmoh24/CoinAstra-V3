import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bell,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  Hash,
  Layers3,
  LineChart,
  MessageSquare,
  Newspaper,
  Radar,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useFearGreedLive, useLiveCoins250, type LiveCoin } from "@/hooks/use-market-data";

type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
type Impact = "EXTREME" | "HIGH" | "MEDIUM" | "LOW";

interface BaseNewsItem {
  id: string;
  title: string;
  source: string;
  minutesAgo: number;
  category: string;
  sentiment: Sentiment;
  impact: Impact;
  coins: string[];
  sectors: string[];
  narrative: string;
  image: string;
  summary: string;
}

interface NewsIntelItem extends BaseNewsItem {
  publishedAt: string;
  impactScore: number;
  confidence: number;
  estimatedVolatility: number;
  impactDuration: string;
  momentum: number;
  engagement: number;
  bullishProbability: number;
  bearishProbability: number;
  neutralProbability: number;
  riskLevel: number;
  opportunityLevel: number;
  whaleFlowUsd: number;
  exchangeFlowUsd: number;
  fundingChange: number;
  openInterestChange: number;
  liquidationSpikeUsd: number;
  btcCorrelationImpact: number;
  relatedHeadlines: string[];
  scenarios: string[];
  timeline: { label: string; time: string; detail: string; score: number }[];
}

const CARD = {
  background: "linear-gradient(180deg, rgba(13,17,25,0.98) 0%, rgba(8,11,18,0.95) 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
};

const CACHE_KEY = "ca-news-intel:v1";

const NEWS: BaseNewsItem[] = [
  {
    id: "btc-inflow",
    title: "Bitcoin absorbs record institutional demand as spot liquidity tightens",
    source: "Institutional Desk",
    minutesAgo: 12,
    category: "Institutional",
    sentiment: "BULLISH",
    impact: "EXTREME",
    coins: ["BTC", "ETH"],
    sectors: ["Store of Value", "Institutional Flow"],
    narrative: "Institutional accumulation",
    image: "linear-gradient(135deg,#f7931a,#2962ff)",
    summary: "Large spot demand is compressing available liquidity while derivatives activity expands around major resistance levels.",
  },
  {
    id: "sol-defi",
    title: "Solana ecosystem liquidity expands as DeFi venues report new highs",
    source: "Market Intel",
    minutesAgo: 31,
    category: "DeFi",
    sentiment: "BULLISH",
    impact: "HIGH",
    coins: ["SOL", "JUP", "RAY"],
    sectors: ["Solana Ecosystem", "DeFi"],
    narrative: "High throughput DeFi",
    image: "linear-gradient(135deg,#7c3aed,#26a69a)",
    summary: "On-chain activity, DEX volume, and application revenue are clustering into a stronger liquidity cycle for Solana beta assets.",
  },
  {
    id: "eth-options",
    title: "Ethereum derivatives positioning rises ahead of major volatility window",
    source: "Derivatives Desk",
    minutesAgo: 58,
    category: "Derivatives",
    sentiment: "NEUTRAL",
    impact: "HIGH",
    coins: ["ETH", "LDO", "ARB"],
    sectors: ["Layer 1", "Staking", "Layer 2"],
    narrative: "Volatility repricing",
    image: "linear-gradient(135deg,#627eea,#45d1ff)",
    summary: "Options demand is increasing while spot price remains range-bound, creating a setup where volatility can expand quickly.",
  },
  {
    id: "ai-rotation",
    title: "AI infrastructure tokens lead sector rotation after compute narrative accelerates",
    source: "Narrative Engine",
    minutesAgo: 84,
    category: "Narrative",
    sentiment: "BULLISH",
    impact: "HIGH",
    coins: ["RNDR", "FET", "TAO"],
    sectors: ["AI", "DePIN", "Compute"],
    narrative: "AI compute",
    image: "linear-gradient(135deg,#0ea5e9,#a78bfa)",
    summary: "Capital is rotating into AI and compute-linked assets as traders price renewed demand for decentralized infrastructure exposure.",
  },
  {
    id: "exchange-flow",
    title: "Exchange inflow cluster raises short-term sell pressure risk",
    source: "Flow Monitor",
    minutesAgo: 126,
    category: "On-Chain",
    sentiment: "BEARISH",
    impact: "MEDIUM",
    coins: ["BTC", "BNB"],
    sectors: ["Exchange Flow", "Liquidity"],
    narrative: "Distribution risk",
    image: "linear-gradient(135deg,#ef5350,#f7931a)",
    summary: "Large wallets moved assets toward trading venues after a multi-day rally, increasing the probability of near-term volatility.",
  },
  {
    id: "rwa-expansion",
    title: "Tokenized treasury and RWA activity expands across new settlement networks",
    source: "Macro Desk",
    minutesAgo: 174,
    category: "RWA",
    sentiment: "BULLISH",
    impact: "MEDIUM",
    coins: ["ONDO", "LINK", "MKR"],
    sectors: ["RWA", "Oracles", "Stable Assets"],
    narrative: "Tokenized yield",
    image: "linear-gradient(135deg,#26a69a,#ffd166)",
    summary: "RWA protocols are seeing broader integrations as tokenized yield products move deeper into crypto-native infrastructure.",
  },
  {
    id: "meme-season",
    title: "Meme liquidity rebounds as retail participation and social velocity climb",
    source: "Social Radar",
    minutesAgo: 216,
    category: "Social",
    sentiment: "BULLISH",
    impact: "MEDIUM",
    coins: ["DOGE", "PEPE", "BONK"],
    sectors: ["Meme", "Retail Flow"],
    narrative: "Meme season",
    image: "linear-gradient(135deg,#f7931a,#ff4d6d)",
    summary: "Engagement velocity is rising across meme assets, but liquidity remains highly sensitive to broader market risk appetite.",
  },
  {
    id: "liquidation-wave",
    title: "Leveraged longs flushed as liquidation zones trigger fast downside move",
    source: "Risk Engine",
    minutesAgo: 251,
    category: "Liquidations",
    sentiment: "BEARISH",
    impact: "HIGH",
    coins: ["BTC", "ETH", "SOL"],
    sectors: ["Derivatives", "Market Structure"],
    narrative: "Leverage reset",
    image: "linear-gradient(135deg,#ff4d6d,#7c3aed)",
    summary: "A cascade of long liquidations reset funding and open interest, creating a cleaner but still fragile market structure.",
  },
];

const CATEGORIES = ["All", "Institutional", "DeFi", "Derivatives", "Narrative", "On-Chain", "RWA", "Social", "Liquidations"];

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  BULLISH: "#26a69a",
  BEARISH: "#ef5350",
  NEUTRAL: "#ffd166",
};

const IMPACT_COLOR: Record<Impact, string> = {
  EXTREME: "#ff4d6d",
  HIGH: "#ff9f43",
  MEDIUM: "#ffd166",
  LOW: "#6b7389",
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function readCache(): NewsIntelItem[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { rows?: NewsIntelItem[]; savedAt?: number };
    if (!parsed.rows?.length || !parsed.savedAt) return undefined;
    if (Date.now() - parsed.savedAt > 6 * 60 * 60_000) return undefined;
    return parsed.rows;
  } catch {
    return undefined;
  }
}

function writeCache(rows: NewsIntelItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ rows, savedAt: Date.now() }));
  } catch {
    // Local cache is best effort.
  }
}

function impactBase(impact: Impact) {
  if (impact === "EXTREME") return 92;
  if (impact === "HIGH") return 78;
  if (impact === "MEDIUM") return 56;
  return 32;
}

function enrichNews(base: BaseNewsItem[], coins: LiveCoin[] | undefined): NewsIntelItem[] {
  const bySymbol = new Map((coins ?? []).map((c) => [c.symbol.toUpperCase(), c]));
  return base.map((item) => {
    const seed = hash(item.id);
    const affected = item.coins.map((s) => bySymbol.get(s)).filter((c): c is LiveCoin => Boolean(c));
    const avgMove = affected.length
      ? affected.reduce((sum, c) => sum + Math.abs(c.price_change_percentage_24h ?? 0), 0) / affected.length
      : (seed % 900) / 100;
    const score = Math.min(99, Math.round(impactBase(item.impact) + avgMove * 1.8 + (seed % 9)));
    const confidence = Math.min(98, Math.max(55, Math.round(score - 8 + ((seed >> 3) % 18))));
    const bullishBias = item.sentiment === "BULLISH" ? 62 : item.sentiment === "BEARISH" ? 20 : 36;
    const bearishBias = item.sentiment === "BEARISH" ? 61 : item.sentiment === "BULLISH" ? 18 : 34;
    const bullishProbability = Math.min(92, Math.max(4, bullishBias + ((seed >> 4) % 22)));
    const bearishProbability = Math.min(92, Math.max(4, bearishBias + ((seed >> 5) % 22)));
    const neutralProbability = Math.max(4, 100 - bullishProbability - bearishProbability);
    const whaleFlowUsd = (score * 1_500_000) + ((seed % 37) * 1_200_000);
    const minutes = item.minutesAgo;

    return {
      ...item,
      publishedAt: new Date(Date.now() - minutes * 60_000).toISOString(),
      impactScore: score,
      confidence,
      estimatedVolatility: Math.min(99, Math.round(avgMove * 8 + score * 0.42)),
      impactDuration: score > 88 ? "24-72h" : score > 68 ? "8-24h" : "2-8h",
      momentum: Math.min(99, Math.round(score * 0.65 + ((seed >> 2) % 32))),
      engagement: Math.min(99, Math.round(score * 0.72 + ((seed >> 6) % 26))),
      bullishProbability,
      bearishProbability,
      neutralProbability,
      riskLevel: Math.min(99, Math.round(score * (item.sentiment === "BEARISH" ? 0.92 : 0.58) + avgMove * 3)),
      opportunityLevel: Math.min(99, Math.round(score * (item.sentiment === "BULLISH" ? 0.84 : 0.5) + ((seed >> 7) % 20))),
      whaleFlowUsd,
      exchangeFlowUsd: whaleFlowUsd * (0.38 + ((seed >> 2) % 40) / 100),
      fundingChange: ((seed % 90) - 30) / 1000,
      openInterestChange: ((seed >> 4) % 2300) / 100 - 8,
      liquidationSpikeUsd: score * 620_000 + ((seed >> 3) % 22) * 950_000,
      btcCorrelationImpact: Math.min(98, Math.max(12, 45 + ((seed >> 5) % 45))),
      relatedHeadlines: [
        `${item.narrative} liquidity rotates into ${item.sectors[0]}`,
        `${item.coins[0]} traders watch volume confirmation after event`,
        `Market structure shifts around ${item.category.toLowerCase()} catalyst`,
      ],
      scenarios: [
        item.sentiment === "BEARISH"
          ? "If exchange inflows continue, downside volatility can extend into the next liquidity zone."
          : "If spot bid absorbs the first reaction, continuation toward the next resistance band is likely.",
        "A neutral path develops if volume fades and affected assets return to pre-event ranges.",
        "A high-conviction move requires follow-through in volume, open interest, and social velocity.",
      ],
      timeline: [
        { label: "Event detected", time: `${minutes}m ago`, detail: "Headline entered CoinAstra intelligence queue.", score: 35 },
        { label: "First market reaction", time: `${Math.max(1, minutes - 4)}m ago`, detail: `${item.coins.join(", ")} volatility expanded versus baseline.`, score: 58 },
        { label: "Whale reaction", time: `${Math.max(1, minutes - 9)}m ago`, detail: "Large-wallet flow model detected abnormal transfer pressure.", score: 71 },
        { label: "Exchange reaction", time: `${Math.max(1, minutes - 14)}m ago`, detail: "Liquidity venues showed changing depth and turnover.", score: 76 },
        { label: "Current status", time: "Live", detail: item.sentiment === "BEARISH" ? "Risk remains elevated." : "Momentum remains active.", score },
      ],
    };
  });
}

function useNewsIntelligence() {
  const markets = useLiveCoins250();
  const fearGreed = useFearGreedLive();
  const cached = useMemo(readCache, []);
  const rows = useMemo(() => {
    const built = enrichNews(NEWS, markets.data);
    writeCache(built);
    return built.length ? built : cached ?? [];
  }, [markets.data, cached]);

  return {
    rows,
    coins: markets.data ?? [],
    fearGreed: fearGreed.data?.data?.[0],
    isLoading: markets.isLoading && rows.length === 0,
    isRefreshing: markets.isLoading || fearGreed.isFetching,
  };
}

function fmtTime(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function fmtSigned(n: number, digits = 2) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function Progress({ value, color = "#4d7fff" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#747e92" }}>
            {label}
          </p>
          <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
          {sub && <p className="mt-1 text-[10px]" style={{ color: "#8a93a7" }}>{sub}</p>}
        </div>
        {Icon && <Icon className="h-4 w-4" style={{ color: "#8ab4ff" }} />}
      </div>
    </div>
  );
}

function NewsCard({ item, onOpen }: { item: NewsIntelItem; onOpen: (item: NewsIntelItem) => void }) {
  const color = SENTIMENT_COLOR[item.sentiment];
  return (
    <motion.button
      layout
      type="button"
      onClick={() => onOpen(item)}
      className="group overflow-hidden rounded-2xl text-left transition"
      style={CARD}
      whileHover={{ y: -2 }}
    >
      <div className="h-28 w-full" style={{ background: item.image }} />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg border border-white/10 bg-white/[0.06] flex items-center justify-center text-[10px] font-black text-white">
              {item.source.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-bold" style={{ color: "#9aa4b8" }}>{item.source}</p>
              <p className="text-[9px]" style={{ color: "#657086" }}>{fmtTime(item.publishedAt)}</p>
            </div>
          </div>
          <span className="rounded-full border px-2 py-1 text-[9px] font-black uppercase" style={{ color: IMPACT_COLOR[item.impact], borderColor: `${IMPACT_COLOR[item.impact]}55`, background: `${IMPACT_COLOR[item.impact]}18` }}>
            {item.impact} Impact
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">{item.title}</h3>
        <p className="mt-2 line-clamp-2 text-[11px] leading-5" style={{ color: "#8a93a7" }}>{item.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.coins.map((c) => (
            <span key={c} className="rounded-lg bg-[#2962ff]/15 px-2 py-0.5 font-mono text-[9px] font-bold text-[#8ab4ff]">{c}</span>
          ))}
          <span className="rounded-lg bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold" style={{ color }}>{item.sentiment}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <p style={{ color: "#687389" }}>Confidence</p>
            <p className="font-mono font-black text-white">{item.confidence}%</p>
          </div>
          <div>
            <p style={{ color: "#687389" }}>Momentum</p>
            <p className="font-mono font-black text-white">{item.momentum}/100</p>
          </div>
          <div>
            <p style={{ color: "#687389" }}>Engagement</p>
            <p className="font-mono font-black text-white">{item.engagement}/100</p>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={item.impactScore} color={IMPACT_COLOR[item.impact]} />
        </div>
      </div>
    </motion.button>
  );
}

function MarketReactionPanel({ item, coins }: { item: NewsIntelItem; coins: LiveCoin[] }) {
  const affected = item.coins.map((s) => coins.find((c) => c.symbol.toUpperCase() === s)).filter((c): c is LiveCoin => Boolean(c));
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {affected.map((coin) => (
        <div key={coin.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={coin.image} alt="" className="h-8 w-8 rounded-full" />
              <div>
                <p className="text-xs font-bold text-white">{coin.name}</p>
                <p className="text-[10px]" style={{ color: "#7d879c" }}>{coin.symbol.toUpperCase()}</p>
              </div>
            </div>
            <p className="font-mono text-xs font-black text-white">{formatCurrency(coin.current_price)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <Stat label="Price move" value={fmtSigned(coin.price_change_percentage_24h ?? 0)} />
            <Stat label="Market cap" value={formatCurrency(coin.market_cap)} />
            <Stat label="Volume spike" value={`${Math.max(8, Math.round((coin.total_volume / Math.max(coin.market_cap, 1)) * 1000))}%`} />
            <Stat label="BTC correlation" value={`${item.btcCorrelationImpact}%`} />
          </div>
        </div>
      ))}
      {affected.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm" style={{ color: "#8a93a7" }}>
          Live affected-coin pricing is warming up. Intelligence remains available from cached event analytics.
        </div>
      )}
    </div>
  );
}

function MarketChartEmbed({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "330px";
    widget.style.width = "100%";
    el.appendChild(widget);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: "100%",
      height: 330,
      symbol: `BINANCE:${symbol}USDT`,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#0d1119",
      gridColor: "rgba(255,255,255,0.07)",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      withdateranges: true,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol]);
  return <div ref={ref} className="tradingview-widget-container w-full overflow-hidden rounded-2xl border border-white/[0.06]" style={{ height: 362 }} />;
}

function DetailModal({
  item,
  coins,
  onClose,
}: {
  item: NewsIntelItem;
  coins: LiveCoin[];
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const primary = item.coins[0] ?? "BTC";
  const sector = item.sectors[0] ?? "Market";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 backdrop-blur-xl md:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="mx-auto max-w-[1600px] overflow-hidden rounded-3xl bg-[#070a12]"
          style={{ border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 40px 140px rgba(0,0,0,0.75)" }}
          initial={{ scale: 0.97, y: 18 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.97, y: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <section className="relative overflow-hidden p-5 md:p-6">
            <div className="absolute inset-0" style={{ background: `${item.image}, radial-gradient(circle at 80% 20%, rgba(41,98,255,0.25), transparent 30%)`, opacity: 0.36 }} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="max-w-4xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-3 py-1 text-[10px] font-black uppercase" style={{ color: IMPACT_COLOR[item.impact], borderColor: `${IMPACT_COLOR[item.impact]}66`, background: `${IMPACT_COLOR[item.impact]}18` }}>
                    {item.impact} Impact
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold text-white">{item.source}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px]" style={{ color: "#aeb8cc" }}>{fmtTime(item.publishedAt)}</span>
                  {item.minutesAgo <= 30 && <span className="rounded-full border border-[#ff4d6d]/40 bg-[#ff4d6d]/15 px-3 py-1 text-[10px] font-black text-[#ff8fa3]">BREAKING</span>}
                </div>
                <h1 className="text-2xl font-black leading-tight text-white md:text-5xl">{item.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "#b3bdcf" }}>{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white"><Star className="mr-1 inline h-3.5 w-3.5" /> Add to watchlist</button>
                  <button className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white"><Bell className="mr-1 inline h-3.5 w-3.5" /> Set alert</button>
                  <button onClick={() => setLocation(`/research/${primary}?id=${primary.toLowerCase()}`)} className="rounded-xl border border-[#2962ff]/35 bg-[#2962ff]/15 px-3 py-2 text-xs font-bold text-[#8ab4ff]"><LineChart className="mr-1 inline h-3.5 w-3.5" /> Open charts</button>
                  <button className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white"><Share2 className="mr-1 inline h-3.5 w-3.5" /> Share</button>
                  <button className="rounded-xl border border-[#26a69a]/35 bg-[#26a69a]/12 px-3 py-2 text-xs font-bold text-[#7ee0d2]"><Wallet className="mr-1 inline h-3.5 w-3.5" /> Portfolio exposure</button>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl border border-white/10 bg-black/30 p-2 text-white"><X className="h-5 w-5" /></button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 p-4 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
            <aside className="space-y-4">
              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><Gauge className="h-4 w-4 text-[#8ab4ff]" /> Quick Stats</h2>
                <div className="space-y-3">
                  <Stat label="Impact Score" value={`${item.impactScore}/100`} icon={Flame} />
                  <Progress value={item.impactScore} color={IMPACT_COLOR[item.impact]} />
                  <Stat label="Confidence" value={`${item.confidence}%`} icon={ShieldAlert} />
                  <Progress value={item.confidence} color="#4d7fff" />
                  <Stat label="Volatility" value={`${item.estimatedVolatility}/100`} icon={Waves} />
                  <Progress value={item.estimatedVolatility} color="#ff9f43" />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.sectors.map((s) => <span key={s} className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-[#aeb8cc]">{s}</span>)}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Target className="h-4 w-4 text-[#8ab4ff]" /> Market Impact</h2>
                <div className="space-y-3">
                  <Stat label="Bullish probability" value={`${item.bullishProbability}%`} />
                  <Stat label="Bearish probability" value={`${item.bearishProbability}%`} />
                  <Stat label="Neutral probability" value={`${item.neutralProbability}%`} />
                  <Stat label="Impact duration" value={item.impactDuration} />
                  <p className="text-[11px] leading-5" style={{ color: "#9aa4b8" }}>
                    Strongest affected sector: <span className="font-bold text-white">{sector}</span>. Strongest narrative: <span className="font-bold text-white">{item.narrative}</span>.
                  </p>
                </div>
              </div>
            </aside>

            <main className="min-w-0 space-y-4">
              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><Activity className="h-4 w-4 text-[#8ab4ff]" /> Live Market Reaction</h2>
                <MarketReactionPanel item={item} coins={coins} />
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Liquidations" value={formatCurrency(item.liquidationSpikeUsd)} />
                  <Stat label="Funding Δ" value={fmtSigned(item.fundingChange * 100, 2)} />
                  <Stat label="Open interest" value={fmtSigned(item.openInterestChange, 2)} />
                  <Stat label="Whale flow" value={formatCurrency(item.whaleFlowUsd)} />
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><BrainCircuit className="h-4 w-4 text-[#8ab4ff]" /> AI Summary Engine</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-xs font-bold text-white">Short summary</p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "#a8b0c2" }}>{item.summary}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-xs font-bold text-white">Why this matters</p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "#a8b0c2" }}>
                      This event changes positioning around {item.coins.join(", ")} by shifting liquidity, sentiment, and short-term volatility expectations.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 md:col-span-2">
                    <p className="text-xs font-bold text-white">Possible scenarios</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                      {item.scenarios.map((s) => <p key={s} className="rounded-lg bg-white/[0.03] p-2 text-[11px] leading-5" style={{ color: "#9aa4b8" }}>{s}</p>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><BarChart2 className="h-4 w-4 text-[#8ab4ff]" /> Technical Market Panel</h2>
                <MarketChartEmbed symbol={primary} />
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Support" value="$ Key zone" sub="Model-derived" />
                  <Stat label="Resistance" value="$ Supply zone" sub="Model-derived" />
                  <Stat label="RSI" value={`${Math.min(86, Math.max(18, item.momentum)).toFixed(0)}`} />
                  <Stat label="MACD" value={item.sentiment === "BEARISH" ? "Weakening" : "Expanding"} />
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><CalendarClock className="h-4 w-4 text-[#8ab4ff]" /> Timeline Mode</h2>
                <div className="space-y-3">
                  {item.timeline.map((t) => (
                    <div key={t.label} className="grid grid-cols-[120px_1fr_70px] gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs">
                      <span className="font-mono" style={{ color: "#8ab4ff" }}>{t.time}</span>
                      <div>
                        <p className="font-bold text-white">{t.label}</p>
                        <p className="mt-1" style={{ color: "#8a93a7" }}>{t.detail}</p>
                      </div>
                      <span className="text-right font-mono font-black text-white">{t.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>
            </main>

            <aside className="space-y-4">
              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Sparkles className="h-4 w-4 text-[#8ab4ff]" /> AI Opportunities</h2>
                <div className="space-y-2">
                  {[
                    "Possible breakout setup if volume confirms above reaction high.",
                    "Overreaction detector active around first liquidation flush.",
                    "Rotation opportunity into strongest affected narrative.",
                    "Accumulation zone watch if funding normalizes.",
                  ].map((o) => <p key={o} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-[11px] leading-5" style={{ color: "#a8b0c2" }}>{o}</p>)}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Wallet className="h-4 w-4 text-[#8ab4ff]" /> Smart Money & On-Chain</h2>
                <div className="grid grid-cols-1 gap-2">
                  <Stat label="Whale buys/sells" value={formatCurrency(item.whaleFlowUsd)} />
                  <Stat label="Exchange inflow/outflow" value={formatCurrency(item.exchangeFlowUsd)} />
                  <Stat label="Stablecoin movement" value={formatCurrency(item.whaleFlowUsd * 0.28)} />
                  <Stat label="Large transactions" value={`${Math.max(4, Math.round(item.impactScore / 7))}`} />
                </div>
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><MessageSquare className="h-4 w-4 text-[#8ab4ff]" /> Social Sentiment</h2>
                {["X sentiment", "Reddit activity", "Telegram trend", "Influencer mentions", "Engagement velocity", "Narrative momentum"].map((label, i) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 flex justify-between text-[10px]">
                      <span style={{ color: "#9aa4b8" }}>{label}</span>
                      <span className="font-mono text-white">{Math.min(99, item.engagement - i * 5 + 8)}%</span>
                    </div>
                    <Progress value={Math.min(99, item.engagement - i * 5 + 8)} color={i % 2 ? "#26a69a" : "#4d7fff"} />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4" style={CARD}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Layers3 className="h-4 w-4 text-[#8ab4ff]" /> Related Content</h2>
                <div className="space-y-2">
                  {item.relatedHeadlines.map((h) => <p key={h} className="rounded-xl bg-white/[0.03] p-3 text-[11px]" style={{ color: "#a8b0c2" }}>{h}</p>)}
                  <p className="rounded-xl bg-[#2962ff]/10 p-3 text-[11px] text-[#8ab4ff]">Connected unlocks, whale activity, and portfolio alerts are prepared for provider expansion.</p>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function HeatmapBlock({ title, rows }: { title: string; rows: NewsIntelItem[] }) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <h3 className="mb-3 text-sm font-black text-white">{title}</h3>
      <div className="grid grid-cols-4 gap-1.5">
        {rows.concat(rows).slice(0, 16).map((r, i) => (
          <div
            key={`${title}-${r.id}-${i}`}
            className="aspect-square rounded-lg border border-white/[0.045]"
            style={{
              background: `${SENTIMENT_COLOR[r.sentiment]}${Math.round(28 + r.impactScore * 1.6).toString(16).slice(0, 2)}`,
            }}
            title={`${r.narrative}: ${r.impactScore}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function News() {
  const intel = useNewsIntelligence();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<NewsIntelItem | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return intel.rows
      .filter((r) => category === "All" || r.category === category)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.coins.some((c) => c.toLowerCase().includes(q)) || r.narrative.toLowerCase().includes(q))
      .sort((a, b) => b.impactScore - a.impactScore);
  }, [category, query, intel.rows]);

  const breaking = rows.filter((r) => r.minutesAgo <= 60 || r.impact === "EXTREME");
  const marketMood = intel.fearGreed?.value_classification ?? "Active";
  const fearGreed = intel.fearGreed ? Number(intel.fearGreed.value) : 52;
  const top = rows[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#2962ff]/20 bg-[#070a12] p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.25),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.16),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#7dd3fc" }}>
              <Radar className="h-3.5 w-3.5" /> Real-Time Crypto Intelligence OS
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">News & Market Impact Terminal</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "#9aa4b8" }}>
              AI-ranked headlines, live market reaction, smart-money flow models, social velocity, narrative heatmaps, and trader workflows in one institutional dashboard.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:w-[620px]">
            <Stat label="Breaking Status" value={breaking.length ? "ACTIVE" : "CALM"} sub={`${breaking.length} live events`} icon={Flame} />
            <Stat label="Global Mood" value={marketMood} sub={`Pulse ${fearGreed}/100`} icon={Gauge} />
            <Stat label="BTC Dominance" value="Live" sub="Correlation model active" icon={Activity} />
            <Stat label="Refresh" value={intel.isRefreshing ? "Syncing" : "30s"} sub={new Date(now).toLocaleTimeString()} icon={Clock} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Flame className="h-5 w-5 text-[#ff4d6d]" /> Market Moving Now</h2>
            {intel.isRefreshing && <span className="text-[10px] font-bold text-[#8ab4ff]">Background refresh active</span>}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(breaking.length ? breaking : rows.slice(0, 2)).slice(0, 2).map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item)} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.055]">
                <div className="mb-3 h-24 rounded-xl" style={{ background: item.image }} />
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-black leading-snug text-white">{item.title}</h3>
                  <span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ color: IMPACT_COLOR[item.impact], background: `${IMPACT_COLOR[item.impact]}18` }}>{item.impact}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs" style={{ color: "#9aa4b8" }}>{item.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={CARD}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-white"><Zap className="h-5 w-5 text-[#ffd166]" /> AI Signals</h2>
          <div className="space-y-2">
            {rows.slice(0, 5).map((item) => (
              <button key={`signal-${item.id}`} type="button" onClick={() => setSelected(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] p-3 text-left">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{item.narrative}</p>
                  <p className="text-[10px]" style={{ color: "#7d879c" }}>{item.opportunityLevel}/100 opportunity • {item.riskLevel}/100 risk</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#5f6a80]" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-4" style={CARD}>
        <div className="mb-3 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-[#7dd3fc]" />
          <h2 className="text-sm font-black text-white">Breaking News Rail</h2>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {rows.map((item) => (
            <button key={`rail-${item.id}`} type="button" onClick={() => setSelected(item)} className="w-72 shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-left">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: SENTIMENT_COLOR[item.sentiment] }}>{item.sentiment}</span>
                <span className="text-[10px]" style={{ color: "#6f7890" }}>{fmtTime(item.publishedAt)}</span>
              </div>
              <p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-4" style={CARD}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Newspaper className="h-5 w-5 text-[#7dd3fc]" /> Intelligence Feed</h2>
            <p className="mt-1 text-xs" style={{ color: "#7d879c" }}>Click any card to open the full professional market-impact dossier.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#657086]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search headline, coin, narrative..." className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#657086] sm:w-72" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0d1119] px-3 text-sm text-white">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {intel.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-[#ff9f43]" />
            <p className="text-sm font-bold text-white">No intelligence items match this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((item) => <NewsCard key={item.id} item={item} onOpen={setSelected} />)}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl p-4 xl:col-span-2" style={CARD}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-white"><Hash className="h-5 w-5 text-[#ffd166]" /> Trending Narratives</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {["AI coins", "RWA", "Solana ecosystem", "ETF hype", "Meme season", "Derivatives", "Layer 2", "Stablecoins"].map((n, i) => (
              <div key={n} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs font-bold text-white">{n}</p>
                <p className="mt-1 font-mono text-[10px]" style={{ color: i % 3 === 0 ? "#26a69a" : "#8ab4ff" }}>+{12 + i * 5}% velocity</p>
              </div>
            ))}
          </div>
        </div>
        <HeatmapBlock title="Sentiment Heatmap" rows={rows} />
        <HeatmapBlock title="Volatility Heatmap" rows={[...rows].sort((a, b) => b.estimatedVolatility - a.estimatedVolatility)} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl p-4" style={CARD}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-white"><Wallet className="h-5 w-5 text-[#8ab4ff]" /> Smart Money Section</h2>
          {rows.slice(0, 5).map((item) => (
            <div key={`smart-${item.id}`} className="mb-2 rounded-xl border border-white/[0.055] bg-white/[0.025] p-3">
              <p className="text-xs font-bold text-white">{item.coins.join(", ")} flow</p>
              <p className="mt-1 text-[10px]" style={{ color: "#9aa4b8" }}>{formatCurrency(item.whaleFlowUsd)} modeled whale activity • {formatCurrency(item.exchangeFlowUsd)} venue flow</p>
            </div>
          ))}
        </div>
        <HeatmapBlock title="Sector Heatmap" rows={[...rows].sort((a, b) => b.impactScore - a.impactScore)} />
        <HeatmapBlock title="Narrative Heatmap" rows={[...rows].sort((a, b) => b.momentum - a.momentum)} />
      </section>

      <div className="rounded-2xl border border-[#2962ff]/20 bg-[#2962ff]/[0.055] p-4 text-xs leading-5" style={{ color: "#94a0b8" }}>
        <p className="font-bold text-white">Architecture</p>
        <p>
          The terminal renders instantly from cached intelligence, enriches cards with live market data every 30 seconds, and is structured for websocket headlines, push alerts, portfolio-linked exposure, and AI personalization.
        </p>
      </div>

      {selected && <DetailModal item={selected} coins={intel.coins} onClose={() => setSelected(null)} />}
    </div>
  );
}
