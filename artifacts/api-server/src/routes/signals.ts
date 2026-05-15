import { Router, type IRouter } from "express";
import {
  ListSignalsQueryParams,
  CreateSignalBody,
  UpdateSignalBody,
  UpdateSignalParams,
  DeleteSignalParams,
} from "@workspace/api-zod";
import { memoryStore, type MemorySignal } from "../lib/memory-store.js";

const router: IRouter = Router();

function computeProgress(entryPrice: number, currentPrice: number, targetPrice: number, action: string): number {
  if (action === "SELL") {
    const range = entryPrice - targetPrice;
    if (range === 0) return 0;
    return Math.max(0, Math.min(100, ((entryPrice - currentPrice) / range) * 100));
  }
  const range = targetPrice - entryPrice;
  if (range === 0) return 0;
  return Math.max(0, Math.min(100, ((currentPrice - entryPrice) / range) * 100));
}

function formatSignal(s: MemorySignal) {
  const currentPrice = s.entryPrice;
  const progress = computeProgress(s.entryPrice, currentPrice, s.targetPrice, s.action);
  return {
    id: s.id,
    tokenSymbol: s.tokenSymbol,
    tokenName: s.tokenName,
    action: s.action,
    entryPrice: s.entryPrice,
    targetPrice: s.targetPrice,
    stopLossPrice: s.stopLossPrice,
    confidence: s.confidence,
    timeframe: s.timeframe,
    status: s.status,
    progressPercent: Math.round(progress * 10) / 10,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
  };
}

router.get("/signals", async (req, res): Promise<void> => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;
  const now = new Date();
  const filtered = status ? memoryStore.signals.filter((s) => s.status === status) : [...memoryStore.signals];
  const updated = filtered.map((s) => {
    let st = s.status;
    if (s.expiresAt && s.expiresAt < now && s.status === "active") st = "expired";
    return { ...s, status: st };
  });
  res.json(updated.sort((a, b) => b.id - a.id).map(formatSignal));
});

router.post("/signals", async (req, res): Promise<void> => {
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const s: MemorySignal = {
    id: memoryStore.takeSignalId(),
    tokenSymbol: parsed.data.tokenSymbol,
    tokenName: parsed.data.tokenName,
    action: parsed.data.action,
    entryPrice: parsed.data.entryPrice,
    targetPrice: parsed.data.targetPrice,
    stopLossPrice: parsed.data.stopLossPrice ?? null,
    confidence: parsed.data.confidence,
    timeframe: parsed.data.timeframe,
    status: "active",
    createdAt: new Date(),
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  };
  memoryStore.signals.push(s);
  res.status(201).json(formatSignal(s));
});

router.patch("/signals/:id", async (req, res): Promise<void> => {
  const params = UpdateSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const s = memoryStore.signals.find((x) => x.id === params.data.id);
  if (!s) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }
  if (parsed.data.status != null) s.status = parsed.data.status;
  if (parsed.data.targetPrice != null) s.targetPrice = parsed.data.targetPrice;
  if (parsed.data.confidence != null) s.confidence = parsed.data.confidence;
  if ("stopLossPrice" in parsed.data) s.stopLossPrice = parsed.data.stopLossPrice ?? null;

  res.json(formatSignal(s));
});

router.delete("/signals/:id", async (req, res): Promise<void> => {
  const params = DeleteSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const idx = memoryStore.signals.findIndex((s) => s.id === params.data.id);
  if (idx < 0) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }
  memoryStore.signals.splice(idx, 1);
  res.sendStatus(204);
});

export default router;
