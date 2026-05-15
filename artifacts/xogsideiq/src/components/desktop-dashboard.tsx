import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap, Waves,
  Shield, Globe, Activity, BarChart2, Newspaper, Briefcase, Network, Bell,
  ChevronRight, Clock, ArrowRightLeft, Flame, Star, Eye, Target, Cpu,
  RefreshCw, AlertTriangle, CheckCircle2, Sparkles, Info, LayoutGrid,
} from "lucide-react";
import {
  useLiveCoins, useGainersLosers, useTrendingCoins,
  useFearGreedLive, useMemeCoinLive, type LiveCoin,
} from "@/hooks/use-market-data";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG } from "@/lib/ai-engine";
import { useGetMarketOverview, getGetMarketOverviewQueryKey } from "@workspace/api-client-react";
import { useTheme } from "@/components/theme-provider";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtP(p: number): string {
  if (!p) return "—";
  if (p >= 1000) return "$" + p.toLocaleString("en", { maximumFractionDigits: 0 });
  if (p >= 1)    return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toFixed(7);
}
function fmtL(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}
function Skel({ w, h, r = "rounded-xl" }: { w: string; h: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: "rgba(255,255,255,0.06)" }} />;
}
function Pulse({ color = "#26a69a", size = 6 }: { color?: string; size?: number }) {
  return <span className="rounded-full animate-pulse inline-block shrink-0" style={{ width: size, height: size, background: color }} />;
}
function GlowCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", ...style }}>
      {children}
    </div>
  );
}
function SectionLabel({ title, icon: Icon, color = "#2962ff", badge, link, linkLabel = "View all" }: {
  title: string; icon?: React.ElementType; color?: string; badge?: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} style={{ color }} />}
        <span className="text-[14px] font-black text-white">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>{badge}</span>
        )}
      </div>
      {link && (
        <Link href={link}>
          <span className="flex items-center gap-1 text-[11px] font-semibold transition-all hover:opacity-80" style={{ color: "#4d7fff" }}>
            {linkLabel} <ChevronRight size={11} />
          </span>
        </Link>
      )}
    </div>
  );
}

