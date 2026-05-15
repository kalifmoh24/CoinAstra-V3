import React from "react";
import { motion } from "framer-motion";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG } from "@/lib/ai-engine";
import type { LiveCoin } from "@/hooks/use-market-data";

function formatPrice(p: number): string {
  if (p >= 1000) return "$" + p.toLocaleString("en", { maximumFractionDigits: 0 });
  if (p >= 1)    return "$" + p.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toFixed(6);
}

function fmtMcap(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}

function MiniSparkline({ coin, height = 32 }: { coin: LiveCoin; height?: number }) {
  const pts = coin.sparkline_in_7d?.price;
  const change = coin.price_change_percentage_24h;
  const color = change >= 0 ? "#26a69a" : "#ef5350";

  if (!pts || pts.length < 4) {
    const synth = Array.from({ length: 7 }, (_, i) => {
      const trend = ((change / 100) / 6) * i * 20;
      const noise = Math.sin(i * 1.7 + coin.market_cap_rank) * 3;
      return 12 - trend + noise;
    });
    const min = Math.min(...synth);
    const max = Math.max(...synth);
    const r = max - min || 1;
    const norm = synth.map(p => ((p - min) / r) * (height - 4) + 2);
    const path = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / 6) * 74 + 3} ${height - y}`).join(" ");
    const area = path + ` L 77 ${height} L 3 ${height} Z`;
    const gid = `sg_${coin.id}`;
    return (
      <svg viewBox={`0 0 80 ${height}`} style={{ width: 52, height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const step = Math.max(1, Math.floor(pts.length / 24));
  const sampled = pts.filter((_, i) => i % step === 0).slice(-24);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const r = max - min || 1;
  const norm = sampled.map(p => ((p - min) / r) * (height - 4) + 2);
  const w = 80;
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (norm.length - 1)) * (w - 6) + 3} ${height - y}`).join(" ");
  const area = path + ` L ${w - 3} ${height} L 3 ${height} Z`;
  const gid = `sp_${coin.id}`;
  return (
    <svg viewBox={`0 0 80 ${height}`} style={{ width: 52, height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface MobileMarketCardProps {
  coin: LiveCoin;
  rank?: number;
  compact?: boolean;
  onPress?: () => void;
}

export function MobileMarketCard({ coin, compact = false, onPress }: MobileMarketCardProps) {
  const change = coin.price_change_percentage_24h ?? 0;
  const isPos = change >= 0;
  const ai = analyzeToken({
    priceChange24h: coin.price_change_percentage_24h,
    priceChange7d: coin.price_change_percentage_7d_in_currency ?? undefined,
    volume24h: coin.total_volume,
    marketCap: coin.market_cap,
    symbol: coin.symbol,
  });

  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={onPress}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span className="text-[11px] font-mono text-[#374060] w-5 text-center shrink-0">{coin.market_cap_rank}</span>
        {coin.image ? (
          <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#1e2438] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {coin.symbol.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</div>
          <div className="text-[10px] text-[#4a5270] mt-0.5 truncate">{coin.name}</div>
        </div>
        <div className="shrink-0">
          <MiniSparkline coin={coin} height={28} />
        </div>
        <div className="text-right shrink-0 min-w-[70px]">
          <div className="text-[13px] font-mono font-bold text-white leading-none">{formatPrice(coin.current_price)}</div>
          <div className="text-[11px] font-bold mt-0.5" style={{ color: isPos ? "#26a69a" : "#ef5350" }}>
            {isPos ? "+" : ""}{change.toFixed(2)}%
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.975 }}
      onClick={onPress}
      className="rounded-2xl p-4 cursor-pointer relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.2)",
      }}
    >
      {/* Gradient accent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${isPos ? "#26a69a" : "#ef5350"}, transparent)`,
          transform: "translate(30%, -30%)",
        }}
      />

      {/* Top row */}
      <div className="flex items-center gap-3 mb-3">
        {coin.image ? (
          <img src={coin.image} alt={coin.symbol} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#1e2438] flex items-center justify-center text-[11px] font-bold text-white">
            {coin.symbol.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</span>
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
              style={{ background: SIGNAL_BG[ai.signal], color: SIGNAL_COLOR[ai.signal] }}
            >
              {ai.signal.replace(/_/g, " ")}
            </span>
          </div>
          <div className="text-[10px] text-[#4a5270] mt-0.5 truncate">{coin.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-mono font-bold text-white leading-none">{formatPrice(coin.current_price)}</div>
          <div className="text-[12px] font-bold mt-1" style={{ color: isPos ? "#26a69a" : "#ef5350" }}>
            {isPos ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Sparkline + stats */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-2">
            <div>
              <div className="text-[9px] text-[#4a5270]">Market Cap</div>
              <div className="text-[10px] font-semibold text-white">{fmtMcap(coin.market_cap)}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#4a5270]">24h Volume</div>
              <div className="text-[10px] font-semibold text-white">{fmtMcap(coin.total_volume)}</div>
            </div>
          </div>
          {/* Bull/Bear bar */}
          <div className="mb-1">
            <div className="flex justify-between text-[9px] mb-0.5">
              <span style={{ color: "#26a69a" }}>Bull {ai.bullishProbability}%</span>
              <span style={{ color: "#ef5350" }}>Bear {ai.bearishProbability}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(239,83,80,0.2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ai.bullishProbability}%`,
                  background: "linear-gradient(90deg, #26a69a, #4ade80)",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#4a5270]">AI Conf</span>
            <span className="text-[9px] font-bold text-[#2962ff]">{ai.confidence}%</span>
          </div>
        </div>
        <div className="shrink-0">
          <MiniSparkline coin={coin} height={40} />
          <div className="text-[9px] text-center mt-0.5 text-[#4a5270]">7D</div>
        </div>
      </div>
    </motion.div>
  );
}

export { MiniSparkline };
