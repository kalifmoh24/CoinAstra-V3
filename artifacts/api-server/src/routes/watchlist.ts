import { Router, type IRouter } from "express";
import { memoryStore } from "../lib/memory-store.js";

const router: IRouter = Router();

router.get("/watchlist", async (_req, res): Promise<void> => {
  res.json(
    memoryStore.watchlist.map((w) => ({
      ...w,
      image: w.image,
      addedAt: w.addedAt.toISOString(),
    })),
  );
});

router.post("/watchlist", async (req, res): Promise<void> => {
  const { coinId, symbol, name, image, targetPrice } = req.body as {
    coinId: string;
    symbol: string;
    name: string;
    image?: string;
    targetPrice?: number;
  };

  if (!coinId || !symbol || !name) {
    res.status(400).json({ error: "coinId, symbol, and name are required" });
    return;
  }

  const existing = memoryStore.watchlist.find((w) => w.coinId === coinId);
  if (existing) {
    res.status(409).json({ error: "Coin already in watchlist", item: { ...existing, addedAt: existing.addedAt.toISOString() } });
    return;
  }

  const item = {
    id: memoryStore.takeWatchId(),
    coinId,
    symbol: symbol.toUpperCase(),
    name,
    image: image ?? null,
    targetPrice: targetPrice ?? null,
    alertEnabled: false,
    addedAt: new Date(),
  };
  memoryStore.watchlist.push(item);
  res.status(201).json({ ...item, addedAt: item.addedAt.toISOString() });
});

router.patch("/watchlist/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const { targetPrice, alertEnabled } = req.body as { targetPrice?: number; alertEnabled?: boolean };
  const row = memoryStore.watchlist.find((w) => w.id === id);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (targetPrice !== undefined) row.targetPrice = targetPrice;
  if (alertEnabled !== undefined) row.alertEnabled = alertEnabled;
  res.json({ ...row, addedAt: row.addedAt.toISOString() });
});

router.delete("/watchlist/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const idx = memoryStore.watchlist.findIndex((w) => w.id === id);
  if (idx >= 0) memoryStore.watchlist.splice(idx, 1);
  res.status(204).end();
});

export default router;
