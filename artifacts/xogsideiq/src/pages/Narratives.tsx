import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useLiveCoins } from "@/hooks/use-market-data";
import { useListNarratives, getListNarrativesQueryKey } from "@workspace/api-client-react";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG } from "@/lib/ai-engine";
import type { LiveCoin } from "@/hooks/use-market-data";
import {
  Brain, Zap, Layers, DollarSign, Globe, Gamepad2, Cpu,
  TrendingUp, TrendingDown, ChevronDown, ChevronRight,
  Activity, Shield, BarChart2, Flame, Wifi, RefreshCw,
  ArrowUpRight, ArrowDownRight, LayoutGrid, Target, Coins,
} from "lucide-react";

/* ── Sector Definitions ─────────────────────────────────────────────────────── */

const SECTOR_DEFS = [
  {
    slug: "layer-1",
    name: "Layer 1 Blockchains",
    shortName: "L1",
    Icon: Layers,
    color: "#26a69a",
    description: "Base-layer blockchains providing foundational infrastructure for the entire crypto ecosystem.",
    coinIds: [
      "bitcoin","ethereum","solana","binancecoin","ripple","cardano",
      "avalanche-2","polkadot","near","tron","cosmos","toncoin","aptos","sui",
    ],
  },
  {
    slug: "defi",
    name: "DeFi Protocols",
    shortName: "DeFi",
    Icon: DollarSign,
    color: "#7c3aed",
    description: "Decentralised finance protocols enabling permissionless lending, trading, and yield generation.",
    coinIds: [
      "uniswap","aave","chainlink","maker","compound-governance-token",
      "curve-dao-token","synthetix-network-token","injective-protocol",
      "gmx","pendle","dydx","balancer","1inch","pancakeswap-token",
    ],
  },
  {
    slug: "layer-2",
    name: "Layer 2 Scaling",
    shortName: "L2",
    Icon: Zap,
    color: "#0ea5e9",
    description: "Scaling solutions built on Layer 1 chains to improve throughput and reduce transaction costs.",
    coinIds: [
      "arbitrum","optimism","matic-network","starknet","loopring","mantle","immutable-x","metis-token",
    ],
  },
  {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    shortName: "AI",
    Icon: Brain,
    color: "#a78bfa",
    description: "AI-powered blockchain protocols, compute networks, and machine learning infrastructure tokens.",
    coinIds: [
      "render-token","fetch-ai","singularitynet","ocean-protocol",
      "bittensor","worldcoin-wld","akash-network","the-graph","cortex","numeraire",
    ],
  },
  {
    slug: "meme-coins",
    name: "Meme Coins",
    shortName: "Meme",
    Icon: Flame,
    color: "#f59e0b",
    description: "Community-driven meme tokens with high volatility, social-driven narratives, and speculative demand.",
    coinIds: [
      "dogecoin","shiba-inu","pepe","bonk","floki","dogwifhat","mog-coin","brett","book-of-meme",
    ],
  },
  {
    slug: "real-world-assets",
    name: "Real World Assets",
    shortName: "RWA",
    Icon: Globe,
    color: "#10b981",
    description: "Tokenisation of real-world assets: bonds, real estate, commodities, and private credit.",
    coinIds: [
      "ondo-finance","maple","centrifuge","goldfinch","polymesh","rio-network","backed-fi",
    ],
  },
  {
    slug: "depin",
    name: "DePIN Networks",
    shortName: "DePIN",
    Icon: Wifi,
    color: "#ec4899",
    description: "Decentralised Physical Infrastructure Networks tokenising real-world physical infrastructure.",
    coinIds: [
      "helium","hivemapper","iotex","flux","akash-network","react",
    ],
  },
  {
    slug: "gaming",
    name: "GameFi & Metaverse",
    shortName: "Gaming",
    Icon: Gamepad2,
    color: "#f97316",
    description: "Blockchain gaming, NFTs, and metaverse projects enabling digital ownership and play-to-earn.",
    coinIds: [
      "the-sandbox","axie-infinity","decentraland","gala","illuvium","ronin","immutable-x","beam-2",
    ],
  },
];

/* ── Static fallback market data ────────────────────────────────────────────── */

