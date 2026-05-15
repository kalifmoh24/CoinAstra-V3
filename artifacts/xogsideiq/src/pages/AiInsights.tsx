import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
  ArrowUp, ArrowDown, ChevronRight, RefreshCw, Star, BarChart2,
  Activity, Eye, Flame, Loader2,
} from "lucide-react";
import { useLiveCoins } from "@/hooks/use-market-data";
import { analyzeToken } from "@/lib/ai-engine";
import type { AiAnalysis } from "@/lib/ai-engine";

interface CoinInsight {
  id: string;
  coin: string;
  name: string;
  image: string;
  price: number;
  ch24: number;
  ch7d: number;
  mcap: number;
  vol: number;
  ai: AiAnalysis;
}

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

const SENTIMENT_COLORS: Record<string, string> = {
  VERY_BULLISH: "#26a69a", BULLISH: "#26a69a", NEUTRAL: "#f7931a",
  BEARISH: "#ef5350", VERY_BEARISH: "#ef5350",
};
const SENTIMENT_LABELS: Record<string, string> = {
  VERY_BULLISH: "Very Bullish", BULLISH: "Bullish", NEUTRAL: "Neutral",
  BEARISH: "Bearish", VERY_BEARISH: "Very Bearish",
};

const NARRATIVES = [
  { id: "ai-agents", label: "AI Agents", color: "#7c3aed", coins: ["render-token","fetch-ai","singularitynet","bittensor","akash-network"] },
  { id: "l2", label: "L2 Scaling", color: "#2962ff", coins: ["matic-network","arbitrum","optimism","starknet","zksync"] },
  { id: "depin", label: "DePIN", color: "#f7931a", coins: ["helium","render-token","akash-network","filecoin","theta-network"] },
  { id: "rwa", label: "Real World Assets", color: "#26a69a", coins: ["ondo-finance","mantra-dao","clearpool","maple","centrifuge"] },
  { id: "meme", label: "Meme Season", color: "#ef5350", coins: ["dogecoin","shiba-inu","pepe","bonk","floki","dogwifhat"] },
];

