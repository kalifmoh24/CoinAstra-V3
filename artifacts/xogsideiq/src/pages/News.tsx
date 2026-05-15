import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper, TrendingUp, TrendingDown, Minus, Flame, Clock, ExternalLink,
  MessageSquare, Hash, Zap, AlertTriangle, ChevronRight, BarChart2, Star,
} from "lucide-react";

const NEWS_ITEMS = [
  {
    id: 1, title: "BlackRock Bitcoin ETF Sees Record $842M Single-Day Inflow",
    source: "Bloomberg", time: "12m ago", category: "ETF", sentiment: "BULLISH", sentScore: 92,
    coins: ["BTC"], impact: "HIGH",
    summary: "BlackRock's IBIT recorded its largest single-day inflow since launch, pushing total AUM past $18B. Institutional demand continues to accelerate as ETF products gain mainstream adoption.",
    reactions: { bull: 847, bear: 42 },
  },
  {
    id: 2, title: "Solana DeFi TVL Hits All-Time High at $7.2B Amid Ecosystem Growth",
    source: "The Block", time: "34m ago", category: "DeFi", sentiment: "BULLISH", sentScore: 88,
    coins: ["SOL"], impact: "HIGH",
    summary: "Solana's DeFi ecosystem reached a new all-time high TVL driven by Kamino, Marinade, and new protocol launches. Daily active users up 28% month-over-month.",
    reactions: { bull: 612, bear: 28 },
  },
  {
    id: 3, title: "SEC Approves Ethereum Spot ETF Options Trading on Major Exchanges",
    source: "CoinDesk", time: "1h ago", category: "Regulation", sentiment: "BULLISH", sentScore: 84,
    coins: ["ETH"], impact: "HIGH",
    summary: "The SEC has approved options trading for spot Ethereum ETFs on NYSE and CBOE, expanding derivatives market access for institutional investors.",
    reactions: { bull: 1240, bear: 187 },
  },
  {
    id: 4, title: "Chainlink Launches CCIP on 5 New Blockchain Networks",
    source: "Decrypt", time: "2h ago", category: "Tech", sentiment: "BULLISH", sentScore: 79,
    coins: ["LINK"], impact: "MEDIUM",
    summary: "Chainlink's Cross-Chain Interoperability Protocol expanded to Avalanche, Arbitrum, Base, Optimism, and BNB Chain, significantly expanding cross-chain messaging capabilities.",
    reactions: { bull: 389, bear: 15 },
  },
  {
    id: 5, title: "Binance Reaches $400M Settlement with DOJ Over Compliance Issues",
    source: "Reuters", time: "3h ago", category: "Regulation", sentiment: "NEUTRAL", sentScore: 48,
    coins: ["BNB"], impact: "MEDIUM",
    summary: "Binance agreed to pay $400M in penalties as part of ongoing compliance upgrades. Exchange operations continue normally; leadership sees resolution as positive for long-term stability.",
    reactions: { bull: 142, bear: 318 },
  },
  {
    id: 6, title: "MicroStrategy Purchases Additional 12,000 BTC for $809M",
    source: "CNBC", time: "4h ago", category: "Institutional", sentiment: "BULLISH", sentScore: 87,
    coins: ["BTC"], impact: "HIGH",
    summary: "MicroStrategy's Michael Saylor announced the firm's latest Bitcoin acquisition, bringing total holdings to over 226,000 BTC valued at approximately $15.2B.",
    reactions: { bull: 2100, bear: 89 },
  },
  {
    id: 7, title: "DOGE Technical Analysis: Distribution Pattern Forming Near Resistance",
    source: "TradingView", time: "5h ago", category: "Technical", sentiment: "BEARISH", sentScore: 28,
    coins: ["DOGE"], impact: "LOW",
    summary: "Multiple technical indicators suggest distribution at the $0.16 resistance zone. Volume declining on rallies; bear divergence on RSI on 4H timeframe.",
    reactions: { bull: 98, bear: 421 },
  },
  {
    id: 8, title: "AI Token Sector Records Best Week Since 2024 Bull Run",
    source: "CryptoPanic", time: "6h ago", category: "Narrative", sentiment: "BULLISH", sentScore: 91,
    coins: ["RNDR","FET","AGIX"], impact: "MEDIUM",
    summary: "The AI/ML cryptocurrency sector gained an average of 12.4% over 7 days, driven by surging GPU demand and new partnerships with traditional tech companies.",
    reactions: { bull: 743, bear: 31 },
  },
];

