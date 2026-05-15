import { Router, type IRouter } from "express";
import {
  CreatePositionBody,
  UpdatePositionBody,
  UpdatePositionParams,
  DeletePositionParams,
} from "@workspace/api-zod";
import { getCoinsMarkets } from "../lib/coingecko.js";
import { memoryStore, type MemoryPosition } from "../lib/memory-store.js";

const router: IRouter = Router();

async function priceMap(): Promise<Map<string, number>> {
  const markets = await getCoinsMarkets(1, 250).catch(() => []);
  const m = new Map<string, number>();
  for (const c of markets) m.set(c.symbol.toUpperCase(), c.current_price);
  return m;
}

async function enrichPosition(p: MemoryPosition, prices: Map<string, number>) {
  const currentPrice = prices.get(p.tokenSymbol) ?? p.avgBuyPrice;
  const valueUsd = p.amount * currentPrice;
  const investedUsd = p.amount * p.avgBuyPrice;
  const pnlUsd = valueUsd - investedUsd;
  const pnlPercent = investedUsd > 0 ? (pnlUsd / investedUsd) * 100 : 0;

  let targetProgressPercent: number | null = null;
  if (p.targetPrice != null) {
    const range = p.targetPrice - p.avgBuyPrice;
    if (range !== 0) {
      targetProgressPercent = Math.max(0, Math.min(100, ((currentPrice - p.avgBuyPrice) / range) * 100));
      targetProgressPercent = Math.round(targetProgressPercent * 10) / 10;
    }
  }

  return {
    id: p.id,
    tokenSymbol: p.tokenSymbol,
    tokenName: p.tokenName,
    logoUrl: p.logoUrl,
    amount: p.amount,
    avgBuyPrice: p.avgBuyPrice,
    currentPrice,
    valueUsd: Math.round(valueUsd * 100) / 100,
    investedUsd: Math.round(investedUsd * 100) / 100,
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    targetPrice: p.targetPrice,
    targetProgressPercent,
    narrativeSlug: p.narrativeSlug,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/portfolio/positions", async (_req, res): Promise<void> => {
  const prices = await priceMap();
  const enriched = await Promise.all(memoryStore.positions.map((p) => enrichPosition(p, prices)));
  res.json(enriched);
});

router.post("/portfolio/positions", async (req, res): Promise<void> => {
  const parsed = CreatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const prices = await priceMap();
  const sym = parsed.data.tokenSymbol.toUpperCase();
  const position: MemoryPosition = {
    id: memoryStore.takePositionId(),
    tokenSymbol: sym,
    tokenName: parsed.data.tokenName,
    logoUrl: null,
    amount: parsed.data.amount,
    avgBuyPrice: parsed.data.avgBuyPrice,
    targetPrice: parsed.data.targetPrice ?? null,
    narrativeSlug: parsed.data.narrativeSlug ?? null,
    createdAt: new Date(),
  };
  memoryStore.positions.push(position);
  const enriched = await enrichPosition(position, prices);
  res.status(201).json(enriched);
});

router.patch("/portfolio/positions/:id", async (req, res): Promise<void> => {
  const params = UpdatePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const p = memoryStore.positions.find((x) => x.id === params.data.id);
  if (!p) {
    res.status(404).json({ error: "Position not found" });
    return;
  }
  if (parsed.data.amount != null) p.amount = parsed.data.amount;
  if (parsed.data.avgBuyPrice != null) p.avgBuyPrice = parsed.data.avgBuyPrice;
  if ("targetPrice" in parsed.data) p.targetPrice = parsed.data.targetPrice ?? null;

  const prices = await priceMap();
  res.json(await enrichPosition(p, prices));
});

router.delete("/portfolio/positions/:id", async (req, res): Promise<void> => {
  const params = DeletePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const idx = memoryStore.positions.findIndex((p) => p.id === params.data.id);
  if (idx < 0) {
    res.status(404).json({ error: "Position not found" });
    return;
  }
  memoryStore.positions.splice(idx, 1);
  res.sendStatus(204);
});

router.get("/portfolio/summary", async (_req, res): Promise<void> => {
  const prices = await priceMap();
  const enriched = await Promise.all(memoryStore.positions.map((p) => enrichPosition(p, prices)));

  const totalValueUsd = enriched.reduce((s, p) => s + p.valueUsd, 0);
  const totalInvestedUsd = enriched.reduce((s, p) => s + p.investedUsd, 0);
  const totalPnlUsd = totalValueUsd - totalInvestedUsd;
  const totalPnlPercent = totalInvestedUsd > 0 ? (totalPnlUsd / totalInvestedUsd) * 100 : 0;

  const byNarrative: Record<string, number> = {};
  for (const p of enriched) {
    const label = p.narrativeSlug ?? "Other";
    byNarrative[label] = (byNarrative[label] ?? 0) + p.valueUsd;
  }

  const allocationByNarrative = Object.entries(byNarrative).map(([label, valueUsd]) => ({
    label,
    valueUsd: Math.round(valueUsd * 100) / 100,
    percent: totalValueUsd > 0 ? Math.round((valueUsd / totalValueUsd) * 1000) / 10 : 0,
  }));

  const sorted = [...enriched].sort((a, b) => b.pnlPercent - a.pnlPercent);

  res.json({
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    totalInvestedUsd: Math.round(totalInvestedUsd * 100) / 100,
    totalPnlUsd: Math.round(totalPnlUsd * 100) / 100,
    totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
    positionCount: enriched.length,
    allocationByNarrative,
    topPerformer: sorted[0] ?? null,
    worstPerformer: sorted[sorted.length - 1] ?? null,
  });
});

router.get("/portfolio/insights", async (_req, res): Promise<void> => {
  const prices = await priceMap();
  const enriched = await Promise.all(memoryStore.positions.map((p) => enrichPosition(p, prices)));
  const narrativeSlugs = [...new Set(enriched.map((p) => p.narrativeSlug ?? "Other"))];
  const overallPnl = enriched.reduce((s, p) => s + p.pnlPercent, 0) / (enriched.length || 1);
  const overallRisk =
    enriched.length <= 1 ? "very_high" : enriched.length <= 3 ? "high" : enriched.length <= 6 ? "moderate" : "low";
  const diversificationScore = Math.min(100, Math.round((enriched.length / 10) * 100));

  res.json({
    overallRisk,
    diversificationScore,
    strengths:
      overallPnl > 0
        ? ["Portfolio is in overall profit", "Live prices from CoinGecko"]
        : ["Diversified across multiple assets"],
    weaknesses:
      enriched.length < 5
        ? ["Concentrated in few positions — consider diversifying"]
        : ["Some positions may trail the market"],
    overexposedSectors:
      narrativeSlugs.length === 1 && narrativeSlugs[0] !== "Other" ? [narrativeSlugs[0]] : [],
    opportunities: ["Review live movers on the Markets page", "Use Discover for sector breadth"],
    rebalancingSuggestions:
      enriched.length < 5
        ? ["Consider adding positions for diversification", "Track live PnL against CoinGecko spot"]
        : ["Review positions with large drawdowns"],
    generatedAt: new Date().toISOString(),
  });
});

export default router;