export default function AiInsights() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"predictions" | "narratives" | "alerts">("predictions");
  const [sentimentFilter, setSentimentFilter] = useState<string>("ALL");

  const { data: liveCoins, isLoading, dataUpdatedAt } = useLiveCoins(1, 100);

  const insights: CoinInsight[] = useMemo(() => {
    if (!liveCoins?.length) return [];
    return liveCoins.map(c => ({
      id: c.id,
      coin: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      ch24: c.price_change_percentage_24h ?? 0,
      ch7d: c.price_change_percentage_7d_in_currency ?? 0,
      mcap: c.market_cap,
      vol: c.total_volume,
      ai: analyzeToken({
        priceChange24h: c.price_change_percentage_24h ?? 0,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? 0,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        price: c.current_price,
        symbol: c.symbol.toUpperCase(),
      }),
    }));
  }, [liveCoins]);

  const filtered = useMemo(() => {
    if (sentimentFilter === "ALL") return insights;
    return insights.filter(c => c.ai.sentiment === sentimentFilter);
  }, [insights, sentimentFilter]);

  const topBullish = useMemo(() =>
    [...insights].sort((a, b) => b.ai.bullishProbability - a.ai.bullishProbability).slice(0, 5),
    [insights]);

  const topSmart = useMemo(() =>
    [...insights].filter(c => c.ai.smartMoney === "ACCUMULATING").slice(0, 5),
    [insights]);

  const aiAlerts = useMemo(() =>
    insights.filter(c => Math.abs(c.ch24) > 5 || c.ai.whaleActivity === "EXTREME" || c.ai.whaleActivity === "HIGH").slice(0, 8),
    [insights]);

  const narrativeData = useMemo(() =>
    NARRATIVES.map(n => {
      const members = insights.filter(c => n.coins.includes(c.id));
      const avgBull = members.length ? Math.round(members.reduce((a, c) => a + c.ai.bullishProbability, 0) / members.length) : 50;
      const avgCh24 = members.length ? members.reduce((a, c) => a + c.ch24, 0) / members.length : 0;
      return { ...n, members, avgBull, avgCh24 };
    }),
    [insights]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#ddd6fe 50%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Insights
            </h1>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#7c3aed" }} />}
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            AI analysis on {insights.length} live coins · updated {lastUpdated}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px]" style={{ color: "#3a4058" }}>
          <RefreshCw className="h-3 w-3" /> Auto-refreshes every 30s
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Bullish Signals", value: insights.filter(c => c.ai.sentiment === "BULLISH" || c.ai.sentiment === "VERY_BULLISH").length.toString(), color: "#26a69a", icon: TrendingUp },
          { label: "Bearish Signals", value: insights.filter(c => c.ai.sentiment === "BEARISH" || c.ai.sentiment === "VERY_BEARISH").length.toString(), color: "#ef5350", icon: TrendingDown },
          { label: "Smart Accum.", value: insights.filter(c => c.ai.smartMoney === "ACCUMULATING").length.toString(), color: "#7c3aed", icon: Star },
          { label: "Whale Active", value: insights.filter(c => c.ai.whaleActivity === "HIGH" || c.ai.whaleActivity === "EXTREME").length.toString(), color: "#f7931a", icon: Activity },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
            </div>
            <div className="text-[20px] font-black" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-0.5" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
        {[
          { id: "predictions", label: "AI Predictions", icon: Brain },
          { id: "narratives", label: "Narratives", icon: Flame },
          { id: "alerts", label: "AI Alerts", icon: Zap },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: tab === t.id ? "rgba(124,58,237,0.25)" : "transparent", color: tab === t.id ? "#a78bfa" : "#5a6072" }}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Predictions tab */}
      {tab === "predictions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {["ALL", "VERY_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "VERY_BEARISH"].map(s => (
              <button key={s} onClick={() => setSentimentFilter(s)}
                className="px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                style={{
                  background: sentimentFilter === s ? `${SENTIMENT_COLORS[s] ?? "#7c3aed"}25` : "rgba(255,255,255,0.03)",
                  color: sentimentFilter === s ? (SENTIMENT_COLORS[s] ?? "#a78bfa") : "#5a6072",
                  border: `1px solid ${sentimentFilter === s ? (SENTIMENT_COLORS[s] ?? "#7c3aed") + "40" : "rgba(255,255,255,0.06)"}`,
                }}>
                {s === "ALL" ? "All" : SENTIMENT_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Predictions grid */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(isLoading ? Array.from({ length: 6 }) : filtered.slice(0, 18)).map((item, i) => {
                if (!item) {
                  return (
                    <div key={i} className="rounded-2xl p-4 animate-pulse"
                      style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)", height: 160 }} />
                  );
                }
                const c = item as CoinInsight;
                const sentColor = SENTIMENT_COLORS[c.ai.sentiment] ?? "#5a6072";
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.5) }}
                    className="rounded-2xl p-4 transition-all cursor-pointer"
                    style={{ background: "rgba(13,17,26,0.85)", border: `1px solid rgba(255,255,255,0.06)` }}
                    onClick={() => setLocation(`/research/${c.coin}`)}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${sentColor}30`}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"}>
                    <div className="flex items-center gap-2 mb-3">
                      {c.image && <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-black text-white">{c.coin}</div>
                        <div className="text-[9px] truncate" style={{ color: "#4a5068" }}>{c.name}</div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: `${sentColor}18`, color: sentColor }}>
                        {SENTIMENT_LABELS[c.ai.sentiment]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-[12px] font-bold text-white">{fmtPrice(c.price)}</span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: c.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                        {c.ch24 >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                        {Math.abs(c.ch24).toFixed(1)}%
                      </span>
                    </div>

                    {/* Bull/Bear bars */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] w-8" style={{ color: "#26a69a" }}>Bull</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full" style={{ width: `${c.ai.bullishProbability}%`, background: "linear-gradient(90deg,#26a69a,#4dd0c5)" }} />
                        </div>
                        <span className="text-[9px] w-7 text-right font-bold" style={{ color: "#26a69a" }}>{c.ai.bullishProbability}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] w-8" style={{ color: "#ef5350" }}>Bear</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full" style={{ width: `${c.ai.bearishProbability}%`, background: "linear-gradient(90deg,#ef5350,#ff6b6b)" }} />
                        </div>
                        <span className="text-[9px] w-7 text-right font-bold" style={{ color: "#ef5350" }}>{c.ai.bearishProbability}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px]">
                      <span style={{ color: c.ai.smartMoney === "ACCUMULATING" ? "#7c3aed" : c.ai.smartMoney === "DISTRIBUTING" ? "#ef5350" : "#5a6072" }}>
                        Smart: {c.ai.smartMoney.charAt(0) + c.ai.smartMoney.slice(1).toLowerCase()}
                      </span>
                      <span style={{ color: "#5a6072" }}>Conf: <strong style={{ color: "#a78bfa" }}>{c.ai.confidence}%</strong></span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Smart money sidebar section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
                <span className="text-[12px] font-bold text-white">Top Bullish</span>
              </div>
              <div className="space-y-2">
                {topBullish.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-[9px] w-4" style={{ color: "#3a4058" }}>{i + 1}</span>
                    {c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" />}
                    <span className="text-[11px] font-bold text-white flex-1">{c.coin}</span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.ai.bullishProbability}%`, background: "#26a69a" }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: "#26a69a" }}>{c.ai.bullishProbability}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
                <span className="text-[12px] font-bold text-white">Smart Money Accumulating</span>
              </div>
              <div className="space-y-2">
                {topSmart.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-[9px] w-4" style={{ color: "#3a4058" }}>{i + 1}</span>
                    {c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" />}
                    <span className="text-[11px] font-bold text-white flex-1">{c.coin}</span>
                    <span className="text-[10px] font-bold" style={{ color: c.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                      {c.ch24 >= 0 ? "+" : ""}{c.ch24.toFixed(1)}%
                    </span>
                  </div>
                ))}
                {topSmart.length === 0 && <p className="text-[11px]" style={{ color: "#5a6072" }}>Loading...</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Narratives tab */}
      {tab === "narratives" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {narrativeData.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: n.color }} />
                  <span className="text-[14px] font-black text-white">{n.label}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: `${n.color}18`, color: n.color }}>
                  {n.avgBull}% Bull
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: `${n.avgBull}%`, background: n.color }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: n.avgCh24 >= 0 ? "#26a69a" : "#ef5350" }}>
                  {n.avgCh24 >= 0 ? "+" : ""}{n.avgCh24.toFixed(1)}% avg
                </span>
              </div>
              {n.members.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {n.members.slice(0, 5).map(c => (
                    <span key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "#a0a8bc", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {c.image && <img src={c.image} alt="" className="w-3 h-3 rounded-full" />}
                      {c.coin}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {n.coins.slice(0, 5).map(id => (
                    <span key={id} className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "#5a6072", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {id.split("-")[0].toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] mt-3" style={{ color: "#5a6072" }}>
                {n.members.length} tracked · avg confidence {n.members.length ? Math.round(n.members.reduce((a, c) => a + c.ai.confidence, 0) / n.members.length) : "—"}%
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Alerts tab */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "rgba(13,17,26,0.85)", height: 80 }} />
            ))
          ) : aiAlerts.map((c, i) => {
            const isWhale = c.ai.whaleActivity === "EXTREME" || c.ai.whaleActivity === "HIGH";
            const isBigMove = Math.abs(c.ch24) > 5;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "rgba(13,17,26,0.85)", border: `1px solid ${isWhale ? "rgba(124,58,237,0.3)" : isBigMove && c.ch24 > 0 ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)"}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isWhale ? "rgba(124,58,237,0.15)" : isBigMove && c.ch24 > 0 ? "rgba(38,166,154,0.15)" : "rgba(239,83,80,0.15)" }}>
                  {isWhale ? <Activity className="h-4 w-4" style={{ color: "#7c3aed" }} /> :
                    isBigMove && c.ch24 > 0 ? <TrendingUp className="h-4 w-4" style={{ color: "#26a69a" }} /> :
                    <AlertTriangle className="h-4 w-4" style={{ color: "#ef5350" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}
                    <span className="text-[13px] font-bold text-white">{c.coin}</span>
                    <span className="text-[10px] font-bold" style={{ color: c.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                      {c.ch24 >= 0 ? "▲" : "▼"} {Math.abs(c.ch24).toFixed(1)}% today
                    </span>
                    {isWhale && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>Whale {c.ai.whaleActivity}</span>}
                  </div>
                  <p className="text-[11px]" style={{ color: "#5a6072" }}>
                    {isWhale ? `Unusual whale activity detected — ${c.ai.whaleActivity.toLowerCase()} volume surge. Smart money: ${c.ai.smartMoney.toLowerCase()}.` :
                      c.ch24 > 0 ? `Strong upward momentum (+${c.ch24.toFixed(1)}% today). AI signal: ${c.ai.signal.replace("_", " ")}.` :
                      `Significant decline (${c.ch24.toFixed(1)}% today). Monitor for reversal or continuation.`}
                  </p>
                </div>
                <span className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-lg"
                  style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>
                  {c.ai.confidence}% conf
                </span>
              </motion.div>
            );
          })}
          {!isLoading && aiAlerts.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: "#7c3aed" }} />
              <p className="text-[12px]" style={{ color: "#5a6072" }}>Market is calm — no major AI alerts right now</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
