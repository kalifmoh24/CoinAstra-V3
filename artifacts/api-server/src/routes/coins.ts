import { Router, type IRouter } from "express";
import {
  getCoinsMarkets,
  getCoinsMarketsByIds,
  searchCoins,
  getCoinDetails,
  getCoinChart,
  getCoinOHLC,
  getTrending,
  getFearGreed,
  getGlobal,
  getCoinCategories,
  getCoinsByCategory,
  getSimplePricesBatched,
} from "../lib/coingecko.js";

const router: IRouter = Router();

/** GET /api/coins/market-prices?ids=bitcoin,ethereum,... — live USD only (cached 30s per chunk). */
router.get("/coins/market-prices", async (req, res, next): Promise<void> => {
  try {
    const raw = String(req.query["ids"] ?? "");
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 10_000) {
      res.status(400).json({ error: "Too many ids (max 10000)" });
      return;
    }
    const data = await getSimplePricesBatched(ids, 2);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/markets-by-ids?ids=bitcoin,ethereum */
router.get("/coins/markets-by-ids", async (req, res, next): Promise<void> => {
  try {
    const raw = String(req.query["ids"] ?? "");
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    const pricePct = req.query["price_change_percentage"]
      ? String(req.query["price_change_percentage"])
      : "1h,7d,30d";
    const data = await getCoinsMarketsByIds(ids, { sparkline: false, priceChangePercentage: pricePct });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/markets?page=1&per_page=100&category=defi&sparkline=true&price_change_percentage=7d,30d */
router.get("/coins/markets", async (req, res, next): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query["page"]) || 1);
    const perPage = Math.min(250, Math.max(10, Number(req.query["per_page"]) || 100));
    const category = req.query["category"] ? String(req.query["category"]) : undefined;
    const sparkline = String(req.query["sparkline"] ?? "true") !== "false";
    const pricePct = req.query["price_change_percentage"]
      ? String(req.query["price_change_percentage"])
      : undefined;
    const order = req.query["order"] ? String(req.query["order"]) : undefined;
    const data = await getCoinsMarkets(page, perPage, category, {
      sparkline,
      priceChangePercentage: pricePct,
      order,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/trending */
router.get("/coins/trending", async (_req, res, next): Promise<void> => {
  try {
    const data = await getTrending();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/search?q=bitcoin */
router.get("/coins/search", async (req, res, next): Promise<void> => {
  try {
    const q = String(req.query["q"] ?? "").trim();
    if (!q) {
      res.json({ coins: [] });
      return;
    }
    const data = await searchCoins(q);
    res.json({ coins: data.coins.slice(0, 20) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/fear-greed */
router.get("/coins/fear-greed", async (_req, res, next): Promise<void> => {
  try {
    const data = await getFearGreed();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/global */
router.get("/coins/global", async (_req, res, next): Promise<void> => {
  try {
    const data = await getGlobal();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/categories — all CoinGecko categories with market data */
router.get("/coins/categories", async (_req, res, next): Promise<void> => {
  try {
    const data = await getCoinCategories();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/categories/:id/coins?page=1&per_page=100 */
router.get("/coins/categories/:id/coins", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]);
    const page = Math.max(1, Number(req.query["page"]) || 1);
    const perPage = Math.min(250, Math.max(10, Number(req.query["per_page"]) || 100));
    const sparkline = String(req.query["sparkline"] ?? "false") !== "false";
    const pricePct = req.query["price_change_percentage"]
      ? String(req.query["price_change_percentage"])
      : "7d,30d";
    const data = await getCoinsByCategory(id, page, perPage, {
      sparkline,
      priceChangePercentage: pricePct,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id — full coin detail (?tickers=1 for exchange listings) */
router.get("/coins/:id", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const includeTickers = String(req.query["tickers"] ?? "") === "1";
    const data = await getCoinDetails(id, { includeTickers });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id/chart?days=7|max */
router.get("/coins/:id/chart", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const raw = String(req.query["days"] ?? "7").toLowerCase();
    const days = raw === "max" ? "max" : Math.min(365, Math.max(1, Number(req.query["days"]) || 7));
    const data = await getCoinChart(id, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id/ohlc?days=7 — candlestick OHLC data */
router.get("/coins/:id/ohlc", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 7));
    const data = await getCoinOHLC(id, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
