import { Router, type IRouter } from "express";
import { memoryStore } from "../lib/memory-store.js";

const router: IRouter = Router();

router.get("/alerts", async (_req, res): Promise<void> => {
  const sorted = [...memoryStore.alerts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(
    sorted.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      triggeredAt: a.triggeredAt?.toISOString() ?? null,
    })),
  );
});

router.post("/alerts", async (req, res): Promise<void> => {
  const { type, coinId, coinSymbol, title, description, targetPrice, targetDirection, priority } = req.body as {
    type?: "price" | "ai" | "whale" | "portfolio";
    coinId?: string;
    coinSymbol?: string;
    title: string;
    description: string;
    targetPrice?: number;
    targetDirection?: "above" | "below";
    priority?: "HIGH" | "MEDIUM" | "LOW";
  };

  if (!title || !description) {
    res.status(400).json({ error: "title and description are required" });
    return;
  }

  const now = new Date();
  const alert = {
    id: memoryStore.takeAlertId(),
    type: type ?? "price",
    coinId: coinId ?? null,
    coinSymbol: coinSymbol?.toUpperCase() ?? null,
    title,
    description,
    targetPrice: targetPrice ?? null,
    targetDirection: targetDirection ?? null,
    priority: priority ?? "MEDIUM",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    triggeredAt: null as Date | null,
  };
  memoryStore.alerts.push(alert);
  res.status(201).json({
    ...alert,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    triggeredAt: null,
  });
});

router.patch("/alerts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const { status, targetPrice } = req.body as { status?: "ACTIVE" | "TRIGGERED" | "DISMISSED"; targetPrice?: number };
  const row = memoryStore.alerts.find((a) => a.id === id);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  row.updatedAt = new Date();
  if (status) {
    row.status = status;
    if (status === "TRIGGERED") row.triggeredAt = new Date();
  }
  if (targetPrice !== undefined) row.targetPrice = targetPrice;
  res.json({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
  });
});

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const idx = memoryStore.alerts.findIndex((a) => a.id === id);
  if (idx >= 0) memoryStore.alerts.splice(idx, 1);
  res.status(204).end();
});

export default router;