const SOCIAL_DATA = [
  { platform: "X / Twitter", score: 74, sentiment: "Bullish", change: "+12%", pos: true, color: "#1DA1F2", icon: "𝕏" },
  { platform: "Reddit", score: 68, sentiment: "Bullish", change: "+8%", pos: true, color: "#FF4500", icon: "R" },
  { platform: "Telegram", score: 71, sentiment: "Bullish", change: "+15%", pos: true, color: "#0088CC", icon: "T" },
  { platform: "Discord", score: 62, sentiment: "Neutral", change: "+3%", pos: true, color: "#5865F2", icon: "D" },
];

const TRENDING_TOPICS = [
  { tag: "#Bitcoin", vol: "128K", pos: true, ch: "+24%" },
  { tag: "#Solana", vol: "84K", pos: true, ch: "+18%" },
  { tag: "#ETF", vol: "72K", pos: true, ch: "+31%" },
  { tag: "#AICoins", vol: "61K", pos: true, ch: "+42%" },
  { tag: "#DeFi", vol: "38K", pos: true, ch: "+9%" },
  { tag: "#Regulation", vol: "29K", pos: false, ch: "-4%" },
  { tag: "#Memecoins", vol: "24K", pos: true, ch: "+7%" },
];

const CATEGORIES = ["All", "ETF", "DeFi", "Regulation", "Tech", "Institutional", "Narrative", "Technical"];

const SENTIMENT_COLOR: Record<string, string> = { BULLISH: "#26a69a", NEUTRAL: "#f7931a", BEARISH: "#ef5350" };
const IMPACT_COLOR: Record<string, string> = { HIGH: "#ef5350", MEDIUM: "#f7931a", LOW: "#5a6072" };

