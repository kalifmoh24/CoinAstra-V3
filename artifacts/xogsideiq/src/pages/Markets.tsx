import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronLeft, ChevronRight, Star, Globe, BarChart2,
  Activity, List, LayoutGrid, TrendingUp, Zap, Flame,
  LayoutDashboard, Compass, BookOpen, Briefcase, Bell,
  X, AlertCircle, Filter, ChevronDown, Sun, Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useScreenSize } from "@/hooks/use-screen-size";
import { useInfiniteSentinel, useOptimizedMarkets } from "@/hooks/use-optimized-markets";
import { dedupeById } from "@/lib/dedupe-coins";
import { ActionButton } from "@/components/action-button";
import { VirtualCoinList } from "@/components/virtual-coin-list";
import { useMarketStore } from "@/stores/market-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MobileNav } from "@/components/mobile-nav";
import { GlobalTicker } from "@/components/global-ticker";
import { NotificationCenter } from "@/components/notification-center";
import { useTheme } from "@/components/theme-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  /** True until first live /simple/price merge for this row (optimized mode). */
  _pricePending?: boolean;
}

interface GlobalData {
  active_cryptocurrencies: number;
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
  markets: number;
}

type SortKey = "rank" | "price" | "ch1h" | "ch24h" | "ch7d" | "mcap" | "vol";
type SortDir = "asc" | "desc";

// ─── Constants ────────────────────────────────────────────────────────────────

// Maps display label → CoinGecko category ID (null = All)
import { researchHref } from "@/lib/research-url";
export { researchHref };

const CATEGORY_MAP: Record<string, string | null> = {
  "All":           null,
  "Trending":      "__trending__",
  "New Listings":  "__new__",
  "DeFi":          "decentralized-finance-defi",
  "Layer 1":       "layer-1",
  "Layer 2":       "layer-2",
  "Meme":          "meme-token",
  "AI":            "artificial-intelligence",
  "Gaming":        "gaming",
  "Solana":        "solana-ecosystem",
  "Stablecoins":   "stablecoins",
  "RWA":           "real-world-assets-rwa",
  "DePIN":         "decentralized-physical-infrastructure-networks-depin",
  "NFT":           "non-fungible-tokens-nft",
  "Metaverse":     "metaverse",
  "Oracle":        "oracle",
  "Exchange":      "exchange-based-tokens",
  "Privacy":       "privacy-coins",
  "Infrastructure":"infrastructure",
  "Dog Meme":      "dog-themed-coins",
  "Cat Meme":      "cat-themed-coins",
  "BTC Ecosystem": "bitcoin-ecosystem",
  "ETH Ecosystem": "ethereum-ecosystem",
  "SOL Ecosystem": "solana-ecosystem",
  "BNB Chain":     "bnb-chain-ecosystem",
  "Liquid Staking":"liquid-staking-tokens",
  "Bridge":        "bridge-governance-tokens",
  "Derivatives":   "derivatives",
  "Sports":        "sports",
  "Fan Token":     "fan-token",
  "Wrapped":       "wrapped-tokens",
};

const CATEGORY_LABELS = Object.keys(CATEGORY_MAP);

