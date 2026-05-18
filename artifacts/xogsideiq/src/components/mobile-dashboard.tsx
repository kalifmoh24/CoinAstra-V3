import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Activity, Search, Bell, Sun, Moon, Brain, Cpu, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Flame, Laugh, Zap, ChevronRight, BarChart2,
  Globe, Waves, Network, Star, Briefcase, Shield, Target, Eye, Clock,
  AlertTriangle, Newspaper, Wallet, LayoutGrid, CheckCircle2, ArrowRightLeft,
  Sparkles, User, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Wifi,
} from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { MiniSparkline } from "@/components/mobile-market-card";
import { useTheme } from "@/components/theme-provider";
import {
  useLiveCoins, useGainersLosers, useTrendingCoins,
  useFearGreedLive, useMemeCoinLive,
} from "@/hooks/use-market-data";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG } from "@/lib/ai-engine";
import { useGetMarketOverview, getGetMarketOverviewQueryKey } from "@workspace/api-client-react";

// ── helpers ────────────────────────────────────────────────────────────────
function fmtP(p: number) {
  if (p >= 1000) return "$" + p.toLocaleString("en", { maximumFractionDigits: 0 });
  if (p >= 1)    return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toFixed(7);
}
function fmtLarge(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}
function Pulse({ color = "#26a69a", size = 6 }: { color?: string; size?: number }) {
  return <span className="rounded-full animate-pulse inline-block shrink-0" style={{ width: size, height: size, background: color }} />;
}
function Skel({ w, h, r = "rounded-xl" }: { w: string; h: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: "rgba(255,255,255,0.06)" }} />;
}
function SH({ title, icon: Icon, color = "#2962ff", badge, link, linkLabel = "See all" }: {
  title: string; icon?: React.ElementType; color?: string; badge?: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} style={{ color }} />}
        <span className="text-[13px] font-bold text-white">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>{badge}</span>
        )}
      </div>
      {link && (
        <Link href={link}>
          <span className="flex items-center gap-0.5 text-[11px]" style={{ color: "#4d7fff" }}>
            {linkLabel} <ChevronRight size={10} />
          </span>
        </Link>
      )}
    </div>
  );
}

// ── static mock data ───────────────────────────────────────────────────────
const NARRATIVES = [
  { id: "ai", name: "AI Coins", score: 91, ch: "+12.4%", pos: true, coins: ["RNDR","FET","AGIX"], color: "#7c3aed", inflow: "$842M" },
  { id: "depin", name: "DePIN", score: 84, ch: "+8.7%", pos: true, coins: ["HNT","IOTX","WIFI"], color: "#2962ff", inflow: "$421M" },
  { id: "rwa", name: "RWA", score: 78, ch: "+6.2%", pos: true, coins: ["ONDO","MPL","CFG"], color: "#f7931a", inflow: "$318M" },
  { id: "meme", name: "Memes", score: 61, ch: "+3.4%", pos: true, coins: ["DOGE","SHIB","PEPE"], color: "#ef5350", inflow: "$1.2B" },
  { id: "l2", name: "Layer 2", score: 72, ch: "+3.1%", pos: true, coins: ["ARB","OP","ZKSYNC"], color: "#26a69a", inflow: "$284M" },
  { id: "defi", name: "DeFi", score: 58, ch: "+1.4%", pos: true, coins: ["UNI","AAVE","GMX"], color: "#0ea5e9", inflow: "$192M" },
  { id: "sol-eco", name: "Solana", score: 88, ch: "+9.1%", pos: true, coins: ["JTO","JUP","BONK"], color: "#9945FF", inflow: "$624M" },
  { id: "gaming", name: "Gaming", score: 52, ch: "-0.8%", pos: false, coins: ["AXS","IMX","GALA"], color: "#ec4899", inflow: "$88M" },
];

const WHALE_TXS = [
  { coin: "SOL", amount: "215,000 SOL", usd: "$38.3M", from: "Coinbase", to: "Cold Wallet", type: "OUT", time: "2m", bullish: true },
  { coin: "BTC", amount: "42.5 BTC", usd: "$2.87M", from: "Unknown Whale", to: "Binance", type: "IN", time: "5m", bullish: false },
  { coin: "ETH", amount: "8,420 ETH", usd: "$27.4M", from: "Jump Trading", to: "Cold Wallet", type: "TRANSFER", time: "9m", bullish: true },
  { coin: "USDT", amount: "50M USDT", usd: "$50M", from: "Tether Treasury", to: "Binance", type: "MINT", time: "14m", bullish: true },
  { coin: "LINK", amount: "1.2M LINK", usd: "$18.7M", from: "Smart Money", to: "Upbit", type: "IN", time: "22m", bullish: false },
];

const AI_OPPORTUNITIES = [
  { coin: "SOL", name: "Solana", gain: "+32%", conf: 94, risk: "LOW", smart: "ACC", narrative: "Layer 1", momentum: 85, badge: "BREAKOUT", badgeColor: "#26a69a" },
  { coin: "SUI", name: "SUI", gain: "+28%", conf: 88, risk: "MEDIUM", smart: "ACC", narrative: "Layer 1", momentum: 92, badge: "WHALE BUYING", badgeColor: "#0ea5e9" },
  { coin: "LINK", name: "Chainlink", gain: "+22%", conf: 84, risk: "LOW", smart: "ACC", narrative: "Oracle", momentum: 68, badge: "AI SIGNAL", badgeColor: "#7c3aed" },
  { coin: "RNDR", name: "Render", gain: "+19%", conf: 82, risk: "MEDIUM", smart: "ACC", narrative: "AI", momentum: 64, badge: "TRENDING", badgeColor: "#f7931a" },
  { coin: "JTO", name: "Jito", gain: "+42%", conf: 79, risk: "MEDIUM", smart: "ACC", narrative: "Solana", momentum: 76, badge: "EARLY GEM", badgeColor: "#ec4899" },
  { coin: "BONK", name: "Bonk", gain: "+85%", conf: 62, risk: "HIGH", smart: "NEU", narrative: "Meme", momentum: 88, badge: "TRENDING", badgeColor: "#f7931a" },
];

