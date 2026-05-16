import { Router, type IRouter } from "express";
import {
  getCoinChart,
  getCoinDetails,
  getCoinIdBySymbol,
  getCoinsMarkets,
  getCoinsMarketsByIds,
  getSimplePricesForIds,
  type CoinDetails,
  type CoinMarket,
} from "../lib/coingecko.js";
import { memoryStore, type MemoryImportedToken } from "../lib/memory-store.js";
import {
  ListTokensQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function firstRealUrl(urls: string[] | undefined): string | undefined {
  if (!urls) return undefined;
  for (const u of urls) {
    const t = typeof u === "string" ? u.trim() : "";
    if (t.length > 4 && /^https?:\/\//i.test(t)) return t;
  }
  return undefined;
}

function whitepaperFromLinks(links: CoinDetails["links"]): string | undefined {
  const w = links?.whitepaper;
  if (typeof w === "string" && w.trim()) return w.trim();
  if (Array.isArray(w)) return firstRealUrl(w);
  return undefined;
}

function numIdFromCg(cgId: string): number {
  let h = 0;
  for (let i = 0; i < cgId.length; i++) h = (Math.imul(31, h) + cgId.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function buildLiveFromMarket(cgId: string, m: CoinMarket, quote?: { usd?: number; usd_24h_change?: number }) {
  const price = quote?.usd ?? m.current_price;
  const ch24 = quote?.usd_24h_change ?? m.price_change_percentage_24h;
  return {
    id: cgId,
    symbol: m.symbol.toUpperCase(),
    name: m.name,
    image: m.image,
    rank: m.market_cap_rank,
    price,
    priceChange24h: ch24,
    priceChange7d: m.price_change_percentage_7d_in_currency ?? 0,
    priceChange30d: 0,
    priceChange1y: 0,
    marketCap: m.market_cap,
    volume24h: m.total_volume,
    fdv: m.fully_diluted_valuation,
    high24h: m.high_24h,
    low24h: m.low_24h,
    ath: m.ath,
    athChange: m.ath_change_percentage,
    athDate: "",
    circulatingSupply: m.circulating_supply,
    totalSupply: m.total_supply,
    maxSupply: m.max_supply,
    categories: [] as string[],
  };
}

function buildLivePayload(cgId: string, details: CoinDetails) {
  const md = details.market_data;
  const comm = details.community_data;
  const gh = details.links?.repos_url?.github?.filter((u) => typeof u === "string" && u.trim().length > 0) ?? [];
  return {
    id: cgId,
    symbol: details.symbol.toUpperCase(),
    name: details.name,
    image: details.image?.large,
    rank: details.market_cap_rank,
    price: md.current_price?.usd,
    priceChange24h: md.price_change_percentage_24h,
    priceChange7d: md.price_change_percentage_7d,
    priceChange30d: md.price_change_percentage_30d,
    priceChange1y: md.price_change_percentage_1y,
    marketCap: md.market_cap?.usd,
    volume24h: md.total_volume?.usd,
    fdv: md.fully_diluted_valuation?.usd,
    high24h: md.high_24h?.usd,
    low24h: md.low_24h?.usd,
    ath: md.ath?.usd,
    athChange: md.ath_change_percentage?.usd,
    athDate: md.ath_date?.usd,
    atl: md.atl?.usd,
    atlChange: md.atl_change_percentage?.usd,
    atlDate: md.atl_date?.usd,
    circulatingSupply: md.circulating_supply,
    totalSupply: md.total_supply,
    maxSupply: md.max_supply,
    contractAddress: details.contract_address,
    platforms: details.platforms,
    categories: details.categories,
    community: {
      twitterFollowers: comm?.twitter_followers ?? null,
      redditSubscribers: comm?.reddit_subscribers ?? null,
      telegramUsers: comm?.telegram_channel_user_count ?? null,
    },
    links: {
      homepage: firstRealUrl(details.links?.homepage),
      whitepaper: whitepaperFromLinks(details.links),
      twitter: details.links?.twitter_screen_name,
      reddit: details.links?.subreddit_url,
      github: gh.length > 0 ? gh : undefined,
      explorers: details.links?.blockchain_site?.filter(Boolean).slice(0, 6),
    },
    description: details.description?.en,
  };
}

function memoryTokenToListRow(t: MemoryImportedToken) {
  return {
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    logoUrl: t.logoUrl,
    chain: t.chain,
    description: null as string | null,
    price: t.price,
    priceChange24h: t.priceChange24h,
    marketCap: t.marketCap,
    volume24h: t.volume24h,
    overallScore: t.overallScore,
    finalGrade: t.finalGrade,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tokens", async (req, res): Promise<void> => {
  const parsed = ListTokensQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data.q?.toLowerCase() : undefined;
  const limit = (parsed.success ? parsed.data.limit : undefined) ?? 50;
  const offset = (parsed.success ? parsed.data.offset : undefined) ?? 0;

  const imported = memoryStore.importedTokens
    .filter((t) => !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    .map(memoryTokenToListRow);

  const markets = await getCoinsMarkets(1, 250).catch(() => []);
  const importedSyms = new Set(memoryStore.importedTokens.map((t) => t.symbol.toUpperCase()));
  const fromMarkets = markets
    .filter((c) => !importedSyms.has(c.symbol.toUpperCase()))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    .map((c) => ({
      id: numIdFromCg(c.id),
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      logoUrl: c.image,
      chain: "Multi-Chain",
      description: null as string | null,
      price: c.current_price,
      priceChange24h: c.price_change_percentage_24h,
      marketCap: c.market_cap,
      volume24h: c.total_volume,
      overallScore: null as number | null,
      finalGrade: null as string | null,
      createdAt: new Date().toISOString(),
    }));

  const merged = [...imported, ...fromMarkets];
  res.json(merged.slice(offset, offset + limit));
});

router.get("/tokens/:symbol", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
  if (mem) {
    res.json({
      id: mem.id,
      symbol: mem.symbol,
      name: mem.name,
      logoUrl: mem.logoUrl,
      chain: mem.chain,
      description: null,
      websiteUrl: null,
      whitepaperUrl: null,
      price: mem.price,
      priceChange24h: mem.priceChange24h,
      priceChange7d: mem.priceChange7d,
      marketCap: mem.marketCap,
      volume24h: mem.volume24h,
      fdv: mem.fdv,
      circulatingSupply: mem.circulatingSupply,
      totalSupply: mem.totalSupply,
      overallScore: mem.overallScore,
      fundamentalScore: mem.fundamentalScore,
      technicalScore: mem.technicalScore,
      sentimentScore: mem.sentimentScore,
      riskScore: mem.riskScore,
      narrativeMomentumScore: mem.narrativeMomentumScore,
      finalGrade: mem.finalGrade,
      gradeExplanation: mem.gradeExplanation,
      narratives: [],
      createdAt: mem.createdAt.toISOString(),
    });
    return;
  }

  const cgId = await getCoinIdBySymbol(symbol);
  if (!cgId) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  const details = await getCoinDetails(cgId);
  const md = details.market_data;
  res.json({
    id: numIdFromCg(cgId),
    symbol: details.symbol.toUpperCase(),
    name: details.name,
    logoUrl: details.image?.large ?? null,
    chain: "Multi-Chain",
    description: details.description?.en ?? null,
    websiteUrl: firstRealUrl(details.links?.homepage) ?? null,
    whitepaperUrl: whitepaperFromLinks(details.links) ?? null,
    price: md.current_price?.usd ?? null,
    priceChange24h: md.price_change_percentage_24h ?? null,
    priceChange7d: md.price_change_percentage_7d ?? null,
    marketCap: md.market_cap?.usd ?? null,
    volume24h: md.total_volume?.usd ?? null,
    fdv: md.fully_diluted_valuation?.usd ?? null,
    circulatingSupply: md.circulating_supply ?? null,
    totalSupply: md.total_supply ?? null,
    overallScore: 50,
    fundamentalScore: 50,
    technicalScore: 50,
    sentimentScore: 50,
    riskScore: 50,
    narrativeMomentumScore: 50,
    finalGrade: "C",
    gradeExplanation: "Live snapshot from CoinGecko (no database-backed grades).",
    narratives: [],
    createdAt: new Date().toISOString(),
  });
});

router.get("/tokens/:symbol/scores", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
  if (mem) {
    res.json({
      tokenId: mem.id,
      symbol: mem.symbol,
      overallScore: mem.overallScore,
      fundamentalScore: mem.fundamentalScore,
      technicalScore: mem.technicalScore,
      sentimentScore: mem.sentimentScore,
      riskScore: mem.riskScore,
      narrativeMomentumScore: mem.narrativeMomentumScore,
      finalGrade: mem.finalGrade,
      gradeExplanation: mem.gradeExplanation ?? "Scores from imported token profile.",
      updatedAt: mem.updatedAt.toISOString(),
    });
    return;
  }

  const cgId = await getCoinIdBySymbol(symbol);
  if (!cgId) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  const details = await getCoinDetails(cgId);
  const pc = details.market_data.price_change_percentage_24h ?? 0;
  const overall = Math.round(Math.max(35, Math.min(85, 50 + pc * 1.2)));

  res.json({
    tokenId: numIdFromCg(cgId),
    symbol,
    overallScore: overall,
    fundamentalScore: overall,
    technicalScore: overall,
    sentimentScore: overall,
    riskScore: 100 - overall,
    narrativeMomentumScore: overall,
    finalGrade: overall >= 70 ? "B" : overall >= 55 ? "C" : "D",
    gradeExplanation: "Heuristic score derived from CoinGecko 24h change (database-free mode).",
    updatedAt: new Date().toISOString(),
  });
});

router.get("/tokens/:symbol/ai-research", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();
  const cgId = await getCoinIdBySymbol(symbol);
  if (!cgId) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  const details = await getCoinDetails(cgId);
  const grade = "C";
  res.json({
    symbol,
    summary: `${details.name} — live market snapshot from CoinGecko. Database-free mode: narrative and proprietary scores are not stored.`,
    strengths: ["Liquid markets on major venues", "Public CoinGecko market metadata"],
    weaknesses: ["No persisted internal research in this deployment"],
    risks: ["Macro and regulatory drivers", "Third-party API rate limits"],
    opportunityLevel: "moderate",
    generatedAt: new Date().toISOString(),
  });
});

router.get("/tokens/:symbol/chart", async (req, res, next): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const symbol = raw.toUpperCase();
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 7));

    const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
    const cgId = mem?.coingeckoId ?? (await getCoinIdBySymbol(symbol));
    if (!cgId) {
      res.status(404).json({ error: "CoinGecko ID not found for this token" });
      return;
    }
    const chart = await getCoinChart(cgId, days);
    res.json(chart);
  } catch (err) {
    next(err);
  }
});