const FALLBACK: Record<string, { price: number; ch24: number; ch7d: number; mcap: number }> = {
  bitcoin:     { price: 81198,  ch24: -0.1, ch7d: -2.1,  mcap: 1_610_000_000_000 },
  ethereum:    { price: 2305,   ch24: -0.3, ch7d: -3.0,  mcap: 277_000_000_000 },
  solana:      { price: 95.61,  ch24: -0.8, ch7d: -5.2,  mcap: 46_000_000_000 },
  binancecoin: { price: 599,    ch24: 0.2,  ch7d: 1.8,   mcap: 84_000_000_000 },
  ripple:      { price: 2.14,   ch24: 1.1,  ch7d: 4.4,   mcap: 122_000_000_000 },
  cardano:     { price: 0.68,   ch24: -0.4, ch7d: -1.2,  mcap: 24_000_000_000 },
  "avalanche-2": { price: 20.4, ch24: 0.8,  ch7d: 3.1,   mcap: 8_400_000_000 },
  polkadot:    { price: 4.12,   ch24: -0.6, ch7d: -2.4,  mcap: 6_300_000_000 },
  near:        { price: 2.46,   ch24: 1.4,  ch7d: 5.2,   mcap: 2_900_000_000 },
  tron:        { price: 0.244,  ch24: 0.3,  ch7d: 1.8,   mcap: 21_000_000_000 },
  cosmos:      { price: 4.88,   ch24: -0.2, ch7d: -1.1,  mcap: 1_900_000_000 },
  toncoin:     { price: 3.12,   ch24: 0.9,  ch7d: 3.4,   mcap: 7_900_000_000 },
  aptos:       { price: 5.44,   ch24: 1.2,  ch7d: 4.8,   mcap: 2_800_000_000 },
  sui:         { price: 2.48,   ch24: 2.1,  ch7d: 8.2,   mcap: 6_200_000_000 },
  uniswap:     { price: 6.12,   ch24: 2.1,  ch7d: 8.4,   mcap: 3_700_000_000 },
  aave:        { price: 198,    ch24: 1.8,  ch7d: 7.2,   mcap: 3_200_000_000 },
  chainlink:   { price: 13.4,   ch24: 4.3,  ch7d: 12.1,  mcap: 8_200_000_000 },
  maker:       { price: 1480,   ch24: 1.2,  ch7d: 4.8,   mcap: 1_700_000_000 },
  arbitrum:    { price: 0.44,   ch24: 0.6,  ch7d: 3.1,   mcap: 1_760_000_000 },
  optimism:    { price: 0.88,   ch24: 1.2,  ch7d: 4.8,   mcap: 1_170_000_000 },
  "matic-network": { price: 0.28, ch24: -0.4, ch7d: 2.2, mcap: 2_800_000_000 },
  "render-token":  { price: 4.12, ch24: 3.1,  ch7d: 9.8,  mcap: 1_980_000_000 },
  "fetch-ai":      { price: 1.24, ch24: 4.2,  ch7d: 11.4, mcap: 1_060_000_000 },
  singularitynet:  { price: 0.48, ch24: 2.8,  ch7d: 8.2,  mcap: 640_000_000 },
  "ocean-protocol":{ price: 0.68, ch24: 2.1,  ch7d: 7.4,  mcap: 380_000_000 },
  bittensor:       { price: 328,  ch24: 5.4,  ch7d: 18.2, mcap: 2_100_000_000 },
  "akash-network": { price: 2.84, ch24: 3.8,  ch7d: 12.4, mcap: 720_000_000 },
  "the-graph":     { price: 0.118,ch24: 1.4,  ch7d: 4.8,  mcap: 1_100_000_000 },
  dogecoin:        { price: 0.168,ch24: -2.1, ch7d: -4.8, mcap: 24_800_000_000 },
  "shiba-inu":     { price: 0.0000138, ch24: -1.4, ch7d: -3.2, mcap: 8_100_000_000 },
  pepe:            { price: 0.0000082, ch24: 0.8,  ch7d: 2.4,  mcap: 3_460_000_000 },
  bonk:            { price: 0.0000188, ch24: 14.8, ch7d: 42.1, mcap: 1_390_000_000 },
  floki:           { price: 0.0000842, ch24: 3.2,  ch7d: 8.4,  mcap: 800_000_000 },
  dogwifhat:       { price: 0.82, ch24: 7.6,  ch7d: 19.8, mcap: 822_000_000 },
  "ondo-finance":  { price: 0.892,ch24: 3.4,  ch7d: 12.4, mcap: 1_280_000_000 },
  helium:          { price: 4.22, ch24: 2.8,  ch7d: 9.4,  mcap: 600_000_000 },
  iotex:           { price: 0.054,ch24: 1.8,  ch7d: 6.4,  mcap: 410_000_000 },
  "the-sandbox":   { price: 0.288,ch24: -1.2, ch7d: -2.4, mcap: 680_000_000 },
  "axie-infinity": { price: 5.12, ch24: -0.8, ch7d: -1.8, mcap: 840_000_000 },
  decentraland:    { price: 0.308,ch24: -0.4, ch7d: -1.2, mcap: 590_000_000 },
  gala:            { price: 0.022,ch24: 0.8,  ch7d: 2.4,  mcap: 480_000_000 },
  ronin:           { price: 1.44, ch24: 1.4,  ch7d: 4.8,  mcap: 780_000_000 },
};

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.001) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function fmtMcap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function pctColor(v: number) { return v >= 0 ? "#26a69a" : "#ef5350"; }