const NEWS_ITEMS = [
  { title: "BlackRock Bitcoin ETF Records $842M Single-Day Inflow", source: "Bloomberg", time: "12m", sentiment: "BULLISH", color: "#26a69a", coin: "BTC", impact: "HIGH" },
  { title: "Solana DeFi TVL Hits All-Time High at $7.2B", source: "The Block", time: "34m", sentiment: "BULLISH", color: "#26a69a", coin: "SOL", impact: "HIGH" },
  { title: "SEC Approves Ethereum Spot ETF Options Trading", source: "CoinDesk", time: "1h", sentiment: "BULLISH", color: "#26a69a", coin: "ETH", impact: "HIGH" },
  { title: "DOGE Technical Distribution Pattern Forming", source: "TradingView", time: "3h", sentiment: "BEARISH", color: "#ef5350", coin: "DOGE", impact: "LOW" },
];

const WATCHLIST_COINS = [
  { coin: "BTC", price: "$67,482", ch24: "+2.4%", pos: true, alert: true, aiScore: 82 },
  { coin: "ETH", price: "$3,248", ch24: "+1.8%", pos: true, alert: true, aiScore: 79 },
  { coin: "SOL", price: "$178", ch24: "+5.2%", pos: true, alert: false, aiScore: 94 },
  { coin: "LINK", price: "$15.60", ch24: "+4.3%", pos: true, alert: true, aiScore: 88 },
];

const PORTFOLIO_DATA = {
  balance: "$24,840",
  pnl: "+$3,120",
  pnlPct: "+14.4%",
  pos: true,
  best: { coin: "SOL", pct: "+42.1%" },
  worst: { coin: "DOGE", pct: "-8.4%" },
  aiHealth: 78,
  allocation: [
    { coin: "BTC", pct: 42, color: "#f7931a" },
    { coin: "ETH", pct: 28, color: "#627EEA" },
    { coin: "SOL", pct: 18, color: "#9945FF" },
    { coin: "Other", pct: 12, color: "#5a6072" },
  ],
};

const AI_ALERTS = [
  { type: "WHALE", title: "215K SOL moved from Coinbase", color: "#0ea5e9", icon: Waves, time: "2m" },
  { type: "SIGNAL", title: "SOL AI signal upgraded to STRONG BUY", color: "#26a69a", icon: Zap, time: "8m" },
  { type: "BREAKOUT", title: "LINK volume 3.2× above average", color: "#7c3aed", icon: TrendingUp, time: "14m" },
  { type: "RISK", title: "DOGE distribution pattern detected", color: "#ef5350", icon: AlertTriangle, time: "31m" },
];

const MEME_RADAR = [
  { coin: "BONK", social: "+248%", aiScore: 68, risk: "HIGH", vol: "+184%", trend: true, ch: "+14.8%" },
  { coin: "WIF", social: "+142%", aiScore: 70, risk: "HIGH", vol: "+124%", trend: true, ch: "+7.6%" },
  { coin: "PEPE", social: "+84%", aiScore: 61, risk: "HIGH", vol: "+64%", trend: false, ch: "+0.8%" },
  { coin: "DOGE", social: "-18%", aiScore: 42, risk: "HIGH", vol: "-12%", trend: false, ch: "-2.1%" },
];

const ONCHAIN = [
  { label: "ETH Gas", value: "18 Gwei", color: "#627EEA", icon: Zap },
  { label: "ETH TVL", value: "$48.2B", color: "#627EEA", icon: Database },
  { label: "SOL TPS", value: "2,840", color: "#9945FF", icon: Activity },
  { label: "DEX Vol 24h", value: "$3.1B", color: "#26a69a", icon: BarChart2 },
  { label: "Bridge Flow", value: "+$280M", color: "#f7931a", icon: ArrowRightLeft },
  { label: "Active Wallets", value: "1.24M", color: "#0ea5e9", icon: Wallet },
];

const HEATMAP_COINS = [
  { coin: "BTC", ch: 2.4, size: 9 }, { coin: "ETH", ch: 1.8, size: 7 }, { coin: "SOL", ch: 5.2, size: 5 },
  { coin: "BNB", ch: 0.8, size: 5 }, { coin: "AVAX", ch: 1.2, size: 4 }, { coin: "DOGE", ch: -2.1, size: 5 },
  { coin: "LINK", ch: 4.3, size: 4 }, { coin: "ARB", ch: 0.6, size: 3 }, { coin: "SUI", ch: 12.4, size: 3 },
  { coin: "RNDR", ch: 3.1, size: 3 }, { coin: "ADA", ch: -1.2, size: 4 }, { coin: "BONK", ch: 14.8, size: 2 },
];

