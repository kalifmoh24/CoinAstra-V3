import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { LayoutGrid, TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react";
import { useLiveCoins } from "@/hooks/use-market-data";
import type { LiveCoin } from "@/hooks/use-market-data";

/* ── Types ──────────────────────────────────────────────────────────────────── */

type TimeView = "1h" | "24h" | "7d" | "30d";

interface HeatCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  ch24: number;
  ch7d: number;
  mcap: number;
  sector: string;
}

interface TreeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  coin: HeatCoin;
}

/* ── Sector mapping ─────────────────────────────────────────────────────────── */

const COIN_SECTOR: Record<string, string> = {
  bitcoin: "Layer 1", ethereum: "Layer 1", solana: "Layer 1",
  binancecoin: "Layer 1", ripple: "Layer 1", cardano: "Layer 1",
  "avalanche-2": "Layer 1", polkadot: "Layer 1", near: "Layer 1",
  tron: "Layer 1", cosmos: "Layer 1", toncoin: "Layer 1",
  aptos: "Layer 1", sui: "Layer 1", algorand: "Layer 1",
  arbitrum: "Layer 2", optimism: "Layer 2", "matic-network": "Layer 2",
  starknet: "Layer 2", loopring: "Layer 2", mantle: "Layer 2",
  "immutable-x": "Layer 2", "metis-token": "Layer 2", base: "Layer 2",
  uniswap: "DeFi", aave: "DeFi", chainlink: "DeFi", maker: "DeFi",
  "compound-governance-token": "DeFi", "curve-dao-token": "DeFi",
  "synthetix-network-token": "DeFi", "injective-protocol": "DeFi",
  gmx: "DeFi", pendle: "DeFi", dydx: "DeFi", balancer: "DeFi",
  "1inch": "DeFi", "pancakeswap-token": "DeFi", "jito-governance-token": "DeFi",
  dogecoin: "Meme", "shiba-inu": "Meme", pepe: "Meme",
  bonk: "Meme", floki: "Meme", dogwifhat: "Meme",
  "mog-coin": "Meme", brett: "Meme", "book-of-meme": "Meme",
  "render-token": "AI", "fetch-ai": "AI", singularitynet: "AI",
  "ocean-protocol": "AI", bittensor: "AI", "worldcoin-wld": "AI",
  "akash-network": "AI", "the-graph": "AI", cortex: "AI",
  "the-sandbox": "Gaming", "axie-infinity": "Gaming", decentraland: "Gaming",
  gala: "Gaming", illuvium: "Gaming", ronin: "Gaming",
  "ondo-finance": "RWA", maple: "RWA", centrifuge: "RWA",
  helium: "DePIN", iotex: "DePIN", flux: "DePIN", hivemapper: "DePIN",
  tether: "Stables", "usd-coin": "Stables", dai: "Stables",
  "binance-usd": "Stables", "true-usd": "Stables",
};

const SECTOR_META: Record<string, { color: string; darkColor: string; order: number }> = {
  "Layer 1": { color: "#26a69a", darkColor: "#0d3d38", order: 0 },
  "DeFi":    { color: "#7c3aed", darkColor: "#2a1550", order: 1 },
  "Meme":    { color: "#f59e0b", darkColor: "#3d2800", order: 2 },
  "Layer 2": { color: "#0ea5e9", darkColor: "#062a3d", order: 3 },
  "AI":      { color: "#a78bfa", darkColor: "#2a1d4d", order: 4 },
  "Gaming":  { color: "#f97316", darkColor: "#3d1a00", order: 5 },
  "RWA":     { color: "#10b981", darkColor: "#063d2a", order: 6 },
  "DePIN":   { color: "#ec4899", darkColor: "#3d0625", order: 7 },
  "Stables": { color: "#5a6072", darkColor: "#1a1e28", order: 8 },
};

/* ── Static fallback data (top 50 coins) ────────────────────────────────────── */

