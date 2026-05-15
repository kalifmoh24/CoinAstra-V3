import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Network, Activity, Cpu, BarChart2, ArrowRightLeft, Database,
  TrendingUp, TrendingDown, Zap, Globe, ChevronUp, ChevronDown,
} from "lucide-react";

function fmtB(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtM(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

const CHAINS = [
  { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627EEA", tvl: 48_200_000_000, dex: 2_800_000_000, active: 432_000, gas: "18 Gwei", tps: 15, bridge: 280_000_000, change: "+3.2%" },
  { id: "sol", name: "Solana", symbol: "SOL", color: "#9945FF", tvl: 6_800_000_000, dex: 1_200_000_000, active: 1_240_000, gas: "~$0.00025", tps: 2840, bridge: 142_000_000, change: "+8.7%" },
  { id: "base", name: "Base", symbol: "ETH", color: "#0052FF", tvl: 4_100_000_000, dex: 620_000_000, active: 288_000, gas: "0.8 Gwei", tps: 24, bridge: 89_000_000, change: "+12.1%" },
  { id: "bsc", name: "BNB Chain", symbol: "BNB", color: "#F3BA2F", tvl: 5_400_000_000, dex: 980_000_000, active: 890_000, gas: "3 Gwei", tps: 70, bridge: 198_000_000, change: "+1.4%" },
  { id: "arb", name: "Arbitrum", symbol: "ETH", color: "#28A0F0", tvl: 3_200_000_000, dex: 480_000_000, active: 210_000, gas: "0.12 Gwei", tps: 40, bridge: 67_000_000, change: "+2.8%" },
  { id: "sui", name: "SUI", symbol: "SUI", color: "#6FBCF0", tvl: 890_000_000, dex: 142_000_000, active: 148_000, gas: "<$0.001", tps: 297, bridge: 28_000_000, change: "+18.4%" },
  { id: "tron", name: "TRON", symbol: "TRX", color: "#FF0013", tvl: 8_100_000_000, dex: 380_000_000, active: 2_100_000, gas: "~$0.001", tps: 2000, bridge: 920_000_000, change: "-0.8%" },
];

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <motion.div key={i}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: i * 0.04 }}
          className="flex-1 rounded-t-sm origin-bottom"
          style={{ height: `${(v / max) * 100}%`, background: i === data.length - 1 ? color : `${color}60` }} />
      ))}
    </div>
  );
}

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 120, h = 40;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * (h - 4);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad_${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const MOCK_TXN_VOLUME = [42, 38, 51, 48, 62, 58, 74, 69, 82, 78, 91, 88, 95, 102];
const MOCK_ACTIVE = [280, 295, 310, 298, 332, 348, 362, 341, 378, 390, 410, 398, 432, 428];
const MOCK_GAS = [22, 18, 31, 24, 19, 28, 35, 22, 18, 21, 17, 24, 18, 19];
const MOCK_DEX = [1.2, 1.4, 1.1, 1.8, 2.1, 1.9, 2.4, 2.2, 2.8, 2.6, 3.1, 2.9, 2.8, 3.0];

const BRIDGE_FLOWS = [
  { from: "Ethereum", to: "Base", amount: 89_000_000, dir: "out" },
  { from: "Ethereum", to: "Arbitrum", amount: 67_000_000, dir: "out" },
  { from: "BNB Chain", to: "Ethereum", amount: 42_000_000, dir: "in" },
  { from: "Solana", to: "Ethereum", amount: 28_000_000, dir: "in" },
  { from: "TRON", to: "Ethereum", amount: 112_000_000, dir: "in" },
  { from: "Ethereum", to: "SUI", amount: 18_000_000, dir: "out" },
];

const DEX_PROTOCOLS = [
  { name: "Uniswap V3", chain: "ETH", vol: 1_820_000_000, color: "#FF007A" },
  { name: "Raydium", chain: "SOL", vol: 680_000_000, color: "#9945FF" },
  { name: "Aerodrome", chain: "BASE", vol: 420_000_000, color: "#0052FF" },
  { name: "PancakeSwap", chain: "BSC", vol: 380_000_000, color: "#F3BA2F" },
  { name: "GMX", chain: "ARB", vol: 290_000_000, color: "#28A0F0" },
  { name: "Orca", chain: "SOL", vol: 210_000_000, color: "#9945FF" },
];

export default function OnChain() {
  const [activeChain, setActiveChain] = useState("eth");
  const chain = CHAINS.find(c => c.id === activeChain) ?? CHAINS[0];
  const isPos = chain.change.startsWith("+");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#10b981,#0ea5e9)", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}>
              <Network className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#6ee7b7 50%,#10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              On-Chain Analytics
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            Live blockchain metrics across 7 major networks
          </p>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {CHAINS.map(c => (
          <button key={c.id} onClick={() => setActiveChain(c.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={{
              background: activeChain === c.id ? `${c.color}20` : "rgba(255,255,255,0.04)",
              color: activeChain === c.id ? c.color : "#5a6072",
              border: activeChain === c.id ? `1px solid ${c.color}40` : "1px solid rgba(255,255,255,0.06)",
              boxShadow: activeChain === c.id ? `0 0 16px ${c.color}20` : "none",
            }}>
            <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Chain Key Metrics */}
      <motion.div key={activeChain} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Value Locked", value: fmtB(chain.tvl), sub: chain.change, color: chain.color, icon: Database },
          { label: "DEX Volume 24h", value: fmtB(chain.dex), sub: "Across all DEXes", color: "#26a69a", icon: BarChart2 },
          { label: "Active Addresses", value: fmtM(chain.active), sub: "24h unique wallets", color: "#f7931a", icon: Activity },
          { label: "Avg Gas / Fee", value: chain.gas, sub: `${chain.tps} TPS`, color: "#7c3aed", icon: Zap },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
            </div>
            <div className="text-[16px] font-black" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{card.sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: "Transaction Volume", data: MOCK_TXN_VOLUME, color: chain.color, unit: "B txns" },
          { title: "Active Addresses", data: MOCK_ACTIVE, color: "#26a69a", unit: "K wallets" },
          { title: "Gas Price (Gwei)", data: MOCK_GAS, color: "#f7931a", unit: "Gwei" },
          { title: "DEX Volume ($B)", data: MOCK_DEX, color: "#7c3aed", unit: "$B" },
        ].map(chart => (
          <div key={chart.title} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold" style={{ color: "#d1d4dc" }}>{chart.title}</span>
              <span className="text-[9px]" style={{ color: "#3a4058" }}>14d</span>
            </div>
            <MiniBarChart data={chart.data} color={chart.color} />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-mono" style={{ color: chart.color }}>
                {chart.data[chart.data.length - 1]} {chart.unit}
              </span>
              <div className="flex items-center gap-0.5 text-[9px]"
                style={{ color: chart.data[chart.data.length - 1] > chart.data[chart.data.length - 2] ? "#26a69a" : "#ef5350" }}>
                {chart.data[chart.data.length - 1] > chart.data[chart.data.length - 2]
                  ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                vs prev
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* All Chains Comparison */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <Globe className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
            <span className="text-[12px] font-bold text-white">All Chains — TVL Ranking</span>
          </div>
          <div className="p-4 space-y-3">
            {[...CHAINS].sort((a, b) => b.tvl - a.tvl).map((c, i) => {
              const maxTvl = CHAINS[0].tvl;
              const pct = (c.tvl / Math.max(...CHAINS.map(x => x.tvl))) * 100;
              const pos = c.change.startsWith("+");
              return (
                <div key={c.id} className="cursor-pointer" onClick={() => setActiveChain(c.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono w-4" style={{ color: "#3a4058" }}>#{i + 1}</span>
                      <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      <span className="text-[11px] font-bold text-white">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono" style={{ color: pos ? "#26a69a" : "#ef5350" }}>{c.change}</span>
                      <span className="text-[11px] font-black" style={{ color: c.color }}>{fmtB(c.tvl)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06 }}
                      style={{ background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Bridge Flows */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Bridge Flows (24h)</span>
            </div>
            <div className="space-y-2">
              {BRIDGE_FLOWS.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <span className="text-[10px] font-semibold" style={{ color: "#d1d4dc", width: 80 }}>{b.from}</span>
                  <ArrowRightLeft className="h-3 w-3 shrink-0" style={{ color: "#3a4058" }} />
                  <span className="text-[10px] font-semibold flex-1" style={{ color: "#d1d4dc" }}>{b.to}</span>
                  <span className="text-[10px] font-black" style={{ color: b.dir === "in" ? "#26a69a" : "#ef5350" }}>
                    {b.dir === "in" ? "+" : "-"}{fmtB(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top DEX Protocols */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-3.5 w-3.5" style={{ color: "#2962ff" }} />
              <span className="text-[12px] font-bold text-white">Top DEX Protocols</span>
            </div>
            <div className="space-y-2">
              {DEX_PROTOCOLS.map((d, i) => {
                const max = DEX_PROTOCOLS[0].vol;
                const pct = (d.vol / max) * 100;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-white">{d.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md font-mono"
                          style={{ background: `${d.color}15`, color: d.color }}>{d.chain}</span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "#d1d4dc" }}>{fmtB(d.vol)}</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        style={{ background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
