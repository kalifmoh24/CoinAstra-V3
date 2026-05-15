import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ScanLine, Filter, Zap, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  RefreshCw, Star, BarChart2, Activity, ChevronDown, ChevronUp,
  Flame, Target, Shield, Eye, Loader2,
} from "lucide-react";
import { useLiveCoins250 } from "@/hooks/use-market-data";
import { analyzeToken } from "@/lib/ai-engine";

function fmtPrice(n: number) {
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function fmtLarge(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

const SIGNAL_COLORS: Record<string, string> = {
  "STRONG BUY": "#26a69a", BUY: "#26a69a", HOLD: "#f7931a", WATCH: "#f7931a",
  SELL: "#ef5350", "STRONG SELL": "#ef5350",
};

const MEME_IDS = new Set(["dogecoin","shiba-inu","pepe","bonk","floki","dogwifhat","brett","mog-coin","book-of-meme","popcat"]);

type SortKey = "aiScore" | "ch24" | "ch7d" | "volumeSpike" | "momentum" | "conf" | "mcap";

const PRESETS = [
  { id: "vol", label: "Volume Spikes", icon: Activity, color: "#f7931a", desc: "Coins with 3×+ volume surge" },
  { id: "momentum", label: "Momentum", icon: TrendingUp, color: "#26a69a", desc: "High momentum score >60" },
  { id: "meme", label: "Meme Pumps", icon: Flame, color: "#ef5350", desc: "Meme coins with price spike" },
  { id: "smart", label: "Smart Money", icon: Star, color: "#7c3aed", desc: "Smart money accumulating" },
  { id: "gem", label: "AI Gems", icon: Zap, color: "#2962ff", desc: "AI score >80, mid/small cap" },
];

export default function Screener() {
  const [sortKey, setSortKey] = useState<SortKey>("aiScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [minMcap, setMinMcap] = useState(0);
  const [preset, setPreset] = useState<string | null>(null);
  const [minVolSpike, setMinVolSpike] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data: rawCoins, isLoading, isError } = useLiveCoins250();

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const coins = useMemo(() => {
    if (!rawCoins?.length) return [];
    return rawCoins.map(c => {
      const ai = analyzeToken({
        priceChange24h: c.price_change_percentage_24h ?? 0,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? 0,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        price: c.current_price,
        symbol: c.symbol.toUpperCase(),
      });
      const volSpike = c.market_cap > 0 ? (c.total_volume / c.market_cap) * 10 : 1;
      const signalLabel = ai.signal === "STRONG_BUY" ? "STRONG BUY"
        : ai.signal === "BUY" ? "BUY"
        : ai.signal === "HOLD" ? "HOLD"
        : ai.signal === "SELL" ? "SELL"
        : "STRONG SELL";
      const smartLabel = ai.smartMoney === "ACCUMULATING" ? "ACC"
        : ai.smartMoney === "DISTRIBUTING" ? "DIS" : "NEU";
      const riskScore = ai.bearishProbability;
      const risk = riskScore > 55 ? "HIGH" : riskScore > 38 ? "MEDIUM" : "LOW";
      return {
        id: c.id,
        coin: c.symbol.toUpperCase(),
        name: c.name,
        image: c.image,
        price: c.current_price,
        ch24: c.price_change_percentage_24h ?? 0,
        ch7d: c.price_change_percentage_7d_in_currency ?? 0,
        mcap: c.market_cap,
        vol: c.total_volume,
        aiScore: ai.confidence,
        signal: signalLabel,
        volumeSpike: Math.round(volSpike * 10) / 10,
        momentum: ai.momentumScore,
        risk,
        smartMoney: smartLabel,
        conf: ai.confidence,
        isMeme: MEME_IDS.has(c.id),
      };
    });
  }, [rawCoins]);

  const filtered = useMemo(() => {
    let list = [...coins];
    if (minMcap > 0) list = list.filter(c => c.mcap >= minMcap);
    if (minVolSpike > 0) list = list.filter(c => c.volumeSpike >= minVolSpike);
    if (preset === "vol") list = list.filter(c => c.volumeSpike >= 3);
    if (preset === "momentum") list = list.filter(c => c.momentum >= 50);
    if (preset === "meme") list = list.filter(c => c.isMeme);
    if (preset === "smart") list = list.filter(c => c.smartMoney === "ACC");
    if (preset === "gem") list = list.filter(c => c.aiScore >= 75 && c.mcap < 10_000_000_000);
    list.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [coins, minMcap, minVolSpike, preset, sortKey, sortDir]);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)}
      className="flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors"
      style={{ color: sortKey === k ? "#f7931a" : "#3a4058" }}>
      {label}
      {sortKey === k ? (sortDir === "desc" ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />) : <ArrowDown className="h-2.5 w-2.5 opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#4d7fff)", boxShadow: "0 0 16px rgba(41,98,255,0.4)" }}>
              <ScanLine className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#93c5fd 50%,#2962ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Screener
            </h1>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#2962ff" }} />}
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {filtered.length} coins · AI-scored from {coins.length} live markets · updates every 30s
          </p>
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.3)" }}>
          <Filter className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(preset === p.id ? null : p.id)}
            className="flex items-center gap-1.5 px-3 h-7 rounded-xl text-[10px] font-semibold transition-all"
            style={{
              background: preset === p.id ? `${p.color}25` : "rgba(255,255,255,0.03)",
              color: preset === p.id ? p.color : "#5a6072",
              border: `1px solid ${preset === p.id ? p.color + "50" : "rgba(255,255,255,0.06)"}`,
            }}>
            <p.icon className="h-3 w-3" /> {p.label}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(41,98,255,0.2)" }}>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#4a5068" }}>Min Market Cap</label>
                <select value={minMcap} onChange={e => setMinMcap(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <option value={0}>All</option>
                  <option value={100_000_000}>$100M+</option>
                  <option value={500_000_000}>$500M+</option>
                  <option value={1_000_000_000}>$1B+</option>
                  <option value={10_000_000_000}>$10B+</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#4a5068" }}>Min Vol/MCap</label>
                <select value={minVolSpike} onChange={e => setMinVolSpike(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <option value={0}>Any</option>
                  <option value={1}>1×+</option>
                  <option value={2}>2×+</option>
                  <option value={3}>3×+</option>
                  <option value={5}>5×+</option>
                </select>
              </div>
              <div className="col-span-2 flex items-end">
                <button onClick={() => { setMinMcap(0); setMinVolSpike(0); setPreset(null); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/5"
                  style={{ color: "#5a6072", border: "1px solid rgba(255,255,255,0.06)" }}>
                  Reset Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Screened", value: filtered.length.toString(), color: "#2962ff" },
          { label: "BUY Signals", value: filtered.filter(c => c.signal.includes("BUY")).length.toString(), color: "#26a69a" },
          { label: "Avg AI Score", value: filtered.length ? Math.round(filtered.reduce((a,c) => a+c.aiScore, 0)/filtered.length).toString() : "—", color: "#7c3aed" },
          { label: "Volume Spikes", value: filtered.filter(c => c.volumeSpike >= 3).length.toString(), color: "#f7931a" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#4a5068" }}>{s.label}</div>
            <div className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Coin table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <th className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>#</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Coin</th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="ch24" label="24h" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="ch7d" label="7d" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="mcap" label="Mcap" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="volumeSpike" label="Vol/Mcap" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="momentum" label="Momentum" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn k="aiScore" label="AI Score" /></th>
                <th className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {isError && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[12px]" style={{ color: "#5a6072" }}>Failed to load market data. Retrying...</td></tr>
              )}
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 rounded-md animate-pulse" style={{ background: "rgba(255,255,255,0.05)", width: j === 1 ? 80 : 40 }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && filtered.slice(0, 100).map((coin, i) => (
                <motion.tr key={coin.id} layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(41,98,255,0.04)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px]" style={{ color: "#3a4058" }}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/research/${coin.coin}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      {coin.image && <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                      <div>
                        <div className="text-[12px] font-black text-white">{coin.coin}</div>
                        <div className="text-[9px] truncate max-w-[80px]" style={{ color: "#4a5068" }}>{coin.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5" style={{ color: coin.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                      {coin.ch24 >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-[11px] font-bold tabular-nums">{Math.abs(coin.ch24).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: coin.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                      {coin.ch7d >= 0 ? "+" : ""}{coin.ch7d.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] tabular-nums text-white">{fmtLarge(coin.mcap)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: coin.volumeSpike >= 3 ? "#f7931a" : "#a0a8bc" }}>
                      {coin.volumeSpike.toFixed(1)}×
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, Math.max(0, (coin.momentum + 100) / 2))}%`,
                          background: coin.momentum > 30 ? "linear-gradient(90deg,#26a69a,#4dd0c5)" : coin.momentum < -30 ? "linear-gradient(90deg,#ef5350,#ff8a80)" : "rgba(255,255,255,0.2)",
                        }} />
                      </div>
                      <span className="text-[9px] font-bold" style={{ color: coin.momentum > 0 ? "#26a69a" : "#ef5350" }}>
                        {coin.momentum > 0 ? "+" : ""}{coin.momentum}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${coin.aiScore}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                      </div>
                      <span className="text-[10px] font-black" style={{ color: "#a78bfa" }}>{coin.aiScore}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                      style={{ background: `${SIGNAL_COLORS[coin.signal] ?? "#5a6072"}18`, color: SIGNAL_COLORS[coin.signal] ?? "#5a6072", border: `1px solid ${SIGNAL_COLORS[coin.signal] ?? "#5a6072"}30` }}>
                      {coin.signal}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