const STATIC_COINS: HeatCoin[] = [
  { id:"bitcoin",      symbol:"BTC",   name:"Bitcoin",       image:"https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",     price:81198,  ch24:-0.1,  ch7d:-2.1,  mcap:1610000, sector:"Layer 1" },
  { id:"ethereum",     symbol:"ETH",   name:"Ethereum",      image:"https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",   price:2305,   ch24:-0.3,  ch7d:-3.0,  mcap:277000,  sector:"Layer 1" },
  { id:"tether",       symbol:"USDT",  name:"Tether",        image:"https://assets.coingecko.com/coins/images/325/thumb/Tether.png",     price:1.0,    ch24:0.01,  ch7d:0.02,  mcap:145000,  sector:"Stables" },
  { id:"binancecoin",  symbol:"BNB",   name:"BNB",           image:"https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png",price:599,  ch24:0.2,   ch7d:1.8,   mcap:84000,   sector:"Layer 1" },
  { id:"ripple",       symbol:"XRP",   name:"XRP",           image:"https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png", price:2.14, ch24:1.1, ch7d:4.4, mcap:122000, sector:"Layer 1" },
  { id:"usd-coin",     symbol:"USDC",  name:"USDC",          image:"https://assets.coingecko.com/coins/images/6319/thumb/usdc.png",      price:1.0,    ch24:0.01,  ch7d:0.01,  mcap:60000,   sector:"Stables" },
  { id:"solana",       symbol:"SOL",   name:"Solana",        image:"https://assets.coingecko.com/coins/images/4128/thumb/solana.png",    price:95.61,  ch24:-0.8,  ch7d:-5.2,  mcap:46000,   sector:"Layer 1" },
  { id:"dogecoin",     symbol:"DOGE",  name:"Dogecoin",      image:"https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png",     price:0.168,  ch24:-2.1,  ch7d:-4.8,  mcap:24800,   sector:"Meme"    },
  { id:"tron",         symbol:"TRX",   name:"TRON",          image:"https://assets.coingecko.com/coins/images/1094/thumb/tron-logo.png", price:0.244,  ch24:0.3,   ch7d:1.8,   mcap:21000,   sector:"Layer 1" },
  { id:"cardano",      symbol:"ADA",   name:"Cardano",       image:"https://assets.coingecko.com/coins/images/975/thumb/cardano.png",    price:0.68,   ch24:-0.4,  ch7d:-1.2,  mcap:24000,   sector:"Layer 1" },
  { id:"toncoin",      symbol:"TON",   name:"Toncoin",       image:"https://assets.coingecko.com/coins/images/17980/thumb/ton_symbol.png",price:3.12, ch24:0.9,   ch7d:3.4,   mcap:7900,    sector:"Layer 1" },
  { id:"shiba-inu",    symbol:"SHIB",  name:"Shiba Inu",     image:"https://assets.coingecko.com/coins/images/11939/thumb/shiba.png",   price:0.0000138,ch24:-1.4,ch7d:-3.2,  mcap:8100,    sector:"Meme"    },
  { id:"chainlink",    symbol:"LINK",  name:"Chainlink",     image:"https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png", price:13.4, ch24:4.3, ch7d:12.1, mcap:8200, sector:"DeFi" },
  { id:"avalanche-2",  symbol:"AVAX",  name:"Avalanche",     image:"https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png", price:20.4, ch24:0.8, ch7d:3.1, mcap:8400, sector:"Layer 1" },
  { id:"sui",          symbol:"SUI",   name:"Sui",           image:"https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg", price:2.48, ch24:2.1, ch7d:8.2, mcap:6200, sector:"Layer 1" },
  { id:"polkadot",     symbol:"DOT",   name:"Polkadot",      image:"https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png", price:4.12, ch24:-0.6, ch7d:-2.4, mcap:6300, sector:"Layer 1" },
  { id:"near",         symbol:"NEAR",  name:"NEAR Protocol", image:"https://assets.coingecko.com/coins/images/10365/thumb/near.jpg", price:2.46, ch24:1.4, ch7d:5.2, mcap:2900, sector:"Layer 1" },
  { id:"uniswap",      symbol:"UNI",   name:"Uniswap",       image:"https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png", price:6.12, ch24:2.1, ch7d:8.4, mcap:3700, sector:"DeFi" },
  { id:"aptos",        symbol:"APT",   name:"Aptos",         image:"https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png", price:5.44, ch24:1.2, ch7d:4.8, mcap:2800, sector:"Layer 1" },
  { id:"pepe",         symbol:"PEPE",  name:"Pepe",          image:"https://assets.coingecko.com/coins/images/29850/thumb/pepe-token.jpeg", price:0.0000082, ch24:0.8, ch7d:2.4, mcap:3460, sector:"Meme" },
  { id:"bittensor",    symbol:"TAO",   name:"Bittensor",     image:"https://assets.coingecko.com/coins/images/28452/thumb/ARUsPeNQ_400x400.jpeg", price:328, ch24:5.4, ch7d:18.2, mcap:2100, sector:"AI" },
  { id:"arbitrum",     symbol:"ARB",   name:"Arbitrum",      image:"https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg", price:0.44, ch24:0.6, ch7d:3.1, mcap:1760, sector:"Layer 2" },
  { id:"cosmos",       symbol:"ATOM",  name:"Cosmos",        image:"https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png", price:4.88, ch24:-0.2, ch7d:-1.1, mcap:1900, sector:"Layer 1" },
  { id:"render-token", symbol:"RNDR",  name:"Render",        image:"https://assets.coingecko.com/coins/images/11636/thumb/rndr.png", price:4.12, ch24:3.1, ch7d:9.8, mcap:1980, sector:"AI" },
  { id:"optimism",     symbol:"OP",    name:"Optimism",      image:"https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png", price:0.88, ch24:1.2, ch7d:4.8, mcap:1170, sector:"Layer 2" },
  { id:"matic-network",symbol:"POL",   name:"Polygon",       image:"https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png", price:0.28, ch24:-0.4, ch7d:2.2, mcap:2800, sector:"Layer 2" },
  { id:"maker",        symbol:"MKR",   name:"Maker",         image:"https://assets.coingecko.com/coins/images/1364/thumb/Mark_Maker.png", price:1480, ch24:1.2, ch7d:4.8, mcap:1700, sector:"DeFi" },
  { id:"aave",         symbol:"AAVE",  name:"Aave",          image:"https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png", price:198, ch24:1.8, ch7d:7.2, mcap:3200, sector:"DeFi" },
  { id:"the-graph",    symbol:"GRT",   name:"The Graph",     image:"https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png", price:0.118, ch24:1.4, ch7d:4.8, mcap:1100, sector:"AI" },
  { id:"bonk",         symbol:"BONK",  name:"Bonk",          image:"https://assets.coingecko.com/coins/images/28600/thumb/bonk.jpg", price:0.0000188, ch24:14.8, ch7d:42.1, mcap:1390, sector:"Meme" },
  { id:"dogwifhat",    symbol:"WIF",   name:"dogwifhat",     image:"https://assets.coingecko.com/coins/images/33566/thumb/dogwifhat.jpg", price:0.82, ch24:7.6, ch7d:19.8, mcap:822, sector:"Meme" },
  { id:"fetch-ai",     symbol:"FET",   name:"Fetch.ai",      image:"https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg", price:1.24, ch24:4.2, ch7d:11.4, mcap:1060, sector:"AI" },
  { id:"floki",        symbol:"FLOKI", name:"Floki",         image:"https://assets.coingecko.com/coins/images/16746/thumb/PNG_image.png", price:0.0000842, ch24:3.2, ch7d:8.4, mcap:800, sector:"Meme" },
  { id:"injective-protocol",symbol:"INJ",name:"Injective",  image:"https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png", price:12.8, ch24:2.9, ch7d:7.4, mcap:1200, sector:"DeFi" },
  { id:"the-sandbox",  symbol:"SAND",  name:"The Sandbox",  image:"https://assets.coingecko.com/coins/images/12129/thumb/sandbox_logo.jpg", price:0.288, ch24:-1.2, ch7d:-2.4, mcap:680, sector:"Gaming" },
  { id:"axie-infinity",symbol:"AXS",   name:"Axie Infinity", image:"https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png", price:5.12, ch24:-0.8, ch7d:-1.8, mcap:840, sector:"Gaming" },
  { id:"ondo-finance", symbol:"ONDO",  name:"Ondo Finance",  image:"https://assets.coingecko.com/coins/images/26580/thumb/ONDO.png", price:0.892, ch24:3.4, ch7d:12.4, mcap:1280, sector:"RWA" },
  { id:"ronin",        symbol:"RON",   name:"Ronin",         image:"https://assets.coingecko.com/coins/images/20009/thumb/ronin.jpg", price:1.44, ch24:1.4, ch7d:4.8, mcap:780, sector:"Gaming" },
  { id:"decentraland", symbol:"MANA",  name:"Decentraland",  image:"https://assets.coingecko.com/coins/images/878/thumb/decentraland-mana.png", price:0.308, ch24:-0.4, ch7d:-1.2, mcap:590, sector:"Gaming" },
  { id:"singularitynet",symbol:"AGIX", name:"SingularityNET",image:"https://assets.coingecko.com/coins/images/2138/thumb/singularitynet.png", price:0.48, ch24:2.8, ch7d:8.2, mcap:640, sector:"AI" },
  { id:"ocean-protocol",symbol:"OCEAN",name:"Ocean Protocol",image:"https://assets.coingecko.com/coins/images/3687/thumb/ocean-protocol-logo.jpg", price:0.68, ch24:2.1, ch7d:7.4, mcap:380, sector:"AI" },
  { id:"curve-dao-token",symbol:"CRV", name:"Curve DAO",    image:"https://assets.coingecko.com/coins/images/12124/thumb/Curve.png", price:0.42, ch24:1.2, ch7d:3.4, mcap:520, sector:"DeFi" },
  { id:"helium",       symbol:"HNT",   name:"Helium",        image:"https://assets.coingecko.com/coins/images/4284/thumb/Helium_HNT.png", price:4.22, ch24:2.8, ch7d:9.4, mcap:600, sector:"DePIN" },
  { id:"gala",         symbol:"GALA",  name:"Gala",          image:"https://assets.coingecko.com/coins/images/12493/thumb/GALA-COINGECKO.png", price:0.022, ch24:0.8, ch7d:2.4, mcap:480, sector:"Gaming" },
  { id:"pendle",       symbol:"PENDLE",name:"Pendle",        image:"https://assets.coingecko.com/coins/images/15069/thumb/Pendle_Logo_Normal-03.png", price:3.84, ch24:4.8, ch7d:16.9, mcap:520, sector:"DeFi" },
  { id:"akash-network",symbol:"AKT",   name:"Akash Network", image:"https://assets.coingecko.com/coins/images/4618/thumb/akash-logo.png", price:2.84, ch24:3.8, ch7d:12.4, mcap:720, sector:"AI" },
  { id:"iotex",        symbol:"IOTX",  name:"IoTeX",         image:"https://assets.coingecko.com/coins/images/3334/thumb/iotex-logo.png", price:0.054, ch24:1.8, ch7d:6.4, mcap:410, sector:"DePIN" },
  { id:"flux",         symbol:"FLUX",  name:"Flux",          image:"https://assets.coingecko.com/coins/images/5163/thumb/Flux_symbol_blue-white.png", price:0.48, ch24:2.4, ch7d:8.2, mcap:300, sector:"DePIN" },
  { id:"dydx",         symbol:"DYDX",  name:"dYdX",          image:"https://assets.coingecko.com/coins/images/17500/thumb/hjnIm9bV.jpg", price:0.74, ch24:2.1, ch7d:6.8, mcap:480, sector:"DeFi" },
  { id:"gmx",          symbol:"GMX",   name:"GMX",           image:"https://assets.coingecko.com/coins/images/18323/thumb/arbit.png", price:18.4, ch24:2.1, ch7d:6.8, mcap:220, sector:"DeFi" },
];