/* ── SectorCard ─────────────────────────────────────────────────────────────── */

interface SectorData {
  slug: string;
  name: string;
  shortName: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  description: string;
  coins: Array<{
    id: string; symbol: string; name: string; image: string;
    price: number; ch24: number; ch7d: number; mcap: number;
    volume24h: number;
  }>;
  perf24h: number;
  perf7d: number;
  momentumScore: number;
  totalMcap: number;
}

function SectorCard({ sector, expanded, onToggle }: {
  sector: SectorData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { Icon, color, coins } = sector;

  const bulletinCoins = useMemo(() => {
    return [...coins]
      .sort((a, b) => b.mcap - a.mcap)
      .slice(0, 4);
  }, [coins]);

  const perf = sector.perf24h;
  const perf7 = sector.perf7d;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,17,26,0.90)",
        border: `1px solid ${color}22`,
        boxShadow: expanded ? `0 0 32px ${color}12` : "none",
      }}
    >
      {/* ── Card Header ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all text-left"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-black text-white">{sector.name}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: `${color}18`, color }}>
              {sector.shortName}
            </span>
            <span className="text-[9px] font-semibold ml-1" style={{ color: "#3a4058" }}>
              {sector.coins.length} coins
            </span>
          </div>
          <p className="text-[10px] text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: "#4a5068", maxWidth: 480 }}>
            {sector.description}
          </p>
        </div>

        {/* Bullet coins */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          {bulletinCoins.map(c => (
            <div key={c.id} className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 shrink-0 -ml-1 first:ml-0 border border-black">
              <img src={c.image} alt={c.symbol} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
          ))}
          {coins.length > 4 && (
            <div className="w-6 h-6 rounded-full -ml-1 flex items-center justify-center text-[7px] font-black"
              style={{ background: `${color}20`, color }}>
              +{coins.length - 4}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#3a4058" }}>24h</div>
            <div className="text-[13px] font-black font-mono flex items-center gap-0.5" style={{ color: pctColor(perf) }}>
              {perf >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {perf >= 0 ? "+" : ""}{perf.toFixed(2)}%
            </div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#3a4058" }}>7d</div>
            <div className="text-[13px] font-black font-mono flex items-center gap-0.5" style={{ color: pctColor(perf7) }}>
              {perf7 >= 0 ? "+" : ""}{perf7.toFixed(2)}%
            </div>
          </div>
          <div className="text-right hidden lg:block">
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#3a4058" }}>MCap</div>
            <div className="text-[12px] font-black font-mono text-white">{fmtMcap(sector.totalMcap)}</div>
          </div>
          {/* Momentum bar */}
          <div className="hidden xl:flex flex-col gap-1 w-24">
            <div className="flex items-center justify-between">
              <span className="text-[8px]" style={{ color: "#3a4058" }}>Momentum</span>
              <span className="text-[9px] font-black" style={{ color }}>{sector.momentumScore}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, sector.momentumScore))}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
            </div>
          </div>
          {/* Expand icon */}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            {expanded
              ? <ChevronDown size={14} style={{ color: "#5a6072" }} />
              : <ChevronRight size={14} style={{ color: "#5a6072" }} />}
          </div>
        </div>
      </button>

      {/* ── Expanded Coin Table ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t" style={{ borderColor: `${color}18` }}>
              {/* Table header */}
              <div className="grid px-5 py-2"
                style={{ gridTemplateColumns: "32px 1fr 100px 90px 80px 100px 70px 80px" }}>
                {["#", "COIN", "PRICE", "24H", "7D", "MKT CAP", "AI SCORE", "SIGNAL"].map(h => (
                  <span key={h} className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#2a3050" }}>{h}</span>
                ))}
              </div>

              {/* Coin rows */}
              {coins.length === 0 ? (
                <div className="px-5 py-6 text-center text-[11px]" style={{ color: "#3a4058" }}>
                  No live data — deploy to coinastra.io for real prices
                </div>
              ) : (
                [...coins]
                  .sort((a, b) => b.mcap - a.mcap)
                  .map((coin, idx) => {
                    const ai = analyzeToken({
                      priceChange24h: coin.ch24,
                      priceChange7d: coin.ch7d,
                      volume24h: coin.volume24h,
                      marketCap: coin.mcap,
                      price: coin.price,
                      symbol: coin.symbol,
                    });
                    return (
                      <motion.div
                        key={coin.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.025 }}
                        className="grid px-5 py-2.5 items-center border-t hover:bg-white/[0.025] transition-colors cursor-pointer group"
                        style={{
                          gridTemplateColumns: "32px 1fr 100px 90px 80px 100px 70px 80px",
                          borderColor: "rgba(255,255,255,0.035)",
                        }}
                      >
                        {/* Rank */}
                        <span className="text-[10px] font-bold" style={{ color: "#2a3050" }}>{idx + 1}</span>

                        {/* Coin */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-800 shrink-0 flex items-center justify-center text-[8px] font-black text-white">
                            {coin.image ? (
                              <img src={coin.image} alt={coin.symbol}
                                className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            ) : coin.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-[12px] font-black text-white group-hover:text-blue-400 transition-colors">{coin.symbol.toUpperCase()}</div>
                            <div className="text-[9px]" style={{ color: "#4a5068" }}>{coin.name}</div>
                          </div>
                        </div>

                        {/* Price */}
                        <span className="text-[11px] font-black text-white font-mono">{fmtPrice(coin.price)}</span>

                        {/* 24h */}
                        <span className="text-[11px] font-black font-mono" style={{ color: pctColor(coin.ch24) }}>
                          {coin.ch24 >= 0 ? "+" : ""}{coin.ch24.toFixed(2)}%
                        </span>

                        {/* 7d */}
                        <span className="text-[11px] font-black font-mono" style={{ color: pctColor(coin.ch7d) }}>
                          {coin.ch7d >= 0 ? "+" : ""}{coin.ch7d.toFixed(2)}%
                        </span>

                        {/* Market Cap */}
                        <span className="text-[10px] font-semibold font-mono" style={{ color: "#8892a4" }}>{fmtMcap(coin.mcap)}</span>

                        {/* AI Score */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${ai.confidence}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
                          </div>
                          <span className="text-[9px] font-black" style={{ color }}>{ai.confidence}</span>
                        </div>

                        {/* Signal */}
                        <div className="flex justify-start">
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-md whitespace-nowrap"
                            style={{
                              background: SIGNAL_BG[ai.signal] ?? "rgba(90,96,114,0.15)",
                              color: SIGNAL_COLOR[ai.signal] ?? "#787b86",
                            }}>
                            {ai.signal.replace(/_/g, " ")}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

export default function Narratives() {
  const { data: apiNarratives } = useListNarratives({
    query: { queryKey: getListNarrativesQueryKey() }
  });
  const { data: liveCoins, dataUpdatedAt } = useLiveCoins();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["layer-1", "defi"]));
  const [filterSlug, setFilterSlug] = useState<string>("all");

  const toggle = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  /* Build sector data by matching live coins to sector coinIds */
  const sectors: SectorData[] = useMemo(() => {
    const coinMap = new Map<string, LiveCoin>();
    liveCoins?.forEach(c => coinMap.set(c.id, c));

    return SECTOR_DEFS.map(def => {
      const coins = def.coinIds
        .map(id => {
          const live = coinMap.get(id);
          const fb = FALLBACK[id];
          if (!live && !fb) return null;
          return {
            id,
            symbol: live?.symbol ?? id,
            name: live?.name ?? id,
            image: live?.image ?? "",
            price: live?.current_price ?? fb?.price ?? 0,
            ch24: live?.price_change_percentage_24h ?? fb?.ch24 ?? 0,
            ch7d: live?.price_change_percentage_7d_in_currency ?? fb?.ch7d ?? 0,
            mcap: live?.market_cap ?? (fb ? fb.mcap : 0),
            volume24h: live?.total_volume ?? 0,
          };
        })
        .filter(Boolean) as SectorData["coins"];

      const apiN = apiNarratives?.find(n => n.slug === def.slug);
      const totalMcap = coins.reduce((s, c) => s + c.mcap, 0);
      const avgCh24 = coins.length > 0
        ? coins.reduce((s, c) => s + c.ch24, 0) / coins.length
        : 0;
      const avgCh7d = coins.length > 0
        ? coins.reduce((s, c) => s + c.ch7d, 0) / coins.length
        : 0;

      return {
        ...def,
        coins,
        perf24h: apiN?.perf24h ?? avgCh24,
        perf7d: apiN?.perf7d ?? avgCh7d,
        momentumScore: apiN?.momentumScore ?? Math.round(Math.max(0, Math.min(100, 50 + avgCh24 * 3))),
        totalMcap,
      };
    });
  }, [liveCoins, apiNarratives]);

  const filteredSectors = filterSlug === "all" ? sectors : sectors.filter(s => s.slug === filterSlug);

  /* Global stats */
  const totalCoins = sectors.reduce((s, n) => s + n.coins.length, 0);
  const bestSector = [...sectors].sort((a, b) => b.perf24h - a.perf24h)[0];
  const worstSector = [...sectors].sort((a, b) => a.perf24h - b.perf24h)[0];
  const overallPerf = sectors.reduce((s, n) => s + n.perf24h, 0) / sectors.length;

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--";

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 20px rgba(41,98,255,0.4)" }}>
              <LayoutGrid size={18} className="text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#a5f3fc 40%,#2962ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Narrative Intelligence
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: "rgba(38,166,154,0.15)", border: "1px solid rgba(38,166,154,0.3)", color: "#26a69a" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "#4a5068" }}>
            {sectors.length} sectors · {totalCoins} tokens tracked · Updated {updatedAt}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Market Trend", value: `${overallPerf >= 0 ? "+" : ""}${overallPerf.toFixed(2)}%`, color: pctColor(overallPerf) },
            { label: "Best Sector", value: bestSector?.shortName ?? "--", color: "#26a69a" },
            { label: "Best 24h", value: bestSector ? `+${bestSector.perf24h.toFixed(2)}%` : "--", color: "#26a69a" },
            { label: "Weakest", value: worstSector?.shortName ?? "--", color: "#ef5350" },
          ].map(s => (
            <div key={s.label} className="px-3 py-1.5 rounded-xl text-right"
              style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: "#3a4058" }}>{s.label}</div>
              <div className="text-[13px] font-black" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sector Performance Heatbar ── */}
      <div className="flex items-stretch gap-0 rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)", height: 52 }}>
        {sectors.map((s) => {
          const isActive = filterSlug === s.slug;
          const width = `${100 / sectors.length}%`;
          return (
            <button key={s.slug}
              onClick={() => setFilterSlug(filterSlug === s.slug ? "all" : s.slug)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all relative overflow-hidden"
              style={{
                width,
                background: isActive ? `${s.color}22` : "rgba(8,12,20,0.9)",
                borderRight: "1px solid rgba(255,255,255,0.04)",
              }}>
              <div className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: isActive ? s.color : `${s.color}40` }} />
              <span className="text-[10px] font-black" style={{ color: isActive ? s.color : "#fff" }}>{s.shortName}</span>
              <span className="text-[9px] font-bold" style={{ color: pctColor(s.perf24h) }}>
                {s.perf24h >= 0 ? "+" : ""}{s.perf24h.toFixed(1)}%
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setFilterSlug("all")}
          className="flex flex-col items-center justify-center px-3 gap-0.5 transition-all"
          style={{
            background: filterSlug === "all" ? "rgba(41,98,255,0.15)" : "rgba(8,12,20,0.9)",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            minWidth: 48,
          }}>
          <LayoutGrid size={12} style={{ color: filterSlug === "all" ? "#4d7fff" : "#3a4058" }} />
          <span className="text-[8px] font-bold" style={{ color: filterSlug === "all" ? "#4d7fff" : "#3a4058" }}>ALL</span>
        </button>
      </div>

      {/* ── Sector Cards ── */}
      <div className="space-y-3">
        {filteredSectors.map((sector, i) => (
          <motion.div key={sector.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}>
            <SectorCard
              sector={sector}
              expanded={expanded.has(sector.slug)}
              onToggle={() => toggle(sector.slug)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