function SentimentIcon({ s }: { s: string }) {
  if (s === "BULLISH") return <TrendingUp className="h-3 w-3" />;
  if (s === "BEARISH") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

export default function News() {
  const [category, setCategory] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = category === "All" ? NEWS_ITEMS : NEWS_ITEMS.filter(n => n.category === category);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#7c3aed)", boxShadow: "0 0 16px rgba(14,165,233,0.4)" }}>
              <Newspaper className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#7dd3fc 50%,#0ea5e9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              News & Sentiment
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "rgba(239,83,80,0.15)", color: "#ef9090", border: "1px solid rgba(239,83,80,0.3)" }}>
              <Flame className="h-2.5 w-2.5" /> BREAKING
            </span>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            AI-summarized news · Real-time social sentiment tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: category === cat ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
                  color: category === cat ? "#7dd3fc" : "#5a6072",
                  border: category === cat ? "1px solid rgba(14,165,233,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* News list */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((article, i) => (
                <motion.div key={article.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl overflow-hidden cursor-pointer"
                  style={{ background: "rgba(13,17,26,0.85)", border: `1px solid ${expanded === article.id ? SENTIMENT_COLOR[article.sentiment] + "30" : "rgba(255,255,255,0.06)"}` }}
                  onClick={() => setExpanded(expanded === article.id ? null : article.id)}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Sentiment indicator */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${SENTIMENT_COLOR[article.sentiment]}18` }}>
                        <span style={{ color: SENTIMENT_COLOR[article.sentiment] }}>
                          <SentimentIcon s={article.sentiment} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                          <h3 className="text-[12px] font-bold text-white leading-snug flex-1">{article.title}</h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                              style={{ background: `${IMPACT_COLOR[article.impact]}18`, color: IMPACT_COLOR[article.impact] }}>
                              {article.impact}
                            </span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                              style={{ background: `${SENTIMENT_COLOR[article.sentiment]}18`, color: SENTIMENT_COLOR[article.sentiment] }}>
                              {article.sentiment}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold" style={{ color: "#787b86" }}>{article.source}</span>
                          <Clock className="h-2.5 w-2.5" style={{ color: "#3a4058" }} />
                          <span className="text-[9px] font-mono" style={{ color: "#3a4058" }}>{article.time}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>{article.category}</span>
                          {article.coins.map(c => (
                            <span key={c} className="text-[8px] px-1.5 py-0.5 rounded-md font-mono"
                              style={{ background: "rgba(41,98,255,0.12)", color: "#4d7fff" }}>{c}</span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${expanded === article.id ? "rotate-90" : ""}`} style={{ color: "#3a4058" }} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === article.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <div className="flex items-center gap-1.5 mb-2 mt-3">
                            <Zap className="h-3 w-3" style={{ color: "#7c3aed" }} />
                            <span className="text-[10px] font-bold" style={{ color: "#a78bfa" }}>AI Summary</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                              style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>AUTO-GENERATED</span>
                          </div>
                          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "#9ca3af" }}>{article.summary}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" style={{ color: "#26a69a" }} />
                              <span className="text-[10px] font-semibold" style={{ color: "#26a69a" }}>{article.reactions.bull.toLocaleString()} bullish</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingDown className="h-3 w-3" style={{ color: "#ef5350" }} />
                              <span className="text-[10px] font-semibold" style={{ color: "#ef5350" }}>{article.reactions.bear.toLocaleString()} bearish</span>
                            </div>
                            <a href="#" className="flex items-center gap-1 ml-auto text-[10px]" style={{ color: "#4d7fff" }}>
                              Read full <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                          {/* Sentiment score bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px]" style={{ color: "#4a5068" }}>AI Sentiment Score</span>
                              <span className="text-[10px] font-black" style={{ color: SENTIMENT_COLOR[article.sentiment] }}>{article.sentScore}/100</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <motion.div className="h-full rounded-full"
                                initial={{ width: 0 }} animate={{ width: `${article.sentScore}%` }}
                                style={{ background: SENTIMENT_COLOR[article.sentiment] }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Social + Trending */}
        <div className="space-y-4">
          {/* Social Sentiment */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-3.5 w-3.5" style={{ color: "#0ea5e9" }} />
              <span className="text-[12px] font-bold text-white">Social Sentiment</span>
            </div>
            <div className="space-y-3">
              {SOCIAL_DATA.map((s, i) => (
                <div key={s.platform}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black"
                        style={{ background: `${s.color}20`, color: s.color }}>
                        {s.icon}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>{s.platform}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]" style={{ color: s.pos ? "#26a69a" : "#ef5350" }}>{s.change}</span>
                      <span className="text-[11px] font-black" style={{ color: s.color }}>{s.score}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${s.score}%` }}
                      transition={{ duration: 0.7, delay: i * 0.1 }}
                      style={{ background: s.color }} />
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "#5a6072" }}>{s.sentiment}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Trending Topics</span>
            </div>
            <div className="space-y-2">
              {TRENDING_TOPICS.map((t, i) => (
                <div key={t.tag} className="flex items-center justify-between py-1.5 cursor-pointer rounded-lg px-2 transition-colors hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-4" style={{ color: "#3a4058" }}>#{i + 1}</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#4d7fff" }}>{t.tag}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: "#5a6072" }}>{t.vol}</span>
                    <span className="text-[9px] font-bold" style={{ color: t.pos ? "#26a69a" : "#ef5350" }}>{t.ch}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fear & Greed */}
          <div className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg,rgba(247,147,26,0.1),rgba(239,83,80,0.08))", border: "1px solid rgba(247,147,26,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Market Fear & Greed</span>
            </div>
            <div className="text-center py-2">
              <div className="text-[48px] font-black" style={{ color: "#f7931a" }}>42</div>
              <div className="text-[14px] font-bold" style={{ color: "#f7931a" }}>FEAR</div>
              <div className="text-[10px] mt-1" style={{ color: "#5a6072" }}>Yesterday: 38 · Last week: 45</div>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mt-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: "42%", background: "linear-gradient(90deg,#ef5350,#f7931a)" }} />
            </div>
            <div className="flex justify-between text-[8px] mt-1" style={{ color: "#3a4058" }}>
              <span>Extreme Fear</span><span>Extreme Greed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
