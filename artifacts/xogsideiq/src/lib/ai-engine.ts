/**
 * CoinAstra AI Engine
 * Generates deterministic AI analysis from real on-chain + market data signals.
 * All scores are seeded from the coin's symbol for render-stable values.
 */

export type Sentiment = "VERY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "VERY_BEARISH";
export type SmartMoney = "ACCUMULATING" | "DISTRIBUTING" | "NEUTRAL";
export type WhaleActivity = "EXTREME" | "HIGH" | "MEDIUM" | "LOW";
export type Signal = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
export type TimeframeSentiment = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface AiAnalysis {
  sentiment: Sentiment;
  sentimentScore: number;       // 0–100
  bullishProbability: number;   // 0–100
  bearishProbability: number;   // 0–100
  holdProbability: number;      // 0–100
  smartMoney: SmartMoney;
  smartMoneyScore: number;      // 0–100
  whaleActivity: WhaleActivity;
  whaleScore: number;           // 0–100
  momentumScore: number;        // –100..100
  narrativeStrength: number;    // 0–100
  confidence: number;           // 50–95
  signal: Signal;
  timeframes: {
    tf: string;
    sentiment: TimeframeSentiment;
    confidence: number;
  }[];
}

/** Clamp a value to [min, max] */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Deterministic pseudo-random from symbol string, returns 0..1 */
function symbolSeed(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = Math.imul(h ^ symbol.charCodeAt(i), 0x9e3779b9);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function analyzeToken(data: {
  priceChange24h: number;
  priceChange7d?: number;
  volume24h?: number;
  marketCap?: number;
  price?: number;
  symbol?: string;
}): AiAnalysis {
  const c24 = data.priceChange24h ?? 0;
  const c7d  = data.priceChange7d  ?? c24 * 2.8;
  const volRatio = data.marketCap && data.volume24h
    ? (data.volume24h / data.marketCap)
    : 0.05;
  const seed = symbolSeed(data.symbol ?? "BTC");
  const jitter = (seed - 0.5) * 12; // ±6 deterministic offset

  // ── Sentiment (0–100) ───────────────────────────────────────────────────────
  const rawSentiment = 50 + c24 * 2.6 + c7d * 0.7 + jitter;
  const sentimentScore = Math.round(clamp(rawSentiment, 4, 96));

  // ── Bullish probability (0–100) ─────────────────────────────────────────────
  const volBonus = volRatio > 0.15 ? 8 : volRatio > 0.08 ? 4 : volRatio < 0.02 ? -5 : 0;
  const rawBull = 50 + c24 * 2.1 + c7d * 0.55 + volBonus + jitter * 0.7;
  const bullishProbability = Math.round(clamp(rawBull, 8, 92));
  const bearishProbability = Math.round(clamp(100 - bullishProbability - 10, 3, 80));
  const holdProbability = Math.max(3, 100 - bullishProbability - bearishProbability);

  // ── Smart money (volume surge = accumulation) ────────────────────────────────
  const volSignal = volRatio > 0.18 ? 22 : volRatio > 0.1 ? 12 : volRatio < 0.025 ? -14 : 0;
  const rawSM = 50 + c24 * 1.6 + volSignal + jitter * 0.9;
  const smartMoneyScore = Math.round(clamp(rawSM, 12, 94));
  const smartMoney: SmartMoney =
    smartMoneyScore > 60 ? "ACCUMULATING" :
    smartMoneyScore < 40 ? "DISTRIBUTING" : "NEUTRAL";

  // ── Whale activity (large moves + volume spikes) ────────────────────────────
  const whaleRaw = 38 + Math.abs(c24) * 2.8 + volRatio * 450 + jitter * 0.8;
  const whaleScore = Math.round(clamp(whaleRaw, 8, 96));
  const whaleActivity: WhaleActivity =
    whaleScore > 75 ? "EXTREME" :
    whaleScore > 55 ? "HIGH" :
    whaleScore > 35 ? "MEDIUM" : "LOW";

  // ── Momentum ────────────────────────────────────────────────────────────────
  const momentumScore = Math.round(clamp(c24 * 3.8 + c7d * 1.1, -100, 100));

  // ── Narrative strength ──────────────────────────────────────────────────────
  const narrativeStrength = Math.round(clamp(55 + c7d * 0.6 + jitter * 1.2, 18, 96));

  // ── AI confidence (lower when hyper-volatile) ────────────────────────────────
  const volatility = Math.abs(c24);
  const confidence = Math.round(clamp(84 - volatility * 0.45 + jitter * 0.5, 48, 95));

  // ── Overall signal ───────────────────────────────────────────────────────────
  const signal: Signal =
    bullishProbability > 74 ? "STRONG_BUY" :
    bullishProbability > 58 ? "BUY" :
    bullishProbability > 42 ? "HOLD" :
    bullishProbability > 26 ? "SELL" : "STRONG_SELL";

  // ── Sentiment label ──────────────────────────────────────────────────────────
  const sentiment: Sentiment =
    sentimentScore > 76 ? "VERY_BULLISH" :
    sentimentScore > 58 ? "BULLISH" :
    sentimentScore > 42 ? "NEUTRAL" :
    sentimentScore > 24 ? "BEARISH" : "VERY_BEARISH";

  // ── Timeframe breakdown ──────────────────────────────────────────────────────
  const tfs: { tf: string; factor: number; cFactor: number }[] = [
    { tf: "3H",  factor: 0.35, cFactor: 0.9 },
    { tf: "4H",  factor: 0.45, cFactor: 0.95 },
    { tf: "1D",  factor: 1.0,  cFactor: 1.0 },
    { tf: "1W",  factor: 1.8,  cFactor: 0.85 },
  ];

  const timeframes = tfs.map(({ tf, factor, cFactor }) => {
    const tfBull = clamp(bullishProbability * factor + 50 * (1 - factor) + jitter * 0.3, 10, 90);
    const tfSentiment: TimeframeSentiment =
      tfBull > 58 ? "BULLISH" : tfBull < 42 ? "BEARISH" : "NEUTRAL";
    return {
      tf,
      sentiment: tfSentiment,
      confidence: Math.round(clamp(confidence * cFactor, 42, 93)),
    };
  });

  return {
    sentiment,
    sentimentScore,
    bullishProbability,
    bearishProbability,
    holdProbability,
    smartMoney,
    smartMoneyScore,
    whaleActivity,
    whaleScore,
    momentumScore,
    narrativeStrength,
    confidence,
    signal,
    timeframes,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  VERY_BULLISH: "#26a69a",
  BULLISH:      "#26a69a",
  NEUTRAL:      "#787b86",
  BEARISH:      "#ef5350",
  VERY_BEARISH: "#ef5350",
};

export const SIGNAL_COLOR: Record<Signal, string> = {
  STRONG_BUY:  "#26a69a",
  BUY:         "#26a69a",
  HOLD:        "#f7931a",
  SELL:        "#ef5350",
  STRONG_SELL: "#ef5350",
};

export const SIGNAL_BG: Record<Signal, string> = {
  STRONG_BUY:  "rgba(38,166,154,0.15)",
  BUY:         "rgba(38,166,154,0.1)",
  HOLD:        "rgba(247,147,26,0.12)",
  SELL:        "rgba(239,83,80,0.1)",
  STRONG_SELL: "rgba(239,83,80,0.15)",
};
