import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waves, ArrowRightLeft, ArrowDown, ArrowUp, ExternalLink, Eye,
  Filter, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Zap,
  Building2, Wallet, Clock, Star,
} from "lucide-react";

function fmtUSD(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

const TXNS = [
  { id: "t1", coin: "BTC", amount: 42.5, usd: 2_866_000, from: "0x3a8fD22e...d92c", to: "Binance", type: "EXCHANGE_IN", fromLabel: "Unknown Whale", toLabel: "Binance", bullish: false, age: "2m" },
  { id: "t2", coin: "ETH", amount: 8420, usd: 27_350_000, from: "0xb1c9F7...3398", to: "0x4a2eD8...7Fbc", type: "TRANSFER", fromLabel: "Jump Trading", toLabel: "Cold Wallet", bullish: true, age: "5m" },
  { id: "t3", coin: "SOL", amount: 215_000, usd: 38_320_000, from: "Coinbase", to: "0x9c38A1...2244", type: "EXCHANGE_OUT", fromLabel: "Coinbase", toLabel: "Unknown Whale", bullish: true, age: "9m" },
  { id: "t4", coin: "USDT", amount: 50_000_000, usd: 50_000_000, from: "Tether Treasury", to: "Binance", type: "MINT", fromLabel: "Tether Treasury", toLabel: "Binance", bullish: true, age: "12m" },
  { id: "t5", coin: "BTC", amount: 18.2, usd: 1_228_000, from: "0xF2a7b3...a91e", to: "OKX", type: "EXCHANGE_IN", fromLabel: "Dormant Wallet", toLabel: "OKX", bullish: false, age: "17m" },
  { id: "t6", coin: "ETH", amount: 12_000, usd: 38_985_600, from: "0xd4e89A...cc12", to: "0x7b9cFa...8823", type: "TRANSFER", fromLabel: "Paradigm", toLabel: "DeFi Protocol", bullish: true, age: "21m" },
  { id: "t7", coin: "LINK", amount: 1_200_000, usd: 18_720_000, from: "0xA3d9Bc...1144", to: "Upbit", type: "EXCHANGE_IN", fromLabel: "Smart Money", toLabel: "Upbit", bullish: false, age: "28m" },
  { id: "t8", coin: "SOL", amount: 85_000, usd: 15_130_000, from: "Kraken", to: "0xc8f4E2...6677", type: "EXCHANGE_OUT", fromLabel: "Kraken", toLabel: "New Wallet", bullish: true, age: "34m" },
  { id: "t9", coin: "AVAX", amount: 420_000, usd: 16_044_000, from: "0x2b3aD9...9fF1", to: "Binance", type: "EXCHANGE_IN", fromLabel: "VC Wallet", toLabel: "Binance", bullish: false, age: "41m" },
  { id: "t10", coin: "BTC", amount: 105, usd: 7_085_550, from: "0x8e2bA4...33cc", to: "0x1f9dC3...7823", type: "TRANSFER", fromLabel: "Long-term Holder", toLabel: "Cold Storage", bullish: true, age: "52m" },
];

const SMART_MONEY = [
  { label: "Alameda Research Remnant", addr: "0x3a8f...d92c", pnl: "+$42.1M", pct: "+384%", pos: true, last: "Bought SOL", color: "#26a69a" },
  { label: "Jump Crypto", addr: "0xb1c9...3398", pnl: "+$18.5M", pct: "+124%", pos: true, last: "Bought ETH", color: "#2962ff" },
  { label: "DRW Cumberland", addr: "0x9c38...2244", pnl: "+$8.9M", pct: "+67%", pos: true, last: "Bought BTC", color: "#7c3aed" },
  { label: "Paradigm Fund", addr: "0xd4e8...cc12", pnl: "+$31.2M", pct: "+218%", pos: true, last: "Bought LINK", color: "#f7931a" },
  { label: "Unknown Whale A", addr: "0xF2a7...a91e", pnl: "-$2.1M", pct: "-12%", pos: false, last: "Sold BTC", color: "#ef5350" },
];

const ACCUM_COINS = [
  { coin: "SOL", net: "+$38.3M", whales: 12, pressure: 82, trending: true },
  { coin: "BTC", net: "+$22.1M", whales: 28, pressure: 74, trending: false },
  { coin: "ETH", net: "+$15.7M", whales: 19, pressure: 68, trending: false },
  { coin: "LINK", net: "+$8.4M", whales: 7, pressure: 61, trending: true },
  { coin: "AVAX", net: "-$5.2M", whales: 4, pressure: 31, trending: false },
];

type TxType = "ALL" | "EXCHANGE_IN" | "EXCHANGE_OUT" | "TRANSFER" | "MINT";

export default function WhaleTracker() {
  const [filter, setFilter] = useState<TxType>("ALL");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => { setPulse(p => !p); }, 2000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === "ALL" ? TXNS : TXNS.filter(t => t.type === filter);

  const txTypeColor = (type: string) => {
    if (type === "EXCHANGE_IN") return "#ef5350";
    if (type === "EXCHANGE_OUT") return "#26a69a";
    if (type === "MINT") return "#7c3aed";
    return "#5a6072";
  };
  const txTypeLabel = (type: string) => {
    if (type === "EXCHANGE_IN") return "→ Exchange";
    if (type === "EXCHANGE_OUT") return "← Exchange";
    if (type === "MINT") return "MINT";
    return "Transfer";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#2962ff)", boxShadow: "0 0 16px rgba(14,165,233,0.4)" }}>
              <Waves className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#7dd3fc 50%,#0ea5e9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Whale Tracker
            </h1>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "rgba(14,165,233,0.15)", color: "#7dd3fc", border: "1px solid rgba(14,165,233,0.3)" }}>
              <span className={`w-1.5 h-1.5 rounded-full bg-[#0ea5e9] ${pulse ? "opacity-100" : "opacity-40"}`} />
              LIVE
            </div>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            Real-time whale transactions &gt;$1M · 10 chains monitored
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "24h Whale Volume", value: "$2.14B", sub: "↑ 28% vs yesterday", color: "#0ea5e9", icon: Waves },
          { label: "Buy Pressure", value: "68%", sub: "32% sell pressure", color: "#26a69a", icon: TrendingUp },
          { label: "Exchange Inflow", value: "$482M", sub: "↑ bearish signal", color: "#ef5350", icon: Building2 },
          { label: "Smart Money Net", value: "+$124M", sub: "Accumulating", color: "#7c3aed", icon: Zap },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{s.label}</span>
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
            </div>
            <div className="text-[16px] font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transactions Feed */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "#5a6072" }}>
              <Filter className="h-3 w-3" /> Filter:
            </span>
            {(["ALL", "EXCHANGE_OUT", "EXCHANGE_IN", "TRANSFER", "MINT"] as TxType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: filter === f ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
                  color: filter === f ? "#7dd3fc" : "#5a6072",
                  border: filter === f ? "1px solid rgba(14,165,233,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {f === "ALL" ? "All" : f === "EXCHANGE_IN" ? "→ Exchange" : f === "EXCHANGE_OUT" ? "← Exchange" : f === "MINT" ? "Mint" : "Transfer"}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-[#0ea5e9] ${pulse ? "opacity-100" : "opacity-40"}`} />
                <span className="text-[12px] font-bold text-white">Live Whale Transactions</span>
              </div>
              <span className="text-[10px]" style={{ color: "#3a4058" }}>{filtered.length} transactions</span>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
              <AnimatePresence>
                {filtered.map((tx, i) => (
                  <motion.div key={tx.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(14,165,233,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
                    {/* Coin badge */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px]"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#d1d4dc" }}>
                      {tx.coin.slice(0, 3)}
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-white">{tx.fromLabel}</span>
                        <ArrowRightLeft className="h-3 w-3 shrink-0" style={{ color: "#3a4058" }} />
                        <span className="text-[11px] font-bold" style={{ color: "#d1d4dc" }}>{tx.toLabel}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black"
                          style={{ background: `${txTypeColor(tx.type)}18`, color: txTypeColor(tx.type) }}>
                          {txTypeLabel(tx.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono" style={{ color: "#4a5068" }}>
                          {shortAddr(tx.from)} → {tx.to.length > 10 ? tx.to : shortAddr(tx.to)}
                        </span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-black text-white font-mono">{fmtUSD(tx.usd)}</div>
                      <div className="text-[9px] font-mono" style={{ color: "#4a5068" }}>
                        {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tx.coin}
                      </div>
                    </div>
                    {/* Age */}
                    <div className="flex items-center gap-1 shrink-0" style={{ color: "#3a4058" }}>
                      <Clock className="h-3 w-3" />
                      <span className="text-[9px] font-mono">{tx.age}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-30 hover:opacity-70 transition-opacity" style={{ color: "#5a6072" }} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Whale Accumulation */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
              <span className="text-[12px] font-bold text-white">Whale Accumulation</span>
            </div>
            <div className="space-y-3">
              {ACCUM_COINS.map((c, i) => {
                const pos = c.net.startsWith("+");
                return (
                  <div key={c.coin}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-white w-10">{c.coin}</span>
                        {c.trending && <Zap className="h-3 w-3" style={{ color: "#f7931a" }} />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px]" style={{ color: "#4a5068" }}>{c.whales} whales</span>
                        <span className="text-[10px] font-bold" style={{ color: pos ? "#26a69a" : "#ef5350" }}>{c.net}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${c.pressure}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }}
                        style={{ background: pos ? "linear-gradient(90deg,#26a69a,#4dd0c5)" : "linear-gradient(90deg,#ef5350,#ff8a80)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Money Wallets */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-3.5 w-3.5" style={{ color: "#f7931a", fill: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Smart Money</span>
            </div>
            <div className="space-y-3">
              {SMART_MONEY.map((w) => (
                <div key={w.addr} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white truncate">{w.label}</span>
                    <span className="text-[10px] font-black" style={{ color: w.pos ? "#26a69a" : "#ef5350" }}>{w.pnl}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono" style={{ color: "#4a5068" }}>{w.addr}</span>
                    <span className="text-[9px]" style={{ color: "#787b86" }}>{w.last}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
