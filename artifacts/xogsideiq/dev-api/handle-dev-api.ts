import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  CreatePositionBody,
  CreateSignalBody,
  DeletePositionParams,
  DeleteSignalParams,
  HealthCheckResponse,
  ListSignalsQueryParams,
  ListTokensQueryParams,
  UpdatePositionBody,
  UpdatePositionParams,
  UpdateSignalBody,
  UpdateSignalParams,
} from "@workspace/api-zod";
import {
  getCoinChart,
  getCoinDetails,
  getCoinIdBySymbol,
  getCoinsMarkets,
  getCoinsMarketsByIds,
  getSimplePricesForIds,
  getCoinsByCategory,
  getCoinCategories,
  getCoinOHLC,
  getFearGreed,
  getGlobal,
  getSimplePricesBatched,
  getTrending,
  searchCoins,
  type CoinDetails,
} from "./coingecko";
import { signToken, verifyToken } from "./jwt";
import { memoryStore, type MemoryImportedToken, type MemoryPosition, type MemorySignal, type MemoryUser } from "./memory-store";

const SALT_ROUNDS = 12;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const raw = await readBody(req);
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function getBearer(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

function requireUser(req: IncomingMessage, res: ServerResponse): ReturnType<typeof verifyToken> | null {
  const t = getBearer(req);
  if (!t) {
    json(res, 401, { error: "Unauthorized", message: "Missing or invalid Authorization header" });
    return null;
  }
  try {
    return verifyToken(t);
  } catch {
    json(res, 401, { error: "Unauthorized", message: "Invalid or expired token" });
    return null;
  }
}

function omitPassword(user: MemoryUser): Omit<MemoryUser, "passwordHash"> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

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

async function priceMap(): Promise<Map<string, number>> {
  const markets = await getCoinsMarkets(1, 250).catch(() => []);
  const m = new Map<string, number>();
  for (const c of markets) m.set(c.symbol.toUpperCase(), c.current_price);
  return m;
}

async function fetchUnlockProviderFeed(): Promise<unknown[]> {
  const url = process.env.UNLOCKS_API_URL;
  if (!url) return [];

  const headers: Record<string, string> = { Accept: "application/json" };
  const key = process.env.UNLOCKS_API_KEY;
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers["X-API-Key"] = key;
  }

  const r = await fetch(url, { headers });
  if (!r.ok) return [];
  const json = await r.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.events)) return json.events;
  if (Array.isArray(json?.results)) return json.results;
  return [];
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

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and dashes")
    .optional(),
  displayName: z.string().min(1).max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatarUrl: z.string().url().optional(),
});