/* ── Treemap algorithm ──────────────────────────────────────────────────────── */

interface TileInput { id: string; value: number; data: HeatCoin }
interface TileOutput extends TileInput { x: number; y: number; w: number; h: number }

function buildTreemap(items: TileInput[], x: number, y: number, w: number, h: number): TileOutput[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, it) => s + it.value, 0);
  let cumul = 0;
  let splitIdx = 0;
  for (let i = 0; i < items.length; i++) {
    cumul += items[i].value;
    if (cumul >= total / 2) { splitIdx = i + 1; break; }
  }
  if (splitIdx === 0) splitIdx = 1;

  const first  = items.slice(0, splitIdx);
  const second = items.slice(splitIdx);
  const ratio  = first.reduce((s, it) => s + it.value, 0) / total;

  if (w >= h) {
    const w1 = w * ratio;
    return [
      ...buildTreemap(first,  x,      y, w1,     h),
      ...buildTreemap(second, x + w1, y, w - w1, h),
    ];
  } else {
    const h1 = h * ratio;
    return [
      ...buildTreemap(first,  x, y,      w, h1),
      ...buildTreemap(second, x, y + h1, w, h - h1),
    ];
  }
}

/* ── Color helpers ──────────────────────────────────────────────────────────── */

function heatBg(pct: number): string {
  if (pct >=  10) return "#0b3d2e";
  if (pct >=   5) return "#0f5040";
  if (pct >=   2) return "#156b52";
  if (pct >=  0.5)return "#1a8066";
  if (pct >=   0) return "#0e3d30";
  if (pct >= -0.5)return "#2c1010";
  if (pct >=  -2) return "#4a1616";
  if (pct >=  -5) return "#682020";
  return "#882828";
}
function heatBorder(pct: number): string {
  if (pct >=   2) return "rgba(38,166,154,0.4)";
  if (pct >=   0) return "rgba(38,166,154,0.15)";
  if (pct >=  -2) return "rgba(239,83,80,0.15)";
  return "rgba(239,83,80,0.4)";
}
function heatText(pct: number): string {
  return pct >= 0 ? "#a7f3d0" : "#fca5a5";
}

