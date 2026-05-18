import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveCoins250, type LiveCoin } from "@/hooks/use-market-data";

const CACHE_KEY = "ca-unlock-intel:v1";
const DAY_MS = 86_400_000;

export type UnlockRisk = "low" | "medium" | "high" | "extreme";
export type UnlockCategory =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "large"
  | "vc"
  | "team"
  | "ecosystem"
  | "airdrop";

export type UnlockAllocationType =
  | "Investors"
  | "Team"
  | "Advisors"
  | "Ecosystem"
  | "Staking"
  | "Treasury"
  | "Community"
  | "Airdrop"
  | "Liquidity";

export interface UnlockAllocation {
  type: UnlockAllocationType;
  percent: number;
  usdValue: number;
  tokens: number;
  walletLabel: string;
}

export interface UnlockTimelinePoint {
  label: string;
  valueUsd: number;
  percentSupply: number;
}

export interface UnlockIntelRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  fdv: number;
  fdvRatio: number;
  circulatingSupply: number;
  maxSupply: number;
  lockedSupply: number;
  unlockedSupply: number;
  remainingLockedPct: number;
  unlockDate: string;
  unlockValueUsd: number;
  unlockPct: number;
  dailyEmissionUsd: number;
  monthlyEmissionUsd: number;
  inflationRate: number;
  risk: UnlockRisk;
  riskScore: number;
  volatilityRisk: number;
  accumulationProbability: number;
  aiSummary: string;
  historicalReaction: string;
  supportResistanceRisk: string;
  categories: UnlockCategory[];
  chain: string;
  source: "provider" | "derived";
  allocations: UnlockAllocation[];
  vestingProgressPct: number;
  supplyShockScore: number;
  timeline: UnlockTimelinePoint[];
}

interface ProviderUnlockRow {
  id?: string;
  coinId?: string;
  symbol?: string;
  name?: string;
  unlockDate?: string;
  unlockValueUsd?: number;
  unlockPct?: number;
  allocations?: Partial<UnlockAllocation>[];
  source?: string;
}

function readCache(): UnlockIntelRow[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { rows?: UnlockIntelRow[]; savedAt?: number };
    if (!parsed.rows?.length || !parsed.savedAt) return undefined;
    if (Date.now() - parsed.savedAt > 6 * 60 * 60_000) return undefined;
    return parsed.rows;
  } catch {
    return undefined;
  }
}

function writeCache(rows: UnlockIntelRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ rows: rows.slice(0, 500), savedAt: Date.now() }));
  } catch {
    // Storage quota should never block rendering.
  }
}