function heatColor(ch: number) {
  if (ch > 8) return "#1a7a68";
  if (ch > 4) return "#22a984";
  if (ch > 0) return "#2ab596";
  if (ch > -4) return "#a83030";
  return "#c43838";
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI SVG SEMI-CIRCLE GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function Gauge({ value, color, size = 96 }: { value: number; color: string; size?: number }) {
  const r = (size / 2) - 10;
  const cx = size / 2, cy = size / 2 + 8;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - value / 100);
  return (
    <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 14}`}>
      <path d={`M ${10} ${cy} A ${r} ${r} 0 0 1 ${size - 10} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} strokeLinecap="round" />
      <motion.path
        d={`M ${10} ${cy} A ${r} ${r} 0 0 1 ${size - 10} ${cy}`}
        fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize={18} fontWeight="900" fontFamily="monospace">{value}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function MobileDashboard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  const [moverTab, setMoverTab] = useState<"gainers" | "losers">("gainers");
  const [expandedNews, setExpandedNews] = useState<number | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: cgCoins, isLoading: coinsLoading } = useLiveCoins();
  const { gainers, losers } = useGainersLosers(10);
  const { data: trendingData } = useTrendingCoins();
  const { data: fearGreedData } = useFearGreedLive();
  const liveMemeCoins = useMemeCoinLive();
  const { data: overview } = useGetMarketOverview({ query: { queryKey: getGetMarketOverviewQueryKey() } });

  const fg = fearGreedData?.data?.[0];
  const fgVal = fg ? parseInt(fg.value) : (overview?.fearGreedIndex ?? 42);
  const fgLabel = fg?.value_classification ?? overview?.fearGreedLabel ?? "Fear";
  const fgColor = fgVal < 25 ? "#ef5350" : fgVal < 45 ? "#f7931a" : fgVal < 55 ? "#787b86" : fgVal < 75 ? "#26a69a" : "#00e676";

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

  const aiOpps = useMemo(() => {
    if (!cgCoins) return AI_OPPORTUNITIES;
    const live = cgCoins.slice(0, 30).map(c => ({
      ...c,
      ai: analyzeToken({
        priceChange24h: c.price_change_percentage_24h,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? undefined,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        symbol: c.symbol,
      }),
    })).filter(c => c.ai.signal === "STRONG_BUY" || c.ai.signal === "BUY").slice(0, 4);
    return live.length > 0 ? live.map(c => ({
      coin: c.symbol.toUpperCase(), name: c.name,
      gain: `+${(Math.random() * 30 + 10).toFixed(0)}%`,
      conf: c.ai.confidence, risk: "MEDIUM", smart: "ACC",
      narrative: "Trending", momentum: c.ai.momentumScore,
      badge: c.ai.signal === "STRONG_BUY" ? "BREAKOUT" : "AI SIGNAL",
      badgeColor: c.ai.signal === "STRONG_BUY" ? "#26a69a" : "#7c3aed",
    })) : AI_OPPORTUNITIES;
  }, [cgCoins]);

  const movers = moverTab === "gainers" ? gainers : losers;
  const trendingCoins = useMemo(() => (trendingData?.coins ?? []).slice(0, 8).map(c => c.item), [trendingData]);
  const memeCoins = liveMemeCoins.length > 0 ? liveMemeCoins : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setHeaderScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const c = { bg: isDark ? "#070a12" : "#f0f2f7", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: c.bg, color: isDark ? "#d1d4dc" : "#1e222d" }}>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: PREMIUM STICKY HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <motion.header
        animate={{ boxShadow: headerScrolled ? "0 4px 40px rgba(0,0,0,0.5)" : "none" }}
        className="shrink-0 z-30"
        style={{
          background: isDark
            ? headerScrolled ? "rgba(5,8,16,0.98)" : "rgba(7,10,18,0.92)"
            : headerScrolled ? "rgba(238,241,248,0.98)" : "rgba(240,242,247,0.85)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderBottom: `1px solid ${headerScrolled ? "rgba(255,255,255,0.09)" : "transparent"}`,
        }}>
        {/* Row 1: Logo + Controls */}
        <div className="flex items-center px-4 gap-2" style={{ height: 52 }}>
          <div className="flex items-center gap-2 shrink-0">
            <motion.div
              animate={{ boxShadow: ["0 0 12px rgba(41,98,255,0.4)", "0 0 22px rgba(41,98,255,0.7)", "0 0 12px rgba(41,98,255,0.4)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)" }}>
              <Activity size={13} className="text-white" />
            </motion.div>
            <span className="text-[16px] font-black tracking-tight" style={{ color: isDark ? "white" : "#0d1117" }}>
              Coin<span style={{ color: "#2962ff" }}>Astra</span>
            </span>
          </div>

          {/* Center: live market status pill */}
          <div className="flex-1 flex justify-center">
            {btcCoin ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(41,98,255,0.1)", border: "1px solid rgba(41,98,255,0.18)" }}>
                <Pulse size={5} />
                <span className="text-[10px] font-mono font-bold text-white">{fmtP(btcCoin.current_price)}</span>
                <span className="text-[9px] font-bold" style={{ color: btcCoin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {btcCoin.price_change_percentage_24h >= 0 ? "+" : ""}{btcCoin.price_change_percentage_24h.toFixed(1)}%
                </span>
                <span className="text-[8px] font-semibold" style={{ color: fgColor }}>F&G {fgVal}</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(41,98,255,0.08)", border: "1px solid rgba(41,98,255,0.15)" }}>
                <Pulse size={5} /><Skel w="w-24" h="h-3" r="rounded-full" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}>
              <Search size={13} />
            </button>
            <NotificationCenter />
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}>
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </div>

        {/* Row 2: Market status strip */}
        <div className="flex items-center gap-4 px-4 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}>
          {[
            { label: "MCap", value: fmtLarge(overview?.totalMarketCap ?? 2_780_000_000_000), color: "#4d7fff" },
            { label: "BTC Dom", value: `${overview?.btcDominance?.toFixed(1) ?? "58.3"}%`, color: "#f7931a" },
            { label: "Vol 24h", value: fmtLarge(overview?.totalVolume24h ?? 96_000_000_000), color: "#26a69a" },
            { label: "Gas", value: "18 Gwei", color: "#627EEA" },
            { label: "F&G", value: `${fgVal} ${fgLabel}`, color: fgColor },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1 shrink-0">
              <span className="text-[8px] uppercase tracking-wider" style={{ color: "#3a4058" }}>{s.label}</span>
              <span className="text-[9px] font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </motion.header>

      {/* ══════════════════════════════════════════════════════════════════
          SCROLLABLE BODY
      ══════════════════════════════════════════════════════════════════ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", paddingBottom: 100 }}>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2: LIVE GLOBAL MARKET TICKER
        ══════════════════════════════════════════════════════════════ */}
        <div className="pt-3 pb-0 overflow-hidden">
          <motion.div
            animate={{ x: [0, -800] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="flex gap-4 items-center px-4 whitespace-nowrap"
            style={{ width: "200%" }}>
            {[
              { label: "BTC", val: btcCoin ? fmtP(btcCoin.current_price) : "$67,482", ch: btcCoin ? btcCoin.price_change_percentage_24h : 2.4, pos: true },
              { label: "ETH", val: ethCoin ? fmtP(ethCoin.current_price) : "$3,248", ch: ethCoin ? ethCoin.price_change_percentage_24h : 1.8, pos: true },
              { label: "SOL", val: solCoin ? fmtP(solCoin.current_price) : "$178", ch: solCoin ? solCoin.price_change_percentage_24h : 5.2, pos: true },
              { label: "TOTAL", val: fmtLarge(overview?.totalMarketCap ?? 2_780_000_000_000), ch: 0.3, pos: true },
              { label: "VOL", val: fmtLarge(overview?.totalVolume24h ?? 96_000_000_000), ch: 0, pos: true },
              { label: "AI SCORE", val: "91/100", ch: 0, pos: true },
              { label: "MEME IDX", val: "+3.8%", ch: 0, pos: true },
              { label: "NARRATIVE", val: "AI Coins 🔥", ch: 0, pos: true },
              // repeat
              { label: "BTC", val: btcCoin ? fmtP(btcCoin.current_price) : "$67,482", ch: btcCoin ? btcCoin.price_change_percentage_24h : 2.4, pos: true },
              { label: "ETH", val: ethCoin ? fmtP(ethCoin.current_price) : "$3,248", ch: ethCoin ? ethCoin.price_change_percentage_24h : 1.8, pos: true },
              { label: "SOL", val: solCoin ? fmtP(solCoin.current_price) : "$178", ch: solCoin ? solCoin.price_change_percentage_24h : 5.2, pos: true },
              { label: "TOTAL", val: fmtLarge(overview?.totalMarketCap ?? 2_780_000_000_000), ch: 0.3, pos: true },
              { label: "VOL", val: fmtLarge(overview?.totalVolume24h ?? 96_000_000_000), ch: 0, pos: true },
              { label: "AI SCORE", val: "91/100", ch: 0, pos: true },
              { label: "MEME IDX", val: "+3.8%", ch: 0, pos: true },
              { label: "NARRATIVE", val: "AI Coins 🔥", ch: 0, pos: true },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#2a3050" }}>{t.label}</span>
                <span className="text-[9px] font-mono font-bold text-white">{t.val}</span>
                {t.ch !== 0 && (
                  <span className="text-[8px] font-bold" style={{ color: t.ch >= 0 ? "#26a69a" : "#ef5350" }}>
                    {t.ch >= 0 ? "+" : ""}{typeof t.ch === "number" ? t.ch.toFixed(1) : t.ch}%
                  </span>
                )}
                <div className="w-px h-3 bg-white/5 ml-1" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3: HERO AI COMMAND CENTER
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(41,98,255,0.15) 0%, rgba(124,58,237,0.12) 50%, rgba(16,185,129,0.08) 100%)",
              border: "1px solid rgba(41,98,255,0.25)",
              boxShadow: "0 8px 48px rgba(41,98,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
            {/* Glow orbs */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #2962ff, transparent)" }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)" }}>
                  <Brain size={13} style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-[12px] font-black text-white">AI Command Center</div>
                  <div className="text-[8px]" style={{ color: "#4a5268" }}>500+ tokens · Updated 60s</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black"
                style={{ background: SIGNAL_BG[btcAi.signal], color: SIGNAL_COLOR[btcAi.signal] }}>
                BTC {btcAi.signal.replace(/_/g, " ")}
              </span>
            </div>

            {/* AI Gauge + Metrics */}
            <div className="flex items-start gap-3 relative z-10">
              {/* Gauge */}
              <div className="shrink-0 flex flex-col items-center">
                <Gauge value={btcAi.bullishProbability} color="#26a69a" size={100} />
                <div className="text-[8px] -mt-1 text-center" style={{ color: "#4a5268" }}>Bullish Score</div>
              </div>

              {/* Right metrics */}
              <div className="flex-1 space-y-2">
                {/* Bull/Bear bar */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span style={{ color: "#26a69a" }}>Bull {btcAi.bullishProbability}%</span>
                    <span style={{ color: "#ef5350" }}>Bear {btcAi.bearishProbability}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-l-full"
                      initial={{ width: 0 }} animate={{ width: `${btcAi.bullishProbability}%` }}
                      transition={{ duration: 1 }}
                      style={{ background: "linear-gradient(90deg,#26a69a,#4ade80)" }} />
                  </div>
                </div>

                {/* 4 mini stats */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Smart $", value: btcAi.smartMoney === "ACCUMULATING" ? "ACCUM" : btcAi.smartMoney === "DISTRIBUTING" ? "DIST" : "NEUT", color: btcAi.smartMoney === "ACCUMULATING" ? "#26a69a" : btcAi.smartMoney === "DISTRIBUTING" ? "#ef5350" : "#5a6072" },
                    { label: "Whale", value: btcAi.whaleActivity, color: btcAi.whaleActivity === "HIGH" || btcAi.whaleActivity === "EXTREME" ? "#f7931a" : "#5a6072" },
                    { label: "Momentum", value: `${btcAi.momentumScore > 0 ? "+" : ""}${btcAi.momentumScore}`, color: btcAi.momentumScore >= 0 ? "#26a69a" : "#ef5350" },
                    { label: "AI Conf.", value: `${btcAi.confidence}%`, color: "#a78bfa" },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-2" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <div className="text-[8px] mb-0.5" style={{ color: "#3a4058" }}>{m.label}</div>
                      <div className="text-[10px] font-black" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeframes */}
            <div className="flex gap-1.5 mt-3 relative z-10">
              {btcAi.timeframes.map(t => {
                const tc = t.sentiment === "BULLISH" ? "#26a69a" : t.sentiment === "BEARISH" ? "#ef5350" : "#5a6072";
                return (
                  <div key={t.tf} className="flex-1 rounded-xl p-2 text-center"
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${tc}25` }}>
                    <div className="text-[8px] font-bold" style={{ color: "#3a4058" }}>{t.tf}</div>
                    <div className="text-[8px] font-black mt-0.5" style={{ color: tc }}>{t.sentiment.slice(0, 4)}</div>
                    <div className="text-[7px] mt-0.5" style={{ color: "#3a4058" }}>{t.confidence}%</div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3 relative z-10">
              <Link href="/ai-insights" className="flex-1">
                <button className="w-full py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", color: "white", boxShadow: "0 4px 16px rgba(41,98,255,0.35)" }}>
                  AI Terminal
                </button>
              </Link>
              <Link href="/screener" className="flex-1">
                <button className="w-full py-2.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#d1d4dc", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Opportunities
                </button>
              </Link>
              <Link href="/signals" className="flex-1">
                <button className="w-full py-2.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                  style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a", border: "1px solid rgba(38,166,154,0.25)" }}>
                  Signals
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4: QUICK STAT CHIPS
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "MCap", value: fmtLarge(overview?.totalMarketCap ?? 2_780_000_000_000), color: "#2962ff", icon: Globe },
              { label: "24h Vol", value: fmtLarge(overview?.totalVolume24h ?? 96_000_000_000), color: "#26a69a", icon: BarChart2 },
              { label: "BTC Dom", value: `${overview?.btcDominance?.toFixed(1) ?? "58.3"}%`, color: "#f7931a", icon: Activity },
              { label: "F&G", value: `${fgVal} · ${fgLabel}`, color: fgColor, icon: Shield },
              { label: "Gas", value: "18 Gwei", color: "#627EEA", icon: Zap },
            ].map(s => (
              <div key={s.label} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{ background: `${s.color}12`, border: `1px solid ${s.color}22` }}>
                <s.icon size={11} style={{ color: s.color }} />
                <div>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: s.color + "99" }}>{s.label}</div>
                  <div className="text-[10px] font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 5: TOP AI OPPORTUNITIES
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="AI Opportunities" icon={Brain} color="#7c3aed" badge="PRO" link="/screener" linkLabel="Screen all" />
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {aiOpps.map((opp, i) => {
              const confColor = opp.conf >= 85 ? "#26a69a" : opp.conf >= 70 ? "#f7931a" : "#ef5350";
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="shrink-0 w-40 rounded-2xl p-3 cursor-pointer relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: `0 4px 20px ${opp.badgeColor}10` }}
                  whileTap={{ scale: 0.95 }}>
                  {/* Glow accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${opp.badgeColor}, transparent)` }} />

                  {/* Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                      style={{ background: `${opp.badgeColor}22`, color: opp.badgeColor, border: `1px solid ${opp.badgeColor}35` }}>
                      {opp.badge}
                    </span>
                  </div>

                  <div className="text-[16px] font-black text-white mb-0.5">{opp.coin}</div>
                  <div className="text-[9px] mb-2" style={{ color: "#4a5268" }}>{opp.name}</div>

                  {/* Potential gain */}
                  <div className="text-[18px] font-black leading-none" style={{ color: "#26a69a" }}>{opp.gain}</div>
                  <div className="text-[8px]" style={{ color: "#3a4058" }}>potential gain</div>

                  {/* Confidence bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[7px] mb-0.5">
                      <span style={{ color: "#3a4058" }}>AI Confidence</span>
                      <span style={{ color: confColor }}>{opp.conf}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${opp.conf}%`, background: confColor }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[7px] px-1 py-0.5 rounded-md"
                      style={{ background: opp.risk === "LOW" ? "rgba(38,166,154,0.15)" : "rgba(247,147,26,0.15)", color: opp.risk === "LOW" ? "#26a69a" : "#f7931a" }}>
                      {opp.risk}
                    </span>
                    <span className="text-[7px]" style={{ color: "#3a4058" }}>{opp.narrative}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 6: TRENDING NARRATIVES
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Trending Narratives" icon={Sparkles} color="#7c3aed" link="/narratives" />
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {NARRATIVES.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="shrink-0 w-36 rounded-2xl p-3 cursor-pointer"
                style={{ background: `${n.color}0d`, border: `1px solid ${n.color}25` }}
                whileTap={{ scale: 0.96 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black" style={{ color: n.color }}>{n.name}</span>
                  <span className="text-[9px] font-bold" style={{ color: n.pos ? "#26a69a" : "#ef5350" }}>{n.ch}</span>
                </div>
                {/* Score bar */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${n.score}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06 }}
                      style={{ background: n.color }} />
                  </div>
                  <span className="text-[9px] font-black" style={{ color: n.color }}>{n.score}</span>
                </div>
                <div className="text-[8px] mb-1.5" style={{ color: "#3a4058" }}>Inflow: {n.inflow}</div>
                <div className="flex gap-1 flex-wrap">
                  {n.coins.map(c => (
                    <span key={c} className="text-[7px] px-1 py-0.5 rounded-md font-mono"
                      style={{ background: `${n.color}15`, color: n.color }}>{c}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 7: MINI HEATMAP
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Market Heatmap" icon={LayoutGrid} color="#2962ff" link="/heatmap" />
          <div className="rounded-2xl overflow-hidden p-2.5"
            style={{ background: "rgba(5,8,14,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-wrap gap-1">
              {HEATMAP_COINS.map((coin, i) => {
                const sz = coin.size >= 7 ? "w-20 h-14" : coin.size >= 5 ? "w-16 h-12" : coin.size >= 3 ? "w-14 h-10" : "w-10 h-8";
                return (
                  <motion.div key={coin.coin}
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`${sz} rounded-xl flex flex-col items-center justify-center cursor-pointer`}
                    style={{ background: heatColor(coin.ch) }}
                    whileTap={{ scale: 0.9 }}>
                    <div className="text-[9px] font-black text-white">{coin.coin}</div>
                    <div className="text-[8px] font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {coin.ch >= 0 ? "+" : ""}{coin.ch.toFixed(1)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 8: WHALE TRACKER LIVE
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Whale Tracker" icon={Waves} color="#0ea5e9" badge="LIVE" link="/whale-tracker" />
          <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            {WHALE_TXS.map((tx, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < WHALE_TXS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-[9px]"
                  style={{ background: "rgba(14,165,233,0.12)", color: "#0ea5e9" }}>
                  {tx.coin.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-white">{tx.from}</span>
                    <ArrowRightLeft size={9} style={{ color: "#3a4058" }} className="shrink-0" />
                    <span className="text-[10px]" style={{ color: "#787b86" }}>{tx.to}</span>
                    <span className="text-[7px] px-1 py-0.5 rounded-md font-black"
                      style={{
                        background: tx.type === "IN" ? "rgba(239,83,80,0.15)" : tx.type === "OUT" ? "rgba(38,166,154,0.15)" : "rgba(255,255,255,0.06)",
                        color: tx.type === "IN" ? "#ef5350" : tx.type === "OUT" ? "#26a69a" : "#5a6072",
                      }}>
                      {tx.type}
                    </span>
                  </div>
                  <div className="text-[8px] mt-0.5" style={{ color: "#3a4058" }}>{tx.amount} · {tx.time} ago</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-black text-white font-mono">{tx.usd}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 9: TOP GAINERS / LOSERS
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Top Movers" icon={TrendingUp} color="#26a69a" badge="LIVE" link="/markets" />
          <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["gainers", "losers"] as const).map(tab => (
              <button key={tab} onClick={() => setMoverTab(tab)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: moverTab === tab ? (tab === "gainers" ? "rgba(38,166,154,0.2)" : "rgba(239,83,80,0.2)") : "transparent",
                  color: moverTab === tab ? (tab === "gainers" ? "#26a69a" : "#ef5350") : "#4a5270",
                  border: moverTab === tab ? `1px solid ${tab === "gainers" ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)"}` : "1px solid transparent",
                }}>
                {tab === "gainers" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {tab === "gainers" ? "Gainers" : "Losers"}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {coinsLoading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="shrink-0 w-36 h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)
              : movers.slice(0, 8).map((coin, i) => {
                  const ai = analyzeToken({
                    priceChange24h: coin.price_change_percentage_24h,
                    priceChange7d: coin.price_change_percentage_7d_in_currency ?? undefined,
                    volume24h: coin.total_volume,
                    marketCap: coin.market_cap,
                    symbol: coin.symbol,
                  });
                  return (
                    <motion.div key={coin.id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="shrink-0 w-36 rounded-2xl p-3 cursor-pointer relative overflow-hidden"
                      style={{ background: c.card, border: `1px solid ${c.border}` }}
                      whileTap={{ scale: 0.96 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        {coin.image && <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full" />}
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</div>
                        </div>
                        <span className="ml-auto text-[7px] px-1 py-0.5 rounded-md font-black"
                          style={{ background: SIGNAL_BG[ai.signal], color: SIGNAL_COLOR[ai.signal] }}>
                          {ai.signal.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mb-1"><MiniSparkline coin={coin} height={28} /></div>
                      <div className="text-[11px] font-mono font-bold text-white leading-none">{fmtP(coin.current_price)}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="text-[11px] font-bold" style={{ color: coin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
                          {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                        </div>
                        <div className="text-[8px]" style={{ color: "#3a4058" }}>{ai.confidence}%</div>
                      </div>
                    </motion.div>
                  );
                })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 10: FEAR & GREED PANEL
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Fear & Greed Index" icon={Shield} color={fgColor} />
          <div className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg,${fgColor}12,rgba(255,255,255,0.02))`, border: `1px solid ${fgColor}25` }}>
            {/* Gauge */}
            <div className="shrink-0">
              <Gauge value={fgVal} color={fgColor} size={90} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-black mb-0.5" style={{ color: fgColor }}>{fgLabel.toUpperCase()}</div>
              <div className="text-[9px] mb-2" style={{ color: "#4a5268" }}>Market Emotion Index · 0–100</div>
              {/* Mini history */}
              <div className="flex items-end gap-1 h-6">
                {[28, 34, 42, 38, 45, 41, fgVal].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t-sm"
                    style={{ height: `${(v / 100) * 100}%`, background: v < 40 ? "#ef5350" : v < 50 ? "#f7931a" : "#26a69a", opacity: i === 6 ? 1 : 0.4 }} />
                ))}
              </div>
              <div className="flex justify-between text-[7px] mt-1">
                {["7d", "6d", "5d", "4d", "3d", "2d", "Now"].map(d => (
                  <span key={d} style={{ color: "#2a3050" }}>{d}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[9px]" style={{ color: "#4a5268" }}>AI Interpretation:</span>
                <span className="text-[9px] font-bold" style={{ color: fgColor }}>
                  {fgVal < 40 ? "Potential buying opportunity" : fgVal < 55 ? "Neutral — monitor closely" : "Caution: market overheated"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 11: AI NEWS & SENTIMENT
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="News & Sentiment" icon={Newspaper} color="#0ea5e9" link="/news" />
          <div className="space-y-2">
            {NEWS_ITEMS.map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{ background: c.card, border: `1px solid ${expandedNews === i ? item.color + "35" : c.border}` }}
                onClick={() => setExpandedNews(expandedNews === i ? null : i)}>
                <div className="flex items-start gap-3 p-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}15` }}>
                    {item.sentiment === "BULLISH" ? <TrendingUp size={13} style={{ color: item.color }} /> : <TrendingDown size={13} style={{ color: item.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[8px]" style={{ color: "#4a5268" }}>{item.source}</span>
                      <span className="text-[7px] px-1 py-0.5 rounded-md font-bold" style={{ background: `${item.color}15`, color: item.color }}>{item.sentiment}</span>
                      <span className="text-[7px] px-1 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}>{item.coin}</span>
                      <Clock size={8} style={{ color: "#3a4058" }} /><span className="text-[8px]" style={{ color: "#3a4058" }}>{item.time}</span>
                    </div>
                  </div>
                  <ChevronDown size={12} style={{ color: "#3a4058", transform: expandedNews === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </div>
                <AnimatePresence>
                  {expandedNews === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="px-3 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-1 mt-2 mb-1">
                        <Zap size={9} style={{ color: "#7c3aed" }} />
                        <span className="text-[8px] font-bold" style={{ color: "#a78bfa" }}>AI Summary</span>
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: "#787b86" }}>
                        AI-powered analysis suggests {item.sentiment === "BULLISH" ? "strong positive" : "negative"} market impact for {item.coin} in the short term. Institutional sentiment remains {item.sentiment === "BULLISH" ? "constructive with accumulation signals" : "cautious with risk-off behavior"}.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 12: WATCHLIST QUICK ACCESS
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="My Watchlist" icon={Star} color="#f7931a" link="/watchlist" />
          <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            {WATCHLIST_COINS.map((wc, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < WATCHLIST_COINS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-[9px]"
                  style={{ background: "rgba(247,147,26,0.12)", color: "#f7931a" }}>{wc.coin.slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-white">{wc.coin}</div>
                  <div className="text-[9px] font-mono" style={{ color: "#4a5268" }}>{wc.price}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {wc.alert && <Bell size={10} style={{ color: "#f7931a" }} />}
                  <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${wc.aiScore}%`, background: "#7c3aed" }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-bold font-mono" style={{ color: wc.pos ? "#26a69a" : "#ef5350" }}>{wc.ch24}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 13: PORTFOLIO SNAPSHOT
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Portfolio" icon={Briefcase} color="#2962ff" link="/portfolio" />
          <div className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg,rgba(41,98,255,0.1),rgba(38,166,154,0.07))", border: "1px solid rgba(41,98,255,0.2)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#3a4058" }}>Total Balance</div>
                <div className="text-[28px] font-black text-white leading-none">{PORTFOLIO_DATA.balance}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <ArrowUpRight size={12} style={{ color: "#26a69a" }} />
                  <span className="text-[12px] font-bold" style={{ color: "#26a69a" }}>{PORTFOLIO_DATA.pnl}</span>
                  <span className="text-[10px]" style={{ color: "#26a69a" }}>({PORTFOLIO_DATA.pnlPct})</span>
                </div>
              </div>
              {/* Mini pie */}
              <div className="relative w-16 h-16">
                <svg width={64} height={64} viewBox="0 0 64 64">
                  {(() => {
                    let offset = 0;
                    return PORTFOLIO_DATA.allocation.map((a, i) => {
                      const circ = 2 * Math.PI * 24;
                      const dash = (a.pct / 100) * circ;
                      const gap = circ - dash;
                      const start = offset;
                      offset += dash;
                      return (
                        <circle key={i} cx={32} cy={32} r={24}
                          fill="none" stroke={a.color} strokeWidth={8}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-start + circ / 4}
                          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">{PORTFOLIO_DATA.aiHealth}%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { label: "Best", coin: PORTFOLIO_DATA.best.coin, val: PORTFOLIO_DATA.best.pct, color: "#26a69a" },
                { label: "Worst", coin: PORTFOLIO_DATA.worst.coin, val: PORTFOLIO_DATA.worst.pct, color: "#ef5350" },
              ].map(p => (
                <div key={p.label} className="flex-1 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="text-[8px] mb-0.5" style={{ color: "#3a4058" }}>{p.label}</div>
                  <div className="text-[11px] font-black text-white">{p.coin}</div>
                  <div className="text-[10px] font-bold" style={{ color: p.color }}>{p.val}</div>
                </div>
              ))}
              <div className="flex-1 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                <div className="text-[8px] mb-0.5" style={{ color: "#3a4058" }}>AI Health</div>
                <div className="text-[11px] font-black text-white">{PORTFOLIO_DATA.aiHealth}/100</div>
                <div className="text-[10px] font-bold" style={{ color: "#26a69a" }}>Strong</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 14: AI ALERTS CENTER
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="AI Alerts" icon={Bell} color="#ef5350" badge="4 NEW" link="/alerts" />
          <div className="space-y-2">
            {AI_ALERTS.map((alert, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: `${alert.color}08`, border: `1px solid ${alert.color}20` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${alert.color}15` }}>
                  <alert.icon size={13} style={{ color: alert.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md"
                    style={{ background: `${alert.color}20`, color: alert.color }}>{alert.type}</span>
                  <p className="text-[11px] font-semibold text-white mt-0.5 leading-snug">{alert.title}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0" style={{ color: "#3a4058" }}>
                  <Clock size={8} /><span className="text-[8px]">{alert.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 15: MEME COIN RADAR
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4">
          <SH title="Meme Radar" icon={Flame} color="#ef5350" badge="HOT" link="/markets" />
          <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            {/* live meme coins if available, else mock */}
            {(memeCoins.length > 0 ? memeCoins.slice(0, 4) : MEME_RADAR).map((coin, i) => {
              const isLive = memeCoins.length > 0;
              const lc = coin as typeof memeCoins[0];
              const mc = coin as typeof MEME_RADAR[0];
              const symbol = isLive ? lc.symbol.toUpperCase() : mc.coin;
              const ch = isLive ? lc.price_change_percentage_24h : parseFloat(mc.ch);
              const isPos = ch >= 0;
              const social = isLive ? `${Math.abs(ch * 10).toFixed(0)}%` : mc.social;
              const aiScore = isLive ? Math.round(50 + ch * 2) : mc.aiScore;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[9px]"
                    style={{ background: "rgba(239,83,80,0.12)", color: "#ef5350" }}>{symbol.slice(0, 3)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-white">{symbol}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px]" style={{ color: "#4a5268" }}>Social {social}</span>
                      <span className="text-[8px] font-bold" style={{ color: "#ef5350" }}>HIGH RISK</span>
                    </div>
                  </div>
                  {isLive && <MiniSparkline coin={lc} height={22} />}
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-bold font-mono" style={{ color: isPos ? "#26a69a" : "#ef5350" }}>
                      {isPos ? "+" : ""}{ch.toFixed(1)}%
                    </div>
                    <div className="text-[8px]" style={{ color: "#a78bfa" }}>AI {aiScore}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 16: ON-CHAIN ACTIVITY
        ══════════════════════════════════════════════════════════════ */}
        <div className="px-4 pt-4 pb-4">
          <SH title="On-Chain Activity" icon={Network} color="#10b981" link="/on-chain" />
          <div className="grid grid-cols-3 gap-2">
            {ONCHAIN.map((item, i) => (
              <motion.div key={item.label}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-3"
                style={{ background: `${item.color}0d`, border: `1px solid ${item.color}20` }}>
                <item.icon size={12} style={{ color: item.color }} className="mb-1.5" />
                <div className="text-[12px] font-black" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[8px] mt-0.5" style={{ color: "#3a4058" }}>{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TRENDING (live feed when available)
        ══════════════════════════════════════════════════════════════ */}
        {trendingCoins.length > 0 && (
          <div className="px-4 pt-0 pb-2">
            <SH title="Trending" icon={Flame} color="#f7931a" badge="HOT" link="/markets" />
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {trendingCoins.map((t, i) => {
                const ch = t.data?.price_change_percentage_24h?.usd ?? 0;
                return (
                  <motion.div key={t.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="shrink-0 w-24 rounded-2xl p-2.5 text-center cursor-pointer"
                    style={{ background: c.card, border: `1px solid ${c.border}` }}
                    whileTap={{ scale: 0.96 }}>
                    <img src={t.thumb} alt={t.symbol}
                      className="w-8 h-8 rounded-full mx-auto mb-1.5 object-cover"
                      onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                    <div className="text-[10px] font-bold text-white">{t.symbol.toUpperCase()}</div>
                    <div className="text-[9px] font-bold mt-1" style={{ color: ch >= 0 ? "#26a69a" : "#ef5350" }}>
                      {ch >= 0 ? "+" : ""}{ch.toFixed(1)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <MobileNav />
    </div>
  );
}

// Legacy export (kept for any import compatibility)
function Database({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={style?.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx={12} cy={5} rx={9} ry={3} />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