const NAV = [
  { path: "/",          label: "Dashboard", icon: LayoutDashboard },
  { path: "/markets",   label: "Markets",   icon: BarChart2 },
  { path: "/research",  label: "Research",  icon: Compass },
  { path: "/narratives",label: "Narratives",icon: BookOpen },
  { path: "/signals",   label: "Signals",   icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
];

const SORT_OPTS: [SortKey, string][] = [
  ["rank","Rank"], ["price","Price"], ["ch24h","24h %"],
  ["ch7d","7d %"], ["mcap","MCap"], ["vol","Volume"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (!n) return "$0.00";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1)    return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(6);
  return "$" + n.toPrecision(4);
}
function fmtLarge(n: number): string {
  if (!n) return "$—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}
function fmtSupply(n: number, sym: string): string {
  const s = sym.toUpperCase();
  if (!n) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B " + s;
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M " + s;
  return n.toLocaleString() + " " + s;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMarkets(page: number): Promise<CoinMarket[]> {
  const res = await fetch(`/api/coins/markets?per_page=250&page=${page}&sparkline=true&price_change_percentage=1h,7d`);
  if (!res.ok) throw new Error(`markets ${res.status}`);
  return res.json();
}
async function fetchCategoryCoins(categoryId: string, page: number): Promise<CoinMarket[]> {
  const res = await fetch(`/api/coins/markets?per_page=250&page=${page}&category=${encodeURIComponent(categoryId)}&sparkline=true&price_change_percentage=1h,7d`);
  if (!res.ok) throw new Error(`category ${res.status}`);
  return res.json();
}
async function fetchGlobal(): Promise<{ data: GlobalData }> {
  const res = await fetch("/api/coins/global");
  if (!res.ok) throw new Error(`global ${res.status}`);
  return res.json();
}

// ─── Shared: MiniSparkline ────────────────────────────────────────────────────

function MiniSparkline({ prices, isPos, id, w = 80, h = 32 }: {
  prices: number[]; isPos: boolean; id: string; w?: number; h?: number;
}) {
  if (!prices || prices.length < 4) {
    return <div style={{ width: w, height: h, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />;
  }
  const step = Math.max(1, Math.floor(prices.length / 24));
  const pts = prices.filter((_, i) => i % step === 0).slice(-24);
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const coords = pts.map((p, i) => [
    (i / (pts.length - 1)) * w,
    h - 2 - ((p - min) / range) * (h - 4),
  ]);
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const color = isPos ? "#26a69a" : "#ef5350";
  const gid = `spk_${id}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceSkel() {
  return (
    <span
      className="inline-block h-3.5 min-w-[3.5rem] rounded animate-pulse"
      style={{ background: "rgba(255,255,255,0.08)" }}
    />
  );
}

function CoinThumb({ src, name, symbol, size = 28 }: { src: string; name: string; symbol: string; size?: number }) {
  const [broken, setBroken] = useState(!src);
  if (broken || !src) {
    const ch = (symbol || name || "?").charAt(0).toUpperCase();
    return (
      <div
        className="rounded-full shrink-0 flex items-center justify-center font-black text-[10px]"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, Math.round(size * 0.35)),
          background: "linear-gradient(135deg,rgba(41,98,255,0.35),rgba(124,58,237,0.35))",
          color: "#d1d4dc",
        }}
      >
        {ch}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className="rounded-full shrink-0"
      style={{ boxShadow: "0 0 8px rgba(0,0,0,0.4)" }}
      onError={() => setBroken(true)}
    />
  );
}

// ─── Shared: ChangeCell ───────────────────────────────────────────────────────

function ChangeCell({ v, badge }: { v?: number | null; badge?: boolean }) {
  if (v == null) return <span style={{ color: "#5a6072", fontSize: 10 }}>—</span>;
  const isPos = v >= 0;
  const color = isPos ? "#26a69a" : "#ef5350";
  if (badge) {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:2, padding:"2px 6px", borderRadius:6,
        background: isPos ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.12)",
        border:`1px solid ${color}30`, color, fontSize:10, fontWeight:700 }}>
        {isPos ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {Math.abs(v).toFixed(2)}%
      </span>
    );
  }
  return (
    <span style={{ color, fontSize:10, fontWeight:600 }}>
      {isPos ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

// ─── Desktop: StatCard ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon, loading }: {
  label:string; value:string; sub?:string; color:string; icon:React.ElementType; loading?: boolean;
}) {
  const subColor = sub?.startsWith("+") ? "#26a69a" : sub?.startsWith("-") ? "#ef5350" : "#787b86";
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="flex-1 min-w-[150px] rounded-2xl p-4 relative overflow-hidden"
      style={{ background:"rgba(13,17,26,0.85)", backdropFilter:"blur(24px)",
        border:`1px solid ${color}22`, boxShadow:`0 0 24px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)` }}>
      <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl"
        style={{ background:`linear-gradient(90deg,transparent 0%,${color}aa 50%,transparent 100%)` }} />
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-xl" style={{ background:color }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color:"#787b86" }}>{label}</span>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
            <Icon size={14} style={{ color }} />
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-28 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
        ) : (
          <div className="text-xl font-black text-white font-mono tabular-nums tracking-tight">{value}</div>
        )}
        {sub && !loading && <div className="text-[9px] mt-1 font-semibold" style={{ color: subColor }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── Mobile: Ticker Strip ─────────────────────────────────────────────────────

function MobileTicker({ coins }: { coins: CoinMarket[] }) {
  return (
    <div className="flex overflow-x-auto" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", WebkitOverflowScrolling:"touch" }}>
      {coins.slice(0,10).map(c => (
        <div key={c.id} className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ borderRight:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
            <CoinThumb src={c.image} name={c.name} symbol={c.symbol} size={16} />
          </div>
          <span className="text-[10px] font-bold text-white">{c.symbol.toUpperCase()}</span>
          <span className="text-[10px] font-mono" style={{ color:"#a0a8bc" }}>
            {c._pricePending ? "…" : fmtPrice(c.current_price)}
          </span>
          <span className="text-[9px] font-bold" style={{ color: c.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
            {c.price_change_percentage_24h >= 0 ? "▲" : "▼"}{Math.abs(c.price_change_percentage_24h).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile: Stat Strip ───────────────────────────────────────────────────────

function MobileStatStrip({ g }: { g?: GlobalData }) {
  const stats = [
    { label:"Mkt Cap", value: fmtLarge(g?.total_market_cap?.usd ?? 0),
      sub: g ? `${g.market_cap_change_percentage_24h_usd >= 0 ? "+" : ""}${g.market_cap_change_percentage_24h_usd.toFixed(2)}% 24h` : undefined,
      color:"#2962ff" },
    { label:"24h Volume", value: fmtLarge(g?.total_volume?.usd ?? 0),
      sub: g ? `${((g.total_volume.usd / g.total_market_cap.usd)*100).toFixed(1)}% of MCap` : undefined,
      color:"#26a69a" },
    { label:"BTC Dom", value:`${(g?.market_cap_percentage?.btc ?? 0).toFixed(1)}%`, color:"#f7931a" },
    { label:"ETH Dom", value:`${(g?.market_cap_percentage?.eth ?? 0).toFixed(1)}%`, color:"#627eea" },
    { label:"Active Coins", value:(g?.active_cryptocurrencies ?? 0).toLocaleString(), color:"#7c3aed" },
  ];
  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{ WebkitOverflowScrolling:"touch" }}>
      {stats.map((s, i) => (
        <motion.div key={i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl p-3 shrink-0 relative overflow-hidden"
          style={{ minWidth:108, background:`${s.color}10`, border:`1px solid ${s.color}28`,
            boxShadow:`0 0 16px ${s.color}0a` }}>
          <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl"
            style={{ background:`linear-gradient(90deg,transparent,${s.color}90,transparent)` }} />
          <div className="text-[8px] uppercase font-bold tracking-widest" style={{ color:s.color }}>{s.label}</div>
          <div className="text-[17px] font-black text-white mt-1 font-mono tracking-tight">{s.value}</div>
          {s.sub && (
            <div className="text-[9px] font-semibold mt-0.5"
              style={{ color: s.sub.startsWith("+") ? "#26a69a" : s.sub.startsWith("-") ? "#ef5350" : "#787b86" }}>
              {s.sub}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Mobile: Sort Bar ─────────────────────────────────────────────────────────

function MobileSortBar({ sortKey, sortDir, onSort }: {
  sortKey: SortKey; sortDir: SortDir; onSort:(k:SortKey)=>void;
}) {
  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ WebkitOverflowScrolling:"touch" }}>
      {SORT_OPTS.map(([k, lbl]) => {
        const active = sortKey === k;
        return (
          <button key={k} onClick={() => onSort(k)}
            className="flex items-center gap-1 px-3 h-8 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 transition-all"
            style={{
              background: active ? "rgba(41,98,255,0.22)" : "rgba(30,34,45,0.9)",
              color: active ? "#4d7fff" : "#5a6072",
              border:`1px solid ${active ? "rgba(41,98,255,0.4)" : "rgba(255,255,255,0.07)"}`,
              boxShadow: active ? "0 0 12px rgba(41,98,255,0.2)" : "none",
            }}>
            {lbl}
            {active && (sortDir==="asc" ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Mobile: Category Bar ─────────────────────────────────────────────────────

function MobileCategoryBar({ category, setCategory }: {
  category:string; setCategory:(c:string)=>void;
}) {
  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ WebkitOverflowScrolling:"touch" }}>
      {CATEGORY_LABELS.map(cat => {
        const active = category === cat;
        return (
          <button key={cat} onClick={() => setCategory(cat)}
            className="px-3 h-8 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all"
            style={{
              background: active ? "rgba(41,98,255,0.22)" : "rgba(30,34,45,0.9)",
              color: active ? "#4d7fff" : "#5a6072",
              border:`1px solid ${active ? "rgba(41,98,255,0.4)" : "rgba(255,255,255,0.07)"}`,
            }}>
            {cat}
          </button>
        );
      })}
    </div>
  );
}

// ─── Mobile: Skeleton Row ─────────────────────────────────────────────────────

function MobileSkelRow({ i }: { i:number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 animate-pulse"
      style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", animationDelay:`${i*50}ms` }}>
      <div className="w-4 h-4 rounded shrink-0" style={{ background:"rgba(255,255,255,0.06)" }} />
      <div className="w-10 h-10 rounded-full shrink-0" style={{ background:"rgba(255,255,255,0.07)" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded-md" style={{ width:100, background:"rgba(255,255,255,0.07)" }} />
        <div className="h-2.5 rounded-md" style={{ width:60, background:"rgba(255,255,255,0.05)" }} />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-4 rounded-md ml-auto" style={{ width:80, background:"rgba(255,255,255,0.07)" }} />
        <div className="h-3 rounded-md ml-auto" style={{ width:50, background:"rgba(255,255,255,0.05)" }} />
      </div>
      <div className="rounded-md shrink-0" style={{ width:56, height:32, background:"rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ─── Mobile: Coin Row ─────────────────────────────────────────────────────────

function MobileCoinRow({ coin, idx, isWatched, onWatchlist, lite }: {
  coin:CoinMarket; idx:number; isWatched:boolean; onWatchlist:()=>void; lite?:boolean;
}) {
  const is24hPos = coin.price_change_percentage_24h >= 0;
  const is7dPos  = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
  const inner = (
      <Link href={researchHref(coin)}>
        <div className="flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors cursor-pointer">
          <button
            className="shrink-0 p-1 -ml-1 rounded-lg active:scale-90 transition-transform"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onWatchlist(); }}
          >
            <Star size={16} style={{ color: isWatched ? "#f7931a" : "#2a2e3a", fill: isWatched ? "#f7931a" : "none" }} />
          </button>
          <CoinThumb src={coin.image} name={coin.name} symbol={coin.symbol} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white leading-none truncate">{coin.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold uppercase" style={{ color:"#5a6072" }}>{coin.symbol}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                style={{ background:"rgba(255,255,255,0.06)", color:"#5a6072" }}>
                #{coin.market_cap_rank}
              </span>
            </div>
            <div className="text-[9px] mt-0.5 font-mono" style={{ color:"#3a4058" }}>
              MCap {fmtLarge(coin.market_cap)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[14px] font-black text-white font-mono tabular-nums leading-none">
              {coin._pricePending ? <PriceSkel /> : fmtPrice(coin.current_price)}
            </div>
            <div className="inline-flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold tabular-nums"
              style={{
                background: is24hPos ? "rgba(38,166,154,0.13)" : "rgba(239,83,80,0.13)",
                color: is24hPos ? "#26a69a" : "#ef5350",
              }}>
              {coin._pricePending ? (
                <span style={{ opacity: 0.7 }}>…</span>
              ) : (
                <>
                  {is24hPos ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                  {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center">
            <MiniSparkline prices={coin.sparkline_in_7d?.price ?? []} isPos={is7dPos} id={`m_${coin.id}`} w={56} h={28} />
            <span className="text-[7px] mt-0.5" style={{ color:"#3a4058" }}>7 days</span>
          </div>
        </div>
      </Link>
  );
  if (lite) {
    return <>{inner}</>;
  }
  return (
    <motion.div
      initial={{ opacity:0, x:-8 }}
      animate={{ opacity:1, x:0 }}
      transition={{ duration:0.12, delay:Math.min(idx*0.012, 0.35) }}
      style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}
    >
      {inner}
    </motion.div>
  );
}

// ─── Tablet: Skeleton Row ─────────────────────────────────────────────────────

function TabletSkelRow({ i }: { i:number }) {
  return (
    <tr className="animate-pulse border-b" style={{ borderColor:"rgba(255,255,255,0.04)", animationDelay:`${i*40}ms` }}>
      {[10, 10, 150, 90, 70, 100, 90, 80].map((w,j) => (
        <td key={j} className="px-3 py-3.5">
          <div className="h-3 rounded-md" style={{ width:w, background:"rgba(255,255,255,0.06)" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Desktop: Skeleton Row ────────────────────────────────────────────────────

function DeskSkelRow({ i }: { i:number }) {
  return (
    <tr className="animate-pulse border-b" style={{ borderColor:"rgba(255,255,255,0.04)", animationDelay:`${i*35}ms` }}>
      {[12,10,150,90,60,65,65,100,100,130,80].map((w,j) => (
        <td key={j} className="px-3 py-3.5">
          <div className="h-3 rounded-md" style={{ width:w, background:"rgba(255,255,255,0.06)" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Shared: SortTH ──────────────────────────────────────────────────────────

function SortTH({ label, sk, sortKey, sortDir, onSort, right }:{
  label:string; sk?:SortKey; sortKey:SortKey; sortDir:SortDir; onSort:(k:SortKey)=>void; right?:boolean;
}) {
  const active = sk && sortKey === sk;
  return (
    <th onClick={sk ? ()=>onSort(sk) : undefined}
      className={`px-3 py-3 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap select-none ${right?"text-right":"text-left"} ${sk?"cursor-pointer":""}`}
      style={{ color: active ? "#4d7fff" : "#4a5068" }}>
      <div className={`flex items-center gap-1 ${right?"justify-end":""}`}>
        {label}
        {sk && (active ? (sortDir==="asc" ? <ArrowUp size={10} style={{color:"#4d7fff"}}/> : <ArrowDown size={10} style={{color:"#4d7fff"}}/>) : <ArrowUpDown size={10} style={{opacity:0.3}}/>)}
      </div>
    </th>
  );
}

// ─── Main Markets Component ───────────────────────────────────────────────────

async function fetchCoinSearchMarkets(q: string) {
  const res = await fetch(`/api/coins/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return { coins: [] };
  return res.json() as Promise<{ coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null; thumb: string }> }>;
}

export default function Markets() {
  const [location, setLocation] = useLocation();
  const { isMobile, isTablet } = useScreenSize();
  const { theme, setTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 280);
  const [category, setCategory]   = useState("All");
  const [sortKey, setSortKey]     = useState<SortKey>("rank");
  const [sortDir, setSortDir]     = useState<SortDir>("asc");
  const [view, setView]           = useState<"table"|"cards">("table");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState(30);
  const [showSearch, setShowSearch] = useState(false);

  // ── Category-based data ────────────────────────────────────────────────────
  const activeCategoryId = CATEGORY_MAP[category] ?? null;
  const isTrendingMode = activeCategoryId === "__trending__";
  const isNewListingsMode = activeCategoryId === "__new__";
  const isCategoryMode = activeCategoryId !== null && !isTrendingMode && !isNewListingsMode;
  const optimizedAll = !activeCategoryId && category === "All";

  const {
    data: categoryCoins,
    isLoading: categoryLoading,
    isError: categoryIsError,
    error: categoryError,
    refetch: refetchCategoryCoins,
  } = useQuery({
    queryKey: ["cg-category-markets", activeCategoryId, page],
    queryFn: () => fetchCategoryCoins(activeCategoryId!, page),
    enabled: isCategoryMode,
    refetchInterval: 30_000,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: trendingCoins, isLoading: trendingLoading } = useQuery({
    queryKey: ["cg-trending-markets"],
    queryFn: async (): Promise<CoinMarket[]> => {
      const r = await fetch("/api/coins/trending");
      if (!r.ok) throw new Error(`trending ${r.status}`);
      const data = await r.json() as { coins: { item: { id: string; symbol: string; name: string; thumb: string; market_cap_rank: number; data: { price: string; price_change_percentage_24h?: { usd: number }; market_cap: string } } }[] };
      const ids = data.coins.map((c) => c.item.id).join(",");
      if (!ids) return [];
      const mr = await fetch(`/api/coins/markets-by-ids?ids=${encodeURIComponent(ids)}&price_change_percentage=1h,7d`);
      if (!mr.ok) throw new Error(`trending markets ${mr.status}`);
      return mr.json();
    },
    enabled: isTrendingMode,
    staleTime: 300_000,
    retry: 1,
  });

  const { data: newListingCoins, isLoading: newListingsLoading } = useQuery({
    queryKey: ["cg-new-listings", page],
    queryFn: async (): Promise<CoinMarket[]> => {
      const r = await fetch(`/api/coins/markets?page=${page}&per_page=100&sparkline=false&price_change_percentage=1h,7d&order=created_desc`);
      if (!r.ok) throw new Error(`new listings ${r.status}`);
      return r.json();
    },
    enabled: isNewListingsMode,
    staleTime: 60_000,
    retry: 1,
  });

  const isSearchMode = debouncedSearch.length >= 1 && !optimizedAll;
  const { data: liveSearchData, isFetching: searchFetching } = useQuery({
    queryKey: ["cg-search-markets", debouncedSearch],
    queryFn: () => fetchCoinSearchMarkets(debouncedSearch),
    enabled: isSearchMode,
    staleTime: 30_000,
  });
  const liveSearchCoins = liveSearchData?.coins ?? [];

  const opt = useOptimizedMarkets(optimizedAll, debouncedSearch, sortKey, sortDir);
  const sentinelRef = useInfiniteSentinel(opt.loadMore, opt.hasMore, scrollRef);

  const { data: coins, isLoading, isError: coinsQueryError, error: coinsQueryErr, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["cg-markets", page],
    queryFn: () => fetchMarkets(page),
    enabled: !optimizedAll && !isCategoryMode && !isTrendingMode && !isNewListingsMode,
    refetchInterval: optimizedAll ? false : 30_000,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: globalRaw, isLoading: globalLoading } = useQuery({
    queryKey: ["cg-global"],
    queryFn: fetchGlobal,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const g = globalRaw?.data;

  // ── Resolved coin list ─────────────────────────────────────────────────────
  const baseCoins: CoinMarket[] = isTrendingMode
    ? (trendingCoins ?? [])
    : isNewListingsMode
      ? (newListingCoins ?? [])
      : isCategoryMode
        ? (categoryCoins ?? [])
        : optimizedAll
          ? (opt.rows as CoinMarket[])
          : (coins ?? []);

  const tickAt = optimizedAll ? opt.priceUpdatedAt : dataUpdatedAt;

  const isRefreshingPrices = useMarketStore((s) => s.isRefreshingPrices);
  const listFetching =
    isRefreshingPrices ||
    opt.isFetchingPrices ||
    isLoading ||
    categoryLoading ||
    trendingLoading ||
    newListingsLoading;

  const refetchMarketsList = useCallback(() => {
    if (optimizedAll) opt.refetchPrices();
    else void refetch();
    if (isCategoryMode) void refetchCategoryCoins();
  }, [optimizedAll, opt, refetch, isCategoryMode, refetchCategoryCoins]);

  useEffect(() => {
    setCountdown(30);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refetchMarketsList();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tickAt, refetchMarketsList]);

  const filtered = useMemo(() => {
    const unique = dedupeById(baseCoins);
    if (optimizedAll) return [...unique];
    const list = [...unique];
    list.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === "rank") {
        av = a.market_cap_rank;
        bv = b.market_cap_rank;
      }
      if (sortKey === "price") {
        av = a.current_price;
        bv = b.current_price;
      }
      if (sortKey === "ch1h") {
        av = a.price_change_percentage_1h_in_currency ?? 0;
        bv = b.price_change_percentage_1h_in_currency ?? 0;
      }
      if (sortKey === "ch24h") {
        av = a.price_change_percentage_24h;
        bv = b.price_change_percentage_24h;
      }
      if (sortKey === "ch7d") {
        av = a.price_change_percentage_7d_in_currency ?? 0;
        bv = b.price_change_percentage_7d_in_currency ?? 0;
      }
      if (sortKey === "mcap") {
        av = a.market_cap;
        bv = b.market_cap;
      }
      if (sortKey === "vol") {
        av = a.total_volume;
        bv = b.total_volume;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [baseCoins, sortKey, sortDir, optimizedAll]);

  const effectiveLoading = optimizedAll
    ? opt.metadataLoading && baseCoins.length === 0
    : isTrendingMode
      ? trendingLoading && baseCoins.length === 0
      : isNewListingsMode
        ? newListingsLoading && baseCoins.length === 0
        : isLoading || (isCategoryMode && categoryLoading);

  const marketsListError = optimizedAll
    ? opt.isError
    : coinsQueryError || (isCategoryMode && categoryIsError);
  const marketsListErr = optimizedAll ? opt.error : isCategoryMode ? categoryError : coinsQueryErr;

  const handleSort = useCallback(
    (k: SortKey) => {
      if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(k);
        setSortDir(k === "rank" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  const handlePage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleWatch = (id: string) =>
    setWatchlist((w) => {
      const n = new Set(w);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const lastUpdated = (optimizedAll ? opt.priceUpdatedAt : dataUpdatedAt)
    ? new Date(optimizedAll ? opt.priceUpdatedAt : (dataUpdatedAt as number)).toLocaleTimeString("en-US", {
        hour12: false,
      })
    : "--:--:--";

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col overflow-hidden"
        style={{ background:"linear-gradient(150deg,#06090f 0%,#0d1117 60%,#06080f 100%)" }}>

        {/* ── Mobile Top Header ── */}
        <header className="flex items-center justify-between px-4 h-14 shrink-0 z-40"
          style={{ background:"rgba(6,9,15,0.97)", backdropFilter:"blur(24px)",
            WebkitBackdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow:"0 0 14px rgba(41,98,255,0.4)" }}>
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-black text-[13px] tracking-tight leading-none">Markets</div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: countdown<=5?"#ef5350":"#3a4058" }}>
                Refresh {countdown}s
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 h-6 rounded-full text-[9px] font-bold"
              style={{ background:"rgba(38,166,154,0.1)", color:"#26a69a", border:"1px solid rgba(38,166,154,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
              LIVE
            </div>
            <button onClick={() => setShowSearch(s => !s)}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:bg-white/5 transition-colors"
              style={{ background:"rgba(42,46,57,0.6)", border:"1px solid rgba(255,255,255,0.08)" }}>
              {showSearch ? <X size={16} style={{ color:"#d1d4dc" }} /> : <Search size={16} style={{ color:"#5a6072" }} />}
            </button>
            <ActionButton
              variant="ghost"
              size="sm"
              loading={listFetching}
              onClick={() => refetchMarketsList()}
              className="!min-h-9 !min-w-9 !px-0"
              aria-label="Refresh markets"
              icon={<RefreshCw size={15} className={listFetching ? "animate-spin" : ""} style={{ color: "#5a6072" }} />}
            />
          </div>
        </header>

        {/* ── Search Overlay ── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
              exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
              className="shrink-0 overflow-hidden"
              style={{ background:"rgba(10,14,22,0.98)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 px-4 py-3">
                <Search size={16} style={{ color:"#5a6072" }} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search coins..."
                  className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#3a4058]"
                />
                {search && <button onClick={() => setSearch("")}><X size={14} style={{ color:"#5a6072" }} /></button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scrollable Content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling:"touch" }}>

          {/* Live ticker */}
          {baseCoins.length > 0 && <MobileTicker coins={baseCoins.slice(0, 10)} />}

          {/* Global stats */}
          <MobileStatStrip g={g} />

          {/* Category chips */}
          <div style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <MobileCategoryBar category={category} setCategory={setCategory} />
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between pr-4"
            style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <MobileSortBar sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            {!effectiveLoading && (
              <span className="text-[10px] font-mono shrink-0" style={{ color:"#3a4058" }}>
                {filtered.length}
              </span>
            )}
          </div>

          {/* Error */}
          {marketsListError && (
            <div className="flex flex-col items-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:"rgba(239,83,80,0.12)", border:"1px solid rgba(239,83,80,0.2)" }}>
                <AlertCircle size={24} className="text-[#ef5350]" />
              </div>
              <p className="text-white font-bold text-base mb-1">Market data unavailable</p>
              <p className="text-[12px] mb-4" style={{ color:"#5a6072" }}>
                {(marketsListErr as Error)?.message ?? "CoinGecko API rate-limited"} · Retrying in {countdown}s
              </p>
              <button onClick={() => refetchMarketsList()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold"
                style={{ background:"rgba(41,98,255,0.2)", border:"1px solid rgba(41,98,255,0.4)", color:"#4d7fff" }}>
                <RefreshCw size={14} /> Retry Now
              </button>
            </div>
          )}

          {/* Coin list */}
          {!marketsListError && (
            <>
              {effectiveLoading
                ? Array.from({length:20}).map((_,i) => <MobileSkelRow key={i} i={i} />)
                : optimizedAll
                  ? (
                    <VirtualCoinList
                      items={filtered}
                      rowHeight={88}
                      scrollParentRef={scrollRef}
                      onEndReached={opt.hasMore ? opt.loadMore : undefined}
                      renderRow={(coin, idx) => (
                        <MobileCoinRow
                          key={coin.id}
                          coin={coin}
                          idx={idx}
                          lite
                          isWatched={watchlist.has(coin.id)}
                          onWatchlist={() => toggleWatch(coin.id)}
                        />
                      )}
                    />
                  )
                  : filtered.map((coin, idx) => (
                    <MobileCoinRow key={coin.id} coin={coin} idx={idx}
                      isWatched={watchlist.has(coin.id)} onWatchlist={() => toggleWatch(coin.id)} />
                  ))
              }
              {optimizedAll && opt.hasMore && !effectiveLoading && (
                <div ref={sentinelRef} className="h-8 mx-4" aria-hidden />
              )}
              {!effectiveLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 px-6 text-center">
                  <Search size={32} className="mb-3 opacity-20 text-white" />
                  <p className="text-[14px] font-bold text-white mb-1">No coins found</p>
                  <p className="text-[12px] mb-4" style={{ color:"#5a6072" }}>Try a different search or category</p>
                  <button onClick={() => { setSearch(""); setCategory("All"); }}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}

          {/* Mobile Pagination */}
          {!marketsListError && !effectiveLoading && filtered.length > 0 && !optimizedAll && (
            <div className="flex items-center justify-between px-4 py-4 mx-4 my-4 rounded-2xl"
              style={{ background:"rgba(13,17,26,0.8)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => handlePage(Math.max(1,page-1))} disabled={page===1}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-[12px] font-bold disabled:opacity-30 transition-all"
                style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.08)", color:"#a0a8bc" }}>
                <ChevronLeft size={16}/> Prev
              </button>
              <div className="flex items-center gap-1.5">
                {[1,2,3,4,5].map(p => (
                  <button key={p} onClick={() => handlePage(p)}
                    className="w-9 h-9 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: page===p ? "rgba(41,98,255,0.25)" : "rgba(42,46,57,0.6)",
                      color: page===p ? "#4d7fff" : "#5a6072",
                      border: page===p ? "1px solid rgba(41,98,255,0.45)" : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: page===p ? "0 0 16px rgba(41,98,255,0.3)" : "none",
                    }}>
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={() => handlePage(page+1)}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-[12px] font-bold transition-all"
                style={{ background:"rgba(41,98,255,0.18)", border:"1px solid rgba(41,98,255,0.35)", color:"#4d7fff" }}>
                Next <ChevronRight size={16}/>
              </button>
            </div>
          )}

          {/* Safe area for bottom nav */}
          <div className="h-28" />
        </div>

        {/* ── Bottom Nav ── */}
        <MobileNav />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLET LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTablet) {
    return (
      <div className="h-screen flex flex-col overflow-hidden"
        style={{ background:"linear-gradient(150deg,#080c16 0%,#0d1117 60%,#080b13 100%)" }}>

        {/* Global Ticker */}
        <GlobalTicker />

        {/* Tablet Header */}
        <header className="flex items-center justify-between px-4 h-12 shrink-0 z-40"
          style={{ background:"rgba(8,12,22,0.95)", backdropFilter:"blur(24px)",
            WebkitBackdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow:"0 0 12px rgba(41,98,255,0.4)" }}>
                <Activity size={15} className="text-white" />
              </div>
              <span className="text-white font-black text-[13px] tracking-tight">CoinAstra</span>
            </Link>
            <nav className="flex items-center gap-0.5">
              {NAV.map(item => {
                const isActive = location===item.path || (item.path!=="/" && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ color: isActive?"#4d7fff":"#4a5068", background: isActive?"rgba(41,98,255,0.12)":"transparent" }}>
                    <item.icon size={12} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 h-6 rounded-full text-[9px] font-bold"
              style={{ background:"rgba(38,166,154,0.1)", color:"#26a69a", border:"1px solid rgba(38,166,154,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
              LIVE
            </div>
            <button onClick={() => refetchMarketsList()}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <RefreshCw size={14} style={{ color:"#5a6072" }} />
            </button>
            <button
              onClick={() => setTheme(theme !== "light" ? "light" : "dark")}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color:"#5a6072" }}>
              {theme !== "light" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Tablet Scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="px-4 py-5">

            {/* Hero */}
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight"
                  style={{ background:"linear-gradient(130deg,#fff 0%,#a8c0ff 55%,#2962ff 100%)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  Crypto Markets
                </h1>
                <p className="text-[11px] mt-0.5" style={{ color:"#4a5068" }}>
                  Updated <span className="font-mono text-[#787b86]">{lastUpdated}</span> ·{" "}
                  Refresh in <span className="font-mono font-bold" style={{ color: countdown<=5?"#ef5350":"#2962ff" }}>{countdown}s</span>
                </p>
              </div>
              {g && (
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wider" style={{ color:"#4a5068" }}>Total Mkt Cap</div>
                  <div className="text-[16px] font-black text-white font-mono">{fmtLarge(g.total_market_cap.usd)}</div>
                </div>
              )}
            </div>

            {/* Tablet Stat Cards — 3 columns + horizontal scroll for rest */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard label="Total Market Cap" value={g ? fmtLarge(g.total_market_cap.usd) : "—"}
                sub={g ? `${g.market_cap_change_percentage_24h_usd>=0?"+":""}${g.market_cap_change_percentage_24h_usd.toFixed(2)}% (24h)` : undefined}
                color="#2962ff" icon={Globe} />
              <StatCard label="24h Volume" value={g ? fmtLarge(g.total_volume.usd) : "—"} color="#26a69a" icon={BarChart2} />
              <StatCard label="BTC Dominance" value={g ? `${g.market_cap_percentage.btc.toFixed(1)}%` : "—"} color="#f7931a" icon={Zap} />
            </div>

            {/* Tablet Filter Bar */}
            <div className="rounded-2xl p-3 mb-4"
              style={{ background:"rgba(13,17,26,0.8)", backdropFilter:"blur(20px)",
                border:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 rounded-xl px-3 h-10"
                  style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <Search size={14} style={{ color:"#5a6072" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search coins..."
                    className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#4a5068]" />
                  {search && <button onClick={() => setSearch("")}><X size={12} style={{ color:"#5a6072" }} /></button>}
                </div>
                <div className="flex items-center gap-1 px-2.5 h-10 rounded-xl font-mono text-[11px]"
                  style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.07)",
                    color: countdown<=5?"#ef5350":"#5a6072" }}>
                  <RefreshCw size={12}/> {countdown}s
                </div>
                <span className="text-[11px] font-mono" style={{ color:"#4a5068" }}>{filtered.length} coins</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_LABELS.map(cat => {
                  const active = category === cat;
                  return (
                    <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
                      className="px-3 h-8 rounded-full text-[10px] font-semibold transition-all"
                      style={{ background: active?"rgba(41,98,255,0.22)":"rgba(42,46,57,0.6)",
                        color: active?"#4d7fff":"#5a6072",
                        border:`1px solid ${active?"rgba(41,98,255,0.4)":"rgba(255,255,255,0.07)"}` }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tablet Table — 8 columns */}
            {marketsListError ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ background:"rgba(13,17,26,0.6)", border:"1px solid rgba(239,83,80,0.2)" }}>
                <AlertCircle size={28} className="text-[#ef5350] mb-3" />
                <p className="text-white font-bold mb-1">Market data unavailable</p>
                <button onClick={() => refetchMarketsList()}
                  className="mt-3 px-5 py-2 rounded-xl text-[12px] font-bold flex items-center gap-2"
                  style={{ background:"rgba(41,98,255,0.2)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.4)" }}>
                  <RefreshCw size={13}/> Retry
                </button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden"
                style={{ background:"rgba(10,14,22,0.8)", backdropFilter:"blur(20px)",
                  border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth:700 }}>
                    <thead style={{ background:"rgba(8,12,22,0.95)", position:"sticky", top:0, zIndex:10,
                      borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      <tr>
                        <th className="pl-4 pr-2 py-3 w-8"><Star size={12} style={{ color:"#3a3e4a" }} /></th>
                        <SortTH label="#" sk="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                        <SortTH label="Coin" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                        <SortTH label="Price" sk="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                        <SortTH label="24h %" sk="ch24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                        <SortTH label="7d %" sk="ch7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                        <SortTH label="Market Cap" sk="mcap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                        <SortTH label="Volume" sk="vol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                        <SortTH label="7 Days" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveLoading
                        ? Array.from({length:18}).map((_,i) => <TabletSkelRow key={i} i={i}/>)
                        : isSearchMode
                          ? searchFetching
                            ? Array.from({length:8}).map((_,i) => <TabletSkelRow key={i} i={i}/>)
                            : liveSearchCoins.map((c, idx) => (
                                <motion.tr key={c.id}
                                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                                  transition={{ duration:0.1, delay:Math.min(idx*0.008,0.25) }}
                                  className="group"
                                  style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", cursor:"pointer" }}
                                  onClick={() => setLocation(researchHref(c))}>
                                  <td className="pl-4 pr-2 py-3" />
                                  <td className="px-3 py-3 text-[11px] font-mono tabular-nums" style={{ color:"#5a6072" }}>{c.market_cap_rank||"—"}</td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                      <img src={c.thumb} alt={c.name} loading="lazy" className="w-7 h-7 rounded-full shrink-0" />
                                      <div>
                                        <div className="text-[12px] font-bold text-white">{c.name}</div>
                                        <div className="text-[9px] font-semibold uppercase" style={{ color:"#5a6072" }}>{c.symbol}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td colSpan={6} className="px-3 py-3 text-right text-[11px]" style={{ color:"#5a6072" }}>Click to view →</td>
                                </motion.tr>
                              ))
                          : filtered.map((coin, idx) => {
                              const is7dPos = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
                              const isWatched = watchlist.has(coin.id);
                              return (
                                <motion.tr key={coin.id}
                                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                                  transition={{ duration:0.1, delay:Math.min(idx*0.008,0.3) }}
                                  className="group"
                                  style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", cursor:"pointer" }}
                                  onClick={() => setLocation(researchHref(coin))}
                                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background="rgba(41,98,255,0.04)"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background="transparent"; }}>
                                  <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                                    <Star size={13} style={{ color:isWatched?"#f7931a":"#2a2e3a", fill:isWatched?"#f7931a":"none", cursor:"pointer" }}
                                      onClick={() => toggleWatch(coin.id)} />
                                  </td>
                                  <td className="px-3 py-3 text-[11px] font-mono tabular-nums" style={{ color:"#5a6072" }}>
                                    {coin.market_cap_rank}
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                      <CoinThumb src={coin.image} name={coin.name} symbol={coin.symbol} />
                                      <div>
                                        <div className="text-[12px] font-bold text-white truncate" style={{ maxWidth:120 }}>{coin.name}</div>
                                        <div className="text-[9px] font-semibold uppercase" style={{ color:"#5a6072" }}>{coin.symbol}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right text-[12px] font-bold text-white font-mono tabular-nums">
                                    {coin._pricePending ? <PriceSkel /> : fmtPrice(coin.current_price)}
                                  </td>
                                  <td className="px-3 py-3 text-right"><ChangeCell v={coin.price_change_percentage_24h} badge /></td>
                                  <td className="px-3 py-3 text-right"><ChangeCell v={coin.price_change_percentage_7d_in_currency} /></td>
                                  <td className="px-3 py-3 text-right text-[11px] font-mono text-[#d1d4dc] tabular-nums">
                                    {fmtLarge(coin.market_cap)}
                                  </td>
                                  <td className="px-3 py-3 text-right text-[11px] font-mono text-[#d1d4dc] tabular-nums">
                                    {fmtLarge(coin.total_volume)}
                                  </td>
                                  <td className="px-3 py-3 text-right">
                                    <MiniSparkline prices={coin.sparkline_in_7d?.price??[]} isPos={is7dPos} id={`t_${coin.id}_${page}`} />
                                  </td>
                                </motion.tr>
                              );
                            })
                      }
                    </tbody>
                  </table>
                  {!effectiveLoading && !isSearchMode && filtered.length===0 && (
                    <div className="flex flex-col items-center py-12">
                      <Search size={28} className="text-white mb-2 opacity-20" />
                      <p className="text-[13px] font-semibold text-white mb-1">No coins found</p>
                      <button onClick={() => { setSearch(""); setCategory("All"); }}
                        className="mt-2 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                        Clear filters
                      </button>
                    </div>
                  )}
                  {!effectiveLoading && isSearchMode && !searchFetching && liveSearchCoins.length===0 && (
                    <div className="flex flex-col items-center py-12">
                      <Search size={28} className="text-white mb-2 opacity-20" />
                      <p className="text-[13px] font-semibold text-white mb-1">No results for "{debouncedSearch}"</p>
                      <button onClick={() => setSearch("")}
                        className="mt-2 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tablet Pagination */}
            {!marketsListError && !effectiveLoading && filtered.length > 0 && !optimizedAll && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-2xl"
                style={{ background:"rgba(13,17,26,0.7)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[11px]" style={{ color:"#5a6072" }}>
                  {filtered.length} coins · Page {page}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePage(Math.max(1,page-1))} disabled={page===1}
                    className="flex items-center gap-1 px-3 h-8 rounded-xl text-[11px] font-semibold disabled:opacity-30 transition-all"
                    style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.08)", color:"#a0a8bc" }}>
                    <ChevronLeft size={14}/> Prev
                  </button>
                  {[1,2,3,4,5].map(p => (
                    <button key={p} onClick={() => handlePage(p)}
                      className="w-8 h-8 rounded-xl text-[11px] font-bold transition-all"
                      style={{ background:page===p?"rgba(41,98,255,0.25)":"rgba(42,46,57,0.6)",
                        color:page===p?"#4d7fff":"#5a6072",
                        border:page===p?"1px solid rgba(41,98,255,0.45)":"1px solid rgba(255,255,255,0.06)" }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => handlePage(page+1)}
                    className="flex items-center gap-1 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
                    style={{ background:"rgba(41,98,255,0.18)", border:"1px solid rgba(41,98,255,0.35)", color:"#4d7fff" }}>
                    Next <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}
            <div className="h-6" />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT (≥ 1024px)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background:"linear-gradient(150deg,#080c16 0%,#0d1117 60%,#080b13 100%)" }}>

      {/* Global Ticker */}
      <GlobalTicker />

      {/* Desktop Top Nav */}
      <header className="flex items-center justify-between px-4 h-11 shrink-0 z-50"
        style={{ background:"rgba(8,12,22,0.9)", backdropFilter:"blur(24px)",
          WebkitBackdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#2962ff 0%,#7c3aed 100%)", boxShadow:"0 0 12px rgba(41,98,255,0.4)" }}>
              <Activity size={14} className="text-white" />
            </div>
            <span className="text-white font-black text-sm tracking-tight">CoinAstra</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {NAV.map(item => {
              const isActive = location===item.path || (item.path!=="/" && location.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ color:isActive?"#4d7fff":"#5a6072",
                    background:isActive?"rgba(41,98,255,0.12)":"transparent",
                    boxShadow:isActive?"0 0 14px rgba(41,98,255,0.18)":"none" }}>
                  <item.icon size={12} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold"
            style={{ background:"rgba(38,166,154,0.1)", color:"#26a69a", border:"1px solid rgba(38,166,154,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
            LIVE DATA
          </div>
          <button onClick={() => refetchMarketsList()}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color:"#5a6072" }}>
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setTheme(theme !== "light" ? "light" : "dark")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color:"#5a6072" }}>
            {theme !== "light" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Desktop Scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[1700px] mx-auto px-4 md:px-6 py-6">

          {/* Hero */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black tracking-tight"
                  style={{ background:"linear-gradient(130deg,#ffffff 0%,#a8c0ff 55%,#2962ff 100%)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  Crypto Markets
                </h1>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest"
                  style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                  TOP 10K
                </div>
              </div>
              <p className="text-[11px]" style={{ color:"#5a6072" }}>
                Real-time prices · Updated <span className="font-mono text-[#787b86]">{lastUpdated}</span> UTC · Refresh in{" "}
                <span className="font-mono font-bold"
                  style={{ color: countdown<=5?"#ef5350":countdown<=10?"#f7931a":"#2962ff" }}>{countdown}s</span>
              </p>
            </div>
            {g && (
              <div className="flex items-center gap-2">
                <div className="hidden lg:block text-right">
                  <div className="text-[9px] text-[#5a6072] uppercase tracking-wider">Total Mkt Cap</div>
                  <div className="text-[14px] font-black text-white font-mono">{fmtLarge(g.total_market_cap.usd)}</div>
                </div>
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold"
                  style={{
                    background: g.market_cap_change_percentage_24h_usd>=0?"rgba(38,166,154,0.1)":"rgba(239,83,80,0.1)",
                    color: g.market_cap_change_percentage_24h_usd>=0?"#26a69a":"#ef5350",
                    border:`1px solid ${g.market_cap_change_percentage_24h_usd>=0?"rgba(38,166,154,0.25)":"rgba(239,83,80,0.25)"}`,
                  }}>
                  {g.market_cap_change_percentage_24h_usd>=0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                  {Math.abs(g.market_cap_change_percentage_24h_usd).toFixed(2)}% 24h
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div className="flex flex-wrap gap-3 mb-6">
            <StatCard
              label="Total Market Cap"
              value={g ? fmtLarge(g.total_market_cap.usd) : "—"}
              sub={g ? `${g.market_cap_change_percentage_24h_usd >= 0 ? "+" : ""}${g.market_cap_change_percentage_24h_usd.toFixed(2)}% in 24h` : undefined}
              color="#2962ff"
              icon={Globe}
              loading={globalLoading && !g}
            />
            <StatCard
              label="24h Volume"
              value={g ? fmtLarge(g.total_volume.usd) : "—"}
              sub={g ? `${((g.total_volume.usd / g.total_market_cap.usd) * 100).toFixed(1)}% of Market Cap` : undefined}
              color="#26a69a"
              icon={BarChart2}
              loading={globalLoading && !g}
            />
            <StatCard
              label="BTC Dominance"
              value={g ? `${g.market_cap_percentage.btc.toFixed(1)}%` : "—"}
              color="#f7931a"
              icon={Zap}
              loading={globalLoading && !g}
            />
            <StatCard
              label="ETH Dominance"
              value={g ? `${g.market_cap_percentage.eth.toFixed(1)}%` : "—"}
              color="#627eea"
              icon={Flame}
              loading={globalLoading && !g}
            />
            <StatCard
              label="Active Coins"
              value={g ? g.active_cryptocurrencies.toLocaleString() : "—"}
              color="#7c3aed"
              icon={TrendingUp}
              loading={globalLoading && !g}
            />
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl p-3 mb-4"
            style={{ background:"rgba(13,17,26,0.7)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3 h-9 transition-all"
                style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.07)" }}>
                <Search size={14} style={{ color:"#5a6072" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[#5a6072]"
                  placeholder="Search name or ticker..." />
                {search && <button onClick={() => setSearch("")}><X size={12} style={{ color:"#787b86" }} /></button>}
              </div>
              <div className="flex items-center rounded-xl overflow-hidden"
                style={{ border:"1px solid rgba(255,255,255,0.07)", background:"rgba(19,23,34,0.8)" }}>
                {([["table","Table",List],["cards","Cards",LayoutGrid]] as const).map(([v,lbl,Icon]) => (
                  <button key={v} onClick={() => setView(v)}
                    className="flex items-center gap-1.5 px-3 h-9 text-[10px] font-semibold transition-all"
                    style={{ background:view===v?"rgba(41,98,255,0.2)":"transparent", color:view===v?"#4d7fff":"#5a6072" }}>
                    <Icon size={14} /> {lbl}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 px-3 h-9 rounded-xl font-mono text-[10px] font-semibold"
                style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.07)",
                  color: countdown<=5?"#ef5350":"#5a6072" }}>
                <RefreshCw size={12} className={countdown<=5?"animate-spin":""} />
                Refresh in {countdown}s
              </div>
              <div className="ml-auto text-[10px] font-mono" style={{ color:"#5a6072" }}>
                {filtered.length > 0 && `${filtered.length} coins`}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_LABELS.map(cat => {
                const active = category===cat;
                return (
                  <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
                    className="px-3 h-7 rounded-full text-[10px] font-semibold transition-all"
                    style={{ background:active?"rgba(41,98,255,0.22)":"rgba(42,46,57,0.6)",
                      color:active?"#4d7fff":"#5a6072",
                      border:`1px solid ${active?"rgba(41,98,255,0.4)":"rgba(255,255,255,0.06)"}`,
                      boxShadow:active?"0 0 12px rgba(41,98,255,0.2)":"none" }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {marketsListError && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
              style={{ background:"rgba(13,17,26,0.6)", border:"1px solid rgba(239,83,80,0.2)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:"rgba(239,83,80,0.12)", border:"1px solid rgba(239,83,80,0.2)" }}>
                <AlertCircle size={28} className="text-[#ef5350]" />
              </div>
              <p className="text-white font-bold text-base mb-1">Market data unavailable</p>
              <p className="text-[12px] mb-1" style={{ color:"#787b86" }}>{(marketsListErr as Error)?.message ?? "CoinGecko API rate-limited."}</p>
              <p className="text-[11px] mb-5" style={{ color:"#5a6072" }}>Auto-retrying in {countdown}s</p>
              <button onClick={() => refetchMarketsList()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold"
                style={{ background:"rgba(41,98,255,0.2)", border:"1px solid rgba(41,98,255,0.4)", color:"#4d7fff" }}>
                <RefreshCw size={14} /> Retry Now
              </button>
            </motion.div>
          )}

          {/* Desktop TABLE */}
          {!marketsListError && view==="table" && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background:"rgba(10,14,22,0.75)", backdropFilter:"blur(24px)",
                border:"1px solid rgba(255,255,255,0.05)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth:960 }}>
                  <thead style={{ background:"rgba(8,12,22,0.95)", position:"sticky", top:0, zIndex:20,
                    borderBottom:"1px solid rgba(255,255,255,0.06)", backdropFilter:"blur(20px)" }}>
                    <tr>
                      <th className="pl-4 pr-2 py-3 w-8"><Star size={12} style={{ color:"#3a3e4a" }} /></th>
                      <SortTH label="#" sk="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTH label="Coin" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTH label="Price" sk="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="1h %" sk="ch1h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="24h %" sk="ch24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="7d %" sk="ch7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Market Cap" sk="mcap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Volume 24h" sk="vol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Circulating Supply" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="7 Days" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveLoading
                      ? Array.from({length:25}).map((_,i) => <DeskSkelRow key={i} i={i}/>)
                      : isSearchMode
                        ? searchFetching
                          ? Array.from({length:10}).map((_,i) => <DeskSkelRow key={i} i={i}/>)
                          : liveSearchCoins.map((c,idx) => (
                              <motion.tr key={c.id}
                                initial={{ opacity:0 }} animate={{ opacity:1 }}
                                transition={{ duration:0.1, delay:Math.min(idx*0.007,0.25) }}
                                style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", cursor:"pointer" }}
                                onClick={() => setLocation(researchHref(c))}
                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background="rgba(41,98,255,0.05)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background="transparent"; }}>
                                <td className="pl-4 pr-2 py-3.5" />
                                <td className="px-3 py-3.5 text-[11px] font-mono tabular-nums" style={{ color:"#5a6072" }}>{c.market_cap_rank||"—"}</td>
                                <td className="px-3 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <img src={c.thumb} alt={c.name} loading="lazy" className="w-7 h-7 rounded-full shrink-0"
                                      onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }} />
                                    <div>
                                      <div className="text-[12px] font-bold text-white">{c.name}</div>
                                      <div className="text-[9px] font-semibold uppercase mt-0.5" style={{ color:"#5a6072" }}>{c.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td colSpan={8} className="px-3 py-3.5 text-right text-[11px]" style={{ color:"#4a5068" }}>
                                  Click to view full chart →
                                </td>
                              </motion.tr>
                            ))
                        : (
                            <>
                              {filtered.map((coin, idx) => {
                            const is7dPos = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
                            const supplyPct = coin.max_supply
                              ? Math.min(100,(coin.circulating_supply/coin.max_supply)*100)
                              : coin.total_supply ? Math.min(100,(coin.circulating_supply/coin.total_supply)*100) : 100;
                            const isWatched = watchlist.has(coin.id);
                            return (
                              <motion.tr key={coin.id}
                                initial={{ opacity:0 }} animate={{ opacity:1 }}
                                transition={{ duration:0.1, delay:Math.min(idx*0.007,0.3) }}
                                style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", cursor:"pointer" }}
                                onClick={() => setLocation(researchHref(coin))}
                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background="rgba(41,98,255,0.04)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background="transparent"; }}>
                                <td className="pl-4 pr-2 py-3.5" onClick={e => e.stopPropagation()}>
                                  <Star size={14} style={{ color:isWatched?"#f7931a":"#2a2e3a", fill:isWatched?"#f7931a":"none", cursor:"pointer" }}
                                    onClick={() => toggleWatch(coin.id)} />
                                </td>
                                <td className="px-3 py-3.5 text-[11px] font-mono tabular-nums" style={{ color:"#5a6072" }}>
                                  {coin.market_cap_rank}
                                </td>
                                <td className="px-3 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <CoinThumb src={coin.image} name={coin.name} symbol={coin.symbol} />
                                    <div className="min-w-0">
                                      <div className="text-[12px] font-bold text-white leading-none truncate" style={{ maxWidth:130 }}>{coin.name}</div>
                                      <div className="text-[9px] font-semibold uppercase mt-0.5" style={{ color:"#5a6072" }}>{coin.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3.5 text-right">
                                  {coin._pricePending ? (
                                    <PriceSkel />
                                  ) : (
                                    <span className="text-[12px] font-bold text-white font-mono tabular-nums">{fmtPrice(coin.current_price)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3.5 text-right"><ChangeCell v={coin.price_change_percentage_1h_in_currency} /></td>
                                <td className="px-3 py-3.5 text-right"><ChangeCell v={coin.price_change_percentage_24h} badge /></td>
                                <td className="px-3 py-3.5 text-right"><ChangeCell v={coin.price_change_percentage_7d_in_currency} /></td>
                                <td className="px-3 py-3.5 text-right text-[11px] font-mono text-[#d1d4dc] tabular-nums">{fmtLarge(coin.market_cap)}</td>
                                <td className="px-3 py-3.5 text-right">
                                  <div className="text-[11px] font-mono text-[#d1d4dc] tabular-nums">{fmtLarge(coin.total_volume)}</div>
                                  {coin.market_cap>0 && <div className="text-[8px] mt-0.5" style={{ color:"#5a6072" }}>{((coin.total_volume/coin.market_cap)*100).toFixed(1)}% of cap</div>}
                                </td>
                                <td className="px-3 py-3.5 text-right" style={{ minWidth:130 }}>
                                  <div className="text-[10px] font-mono text-[#d1d4dc] tabular-nums">{fmtSupply(coin.circulating_supply,coin.symbol)}</div>
                                  <div className="flex items-center justify-end gap-1.5 mt-1">
                                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.07)" }}>
                                      <div className="h-full rounded-full transition-all" style={{ width:`${supplyPct}%`,
                                        background: supplyPct>80?"#26a69a":supplyPct>50?"#f7931a":"#2962ff" }} />
                                    </div>
                                    <span className="text-[8px] font-mono tabular-nums" style={{ color:"#5a6072" }}>{supplyPct.toFixed(0)}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3.5 text-right">
                                  <MiniSparkline prices={coin.sparkline_in_7d?.price??[]} isPos={is7dPos} id={`d_${coin.id}_${page}`} />
                                </td>
                              </motion.tr>
                            );
                              })}
                              {optimizedAll && opt.hasMore && (
                                <tr>
                                  <td colSpan={11} className="p-0">
                                    <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                  </tbody>
                </table>
                {!effectiveLoading && isSearchMode && !searchFetching && liveSearchCoins.length===0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search size={28} className="text-white mb-3 opacity-20" />
                    <p className="text-[13px] font-semibold text-white mb-1">No results for "{debouncedSearch}"</p>
                    <button onClick={() => setSearch("")}
                      className="mt-2 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                      Clear search
                    </button>
                  </div>
                )}
                {!effectiveLoading && !isSearchMode && filtered.length===0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search size={28} className="text-white mb-3 opacity-20" />
                    <p className="text-[13px] font-semibold text-white mb-1">No coins found</p>
                    <button onClick={() => { setSearch(""); setCategory("All"); }}
                      className="mt-2 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.3)" }}>
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop CARDS */}
          {!marketsListError && view==="cards" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {effectiveLoading
                ? Array.from({length:24}).map((_,i) => (
                    <div key={i} className="rounded-2xl h-44 animate-pulse"
                      style={{ background:"rgba(13,17,26,0.6)", animationDelay:`${i*30}ms` }} />
                  ))
                : (
                    <>
                      {filtered.map((coin,idx) => {
                    const is7dPos = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
                    const isWatched = watchlist.has(coin.id);
                    return (
                      <motion.div key={coin.id}
                        initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                        transition={{ duration:0.18, delay:Math.min(idx*0.01,0.4) }}
                        onClick={() => setLocation(researchHref(coin))}
                        className="rounded-2xl p-4 relative overflow-hidden group"
                        style={{ background:"rgba(13,17,26,0.8)", backdropFilter:"blur(20px)",
                          border:"1px solid rgba(255,255,255,0.05)", cursor:"pointer", transition:"all 0.2s" }}
                        onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement;
                          el.style.border="1px solid rgba(41,98,255,0.35)";
                          el.style.boxShadow="0 0 24px rgba(41,98,255,0.12)"; el.style.transform="translateY(-2px)"; }}
                        onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement;
                          el.style.border="1px solid rgba(255,255,255,0.05)";
                          el.style.boxShadow="none"; el.style.transform="translateY(0)"; }}>
                        <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background:"linear-gradient(90deg,transparent,#2962ff88,transparent)" }} />
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CoinThumb src={coin.image} name={coin.name} symbol={coin.symbol} size={32} />
                            <div>
                              <div className="text-[12px] font-bold text-white leading-none truncate" style={{ maxWidth:90 }}>{coin.name}</div>
                              <div className="text-[9px] uppercase font-semibold mt-0.5" style={{ color:"#5a6072" }}>{coin.symbol}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                              style={{ background:"rgba(255,255,255,0.06)", color:"#5a6072" }}>
                              #{coin.market_cap_rank}
                            </span>
                            <Star size={13} style={{ color:isWatched?"#f7931a":"#2a2e3a", fill:isWatched?"#f7931a":"none", cursor:"pointer" }}
                              onClick={() => toggleWatch(coin.id)} />
                          </div>
                        </div>
                        <div className="my-2">
                          <MiniSparkline prices={coin.sparkline_in_7d?.price??[]} isPos={is7dPos} id={`card_${coin.id}_${page}`} w={80} h={32} />
                        </div>
                        <div className="text-[14px] font-black text-white font-mono tabular-nums tracking-tight">
                          {coin._pricePending ? <PriceSkel /> : fmtPrice(coin.current_price)}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px]" style={{ color:"#5a6072" }}>24h</span>
                          <ChangeCell v={coin.price_change_percentage_24h} badge />
                          <span className="text-[9px]" style={{ color:"#5a6072" }}>7d</span>
                          <ChangeCell v={coin.price_change_percentage_7d_in_currency} />
                        </div>
                        <div className="mt-3 pt-2.5 grid grid-cols-2 gap-y-1.5"
                          style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                          <div>
                            <div className="text-[8px] uppercase tracking-wider font-semibold" style={{ color:"#5a6072" }}>Mkt Cap</div>
                            <div className="text-[10px] font-mono text-[#a0a8bc] mt-0.5">{fmtLarge(coin.market_cap)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] uppercase tracking-wider font-semibold" style={{ color:"#5a6072" }}>Volume</div>
                            <div className="text-[10px] font-mono text-[#a0a8bc] mt-0.5">{fmtLarge(coin.total_volume)}</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                      {optimizedAll && opt.hasMore && (
                        <div ref={sentinelRef} className="col-span-full h-8" aria-hidden />
                      )}
                    </>
                  )}
            </div>
          )}

          {/* Desktop Pagination */}
          {!marketsListError && !effectiveLoading && !isSearchMode && filtered.length > 0 && !isCategoryMode && !optimizedAll && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
              className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3 px-4 py-3 rounded-2xl"
              style={{ background:"rgba(13,17,26,0.7)", border:"1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[11px]" style={{ color:"#5a6072" }}>
                Page <span className="font-bold text-white">{page}</span> of 40 ·{" "}
                Showing <span className="font-bold text-white">{filtered.length}</span> coins ·{" "}
                <span style={{ color:"#4a5068" }}>Up to 10,000 coins across all pages</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePage(Math.max(1,page-1))} disabled={page===1}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-25"
                  style={{ background:"rgba(42,46,57,0.8)", border:"1px solid rgba(255,255,255,0.07)", color:"#a0a8bc" }}>
                  <ChevronLeft size={16}/> Prev
                </button>
                {(() => {
                  const maxPage = 40;
                  const pages: number[] = [];
                  if (page > 3) pages.push(1);
                  for (let p = Math.max(1, page-2); p <= Math.min(maxPage, page+2); p++) pages.push(p);
                  if (page < maxPage-2) pages.push(maxPage);
                  return pages.filter((p,i,a) => a.indexOf(p)===i).map((p,i,a) => (
                    <React.Fragment key={p}>
                      {i>0 && a[i-1]!==p-1 && <span className="text-[#3a4058] text-xs">…</span>}
                      <button onClick={() => handlePage(p)}
                        className="w-9 h-9 rounded-xl text-[11px] font-bold transition-all"
                        style={{ background:page===p?"rgba(41,98,255,0.25)":"rgba(42,46,57,0.6)",
                          color:page===p?"#4d7fff":"#5a6072",
                          border:page===p?"1px solid rgba(41,98,255,0.45)":"1px solid rgba(255,255,255,0.06)",
                          boxShadow:page===p?"0 0 16px rgba(41,98,255,0.25)":"none" }}>
                        {p}
                      </button>
                    </React.Fragment>
                  ));
                })()}
                <button onClick={() => handlePage(Math.min(40, page+1))} disabled={page===40}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-25"
                  style={{ background:"rgba(41,98,255,0.18)", border:"1px solid rgba(41,98,255,0.35)", color:"#4d7fff",
                    boxShadow:"0 0 14px rgba(41,98,255,0.15)" }}>
                  Next <ChevronRight size={16}/>
                </button>
              </div>
            </motion.div>
          )}

          {optimizedAll && !marketsListError && !effectiveLoading && (
            <div
              className="mt-4 px-4 py-3 rounded-2xl text-center text-[11px]"
              style={{ background: "rgba(13,17,26,0.7)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span style={{ color: "#5a6072" }}>Loaded </span>
              <span className="font-bold text-white">{filtered.length}</span>
              <span style={{ color: "#5a6072" }}> of </span>
              <span className="font-bold text-white">{opt.total}</span>
              <span style={{ color: "#5a6072" }}>
                {" "}
                · Scroll for more · Live prices cached 30s (CoinGecko)
              </span>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-[9px]" style={{ color:"#3a3e4a" }}>
              Market data provided by CoinGecko API · Prices update every 30 seconds · For informational purposes only
            </p>
          </div>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