/** Returns true if the request was fully handled (response ended). */
export async function handleDevApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url ?? "/";
  if (!rawUrl.startsWith("/api")) return false;

  const u = new URL(rawUrl, "http://127.0.0.1");
  const path = u.pathname.slice("/api".length) || "/";
  const method = (req.method ?? "GET").toUpperCase();
  const searchParams = u.searchParams;

  try {
    if (method === "GET" && path === "/healthz") {
      json(res, 200, HealthCheckResponse.parse({ status: "ok" }));
      return true;
    }

    if (method === "POST" && path === "/auth/register") {
      const body = await readJson(req);
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        json(res, 400, { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues });
        return true;
      }
      const { email, password, username, displayName } = parsed.data;
      const lower = email.toLowerCase();
      if (memoryStore.usersByEmail.has(lower)) {
        json(res, 409, { error: "An account with this email already exists", code: "EMAIL_TAKEN" });
        return true;
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const now = new Date();
      const id = memoryStore.takeUserId();
      const user: MemoryUser = {
        id,
        email: lower,
        passwordHash,
        username: username ?? null,
        displayName: displayName ?? null,
        avatarUrl: null,
        role: "user",
        isActive: true,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.usersById.set(id, user);
      memoryStore.usersByEmail.set(lower, user);
      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      json(res, 201, { user: omitPassword(user), token });
      return true;
    }

    if (method === "POST" && path === "/auth/login") {
      const body = await readJson(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        json(res, 400, { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues });
        return true;
      }
      const { email, password } = parsed.data;
      const user = memoryStore.usersByEmail.get(email.toLowerCase());
      if (!user) {
        json(res, 401, { error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
        return true;
      }
      if (!user.isActive) {
        json(res, 403, { error: "Account is disabled", code: "ACCOUNT_DISABLED" });
        return true;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        json(res, 401, { error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
        return true;
      }
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();
      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      json(res, 200, { user: omitPassword(user), token });
      return true;
    }

    if (method === "GET" && path === "/auth/profile") {
      const auth = requireUser(req, res);
      if (!auth) return true;
      const user = memoryStore.usersById.get(auth.sub);
      if (!user) {
        json(res, 404, { error: "User not found", code: "USER_NOT_FOUND" });
        return true;
      }
      json(res, 200, { user: omitPassword(user) });
      return true;
    }

    if (method === "PATCH" && path === "/auth/profile") {
      const auth = requireUser(req, res);
      if (!auth) return true;
      const body = await readJson(req);
      const parsed = updateProfileSchema.safeParse(body);
      if (!parsed.success) {
        json(res, 400, { error: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues });
        return true;
      }
      const user = memoryStore.usersById.get(auth.sub);
      if (!user) {
        json(res, 404, { error: "User not found", code: "USER_NOT_FOUND" });
        return true;
      }
      const d = parsed.data;
      if (d.displayName !== undefined) user.displayName = d.displayName ?? null;
      if (d.avatarUrl !== undefined) user.avatarUrl = d.avatarUrl ?? null;
      if (d.username !== undefined) user.username = d.username ?? null;
      user.updatedAt = new Date();
      json(res, 200, { user: omitPassword(user) });
      return true;
    }

    if (method === "GET" && path === "/coins/market-prices") {
      const raw = searchParams.get("ids") ?? "";
      const ids = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 10_000) {
        json(res, 400, { error: "Too many ids (max 10000)" });
        return true;
      }
      const data = await getSimplePricesBatched(ids, 2);
      json(res, 200, data);
      return true;
    }

    if (method === "GET" && path === "/unlocks/upcoming") {
      const events = await fetchUnlockProviderFeed().catch(() => []);
      json(res, 200, {
        data: events,
        providerConfigured: Boolean(process.env.UNLOCKS_API_URL),
        refreshedAt: new Date().toISOString(),
      });
      return true;
    }

    if (method === "GET" && path === "/coins/markets-by-ids") {
      const raw = searchParams.get("ids") ?? "";
      const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
      const pricePct = searchParams.get("price_change_percentage") ?? "1h,7d,30d";
      const data = await getCoinsMarketsByIds(ids, { sparkline: false, priceChangePercentage: pricePct });
      json(res, 200, data);
      return true;
    }

    if (method === "GET" && path === "/coins/markets") {
      const page = Math.max(1, Number(searchParams.get("page")) || 1);
      const perPage = Math.min(250, Math.max(10, Number(searchParams.get("per_page")) || 100));
      const category = searchParams.get("category") ?? undefined;
      const sparkline = searchParams.get("sparkline") !== "false";
      const pricePct = searchParams.get("price_change_percentage") ?? undefined;
      const order = searchParams.get("order") ?? undefined;
      const data = await getCoinsMarkets(page, perPage, category, {
        sparkline,
        priceChangePercentage: pricePct ?? undefined,
        order: order ?? undefined,
      });
      json(res, 200, data);
      return true;
    }

    if (method === "GET" && path === "/coins/trending") {
      json(res, 200, await getTrending());
      return true;
    }

    if (method === "GET" && path === "/coins/search") {
      const q = (searchParams.get("q") ?? "").trim();
      if (!q) {
        json(res, 200, { coins: [] });
        return true;
      }
      const data = await searchCoins(q);
      json(res, 200, { coins: data.coins.slice(0, 20) });
      return true;
    }

    if (method === "GET" && path === "/coins/fear-greed") {
      json(res, 200, await getFearGreed());
      return true;
    }

    if (method === "GET" && path === "/coins/global") {
      json(res, 200, await getGlobal());
      return true;
    }

    if (method === "GET" && path === "/coins/categories") {
      json(res, 200, await getCoinCategories());
      return true;
    }

    const catCoins = path.match(/^\/coins\/categories\/([^/]+)\/coins$/);
    if (method === "GET" && catCoins) {
      const id = catCoins[1];
      const page = Math.max(1, Number(searchParams.get("page")) || 1);
      const perPage = Math.min(250, Math.max(10, Number(searchParams.get("per_page")) || 100));
      const sparkline = searchParams.get("sparkline") !== "false";
      const pricePct = searchParams.get("price_change_percentage") ?? "7d,30d";
      const data = await getCoinsByCategory(id, page, perPage, {
        sparkline,
        priceChangePercentage: pricePct,
      });
      json(res, 200, data);
      return true;
    }

    const coinChart = path.match(/^\/coins\/([^/]+)\/chart$/);
    if (method === "GET" && coinChart) {
      const id = coinChart[1].toLowerCase();
      const raw = (searchParams.get("days") ?? "7").toLowerCase();
      const days = raw === "max" ? "max" : Math.min(365, Math.max(1, Number(searchParams.get("days")) || 7));
      json(res, 200, await getCoinChart(id, days));
      return true;
    }

    const coinOhlc = path.match(/^\/coins\/([^/]+)\/ohlc$/);
    if (method === "GET" && coinOhlc) {
      const id = coinOhlc[1].toLowerCase();
      const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 7));
      json(res, 200, await getCoinOHLC(id, days));
      return true;
    }

    const coinDetail = path.match(/^\/coins\/([^/]+)$/);
    if (method === "GET" && coinDetail) {
      const id = coinDetail[1].toLowerCase();
      const includeTickers = searchParams.get("tickers") === "1";
      json(res, 200, await getCoinDetails(id, { includeTickers }));
      return true;
    }

    if (method === "GET" && path === "/market/overview") {
      const [global, fearGreed, markets] = await Promise.all([
        getGlobal().catch(() => null),
        getFearGreed().catch(() => null),
        getCoinsMarkets(1, 10).catch(() => null),
      ]);
      const btc = markets?.find((c) => c.symbol === "btc");
      const eth = markets?.find((c) => c.symbol === "eth");
      const fg = fearGreed?.data?.[0];
      json(res, 200, {
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
      return true;
    }

    if (method === "GET" && path === "/market/movers") {
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
      json(res, 200, {
        gainers: [...withChange]
          .sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0))
          .slice(0, 10)
          .map(mapCoin),
        losers: [...withChange]
          .sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0))
          .slice(0, 10)
          .map(mapCoin),
        volumeLeaders: [...coins].sort((a, b) => b.total_volume - a.total_volume).slice(0, 10).map(mapCoin),
      });
      return true;
    }

    if (method === "GET" && path === "/watchlist") {
      json(
        res,
        200,
        memoryStore.watchlist.map((w) => ({
          ...w,
          image: w.image,
          addedAt: w.addedAt.toISOString(),
        })),
      );
      return true;
    }

    if (method === "POST" && path === "/watchlist") {
      const body = (await readJson(req)) as Record<string, unknown> | undefined;
      const coinId = body?.coinId as string | undefined;
      const symbol = body?.symbol as string | undefined;
      const name = body?.name as string | undefined;
      const image = body?.image as string | undefined;
      const targetPrice = body?.targetPrice as number | undefined;
      if (!coinId || !symbol || !name) {
        json(res, 400, { error: "coinId, symbol, and name are required" });
        return true;
      }
      const existing = memoryStore.watchlist.find((w) => w.coinId === coinId);
      if (existing) {
        json(res, 409, {
          error: "Coin already in watchlist",
          item: { ...existing, addedAt: existing.addedAt.toISOString() },
        });
        return true;
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
      json(res, 201, { ...item, addedAt: item.addedAt.toISOString() });
      return true;
    }

    const watchPatch = path.match(/^\/watchlist\/(\d+)$/);
    if (method === "PATCH" && watchPatch) {
      const id = Number(watchPatch[1]);
      const body = (await readJson(req)) as { targetPrice?: number; alertEnabled?: boolean };
      const row = memoryStore.watchlist.find((w) => w.id === id);
      if (!row) {
        json(res, 404, { error: "Not found" });
        return true;
      }
      if (body.targetPrice !== undefined) row.targetPrice = body.targetPrice;
      if (body.alertEnabled !== undefined) row.alertEnabled = body.alertEnabled;
      json(res, 200, { ...row, addedAt: row.addedAt.toISOString() });
      return true;
    }

    const watchDel = path.match(/^\/watchlist\/(\d+)$/);
    if (method === "DELETE" && watchDel) {
      const id = Number(watchDel[1]);
      const idx = memoryStore.watchlist.findIndex((w) => w.id === id);
      if (idx >= 0) memoryStore.watchlist.splice(idx, 1);
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (method === "GET" && path === "/alerts") {
      const sorted = [...memoryStore.alerts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      json(
        res,
        200,
        sorted.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
          triggeredAt: a.triggeredAt?.toISOString() ?? null,
        })),
      );
      return true;
    }

    if (method === "POST" && path === "/alerts") {
      const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
      const title = body.title as string | undefined;
      const description = body.description as string | undefined;
      if (!title || !description) {
        json(res, 400, { error: "title and description are required" });
        return true;
      }
      const now = new Date();
      const alert = {
        id: memoryStore.takeAlertId(),
        type: (body.type as string) ?? "price",
        coinId: (body.coinId as string) ?? null,
        coinSymbol: (body.coinSymbol as string)?.toUpperCase() ?? null,
        title,
        description,
        targetPrice: (body.targetPrice as number) ?? null,
        targetDirection: (body.targetDirection as string) ?? null,
        priority: (body.priority as string) ?? "MEDIUM",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        triggeredAt: null as Date | null,
      };
      memoryStore.alerts.push(alert);
      json(res, 201, {
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        triggeredAt: null,
      });
      return true;
    }

    const alertPatch = path.match(/^\/alerts\/(\d+)$/);
    if (method === "PATCH" && alertPatch) {
      const id = Number(alertPatch[1]);
      const body = ((await readJson(req)) ?? {}) as { status?: "ACTIVE" | "TRIGGERED" | "DISMISSED"; targetPrice?: number };
      const row = memoryStore.alerts.find((a) => a.id === id);
      if (!row) {
        json(res, 404, { error: "Not found" });
        return true;
      }
      row.updatedAt = new Date();
      if (body.status) {
        row.status = body.status;
        if (body.status === "TRIGGERED") row.triggeredAt = new Date();
      }
      if (body.targetPrice !== undefined) row.targetPrice = body.targetPrice;
      json(res, 200, {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        triggeredAt: row.triggeredAt?.toISOString() ?? null,
      });
      return true;
    }

    const alertDel = path.match(/^\/alerts\/(\d+)$/);
    if (method === "DELETE" && alertDel) {
      const id = Number(alertDel[1]);
      const idx = memoryStore.alerts.findIndex((a) => a.id === id);
      if (idx >= 0) memoryStore.alerts.splice(idx, 1);
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (method === "GET" && path === "/signals") {
      const parsed = ListSignalsQueryParams.safeParse(Object.fromEntries(searchParams));
      const status = parsed.success ? parsed.data.status : undefined;
      const now = new Date();
      const filtered = status ? memoryStore.signals.filter((s) => s.status === status) : [...memoryStore.signals];
      const updated = filtered.map((s) => {
        let st = s.status;
        if (s.expiresAt && s.expiresAt < now && s.status === "active") st = "expired";
        return { ...s, status: st };
      });
      json(res, 200, updated.sort((a, b) => b.id - a.id).map(formatSignal));
      return true;
    }

    if (method === "POST" && path === "/signals") {
      const body = await readJson(req);
      const parsed = CreateSignalBody.safeParse(body);
      if (!parsed.success) {
        json(res, 400, { error: parsed.error.message });
        return true;
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
      json(res, 201, formatSignal(s));
      return true;
    }

    const sigPatch = path.match(/^\/signals\/(\d+)$/);
    if (method === "PATCH" && sigPatch) {
      const params = UpdateSignalParams.safeParse({ id: sigPatch[1] });
      const body = await readJson(req);
      const parsed = UpdateSignalBody.safeParse(body);
      if (!params.success) {
        json(res, 400, { error: params.error.message });
        return true;
      }
      if (!parsed.success) {
        json(res, 400, { error: parsed.error.message });
        return true;
      }
      const s = memoryStore.signals.find((x) => x.id === params.data.id);
      if (!s) {
        json(res, 404, { error: "Signal not found" });
        return true;
      }
      if (parsed.data.status != null) s.status = parsed.data.status;
      if (parsed.data.targetPrice != null) s.targetPrice = parsed.data.targetPrice;
      if (parsed.data.confidence != null) s.confidence = parsed.data.confidence;
      if ("stopLossPrice" in parsed.data) s.stopLossPrice = parsed.data.stopLossPrice ?? null;
      json(res, 200, formatSignal(s));
      return true;
    }

    const sigDel = path.match(/^\/signals\/(\d+)$/);
    if (method === "DELETE" && sigDel) {
      const params = DeleteSignalParams.safeParse({ id: sigDel[1] });
      if (!params.success) {
        json(res, 400, { error: params.error.message });
        return true;
      }
      const idx = memoryStore.signals.findIndex((s) => s.id === params.data.id);
      if (idx < 0) {
        json(res, 404, { error: "Signal not found" });
        return true;
      }
      memoryStore.signals.splice(idx, 1);
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (method === "GET" && path === "/portfolio/positions") {
      const prices = await priceMap();
      const enriched = await Promise.all(memoryStore.positions.map((p) => enrichPosition(p, prices)));
      json(res, 200, enriched);
      return true;
    }

    if (method === "POST" && path === "/portfolio/positions") {
      const body = await readJson(req);
      const parsed = CreatePositionBody.safeParse(body);
      if (!parsed.success) {
        json(res, 400, { error: parsed.error.message });
        return true;
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
      json(res, 201, await enrichPosition(position, prices));
      return true;
    }

    const posPatch = path.match(/^\/portfolio\/positions\/(\d+)$/);
    if (method === "PATCH" && posPatch) {
      const params = UpdatePositionParams.safeParse({ id: posPatch[1] });
      const body = await readJson(req);
      const parsed = UpdatePositionBody.safeParse(body);
      if (!params.success) {
        json(res, 400, { error: params.error.message });
        return true;
      }
      if (!parsed.success) {
        json(res, 400, { error: parsed.error.message });
        return true;
      }
      const p = memoryStore.positions.find((x) => x.id === params.data.id);
      if (!p) {
        json(res, 404, { error: "Position not found" });
        return true;
      }
      if (parsed.data.amount != null) p.amount = parsed.data.amount;
      if (parsed.data.avgBuyPrice != null) p.avgBuyPrice = parsed.data.avgBuyPrice;
      if ("targetPrice" in parsed.data) p.targetPrice = parsed.data.targetPrice ?? null;
      const prices = await priceMap();
      json(res, 200, await enrichPosition(p, prices));
      return true;
    }

    const posDel = path.match(/^\/portfolio\/positions\/(\d+)$/);
    if (method === "DELETE" && posDel) {
      const params = DeletePositionParams.safeParse({ id: posDel[1] });
      if (!params.success) {
        json(res, 400, { error: params.error.message });
        return true;
      }
      const idx = memoryStore.positions.findIndex((p) => p.id === params.data.id);
      if (idx < 0) {
        json(res, 404, { error: "Position not found" });
        return true;
      }
      memoryStore.positions.splice(idx, 1);
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (method === "GET" && path === "/portfolio/summary") {
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
      json(res, 200, {
        totalValueUsd: Math.round(totalValueUsd * 100) / 100,
        totalInvestedUsd: Math.round(totalInvestedUsd * 100) / 100,
        totalPnlUsd: Math.round(totalPnlUsd * 100) / 100,
        totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
        positionCount: enriched.length,
        allocationByNarrative,
        topPerformer: sorted[0] ?? null,
        worstPerformer: sorted[sorted.length - 1] ?? null,
      });
      return true;
    }

    if (method === "GET" && path === "/portfolio/insights") {
      const prices = await priceMap();
      const enriched = await Promise.all(memoryStore.positions.map((p) => enrichPosition(p, prices)));
      const narrativeSlugs = [...new Set(enriched.map((p) => p.narrativeSlug ?? "Other"))];
      const overallPnl = enriched.reduce((s, p) => s + p.pnlPercent, 0) / (enriched.length || 1);
      const overallRisk =
        enriched.length <= 1 ? "very_high" : enriched.length <= 3 ? "high" : enriched.length <= 6 ? "moderate" : "low";
      const diversificationScore = Math.min(100, Math.round((enriched.length / 10) * 100));
      json(res, 200, {
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
      return true;
    }

    if (method === "GET" && path === "/narratives") {
      json(res, 200, []);
      return true;
    }

    const narSlug = path.match(/^\/narratives\/([^/]+)$/);
    if (method === "GET" && narSlug) {
      json(res, 404, { error: "Narrative not found" });
      return true;
    }

    if (method === "GET" && path === "/news") {
      json(res, 200, []);
      return true;
    }

    if (method === "POST" && path === "/tokens/import") {
      const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
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
      } = body;
      if (!cgId || !symbol || !name) {
        json(res, 400, { error: "id, symbol, and name are required" });
        return true;
      }
      const upperSymbol = String(symbol).toUpperCase();
      if (memoryStore.importedTokens.some((t) => t.symbol === upperSymbol)) {
        json(res, 200, { imported: false, message: "Already on platform" });
        return true;
      }
      const now = new Date();
      memoryStore.importedTokens.push({
        id: memoryStore.takeTokenId(),
        symbol: upperSymbol,
        name: String(name),
        logoUrl: (image as string) ?? null,
        chain: "Multi-Chain",
        coingeckoId: String(cgId),
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
      json(res, 201, { imported: true, message: "Coin added to CoinAstra" });
      return true;
    }

    if (method === "GET" && path === "/tokens") {
      const parsed = ListTokensQueryParams.safeParse(Object.fromEntries(searchParams));
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
      json(res, 200, merged.slice(offset, offset + limit));
      return true;
    }

    const tokNews = path.match(/^\/tokens\/([^/]+)\/news$/);
    if (method === "GET" && tokNews) {
      json(res, 200, []);
      return true;
    }

    const tokChart = path.match(/^\/tokens\/([^/]+)\/chart$/);
    if (method === "GET" && tokChart) {
      const symbol = tokChart[1].toUpperCase();
      const days = Math.min(365, Math.max(1, Number(searchParams.get("days")) || 7));
      const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
      const cgId = mem?.coingeckoId ?? (await getCoinIdBySymbol(symbol));
      if (!cgId) {
        json(res, 404, { error: "CoinGecko ID not found for this token" });
        return true;
      }
      json(res, 200, await getCoinChart(cgId, days));
      return true;
    }

    const tokLive = path.match(/^\/tokens\/([^/]+)\/live$/);
    if (method === "GET" && tokLive) {
      const symbol = tokLive[1].toUpperCase();
      const preferredId = searchParams.get("id") ?? undefined;
      const full = searchParams.get("full") === "1";
      const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
      let cgId = preferredId ?? mem?.coingeckoId ?? null;
      if (!cgId) cgId = await getCoinIdBySymbol(symbol, preferredId ?? undefined);
      if (!cgId) {
        json(res, 404, { error: "CoinGecko ID not found for this token" });
        return true;
      }
      if (full) {
        const details = await getCoinDetails(cgId);
        json(res, 200, buildLivePayload(cgId, details));
        return true;
      }
      const [markets, quotes] = await Promise.all([
        getCoinsMarketsByIds([cgId], { sparkline: false, priceChangePercentage: "1h,7d,30d" }),
        getSimplePricesForIds([cgId]),
      ]);
      const m = markets[0];
      if (!m) {
        json(res, 404, { error: "Market data not found" });
        return true;
      }
      const q = quotes[cgId];
      json(res, 200, {
        id: cgId,
        symbol: m.symbol.toUpperCase(),
        name: m.name,
        image: m.image,
        rank: m.market_cap_rank,
        price: q?.usd ?? m.current_price,
        priceChange24h: q?.usd_24h_change ?? m.price_change_percentage_24h,
        priceChange7d: m.price_change_percentage_7d_in_currency ?? 0,
        priceChange30d: 0,
        priceChange1y: 0,
        marketCap: q?.usd_market_cap ?? m.market_cap,
        volume24h: q?.usd_24h_vol ?? m.total_volume,
        fdv: m.fully_diluted_valuation,
        high24h: m.high_24h,
        low24h: m.low_24h,
        ath: m.ath,
        athChange: m.ath_change_percentage,
        athDate: "",
        circulatingSupply: m.circulating_supply,
        totalSupply: m.total_supply,
        maxSupply: m.max_supply,
        categories: [],
      });
      return true;
    }

    const tokScores = path.match(/^\/tokens\/([^/]+)\/scores$/);
    if (method === "GET" && tokScores) {
      const symbol = tokScores[1].toUpperCase();
      const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
      if (mem) {
        json(res, 200, {
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
        return true;
      }
      const cgId = await getCoinIdBySymbol(symbol);
      if (!cgId) {
        json(res, 404, { error: "Token not found" });
        return true;
      }
      const details = await getCoinDetails(cgId);
      const pc = details.market_data.price_change_percentage_24h ?? 0;
      const overall = Math.round(Math.max(35, Math.min(85, 50 + pc * 1.2)));
      json(res, 200, {
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
      return true;
    }

    const tokAi = path.match(/^\/tokens\/([^/]+)\/ai-research$/);
    if (method === "GET" && tokAi) {
      const symbol = tokAi[1].toUpperCase();
      const cgId = await getCoinIdBySymbol(symbol);
      if (!cgId) {
        json(res, 404, { error: "Token not found" });
        return true;
      }
      const details = await getCoinDetails(cgId);
      json(res, 200, {
        symbol,
        summary: `${details.name} — live market snapshot from CoinGecko. Database-free mode: narrative and proprietary scores are not stored.`,
        strengths: ["Liquid markets on major venues", "Public CoinGecko market metadata"],
        weaknesses: ["No persisted internal research in this deployment"],
        risks: ["Macro and regulatory drivers", "Third-party API rate limits"],
        opportunityLevel: "moderate",
        generatedAt: new Date().toISOString(),
      });
      return true;
    }

    const tokDetail = path.match(/^\/tokens\/([^/]+)$/);
    if (method === "GET" && tokDetail) {
      const symbol = tokDetail[1].toUpperCase();
      const mem = memoryStore.importedTokens.find((t) => t.symbol === symbol);
      if (mem) {
        json(res, 200, {
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
        return true;
      }
      const cgId = await getCoinIdBySymbol(symbol);
      if (!cgId) {
        json(res, 404, { error: "Token not found" });
        return true;
      }
      const details = await getCoinDetails(cgId);
      const md = details.market_data;
      json(res, 200, {
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
      return true;
    }

    json(res, 404, { error: "Not found", path });
    return true;
  } catch (err) {
    console.error("[dev-api]", err);
    json(res, 500, { error: "Internal Server Error" });
    return true;
  }
}