function fmtPct(v: number) { return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`; }
function fmtPr(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1)    return `$${p.toFixed(2)}`;
  if (p >= 0.001)return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}
function fmtMcap(v: number): string {
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}T`;
  if (v >= 1)     return `$${v.toFixed(0)}B`;
  return `$${(v * 1000).toFixed(0)}M`;
}

/* ── Tooltip ──────────────────────────────────────────────────────────────── */

function Tooltip({ coin, x, y, containerW }: { coin: HeatCoin; x: number; y: number; containerW: number }) {
  const flipX = x > containerW - 200;
  return (
    <div
      className="pointer-events-none absolute z-50 rounded-xl p-3 w-44"
      style={{
        left: flipX ? x - 180 : x + 8,
        top: Math.max(0, y - 10),
        background: "rgba(8,12,22,0.97)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        <div>
          <div className="text-[11px] font-black text-white">{coin.symbol}</div>
          <div className="text-[8px]" style={{ color: "#4a5068" }}>{coin.name}</div>
        </div>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span style={{ color: "#5a6072" }}>Price</span>
          <span className="font-black text-white font-mono">{fmtPr(coin.price)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "#5a6072" }}>24h</span>
          <span className="font-black font-mono" style={{ color: heatText(coin.ch24) }}>{fmtPct(coin.ch24)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "#5a6072" }}>7d</span>
          <span className="font-black font-mono" style={{ color: heatText(coin.ch7d) }}>{fmtPct(coin.ch7d)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "#5a6072" }}>Mcap</span>
          <span className="font-bold font-mono" style={{ color: "#8892a4" }}>{fmtMcap(coin.mcap)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "#5a6072" }}>Sector</span>
          <span className="font-bold" style={{ color: SECTOR_META[coin.sector]?.color ?? "#fff" }}>{coin.sector}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

