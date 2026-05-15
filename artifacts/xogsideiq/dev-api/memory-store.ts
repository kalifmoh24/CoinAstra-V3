/**
 * Ephemeral in-memory persistence for Vite dev API (no database).
 * Resets when the dev server restarts.
 */

export interface MemoryUser {
  id: number;
  email: string;
  passwordHash: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryWatchlistRow {
  id: number;
  coinId: string;
  symbol: string;
  name: string;
  image: string | null;
  targetPrice: number | null;
  alertEnabled: boolean;
  addedAt: Date;
}

export interface MemoryAlert {
  id: number;
  type: string;
  coinId: string | null;
  coinSymbol: string | null;
  title: string;
  description: string;
  targetPrice: number | null;
  targetDirection: string | null;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  triggeredAt: Date | null;
}

export interface MemorySignal {
  id: number;
  tokenSymbol: string;
  tokenName: string;
  action: string;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number | null;
  confidence: number;
  timeframe: string;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface MemoryPosition {
  id: number;
  tokenSymbol: string;
  tokenName: string;
  logoUrl: string | null;
  amount: number;
  avgBuyPrice: number;
  targetPrice: number | null;
  narrativeSlug: string | null;
  createdAt: Date;
}

export interface MemoryImportedToken {
  id: number;
  symbol: string;
  name: string;
  logoUrl: string | null;
  chain: string;
  coingeckoId: string;
  price: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
  fdv: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  overallScore: number;
  fundamentalScore: number;
  technicalScore: number;
  sentimentScore: number;
  riskScore: number;
  narrativeMomentumScore: number;
  finalGrade: string;
  gradeExplanation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let nextUserId = 1;
let nextWatchId = 1;
let nextAlertId = 1;
let nextSignalId = 1;
let nextPositionId = 1;
let nextTokenId = 1;

const usersById = new Map<number, MemoryUser>();
const usersByEmail = new Map<string, MemoryUser>();
const watchlist: MemoryWatchlistRow[] = [];
const alerts: MemoryAlert[] = [];
const signals: MemorySignal[] = [];
const positions: MemoryPosition[] = [];
const importedTokens: MemoryImportedToken[] = [];

export const memoryStore = {
  usersById,
  usersByEmail,
  watchlist,
  alerts,
  signals,
  positions,
  importedTokens,
  takeUserId: (): number => nextUserId++,
  takeWatchId: (): number => nextWatchId++,
  takeAlertId: (): number => nextAlertId++,
  takeSignalId: (): number => nextSignalId++,
  takePositionId: (): number => nextPositionId++,
  takeTokenId: (): number => nextTokenId++,
};