// ── MiniSparklineSVG ─────────────────────────────────────────────────────────
function MiniSpark({ coin, w = 80, h = 32 }: { coin: LiveCoin; w?: number; h?: number }) {
  const pts = coin.sparkline_in_7d?.price ?? [];
  if (pts.length < 2) {
    const up = coin.price_change_percentage_24h >= 0;
    const c = up ? "#26a69a" : "#ef5350";
    const src = up ? "0,28 20,22 40,18 60,14 80,10" : "0,10 20,14 40,18 60,22 80,28";
    return <svg width={w} height={h} viewBox={`0 0 80 32`}><polyline points={src} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
  }
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const xs = pts.filter((_, i) => i % Math.ceil(pts.length / 20) === 0).slice(0, 20);
  const norm = xs.map(p => ((p - min) / range) * (h - 4) + 2);
  const step = (w - 4) / (norm.length - 1);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${i * step + 2} ${h - y}`).join(" ");
  const up = coin.price_change_percentage_24h >= 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={path} fill="none" stroke={up ? "#26a69a" : "#ef5350"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Semi-circle Gauge ────────────────────────────────────────────────────────
function ArcGauge({ value, color, label, size = 110 }: { value: number; color: string; label: string; size?: number }) {
  const r = size / 2 - 12;
  const cx = size / 2, cy = size / 2 + 6;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - value / 100);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 18}`}>
        <path d={`M ${12} ${cy} A ${r} ${r} 0 0 1 ${size - 12} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} strokeLinecap="round" />
        <motion.path d={`M ${12} ${cy} A ${r} ${r} 0 0 1 ${size - 12} ${cy}`}
          fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={18} fontWeight="900" fontFamily="monospace">{value}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#4a5268" fontSize={8}>{label}</text>
      </svg>
    </div>
  );
}

// ── Static data ──────────────────────────────────────────────────────────────
const NARRATIVES_DATA = [
  { id: "ai", name: "AI Coins", score: 91, ch24: "+12.4%", ch7d: "+28.1%", pos: true, inflow: "$842M", coins: ["RNDR","FET","AGIX","OCEAN"], color: "#7c3aed" },
  { id: "depin", name: "DePIN", score: 84, ch24: "+8.7%", ch7d: "+19.4%", pos: true, inflow: "$421M", coins: ["HNT","IOTX","WIFI","POKT"], color: "#2962ff" },
  { id: "rwa", name: "Real World Assets", score: 78, ch24: "+6.2%", ch7d: "+14.8%", pos: true, inflow: "$318M", coins: ["ONDO","MPL","CFG","RIO"], color: "#f7931a" },
  { id: "l2", name: "Layer 2", score: 72, ch24: "+3.1%", ch7d: "+8.4%", pos: true, inflow: "$284M", coins: ["ARB","OP","ZKSYNC","MATIC"], color: "#26a69a" },
  { id: "meme", name: "Meme Coins", score: 61, ch24: "+3.4%", ch7d: "+18.2%", pos: true, inflow: "$1.2B", coins: ["DOGE","SHIB","PEPE","BONK"], color: "#ef5350" },
  { id: "defi", name: "DeFi", score: 58, ch24: "+1.4%", ch7d: "+4.2%", pos: true, inflow: "$192M", coins: ["UNI","AAVE","GMX","CRV"], color: "#0ea5e9" },
];

const AI_OPPS = [
  { coin: "SOL", name: "Solana", type: "BREAKOUT", gain: "+32%", conf: 94, risk: "LOW", smart: "ACCUMULATING", momentum: 85, color: "#26a69a", desc: "Breaking key resistance with 4.8× volume" },
  { coin: "SUI", name: "SUI", type: "WHALE BUYING", gain: "+28%", conf: 88, risk: "MEDIUM", smart: "ACCUMULATING", momentum: 92, color: "#0ea5e9", desc: "12 large wallets accumulated last 48h" },
  { coin: "LINK", name: "Chainlink", type: "AI SIGNAL", gain: "+22%", conf: 84, risk: "LOW", smart: "ACCUMULATING", momentum: 68, color: "#7c3aed", desc: "Multi-timeframe confluence BUY signal" },
  { coin: "RNDR", name: "Render", type: "OVERSOLD", gain: "+19%", conf: 82, risk: "MEDIUM", smart: "NEUTRAL", momentum: 64, color: "#f7931a", desc: "RSI 28 — historically strong reversal zone" },
  { coin: "JTO", name: "Jito", type: "EARLY GEM", gain: "+42%", conf: 79, risk: "MEDIUM", smart: "ACCUMULATING", momentum: 76, color: "#ec4899", desc: "Solana DeFi TVL growing 34% week-over-week" },
  { coin: "INJ", name: "Injective", type: "MOMENTUM", gain: "+24%", conf: 77, risk: "LOW", smart: "ACCUMULATING", momentum: 71, color: "#f7931a", desc: "Consecutive green weeks + smart money inflow" },
];

const WHALE_TXNS = [
  { coin: "SOL", from: "Coinbase", to: "Cold Wallet", type: "OUT", amt: "215,000 SOL", usd: "$38.3M", time: "2m", bullish: true },
  { coin: "BTC", from: "Unknown", to: "Binance", type: "IN", amt: "42.5 BTC", usd: "$2.87M", time: "5m", bullish: false },
  { coin: "ETH", from: "Jump Trading", to: "Cold Wallet", type: "TRANSFER", amt: "8,420 ETH", usd: "$27.4M", time: "9m", bullish: true },
  { coin: "USDT", from: "Tether Treasury", to: "Binance", type: "MINT", amt: "50M USDT", usd: "$50M", time: "14m", bullish: true },
  { coin: "LINK", from: "Smart Money", to: "Upbit", type: "IN", amt: "1.2M LINK", usd: "$18.7M", time: "22m", bullish: false },
  { coin: "BTC", from: "Dormant (7yr)", to: "OKX", type: "IN", amt: "18.2 BTC", usd: "$1.23M", time: "37m", bullish: false },
];

const NEWS_DATA = [
  { title: "BlackRock Bitcoin ETF Records $842M Single-Day Inflow — Largest Ever", source: "Bloomberg", time: "12m", sentiment: "BULLISH", color: "#26a69a", coin: "BTC", impact: "HIGH", social: 4820 },
  { title: "Solana DeFi TVL Hits All-Time High at $7.2B Amid Network Growth", source: "The Block", time: "34m", sentiment: "BULLISH", color: "#26a69a", coin: "SOL", impact: "HIGH", social: 2940 },
  { title: "SEC Approves Ethereum Spot ETF Options — Institutions Rush In", source: "CoinDesk", time: "1h", sentiment: "BULLISH", color: "#26a69a", coin: "ETH", impact: "HIGH", social: 3210 },
  { title: "Binance Faces New Regulatory Scrutiny in South Korea", source: "Reuters", time: "2h", sentiment: "BEARISH", color: "#ef5350", coin: "BNB", impact: "MEDIUM", social: 1840 },
  { title: "DOGE Technical Distribution Pattern Warns of Correction", source: "TradingView", time: "3h", sentiment: "BEARISH", color: "#ef5350", coin: "DOGE", impact: "LOW", social: 980 },
  { title: "Chainlink CCIP Now Live on 20+ Blockchain Networks", source: "Decrypt", time: "4h", sentiment: "BULLISH", color: "#26a69a", coin: "LINK", impact: "MEDIUM", social: 1420 },
];

const AI_ALERTS_DATA = [
  { type: "WHALE", title: "215K SOL exiting Coinbase to cold wallet", color: "#0ea5e9", icon: Waves, time: "2m", priority: "HIGH" },
  { type: "BREAKOUT", title: "SOL breaking $180 resistance on 4.8× volume", color: "#26a69a", icon: TrendingUp, time: "8m", priority: "HIGH" },
  { type: "AI SIGNAL", title: "LINK upgraded: WATCH → STRONG BUY", color: "#7c3aed", icon: Zap, time: "14m", priority: "HIGH" },
  { type: "LIQUIDATION", title: "$24M DOGE longs liquidated at $0.138", color: "#ef5350", icon: AlertTriangle, time: "21m", priority: "MEDIUM" },
  { type: "SMART $", title: "Jump Trading accumulated 8,420 ETH in 24h", color: "#f7931a", icon: Eye, time: "35m", priority: "MEDIUM" },
  { type: "VOLUME", title: "JTO volume 5.4× above 30-day average", color: "#ec4899", icon: BarChart2, time: "48m", priority: "LOW" },
];

const ONCHAIN_CHAINS = [
  { name: "Ethereum", color: "#627EEA", tvl: "$48.2B", dex: "$2.80B", gas: "18 Gwei", wallets: "428K", txs: "1.02M", ch: "+3.2%" },
  { name: "Solana", color: "#9945FF", tvl: "$6.80B", dex: "$980M", gas: "0.001 SOL", wallets: "892K", txs: "48.2M", ch: "+8.7%" },
  { name: "Base", color: "#0052FF", tvl: "$4.10B", dex: "$420M", gas: "0.8 Gwei", wallets: "218K", txs: "2.84M", ch: "+12.1%" },
  { name: "BNB Chain", color: "#F3BA2F", tvl: "$5.40B", dex: "$380M", gas: "3 Gwei", wallets: "312K", txs: "4.12M", ch: "+1.4%" },
];

const HEATMAP_DATA = [
  { coin: "BTC", ch: 2.4, size: 10 }, { coin: "ETH", ch: 1.8, size: 8 }, { coin: "SOL", ch: 5.2, size: 6 },
  { coin: "BNB", ch: 0.8, size: 6 }, { coin: "AVAX", ch: 1.2, size: 5 }, { coin: "DOGE", ch: -2.1, size: 5 },
  { coin: "LINK", ch: 4.3, size: 4 }, { coin: "ARB", ch: 0.6, size: 4 }, { coin: "SUI", ch: 12.4, size: 4 },
  { coin: "RNDR", ch: 3.1, size: 3 }, { coin: "ADA", ch: -1.2, size: 5 }, { coin: "BONK", ch: 14.8, size: 3 },
  { coin: "PEPE", ch: 0.8, size: 3 }, { coin: "INJ", ch: 2.9, size: 3 }, { coin: "JTO", ch: 8.9, size: 2 },
  { coin: "OP", ch: -0.4, size: 3 }, { coin: "FET", ch: 6.2, size: 2 }, { coin: "WIF", ch: 7.6, size: 2 },
];

function heatColor(ch: number): string {
  if (ch > 10) return "#0d6b58"; if (ch > 5) return "#1a9176"; if (ch > 2) return "#22a984";
  if (ch > 0) return "#2ab596"; if (ch > -2) return "#8a2424"; if (ch > -5) return "#a83030";
  return "#c43838";
}

const TABLE_TABS = ["All", "AI Coins", "Meme", "Layer 1", "RWA", "DeFi", "Gaming", "DePIN"] as const;

const TAB_CATEGORY_ID: Record<typeof TABLE_TABS[number], string | null> = {
  "All":      null,
  "AI Coins": "artificial-intelligence",
  "Meme":     "meme-token",
  "Layer 1":  "layer-1",
  "RWA":      "real-world-assets-rwa",
  "DeFi":     "decentralized-finance-defi",
  "Gaming":   "gaming",
  "DePIN":    "decentralized-physical-infrastructure-networks-depin",
};

async function fetchCategoryTop10(categoryId: string): Promise<any[]> {
  const res = await fetch(`/api/coins/markets?per_page=10&page=1&category=${encodeURIComponent(categoryId)}&sparkline=false&price_change_percentage=1h,7d`);
  if (!res.ok) return [];
  return res.json();
}

const MOCK_COINS = [
  { rank: 1, coin: "BTC", name: "Bitcoin", price: 67482.50, ch1h: 0.2, ch24: 2.4, ch7d: 4.8, vol: 42_000_000_000, mcap: 1_326_000_000_000, aiScore: 82, signal: "BUY", sentiment: "BULLISH", whale: "ACC", risk: "LOW" },
  { rank: 2, coin: "ETH", name: "Ethereum", price: 3248.75, ch1h: 0.4, ch24: 1.8, ch7d: 6.2, vol: 18_200_000_000, mcap: 390_000_000_000, aiScore: 79, signal: "BUY", sentiment: "BULLISH", whale: "ACC", risk: "LOW" },
  { rank: 3, coin: "BNB", name: "BNB", price: 412.30, ch1h: -0.1, ch24: 0.8, ch7d: -1.2, vol: 1_800_000_000, mcap: 62_000_000_000, aiScore: 64, signal: "WATCH", sentiment: "NEUTRAL", whale: "NEU", risk: "MEDIUM" },
  { rank: 4, coin: "SOL", name: "Solana", price: 178.32, ch1h: 1.2, ch24: 5.2, ch7d: 18.4, vol: 4_200_000_000, mcap: 82_000_000_000, aiScore: 94, signal: "STRONG BUY", sentiment: "VERY BULLISH", whale: "ACC", risk: "LOW" },
  { rank: 5, coin: "DOGE", name: "Dogecoin", price: 0.138, ch1h: -0.8, ch24: -2.1, ch7d: -4.8, vol: 2_100_000_000, mcap: 19_800_000_000, aiScore: 42, signal: "SELL", sentiment: "BEARISH", whale: "DIST", risk: "HIGH" },
  { rank: 6, coin: "ADA", name: "Cardano", price: 0.448, ch1h: 0.1, ch24: -1.2, ch7d: -3.1, vol: 480_000_000, mcap: 15_800_000_000, aiScore: 55, signal: "WATCH", sentiment: "NEUTRAL", whale: "NEU", risk: "MEDIUM" },
  { rank: 7, coin: "AVAX", name: "Avalanche", price: 36.80, ch1h: 0.6, ch24: 1.2, ch7d: 2.8, vol: 620_000_000, mcap: 15_200_000_000, aiScore: 67, signal: "BUY", sentiment: "BULLISH", whale: "ACC", risk: "LOW" },
  { rank: 8, coin: "LINK", name: "Chainlink", price: 15.60, ch1h: 0.9, ch24: 4.3, ch7d: 12.1, vol: 920_000_000, mcap: 9_100_000_000, aiScore: 88, signal: "BUY", sentiment: "BULLISH", whale: "ACC", risk: "LOW" },
  { rank: 9, coin: "DOT", name: "Polkadot", price: 6.82, ch1h: -0.2, ch24: -0.8, ch7d: -2.4, vol: 280_000_000, mcap: 8_900_000_000, aiScore: 51, signal: "WATCH", sentiment: "NEUTRAL", whale: "NEU", risk: "MEDIUM" },
  { rank: 10, coin: "RNDR", name: "Render", price: 8.45, ch1h: 1.4, ch24: 3.1, ch7d: 9.8, vol: 380_000_000, mcap: 3_400_000_000, aiScore: 85, signal: "BUY", sentiment: "BULLISH", whale: "ACC", risk: "LOW" },
];

const SIG_COLOR: Record<string, string> = {
  "STRONG BUY": "#26a69a", BUY: "#26a69a", WATCH: "#f7931a", SELL: "#ef5350",
};
const RISK_COLOR: Record<string, string> = { LOW: "#26a69a", MEDIUM: "#f7931a", HIGH: "#ef5350" };

// ════════════════════════════════════════════════════════════════════════════
export function DesktopDashboard() {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [tableTab, setTableTab] = useState<typeof TABLE_TABS[number]>("All");
  const [expandedNews, setExpandedNews] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [, setLocation] = useLocation();
  const nav = (sym: string) => setLocation(`/research/${sym.toUpperCase()}`);

  const { data: cgCoins, isLoading: coinsLoading, dataUpdatedAt } = useLiveCoins();
  const { gainers, losers } = useGainersLosers(6);
  const { data: fearGreedData } = useFearGreedLive();
  const { data: overview } = useGetMarketOverview({ query: { queryKey: getGetMarketOverviewQueryKey() } });
  const liveMemeCoins = useMemeCoinLive();

  const activeCategoryId = TAB_CATEGORY_ID[tableTab];
  const { data: categoryCoins, isLoading: categoryLoading } = useQuery({
    queryKey: ["dash-category-top10", activeCategoryId],
    queryFn: () => fetchCategoryTop10(activeCategoryId!),
    enabled: activeCategoryId !== null,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const fg = fearGreedData?.data?.[0];
  const fgVal = fg ? parseInt(fg.value) : (overview?.fearGreedIndex ?? 42);
  const fgLabel = fg?.value_classification ?? overview?.fearGreedLabel ?? "Fear";
  const fgColor = fgVal < 25 ? "#ef5350" : fgVal < 45 ? "#f7931a" : fgVal < 55 ? "#787b86" : "#26a69a";

  const btcCoin = useMemo(() => cgCoins?.find(c => c.id === "bitcoin"), [cgCoins]);
  const ethCoin = useMemo(() => cgCoins?.find(c => c.id === "ethereum"), [cgCoins]);
  const solCoin = useMemo(() => cgCoins?.find(c => c.id === "solana"), [cgCoins]);

  const btcAi = useMemo(() => analyzeToken({
    priceChange24h: btcCoin?.price_change_percentage_24h ?? 2.4,
    priceChange7d: btcCoin?.price_change_percentage_7d_in_currency ?? 4.8,
    volume24h: btcCoin?.total_volume ?? 42_000_000_000,
    marketCap: btcCoin?.market_cap ?? 1_326_000_000_000,
    symbol: "BTC",
  }), [btcCoin]);

  const liveTableCoins = useMemo(() => {
    // In category mode, use fetched category coins
    const sourceCoins: any[] | null = activeCategoryId
      ? (categoryCoins ?? null)
      : (cgCoins ?? null);

    if (!sourceCoins || sourceCoins.length < 1) return [];
    return sourceCoins.slice(0, 10).map((c: any, i: number) => {
      const ai = analyzeToken({
        priceChange24h: c.price_change_percentage_24h ?? 0,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? undefined,
        volume24h: c.total_volume ?? 0,
        marketCap: c.market_cap ?? 0,
        symbol: c.symbol ?? "",
      });
      return {
        rank: i + 1,
        coin: (c.symbol ?? "").toUpperCase(),
        name: c.name ?? "",
        price: c.current_price ?? 0,
        ch1h: c.price_change_percentage_1h_in_currency ?? 0,
        ch24: c.price_change_percentage_24h ?? 0,
        ch7d: c.price_change_percentage_7d_in_currency ?? 0,
        vol: c.total_volume ?? 0,
        mcap: c.market_cap ?? 0,
        aiScore: ai.confidence,
        signal: ai.signal.replace(/_/g, " "),
        sentiment: ai.sentiment,
        whale: ai.smartMoney === "ACCUMULATING" ? "ACC" : ai.smartMoney === "DISTRIBUTING" ? "DIST" : "NEU",
        risk: ai.whaleActivity === "LOW" ? "LOW" : ai.whaleActivity === "MEDIUM" ? "MEDIUM" : "HIGH",
        sparkCoin: c,
      };
    });
  }, [cgCoins, categoryCoins, activeCategoryId]);

  const tableLoading = activeCategoryId ? categoryLoading : coinsLoading;

  const c = { border: "rgba(255,255,255,0.07)", card: "rgba(255,255,255,0.025)" };

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full" style={{ background: isDark ? "#070a12" : "#f0f2f7", color: isDark ? "#d1d4dc" : "#1e222d" }}>
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: COMPACT AI COMMAND CENTER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-4 pb-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl px-5 py-3.5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(41,98,255,0.10) 0%, rgba(124,58,237,0.08) 50%, rgba(16,185,129,0.06) 100%)",
            border: "1px solid rgba(41,98,255,0.18)",
            boxShadow: "0 4px 32px rgba(41,98,255,0.08)",
          }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-8 pointer-events-none"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />

          <div className="relative z-10 flex items-center gap-5">
            {/* Compact gauge */}
            <div className="flex items-center gap-3 shrink-0">
              <ArcGauge value={btcAi.bullishProbability} color="#26a69a" label="Bullish" size={90} />
              <div>
                <div className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#a78bfa" }}>AI Sentiment</div>
                <div className="text-[13px] font-black leading-tight" style={{ color: btcAi.bullishProbability >= 60 ? "#26a69a" : btcAi.bullishProbability >= 40 ? "#f7931a" : "#ef5350" }}>
                  {btcAi.sentiment.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />

            {/* Title + bull/bear */}
            <div className="shrink-0 w-52">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124,58,237,0.2)" }}>
                  <Brain size={12} style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-[13px] font-black text-white">AI Command Center</span>
                <span className="ml-auto text-[8px] font-black px-2 py-0.5 rounded-lg"
                  style={{ background: SIGNAL_BG[btcAi.signal] ?? "rgba(90,96,114,0.15)", color: SIGNAL_COLOR[btcAi.signal] ?? "#787b86" }}>
                  BTC {btcAi.signal.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between text-[9px] mb-1">
                <span style={{ color: "#26a69a" }}>Bull {btcAi.bullishProbability}%</span>
                <span style={{ color: "#ef5350" }}>Bear {btcAi.bearishProbability}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(239,83,80,0.18)" }}>
                <motion.div className="h-full rounded-l-full"
                  initial={{ width: 0 }} animate={{ width: `${btcAi.bullishProbability}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, #26a69a, #4ade80)" }} />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />

            {/* 6 mini metrics in a row */}
            <div className="flex-1 grid grid-cols-6 gap-2">
              {[
                { label: "Smart $", value: btcAi.smartMoney === "ACCUMULATING" ? "ACCUM" : btcAi.smartMoney === "DISTRIBUTING" ? "DIST" : "NEUT", color: btcAi.smartMoney === "ACCUMULATING" ? "#26a69a" : btcAi.smartMoney === "DISTRIBUTING" ? "#ef5350" : "#787b86" },
                { label: "Whale", value: btcAi.whaleActivity, color: btcAi.whaleActivity === "HIGH" || btcAi.whaleActivity === "EXTREME" ? "#f7931a" : "#787b86" },
                { label: "Momentum", value: `${btcAi.momentumScore > 0 ? "+" : ""}${btcAi.momentumScore}`, color: btcAi.momentumScore >= 0 ? "#26a69a" : "#ef5350" },
                { label: "Confidence", value: `${btcAi.confidence}%`, color: "#a78bfa" },
                { label: "Narrative", value: `${btcAi.narrativeStrength}%`, color: "#f7931a" },
                { label: "Signal", value: btcAi.signal.replace(/_/g, " "), color: SIGNAL_COLOR[btcAi.signal] ?? "#787b86" },
              ].map(m => (
                <div key={m.label} className="rounded-xl py-2 px-2 text-center"
                  style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${m.color}14` }}>
                  <div className="text-[7px] uppercase tracking-wide mb-0.5" style={{ color: "#2a3050" }}>{m.label}</div>
                  <div className="text-[10px] font-black leading-tight" style={{ color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />

            {/* TF breakdown compact */}
            <div className="flex gap-1.5 shrink-0">
              {btcAi.timeframes.map(t => {
                const tc = t.sentiment === "BULLISH" ? "#26a69a" : t.sentiment === "BEARISH" ? "#ef5350" : "#5a6072";
                return (
                  <div key={t.tf} className="rounded-xl px-2.5 py-2 text-center"
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${tc}18`, minWidth: 44 }}>
                    <div className="text-[8px] font-bold" style={{ color: "#2a3050" }}>{t.tf}</div>
                    <div className="text-[9px] font-black" style={{ color: tc }}>{t.sentiment.slice(0, 4)}</div>
                    <div className="text-[7px]" style={{ color: "#2a3050" }}>{t.confidence}%</div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />

            {/* Live prices + action */}
            <div className="shrink-0 flex flex-col gap-1.5">
              {[
                { label: "BTC", coin: btcCoin, fallPrice: 67482, fallCh: 2.4, color: "#f7931a" },
                { label: "ETH", coin: ethCoin, fallPrice: 3248, fallCh: 1.8, color: "#627EEA" },
                { label: "SOL", coin: solCoin, fallPrice: 178.32, fallCh: 5.2, color: "#9945FF" },
              ].map(p => {
                const price = p.coin?.current_price ?? p.fallPrice;
                const ch = p.coin?.price_change_percentage_24h ?? p.fallCh;
                return (
                  <div key={p.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${p.color}14` }}>
                    <span className="text-[8px] font-black w-6 shrink-0" style={{ color: p.color }}>{p.label}</span>
                    <span className="text-[10px] font-black text-white font-mono">{fmtP(price)}</span>
                    <span className="text-[8px] font-bold ml-1" style={{ color: ch >= 0 ? "#26a69a" : "#ef5350" }}>
                      {ch >= 0 ? "+" : ""}{ch.toFixed(1)}%
                    </span>
                    <Pulse color={p.color} size={4} />
                  </div>
                );
              })}
              <Link href="/ai-insights">
                <button className="w-full py-1.5 rounded-xl text-[9px] font-black transition-all hover:opacity-90 mt-0.5"
                  style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", color: "white" }}>
                  AI Terminal →
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: GLOBAL MARKET OVERVIEW — compact icon cards
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-4">
        <SectionLabel title="Global Market Overview" icon={Globe} color="#2962ff" />
        <div className="grid grid-cols-5 xl:grid-cols-10 gap-2">
          {[
            { label: "Market Cap", value: fmtL(overview?.totalMarketCap ?? 2_780_000_000_000), sub: "+0.3%", pos: true, color: "#2962ff", icon: Globe },
            { label: "24h Volume", value: fmtL(overview?.totalVolume24h ?? 96_000_000_000), sub: "3.4% of MCap", pos: true, color: "#26a69a", icon: BarChart2 },
            { label: "BTC Dom", value: `${overview?.btcDominance?.toFixed(1) ?? "58.3"}%`, sub: "↑ rising", pos: true, color: "#f7931a", icon: Activity },
            { label: "Fear & Greed", value: `${fgVal}`, sub: fgLabel, pos: fgVal >= 50, color: fgColor, icon: Shield },
            { label: "ETH Gas", value: "18 Gwei", sub: "Normal", pos: true, color: "#627EEA", icon: Zap },
            { label: "Stable Flow", value: "+$2.8B", sub: "Net inflow", pos: true, color: "#26a69a", icon: ArrowRightLeft },
            { label: "Open Interest", value: "$28.4B", sub: "Perps", pos: true, color: "#7c3aed", icon: Target },
            { label: "Top Chain", value: "Solana", sub: "+8.7% TVL", pos: true, color: "#9945FF", icon: Network },
            { label: "Institution", value: "+$842M", sub: "ETF inflow", pos: true, color: "#f7931a", icon: Briefcase },
            { label: "AI Score", value: "91", sub: "BULLISH", pos: true, color: "#a78bfa", icon: Brain },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-xl p-3 cursor-pointer group transition-all"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${s.color}1a`,
              }}
              whileHover={{ scale: 1.04, boxShadow: `0 4px 20px ${s.color}18` }}>
              {/* Icon + label row */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}18` }}>
                  <s.icon size={10} style={{ color: s.color }} />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide truncate" style={{ color: "#3a4058" }}>{s.label}</span>
              </div>
              {/* Value */}
              <div className="text-[13px] font-black leading-none" style={{ color: "white" }}>{s.value}</div>
              {/* Sub */}
              <div className="text-[8px] mt-1 font-semibold" style={{ color: s.pos ? s.color : "#ef5350", opacity: 0.85 }}>{s.sub}</div>
              {/* Bottom accent line */}
              <div className="h-0.5 rounded-full mt-2 transition-all group-hover:opacity-100 opacity-30"
                style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3: LIVE MARKET TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-5">
        <SectionLabel title="Live Market" icon={Activity} color="#26a69a" badge="LIVE" link="/markets" />
        {/* Category tabs */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TABLE_TABS.map(tab => (
            <button key={tab} onClick={() => setTableTab(tab)}
              className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={{
                background: tableTab === tab ? "rgba(41,98,255,0.2)" : "rgba(255,255,255,0.04)",
                color: tableTab === tab ? "#4d7fff" : "#5a6072",
                border: `1px solid ${tableTab === tab ? "rgba(41,98,255,0.35)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {tab}
            </button>
          ))}
        </div>
        {/* Table */}
        <GlowCard>
          {/* Header */}
          <div className="grid gap-2 px-4 py-2.5 border-b"
            style={{ gridTemplateColumns: "32px 160px 100px 60px 70px 70px 90px 100px 80px 70px 60px 70px", borderColor: c.border }}>
            {["#", "Coin", "Price", "1H", "24H", "7D", "Volume", "Mkt Cap", "AI Score", "Signal", "Risk", "Whale"].map(h => (
              <div key={h} className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#3a4058" }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          {(tableLoading ? Array.from({ length: 8 }).map((_, i) => ({ id: i })) : liveTableCoins).map((row: any, i) => {
            if (tableLoading || !row.coin) {
              return (
                <div key={i} className="grid gap-2 px-4 py-3 border-b animate-pulse"
                  style={{ gridTemplateColumns: "32px 160px 100px 60px 70px 70px 90px 100px 80px 70px 60px 70px", borderColor: c.border }}>
                  {Array.from({ length: 12 }).map((_, j) => <Skel key={j} w="w-full" h="h-3" r="rounded-md" />)}
                </div>
              );
            }
            const r = row as typeof liveTableCoins[0];
            const signalKey = r.signal.replace(/ /g, "_");
            return (
              <motion.div key={r.coin}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                onClick={() => nav(r.coin)}
                className="grid gap-2 px-4 py-2.5 border-b transition-all hover:bg-white/[0.02] cursor-pointer"
                style={{ gridTemplateColumns: "32px 160px 100px 60px 70px 70px 90px 100px 80px 70px 60px 70px", borderColor: c.border }}>
                <span className="text-[10px] text-[#3a4058] font-mono self-center">{r.rank}</span>
                <div className="flex items-center gap-2 self-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[8px]"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#d1d4dc" }}>{r.coin.slice(0, 2)}</div>
                  <div>
                    <div className="text-[11px] font-bold text-white leading-none">{r.coin}</div>
                    <div className="text-[8px]" style={{ color: "#3a4058" }}>{r.name}</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-white self-center">{fmtP(r.price)}</span>
                <span className="text-[10px] font-bold self-center" style={{ color: r.ch1h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {r.ch1h >= 0 ? "+" : ""}{r.ch1h.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold self-center" style={{ color: r.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                  {r.ch24 >= 0 ? "+" : ""}{r.ch24.toFixed(2)}%
                </span>
                <span className="text-[10px] font-bold self-center" style={{ color: r.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                  {r.ch7d >= 0 ? "+" : ""}{r.ch7d.toFixed(1)}%
                </span>
                <span className="text-[9px] self-center" style={{ color: "#787b86" }}>{fmtL(r.vol)}</span>
                <span className="text-[9px] self-center" style={{ color: "#787b86" }}>{fmtL(r.mcap)}</span>
                <div className="self-center">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${r.aiScore}%`, background: "#7c3aed" }} />
                    </div>
                    <span className="text-[9px] font-bold shrink-0" style={{ color: "#a78bfa" }}>{r.aiScore}</span>
                  </div>
                </div>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md self-center"
                  style={{ background: `${SIG_COLOR[r.signal] ?? "#5a6072"}15`, color: SIG_COLOR[r.signal] ?? "#5a6072" }}>
                  {r.signal}
                </span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md self-center"
                  style={{ background: `${RISK_COLOR[r.risk]}15`, color: RISK_COLOR[r.risk] }}>
                  {r.risk}
                </span>
                <span className="text-[9px] font-bold self-center"
                  style={{ color: r.whale === "ACC" ? "#26a69a" : r.whale === "DIST" ? "#ef5350" : "#5a6072" }}>
                  {r.whale}
                </span>
              </motion.div>
            );
          })}
        </GlowCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 + 5: AI OPPORTUNITIES + WHALE TRACKER (2-column)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* AI Opportunities */}
        <div>
          <SectionLabel title="AI Opportunities" icon={Brain} color="#7c3aed" badge="PRO" link="/screener" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_OPPS.map((opp, i) => (
              <motion.div key={opp.coin}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                onClick={() => nav(opp.coin)}
                className="rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all hover:scale-[1.02]"
                style={{ background: c.card, border: `1px solid ${opp.color}22`, boxShadow: `0 4px 20px ${opp.color}08` }}
                whileHover={{ boxShadow: `0 6px 32px ${opp.color}18` }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${opp.color}, transparent)` }} />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase"
                    style={{ background: `${opp.color}20`, color: opp.color }}>{opp.type}</span>
                  <span className="text-[10px]" style={{ color: "#3a4058" }}>{opp.risk} RISK</span>
                </div>
                <div className="text-[18px] font-black text-white leading-none mb-0.5">{opp.coin}</div>
                <div className="text-[9px] mb-2" style={{ color: "#4a5268" }}>{opp.name}</div>
                <div className="text-[22px] font-black leading-none" style={{ color: "#26a69a" }}>{opp.gain}</div>
                <div className="text-[8px] mb-2" style={{ color: "#3a4058" }}>potential upside</div>
                <p className="text-[9px] leading-relaxed mb-2" style={{ color: "#4a5268" }}>{opp.desc}</p>
                <div>
                  <div className="flex justify-between text-[8px] mb-1">
                    <span style={{ color: "#3a4058" }}>AI Confidence</span>
                    <span style={{ color: opp.conf >= 85 ? "#26a69a" : opp.conf >= 70 ? "#f7931a" : "#ef5350" }}>{opp.conf}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${opp.conf}%`, background: opp.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Whale Tracker */}
        <div>
          <SectionLabel title="Whale Tracker Live" icon={Waves} color="#0ea5e9" badge="LIVE" link="/whale-tracker" />
          <GlowCard>
            <div className="divide-y" style={{ borderColor: c.border }}>
              {WHALE_TXNS.map((tx, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[9px] shrink-0"
                    style={{ background: "rgba(14,165,233,0.12)", color: "#0ea5e9" }}>{tx.coin.slice(0, 3)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-white">{tx.from}</span>
                      <ArrowRightLeft size={9} style={{ color: "#3a4058" }} className="shrink-0" />
                      <span className="text-[10px]" style={{ color: "#787b86" }}>{tx.to}</span>
                      <span className="text-[7px] px-1.5 py-0.5 rounded-md font-black"
                        style={{
                          background: tx.type === "IN" ? "rgba(239,83,80,0.15)" : tx.type === "OUT" ? "rgba(38,166,154,0.15)" : "rgba(255,255,255,0.06)",
                          color: tx.type === "IN" ? "#ef5350" : tx.type === "OUT" ? "#26a69a" : "#5a6072",
                        }}>{tx.type}</span>
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: "#3a4058" }}>{tx.amt} · {tx.time} ago</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-black text-white font-mono">{tx.usd}</div>
                    <div className="flex items-center justify-end gap-1">
                      <Pulse color={tx.bullish ? "#26a69a" : "#ef5350"} size={4} />
                      <span className="text-[8px]" style={{ color: tx.bullish ? "#26a69a" : "#ef5350" }}>
                        {tx.bullish ? "Bullish" : "Bearish"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 + 7: NARRATIVES + HEATMAP (2-column)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-5 grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Narrative Intelligence */}
        <div className="xl:col-span-3">
          <SectionLabel title="Narrative Intelligence" icon={Sparkles} color="#7c3aed" link="/narratives" />
          <div className="space-y-2.5">
            {NARRATIVES_DATA.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl px-4 py-3 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: `${n.color}0a`, border: `1px solid ${n.color}20` }}
                whileHover={{ boxShadow: `0 4px 24px ${n.color}12` }}>
                <div className="w-32 shrink-0">
                  <div className="text-[12px] font-black" style={{ color: n.color }}>{n.name}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "#3a4058" }}>Inflow: {n.inflow}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${n.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        style={{ background: n.color }} />
                    </div>
                    <span className="text-[10px] font-black shrink-0" style={{ color: n.color }}>{n.score}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {n.coins.map(c => (
                      <span key={c} onClick={e => { e.stopPropagation(); nav(c); }}
                        className="text-[8px] px-1.5 py-0.5 rounded-md font-mono cursor-pointer hover:brightness-125 transition-all"
                        style={{ background: `${n.color}15`, color: n.color }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-black" style={{ color: n.pos ? "#26a69a" : "#ef5350" }}>{n.ch24}</div>
                  <div className="text-[9px]" style={{ color: "#3a4058" }}>24h</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Market Heatmap */}
        <div className="xl:col-span-2">
          <SectionLabel title="Market Heatmap" icon={LayoutGrid} color="#2962ff" link="/heatmap" />
          <GlowCard className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {HEATMAP_DATA.map((coin, i) => {
                const sz = coin.size >= 8 ? "w-24 h-16" : coin.size >= 6 ? "w-20 h-14" : coin.size >= 4 ? "w-16 h-12" : "w-12 h-9";
                return (
                  <motion.div key={coin.coin}
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }}
                    onClick={() => nav(coin.coin)}
                    className={`${sz} rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:brightness-125 hover:scale-105`}
                    style={{ background: heatColor(coin.ch) }}>
                    <div className="text-[9px] font-black text-white">{coin.coin}</div>
                    <div className="text-[8px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {coin.ch >= 0 ? "+" : ""}{coin.ch.toFixed(1)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-1">
                {["#c43838","#8a2424","#2ab596","#1a9176","#0d6b58"].map((c, i) => (
                  <div key={i} className="w-5 h-2 rounded-sm" style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-3 text-[8px]" style={{ color: "#3a4058" }}>
                <span style={{ color: "#ef5350" }}>↓ Losing</span>
                <span style={{ color: "#26a69a" }}>↑ Gaining</span>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 + 9: NEWS + PORTFOLIO (2-column)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* News & Sentiment */}
        <div className="xl:col-span-2">
          <SectionLabel title="News & AI Sentiment" icon={Newspaper} color="#0ea5e9" link="/news" />
          <div className="space-y-2.5">
            {NEWS_DATA.map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                style={{ background: c.card, border: `1px solid ${expandedNews === i ? item.color + "35" : c.border}` }}
                onClick={() => setExpandedNews(expandedNews === i ? null : i)}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}15` }}>
                    {item.sentiment === "BULLISH"
                      ? <TrendingUp size={13} style={{ color: item.color }} />
                      : <TrendingDown size={13} style={{ color: item.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px]" style={{ color: "#4a5268" }}>{item.source}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                        style={{ background: `${item.color}15`, color: item.color }}>{item.sentiment}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}>{item.coin}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#5a6072" }}>{item.impact} IMPACT</span>
                      <Clock size={8} style={{ color: "#3a4058" }} />
                      <span className="text-[8px]" style={{ color: "#3a4058" }}>{item.time} · {item.social.toLocaleString()} engagements</span>
                    </div>
                  </div>
                  <ChevronRight size={12} style={{ color: "#3a4058", transform: expandedNews === i ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                </div>
                <AnimatePresence>
                  {expandedNews === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="px-4 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-1.5 mt-2 mb-1">
                        <Zap size={10} style={{ color: "#7c3aed" }} />
                        <span className="text-[9px] font-bold" style={{ color: "#a78bfa" }}>AI Analysis</span>
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: "#787b86" }}>
                        AI-powered sentiment analysis indicates {item.sentiment === "BULLISH" ? "strong positive" : "negative"} market impact for {item.coin}. 
                        Institutional flow suggests {item.sentiment === "BULLISH" ? "continued accumulation with high conviction" : "risk-off positioning"}. 
                        Social engagement at {item.social.toLocaleString()} interactions — {item.sentiment === "BULLISH" ? "above" : "below"} 30-day average.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Portfolio Preview */}
        <div>
          <SectionLabel title="Portfolio Snapshot" icon={Briefcase} color="#2962ff" link="/portfolio" />
          <GlowCard className="p-4">
            <div className="text-center mb-4">
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#3a4058" }}>Total Balance</div>
              <div className="text-[32px] font-black text-white leading-none">$24,840</div>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <ArrowUpRight size={14} style={{ color: "#26a69a" }} />
                <span className="text-[13px] font-bold" style={{ color: "#26a69a" }}>+$3,120</span>
                <span className="text-[11px]" style={{ color: "#26a69a" }}>(+14.4%)</span>
              </div>
            </div>
            {/* Mini pie donut */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg width={96} height={96} viewBox="0 0 96 96">
                  {(() => {
                    const alloc = [
                      { pct: 42, color: "#f7931a" }, { pct: 28, color: "#627EEA" },
                      { pct: 18, color: "#9945FF" }, { pct: 12, color: "#5a6072" },
                    ];
                    let offset = 0;
                    return alloc.map((a, i) => {
                      const circ = 2 * Math.PI * 36;
                      const dash = (a.pct / 100) * circ;
                      const gap = circ - dash;
                      const rot = -(offset / circ) * 360;
                      offset += dash;
                      return (
                        <circle key={i} cx={48} cy={48} r={36}
                          fill="none" stroke={a.color} strokeWidth={12}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={circ / 4}
                          style={{ transform: `rotate(${rot}deg)`, transformOrigin: "center" }} />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-black text-white">AI Health</span>
                  <span className="text-[14px] font-black" style={{ color: "#26a69a" }}>78%</span>
                </div>
              </div>
            </div>
            {/* Allocation breakdown */}
            {[
              { label: "Bitcoin", pct: 42, color: "#f7931a", val: "$10,432" },
              { label: "Ethereum", pct: 28, color: "#627EEA", val: "$6,955" },
              { label: "Solana", pct: 18, color: "#9945FF", val: "$4,471" },
              { label: "Others", pct: 12, color: "#5a6072", val: "$2,981" },
            ].map(a => (
              <div key={a.label} className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-white font-semibold">{a.label}</span>
                    <span style={{ color: a.color }}>{a.pct}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                </div>
                <span className="text-[9px] font-mono shrink-0" style={{ color: "#4a5268" }}>{a.val}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: "Best", coin: "SOL", val: "+42.1%", color: "#26a69a" },
                { label: "Worst", coin: "DOGE", val: "-8.4%", color: "#ef5350" },
              ].map(p => (
                <div key={p.label} className="rounded-xl p-2.5" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="text-[8px] mb-0.5" style={{ color: "#3a4058" }}>{p.label}</div>
                  <div className="text-[11px] font-black text-white">{p.coin}</div>
                  <div className="text-[10px] font-bold" style={{ color: p.color }}>{p.val}</div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 10 + 11: ON-CHAIN + AI ALERTS (2-column)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* On-Chain Analytics */}
        <div>
          <SectionLabel title="On-Chain Analytics" icon={Network} color="#10b981" link="/on-chain" />
          <div className="space-y-2.5">
            {ONCHAIN_CHAINS.map((chain, i) => (
              <motion.div key={chain.name}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4"
                style={{ background: `${chain.color}08`, border: `1px solid ${chain.color}20` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: chain.color }} />
                    <span className="text-[13px] font-black text-white">{chain.name}</span>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: "#26a69a" }}>{chain.ch}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "TVL", value: chain.tvl },
                    { label: "DEX Vol", value: chain.dex },
                    { label: "Gas", value: chain.gas },
                    { label: "Wallets", value: chain.wallets },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: `${chain.color}80` }}>{m.label}</div>
                      <div className="text-[11px] font-bold text-white">{m.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Alerts Center */}
        <div>
          <SectionLabel title="AI Alerts Center" icon={Bell} color="#ef5350" badge="LIVE" link="/alerts" />
          <div className="space-y-2.5">
            {AI_ALERTS_DATA.map((alert, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: `${alert.color}08`, border: `1px solid ${alert.color}22` }}
                whileHover={{ boxShadow: `0 4px 20px ${alert.color}12` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${alert.color}18` }}>
                  <alert.icon size={14} style={{ color: alert.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md"
                    style={{ background: `${alert.color}20`, color: alert.color }}>{alert.type}</span>
                  <p className="text-[11px] font-semibold text-white mt-0.5 leading-snug">{alert.title}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1" style={{ color: "#3a4058" }}>
                    <Clock size={8} />
                    <span className="text-[8px]">{alert.time}</span>
                  </div>
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{
                      background: alert.priority === "HIGH" ? "rgba(239,83,80,0.15)" : alert.priority === "MEDIUM" ? "rgba(247,147,26,0.15)" : "rgba(90,96,114,0.15)",
                      color: alert.priority === "HIGH" ? "#ef5350" : alert.priority === "MEDIUM" ? "#f7931a" : "#5a6072",
                    }}>{alert.priority}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 12: FOOTER TERMINAL
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-6 pt-2">
        <div className="rounded-2xl px-4 py-3 flex items-center gap-6 flex-wrap"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Status indicators */}
          <div className="flex items-center gap-1.5">
            <Pulse color="#26a69a" size={6} />
            <span className="text-[9px] font-bold" style={{ color: "#26a69a" }}>MARKETS OPEN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pulse color="#2962ff" size={6} />
            <span className="text-[9px] font-bold" style={{ color: "#2962ff" }}>AI ENGINE LIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pulse color="#7c3aed" size={6} />
            <span className="text-[9px] font-bold" style={{ color: "#7c3aed" }}>WHALE TRACKER ACTIVE</span>
          </div>
          {/* Live ticker strip */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <motion.div animate={{ x: [0, -400] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="flex gap-6 whitespace-nowrap">
              {[
                { label: "BTC", val: fmtP(btcCoin?.current_price ?? 67482), ch: btcCoin?.price_change_percentage_24h ?? 2.4 },
                { label: "ETH", val: fmtP(ethCoin?.current_price ?? 3248), ch: ethCoin?.price_change_percentage_24h ?? 1.8 },
                { label: "SOL", val: fmtP(solCoin?.current_price ?? 178.32), ch: solCoin?.price_change_percentage_24h ?? 5.2 },
                { label: "MCap", val: fmtL(overview?.totalMarketCap ?? 2_780_000_000_000), ch: 0.3 },
                { label: "F&G", val: `${fgVal} ${fgLabel}`, ch: 0 },
                { label: "BTC Dom", val: `${overview?.btcDominance?.toFixed(1) ?? "58.3"}%`, ch: 0 },
              ].flatMap((t, i) => [t, t]).map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase" style={{ color: "#2a3050" }}>{t.label}</span>
                  <span className="text-[9px] font-mono font-bold text-white">{t.val}</span>
                  {t.ch !== 0 && <span className="text-[8px] font-bold" style={{ color: t.ch >= 0 ? "#26a69a" : "#ef5350" }}>
                    {t.ch >= 0 ? "+" : ""}{t.ch.toFixed(1)}%
                  </span>}
                  <span style={{ color: "#1a1e2a" }}>·</span>
                </span>
              ))}
            </motion.div>
          </div>
          {/* Clock */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock size={9} style={{ color: "#3a4058" }} />
            <span className="text-[9px] font-mono font-bold text-white">
              {now.toUTCString().slice(17, 25)} UTC
            </span>
          </div>
          <div className="text-[9px]" style={{ color: "#2a3050" }}>CoinGecko · alternative.me</div>
        </div>
      </div>
    </div>
  );
}