export default function Heatmap() {
  const [, setLocation]           = useLocation();
  const [view, setView]           = useState<TimeView>("24h");
  const [sectorFilter, setSector] = useState<string>("All");
  const [hovered, setHovered]     = useState<{ coin: HeatCoin; x: number; y: number } | null>(null);
  const containerRef              = useRef<HTMLDivElement>(null);
  const [cWidth, setCWidth]       = useState(1100);

  const { data: liveCoins, dataUpdatedAt, refetch } = useLiveCoins();

  /* Observe container width */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setCWidth(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* Merge live data with static fallback */
  const allCoins: HeatCoin[] = useMemo(() => {
    if (!liveCoins?.length) return STATIC_COINS;
    const liveMap = new Map(liveCoins.map((c: LiveCoin) => [c.id, c]));
    return STATIC_COINS.map(fb => {
      const live = liveMap.get(fb.id);
      if (!live) return fb;
      return {
        ...fb,
        price: live.current_price,
        ch24:  live.price_change_percentage_24h,
        ch7d:  live.price_change_percentage_7d_in_currency ?? fb.ch7d,
        mcap:  live.market_cap / 1_000_000, // keep in millions for relative sizing
        image: live.image,
        name:  live.name,
        symbol: live.symbol.toUpperCase(),
      };
    });
  }, [liveCoins]);

  const getVal = (c: HeatCoin) =>
    view === "7d" || view === "30d" ? c.ch7d : c.ch24;

  const sectors = useMemo(() => {
    const map = new Map<string, HeatCoin[]>();
    allCoins.forEach(c => {
      if (!map.has(c.sector)) map.set(c.sector, []);
      map.get(c.sector)!.push(c);
    });
    return Array.from(map.entries())
      .sort((a, b) => (SECTOR_META[a[0]]?.order ?? 99) - (SECTOR_META[b[0]]?.order ?? 99));
  }, [allCoins]);

  const filteredCoins = useMemo(() => {
    return sectorFilter === "All" ? allCoins : allCoins.filter(c => c.sector === sectorFilter);
  }, [allCoins, sectorFilter]);

  /* ── Build full treemap ─── */
  const HEATMAP_H = 540;
  const tiles = useMemo(() => {
    const items = [...filteredCoins]
      .filter(c => c.mcap > 0)
      .sort((a, b) => b.mcap - a.mcap)
      .map(c => ({ id: c.id, value: c.mcap, data: c }));
    return buildTreemap(items, 0, 0, cWidth, HEATMAP_H);
  }, [filteredCoins, cWidth, HEATMAP_H]);

  /* ── Sector stats ─── */
  const sectorStats = useMemo(() => sectors.map(([name, coins]) => {
    const avg = coins.reduce((s, c) => s + getVal(c), 0) / coins.length;
    const mcap = coins.reduce((s, c) => s + c.mcap, 0);
    return { name, avg, mcap, coins: coins.length, color: SECTOR_META[name]?.color ?? "#5a6072" };
  }), [sectors, view]);

  const topGainers = useMemo(() =>
    [...allCoins].sort((a, b) => getVal(b) - getVal(a)).slice(0, 6),
  [allCoins, view]);
  const topLosers = useMemo(() =>
    [...allCoins].sort((a, b) => getVal(a) - getVal(b)).slice(0, 6),
  [allCoins, view]);

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#10b981)", boxShadow: "0 0 20px rgba(41,98,255,0.35)" }}>
              <LayoutGrid size={18} className="text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#a5f3fc 50%,#2962ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Market Heatmap
            </h1>
            {updatedAt && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                style={{ background: "rgba(38,166,154,0.15)", border: "1px solid rgba(38,166,154,0.3)", color: "#26a69a" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: "#4a5068" }}>
            {allCoins.length} coins · Block size = market cap · Color = performance · {updatedAt ? `Updated ${updatedAt}` : "Fallback data"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time selector */}
          <div className="flex items-center p-0.5 rounded-xl gap-0.5"
            style={{ background: "rgba(10,14,22,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["24h","7d"] as TimeView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: view === v ? "rgba(41,98,255,0.25)" : "transparent",
                  color: view === v ? "#4d7fff" : "#5a6072",
                  border: view === v ? "1px solid rgba(41,98,255,0.4)" : "1px solid transparent",
                }}>{v}</button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
            style={{ background: "rgba(41,98,255,0.1)", border: "1px solid rgba(41,98,255,0.2)", color: "#4d7fff" }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Sector filter bar ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {["All", ...sectors.map(([n]) => n)].map(s => {
          const meta = SECTOR_META[s];
          const isActive = sectorFilter === s;
          return (
            <button key={s} onClick={() => setSector(s)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all"
              style={{
                background: isActive ? `${meta?.color ?? "#2962ff"}20` : "rgba(255,255,255,0.04)",
                color: isActive ? (meta?.color ?? "#4d7fff") : "#5a6072",
                border: isActive ? `1px solid ${meta?.color ?? "#2962ff"}40` : "1px solid rgba(255,255,255,0.06)",
              }}>{s}</button>
          );
        })}
      </div>

      {/* ── Color legend ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-0.5">
          {["#0b3d2e","#156b52","#1a8066","#3d1212","#782222","#962a2a"].map((c, i) => (
            <div key={i} className="w-10 h-3.5 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <TrendingUp size={11} style={{ color: "#26a69a" }} />
            <span style={{ color: "#26a69a" }}>Gaining</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown size={11} style={{ color: "#ef5350" }} />
            <span style={{ color: "#ef5350" }}>Losing</span>
          </div>
          <span style={{ color: "#3a4058" }}>Block size = market cap</span>
        </div>
      </div>

      {/* ── Treemap Canvas ── */}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "rgba(6,9,16,0.98)",
          border: "1px solid rgba(255,255,255,0.06)",
          height: HEATMAP_H,
          boxShadow: "0 4px 40px rgba(0,0,0,0.4)",
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {tiles.map(tile => {
          const coin = tile.data;
          const val   = getVal(coin);
          const isHov = hovered?.coin.id === coin.id;

          /* Size thresholds */
          const showImg   = tile.w >= 44 && tile.h >= 44;
          const showName  = tile.w >= 52 && tile.h >= 40;
          const showPct   = tile.w >= 36 && tile.h >= 30;
          const showPrice = tile.w >= 72 && tile.h >= 60;
          const bigText   = tile.w >= 100 && tile.h >= 70;

          return (
            <motion.div
              key={coin.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              onClick={() => setLocation(`/research/${coin.symbol.toUpperCase()}`)}
              onMouseEnter={e => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) setHovered({ coin, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseMove={e => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) setHovered({ coin, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              style={{
                position: "absolute",
                left:   tile.x + 1,
                top:    tile.y + 1,
                width:  Math.max(0, tile.w - 2),
                height: Math.max(0, tile.h - 2),
                background: heatBg(val),
                border: `1px solid ${heatBorder(val)}`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "filter 0.12s",
                filter: isHov ? "brightness(1.35)" : "brightness(1)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              {showImg && (
                <img
                  src={coin.image}
                  alt={coin.symbol}
                  style={{
                    width:  bigText ? 28 : 18,
                    height: bigText ? 28 : 18,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              {showName && (
                <div style={{
                  fontSize: bigText ? 13 : 10,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                  letterSpacing: bigText ? 0.3 : 0,
                  textAlign: "center",
                  padding: "0 4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}>
                  {coin.symbol}
                </div>
              )}
              {showPrice && (
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", textAlign: "center" }}>
                  {fmtPr(coin.price)}
                </div>
              )}
              {showPct && (
                <div style={{
                  fontSize: bigText ? 11 : 9,
                  fontWeight: 700,
                  color: heatText(val),
                  fontFamily: "monospace",
                  textAlign: "center",
                }}>
                  {fmtPct(val)}
                </div>
              )}
              {!showName && tile.w >= 18 && tile.h >= 14 && (
                <div style={{ fontSize: 7, fontWeight: 900, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                  {coin.symbol.slice(0, 3)}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Tooltip */}
        {hovered && (
          <Tooltip
            coin={hovered.coin}
            x={hovered.x}
            y={hovered.y}
            containerW={cWidth}
          />
        )}
      </div>

      {/* ── Bottom panels: Sector stats + Top Movers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sector rotation */}
        <div className="lg:col-span-2 rounded-2xl p-4"
          style={{ background: "rgba(13,17,26,0.90)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} style={{ color: "#2962ff" }} />
            <span className="text-[12px] font-black text-white">Sector Rotation ({view})</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {sectorStats.filter(s => s.name !== "Stables").map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[10px] font-semibold text-white">{s.name}</span>
                    <span className="text-[8px]" style={{ color: "#3a4058" }}>{s.coins} coins</span>
                  </div>
                  <span className="text-[10px] font-black font-mono"
                    style={{ color: s.avg >= 0 ? "#26a69a" : "#ef5350" }}>
                    {s.avg >= 0 ? "+" : ""}{s.avg.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(s.avg) * 8)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 }}
                    style={{ background: s.avg >= 0 ? s.color : "#ef5350" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top movers */}
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(13,17,26,0.90)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} style={{ color: "#26a69a" }} />
            <span className="text-[12px] font-black text-white">Top Movers ({view})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider mb-2" style={{ color: "#26a69a" }}>🚀 Gainers</div>
              {topGainers.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-1.5">
                    <img src={c.image} alt={c.symbol} className="w-4 h-4 rounded-full"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-[10px] font-black text-white">{c.symbol}</span>
                  </div>
                  <span className="text-[9px] font-black font-mono" style={{ color: "#26a69a" }}>+{getVal(c).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider mb-2" style={{ color: "#ef5350" }}>📉 Losers</div>
              {topLosers.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-1.5">
                    <img src={c.image} alt={c.symbol} className="w-4 h-4 rounded-full"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-[10px] font-black text-white">{c.symbol}</span>
                  </div>
                  <span className="text-[9px] font-black font-mono" style={{ color: "#ef5350" }}>{getVal(c).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
