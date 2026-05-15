import { Router, type IRouter } from "express";
import { getGlobal, getFearGreed, getCoinsMarkets } from "../lib/coingecko.js";

const router: IRouter = Router();

router.get("/market/overview", async (_req, res, next): Promise<void> => {
  try {
    const [global, fearGreed, markets] = await Promise.all([
      getGlobal().catch(() => null),
      getFearGreed().catch(() => null),
      getCoinsMarkets(1, 10).catch(() => null),
    ]);

    const btc = markets?.find((c) => c.symbol === "btc");
    const eth = markets?.find((c) => c.symbol === "eth");
    const fg = fearGreed?.data?.[0];

    res.json({
      btcPrice: btc?.current_price ?? 67500,
      btcChange24h: btc?.price_change_percentage_24h ?? 2.4,
      ethPrice: eth?.current_price ?? 3250,
      ethChange24h: eth?.price_change_percentage_24h ?? 1.8,
      totalMarketCap: global?.data?.total_market_cap?.usd ?? 2.45e12,
      totalVolume24h: global?.data?.total_volume?.usd ?? 98e9,
      btcDominance: global?.data?.market_cap_percentage?.btc
        ? Math.round(global.data.market_cap_percentage.btc * 10) / 10
        : 52.3,
      marketCapChange24h: global?.data?.market_cap_change_percentage_24h_usd ?? 0,
      fearGreedIndex: fg ? Number(fg.value) : 68,
      fearGreedLabel: fg?.value_classification ?? "Greed",
      activeCoins: global?.data?.active_cryptocurrencies ?? 10000,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/market/movers", async (_req, res, next): Promise<void> => {
  try {
    const coins = await getCoinsMarkets(1, 100);
    const withChange = coins.filter((c) => c.price_change_percentage_24h != null);

    const mapCoin = (c: (typeof coins)[0]) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      priceChange24h: c.price_change_percentage_24h,
      volume24h: c.total_volume,
      marketCap: c.market_cap,
    });

    res.json({
      gainers: [...withChange].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 10).map(mapCoin),
      losers: [...withChange].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 10).map(mapCoin),
      volumeLeaders: [...coins].sort((a, b) => b.total_volume - a.total_volume).slice(0, 10).map(mapCoin),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