router.get("/tokens/:symbol/live", async (req, res, next): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const symbol = raw.toUpperCase();
    const preferredId = typeof req.query["id"] === "string" ? req.query["id"] : undefined;
    const full = String(req.query["full"] ?? "") === "1";

    const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
    let cgId = preferredId ?? mem?.coingeckoId ?? null;
    if (!cgId) cgId = await getCoinIdBySymbol(symbol, preferredId);
    if (!cgId) {
      res.status(404).json({ error: "CoinGecko ID not found for this token" });
      return;
    }

    if (full) {
      const details = await getCoinDetails(cgId);
      res.json(buildLivePayload(cgId, details));
      return;
    }

    const [markets, quotes] = await Promise.all([
      getCoinsMarketsByIds([cgId], { sparkline: false, priceChangePercentage: "1h,7d,30d" }),
      getSimplePricesForIds([cgId]),
    ]);
    const m = markets[0];
    if (!m) {
      res.status(404).json({ error: "Market data not found" });
      return;
    }
    res.json(buildLiveFromMarket(cgId, m, quotes[cgId]));
  } catch (err) {
    next(err);
  }
});

router.get("/tokens/:symbol/news", async (req, res): Promise<void> => {
  res.json([]);
});

router.post("/tokens/import", async (req, res, next): Promise<void> => {
  try {
    const {
      id: cgId,
      symbol,
      name,
      image,
      current_price,
      price_change_percentage_24h,
      price_change_percentage_7d_in_currency,
      market_cap,
      total_volume,
      fully_diluted_valuation,
      circulating_supply,
      total_supply,
    } = req.body as Record<string, unknown>;

    if (!cgId || !symbol || !name) {
      res.status(400).json({ error: "id, symbol, and name are required" });
      return;
    }

    const upperSymbol = (symbol as string).toUpperCase();
    if (memoryStore.importedTokens.some((t) => t.symbol === upperSymbol)) {
      res.status(200).json({ imported: false, message: "Already on platform" });
      return;
    }

    const now = new Date();
    memoryStore.importedTokens.push({
      id: memoryStore.takeTokenId(),
      symbol: upperSymbol,
      name: name as string,
      logoUrl: (image as string) ?? null,
      chain: "Multi-Chain",
      coingeckoId: cgId as string,
      price: (current_price as number) ?? null,
      priceChange24h: (price_change_percentage_24h as number) ?? null,
      priceChange7d: (price_change_percentage_7d_in_currency as number) ?? null,
      marketCap: (market_cap as number) ?? null,
      volume24h: (total_volume as number) ?? null,
      fdv: (fully_diluted_valuation as number) ?? null,
      circulatingSupply: (circulating_supply as number) ?? null,
      totalSupply: (total_supply as number) ?? null,
      overallScore: 50,
      fundamentalScore: 50,
      technicalScore: 50,
      sentimentScore: 50,
      riskScore: 50,
      narrativeMomentumScore: 50,
      finalGrade: "B",
      gradeExplanation: "Imported from CoinGecko (in-memory store).",
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({ imported: true, message: "Coin added to CoinAstra" });
  } catch (err) {
    next(err);
  }
});

export default router;