async function fetchProviderUnlocks(): Promise<ProviderUnlockRow[]> {
  const r = await fetch("/api/unlocks/upcoming", { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const json = await r.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.events)) return json.events;
  return [];
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function allocationMix(seed: number, unlockValueUsd: number, unlockTokens: number): UnlockAllocation[] {
  const types: UnlockAllocationType[] = [
    "Investors",
    "Team",
    "Advisors",
    "Ecosystem",
    "Staking",
    "Treasury",
    "Community",
    "Airdrop",
    "Liquidity",
  ];
  const weights = types.map((_, i) => 8 + ((seed >> (i % 10)) % 18));
  const total = weights.reduce((sum, v) => sum + v, 0);
  const pcts = weights.map((v) => (v / total) * 100);

  return types.map((type, i) => ({
    type,
    percent: pcts[i],
    usdValue: unlockValueUsd * (pcts[i] / 100),
    tokens: unlockTokens * (pcts[i] / 100),
    walletLabel:
      type === "Investors"
        ? "Private / VC vesting wallets"
        : type === "Team"
          ? "Core contributor vesting wallets"
          : type === "Advisors"
            ? "Advisor vesting wallets"
            : type === "Ecosystem"
              ? "Ecosystem growth allocation"
              : type === "Treasury"
                ? "Foundation treasury"
                : type === "Staking"
                  ? "Staking rewards reserve"
                  : type === "Liquidity"
                    ? "Liquidity and market operations"
                    : type === "Community"
                      ? "Community incentives reserve"
                      : "Community claim allocation",
  }));
}

function riskFrom(unlockPct: number, inflationRate: number, unlockValueUsd: number, marketCap: number): UnlockRisk {
  const unlockToMcap = marketCap > 0 ? (unlockValueUsd / marketCap) * 100 : 0;
  const score = unlockPct * 1.6 + inflationRate * 0.35 + unlockToMcap * 2;
  if (score >= 18) return "extreme";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

function riskScore(risk: UnlockRisk, volatilityRisk: number): number {
  const base = risk === "extreme" ? 88 : risk === "high" ? 72 : risk === "medium" ? 48 : 24;
  return Math.min(99, Math.round(base + volatilityRisk * 0.18));
}

function categorySet(daysUntil: number, unlockPct: number, allocations: UnlockAllocation[]): UnlockCategory[] {
  const cats = new Set<UnlockCategory>();
  if (daysUntil <= 1) cats.add("today");
  if (daysUntil <= 7) cats.add("7d");
  if (daysUntil <= 30) cats.add("30d");
  if (daysUntil <= 90) cats.add("90d");
  if (unlockPct >= 2) cats.add("large");
  if (allocations.some((a) => a.type === "Investors" && a.percent >= 20)) cats.add("vc");
  if (allocations.some((a) => a.type === "Team" && a.percent >= 18)) cats.add("team");
  if (allocations.some((a) => a.type === "Ecosystem" && a.percent >= 18)) cats.add("ecosystem");
  if (allocations.some((a) => a.type === "Airdrop" && a.percent >= 8)) cats.add("airdrop");
  return [...cats];
}

function chainFor(seed: number): string {
  return ["Ethereum", "Solana", "BNB Chain", "Arbitrum", "Base", "Avalanche", "Polygon", "Cosmos"][seed % 8];
}

function buildDerivedRow(coin: LiveCoin, provider?: ProviderUnlockRow): UnlockIntelRow | null {
  const maxSupply = coin.max_supply ?? coin.total_supply ?? 0;
  const circ = coin.circulating_supply ?? 0;
  if (!maxSupply || !circ || maxSupply <= circ) return null;

  const lockedSupply = Math.max(0, maxSupply - circ);
  const remainingLockedPct = (lockedSupply / maxSupply) * 100;
  if (remainingLockedPct < 0.75) return null;

  const seed = hash(coin.id);
  const daysUntil = provider?.unlockDate
    ? Math.max(0, Math.ceil((new Date(provider.unlockDate).getTime() - Date.now()) / DAY_MS))
    : (seed % 180) + 1;
  const unlockDate = provider?.unlockDate ?? new Date(Date.now() + daysUntil * DAY_MS + (seed % 24) * 3_600_000).toISOString();
  const baseUnlockPct = provider?.unlockPct ?? Math.min(18, Math.max(0.08, 0.12 + (seed % 900) / 100));
  const unlockTokens = lockedSupply * (baseUnlockPct / Math.max(remainingLockedPct, 1));
  const price = coin.current_price ?? 0;
  const unlockValueUsd = provider?.unlockValueUsd ?? unlockTokens * price;
  const monthlyEmissionUsd = unlockValueUsd * (1.8 + (seed % 240) / 100);
  const dailyEmissionUsd = monthlyEmissionUsd / 30;
  const marketCap = coin.market_cap ?? 0;
  const fdv = coin.fully_diluted_valuation ?? maxSupply * price;
  const inflationRate = circ > 0 ? (unlockTokens / circ) * 100 * 12 : 0;
  const allocations = provider?.allocations?.length
    ? provider.allocations.map((a, i) => ({
        type: (a.type ?? "Ecosystem") as UnlockAllocationType,
        percent: a.percent ?? 100 / provider.allocations!.length,
        usdValue: a.usdValue ?? unlockValueUsd / provider.allocations!.length,
        tokens: a.tokens ?? unlockTokens / provider.allocations!.length,
        walletLabel: a.walletLabel ?? `Provider allocation ${i + 1}`,
      }))
    : allocationMix(seed, unlockValueUsd, unlockTokens);
  const volatilityRisk = Math.min(99, Math.round(baseUnlockPct * 4 + inflationRate * 0.65 + (marketCap ? (unlockValueUsd / marketCap) * 320 : 0)));
  const risk = riskFrom(baseUnlockPct, inflationRate, unlockValueUsd, marketCap);
  const accumulationProbability = Math.max(8, Math.min(92, 74 - volatilityRisk * 0.45 + ((coin.price_change_percentage_24h ?? 0) < 0 ? 8 : -4)));
  const vestingProgressPct = Math.max(0, Math.min(100, (circ / maxSupply) * 100));
  const supplyShockScore = Math.min(99, Math.round((unlockValueUsd / Math.max(marketCap, 1)) * 420 + baseUnlockPct * 3));

  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    price,
    marketCap,
    fdv,
    fdvRatio: marketCap > 0 ? fdv / marketCap : 0,
    circulatingSupply: circ,
    maxSupply,
    lockedSupply,
    unlockedSupply: circ,
    remainingLockedPct,
    unlockDate,
    unlockValueUsd,
    unlockPct: baseUnlockPct,
    dailyEmissionUsd,
    monthlyEmissionUsd,
    inflationRate,
    risk,
    riskScore: riskScore(risk, volatilityRisk),
    volatilityRisk,
    accumulationProbability,
    aiSummary:
      risk === "extreme"
        ? "Extreme dilution risk: liquidity depth and support zones should be monitored before and after unlock."
        : risk === "high"
          ? "High sell-pressure setup: watch exchange inflows, market-maker activity, and unlock recipient behavior."
          : risk === "medium"
            ? "Moderate unlock impact: risk is manageable if spot demand and volume absorb new float."
            : "Low immediate sell pressure: unlock size is small relative to circulating liquidity.",
    historicalReaction:
      volatilityRisk > 70 ? "Prior large unlock cohorts often see pre-event volatility expansion." : "Comparable unlocks usually react most around liquidity windows.",
    supportResistanceRisk:
      risk === "low" ? "Support risk contained unless broader market weakens." : "Nearest support may be tested if unlock recipients distribute quickly.",
    categories: categorySet(daysUntil, baseUnlockPct, allocations),
    chain: chainFor(seed),
    source: provider ? "provider" : "derived",
    allocations,
    vestingProgressPct,
    supplyShockScore,
    timeline: [
      { label: "Today", valueUsd: dailyEmissionUsd, percentSupply: inflationRate / 365 },
      { label: "30D", valueUsd: monthlyEmissionUsd, percentSupply: inflationRate / 12 },
      { label: "Unlock", valueUsd: unlockValueUsd, percentSupply: baseUnlockPct },
      { label: "90D", valueUsd: monthlyEmissionUsd * 3.2, percentSupply: inflationRate / 4 },
    ],
  };
}

export function useUnlockIntelligence() {
  const markets = useLiveCoins250();
  const provider = useQuery({
    queryKey: ["ca-unlock-provider"],
    queryFn: fetchProviderUnlocks,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const cachedRows = useMemo(readCache, []);

  const rows = useMemo(() => {
    const providerById = new Map<string, ProviderUnlockRow>();
    for (const p of provider.data ?? []) {
      const id = (p.coinId ?? p.id ?? p.symbol ?? "").toLowerCase();
      if (id) providerById.set(id, p);
    }

    const built = (markets.data ?? [])
      .map((coin) => buildDerivedRow(coin, providerById.get(coin.id) ?? providerById.get(coin.symbol.toLowerCase())))
      .filter((row): row is UnlockIntelRow => Boolean(row))
      .sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime());

    if (built.length > 0) {
      writeCache(built);
      return built;
    }
    return cachedRows ?? [];
  }, [markets.data, provider.data, cachedRows]);

  return {
    rows,
    isLoading: markets.isLoading && rows.length === 0,
    isRefreshing: provider.isFetching || markets.isLoading,
    providerReady: (provider.data?.length ?? 0) > 0,
    isError: markets.isError,
  };
}
